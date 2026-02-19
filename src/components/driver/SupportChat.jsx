import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MessageCircle, Send, Paperclip, Clock, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

export default function DriverSupportChat({ user }) {
  const [message, setMessage] = useState('');
  const [conversationId, setConversationId] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (user?.email) {
      const convId = `driver_${user.email}_support`;
      setConversationId(convId);
    }
  }, [user]);

  const { data: messages = [] } = useQuery({
    queryKey: ['driverSupportChat', user?.email],
    queryFn: async () => {
      const allMessages = await base44.entities.SupportChat.filter(
        { user_email: user?.email },
        '-created_date',
        100
      );
      return allMessages || [];
    },
    enabled: !!user?.email && isOpen,
    refetchInterval: isOpen ? 3000 : false,
  });

  // Real-time subscription
  useEffect(() => {
    if (!user?.email || !isOpen) return;

    const unsubscribe = base44.entities.SupportChat.subscribe((event) => {
      if (event.data?.user_email === user.email) {
        queryClient.invalidateQueries({ queryKey: ['driverSupportChat'] });
      }
    });

    return unsubscribe;
  }, [user?.email, isOpen, queryClient]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, [messages, isOpen]);

  const sendMessageMutation = useMutation({
    mutationFn: async ({ text, attachment }) => {
      return base44.entities.SupportChat.create({
        user_email: user.email,
        message: text,
        sender_type: 'user',
        conversation_id: conversationId,
        status: 'open',
        attachment_url: attachment || undefined,
      });
    },
    onSuccess: () => {
      setMessage('');
      queryClient.invalidateQueries({ queryKey: ['driverSupportChat'] });
    },
  });

  const handleSend = () => {
    if (!message.trim()) return;
    sendMessageMutation.mutate({ text: message });
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingFile(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      sendMessageMutation.mutate({
        text: message || '📎 Attachment',
        attachment: file_url,
      });
      toast.success('File uploaded');
    } catch (error) {
      toast.error('Failed to upload file');
    } finally {
      setUploadingFile(false);
    }
  };

  const unreadCount = messages.filter(m => m.sender_type === 'support' && m.status === 'open').length;

  return (
    <>
      {/* Floating Chat Button */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        className="fixed bottom-24 right-6 z-40"
      >
        <Button
          onClick={() => setIsOpen(!isOpen)}
          size="lg"
          className="h-14 w-14 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-lg hover:shadow-xl transition-all"
        >
          <MessageCircle className="w-6 h-6 text-white" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 bg-red-500 text-white text-xs h-5 w-5 flex items-center justify-center p-0 border-2 border-white">
              {unreadCount}
            </Badge>
          )}
        </Button>
      </motion.div>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-24 right-6 w-96 h-[500px] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col z-50 overflow-hidden"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                  <MessageCircle className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="text-white font-semibold text-sm">Driver Support</h3>
                  <p className="text-blue-100 text-xs">We're here to help</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(false)}
                className="text-white hover:bg-white/20 h-8 w-8"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-3">
                    <MessageCircle className="w-6 h-6 text-blue-500" />
                  </div>
                  <p className="text-gray-600 text-sm">Start a conversation with our support team</p>
                </div>
              ) : (
                <>
                  {messages.slice().reverse().map((msg) => {
                    const isUser = msg.sender_type === 'user';
                    return (
                      <div key={msg.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[75%] ${isUser ? 'bg-blue-500 text-white' : 'bg-white text-gray-800 border border-gray-200'} rounded-2xl px-3 py-2 shadow-sm`}>
                          {!isUser && (
                            <div className="flex items-center gap-2 mb-1">
                              <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                                <MessageCircle className="w-3 h-3 text-white" />
                              </div>
                              <span className="text-xs font-semibold text-gray-700">Support Team</span>
                            </div>
                          )}
                          <p className="text-sm break-words">{msg.message}</p>
                          {msg.attachment_url && (
                            <a
                              href={msg.attachment_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs underline mt-1 block"
                            >
                              📎 View attachment
                            </a>
                          )}
                          <div className={`flex items-center gap-1 mt-1 text-xs ${isUser ? 'text-blue-100' : 'text-gray-500'}`}>
                            <Clock className="w-3 h-3" />
                            {format(new Date(msg.created_date), 'h:mm a')}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* Input */}
            <div className="border-t border-gray-200 p-3 bg-white">
              <div className="flex items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={handleFileUpload}
                  accept="image/*,.pdf,.doc,.docx"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingFile}
                  className="h-9 w-9 border-gray-300"
                >
                  {uploadingFile ? (
                    <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Paperclip className="w-4 h-4" />
                  )}
                </Button>
                <Input
                  placeholder="Type a message..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                  className="flex-1 bg-gray-50 border-gray-300 h-9 text-sm"
                />
                <Button
                  onClick={handleSend}
                  disabled={!message.trim() || sendMessageMutation.isPending}
                  size="icon"
                  className="bg-blue-500 text-white hover:bg-blue-600 h-9 w-9"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}