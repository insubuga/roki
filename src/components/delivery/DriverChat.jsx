import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MessageCircle, Send, Paperclip, Clock, X, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

export default function DriverChat({ order, user }) {
  const [message, setMessage] = useState('');
  const [conversationId, setConversationId] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (user?.email && order?.id) {
      const convId = `customer_${user.email}_order_${order.id}`;
      setConversationId(convId);
    }
  }, [user, order]);

  const { data: messages = [] } = useQuery({
    queryKey: ['driverChat', conversationId],
    queryFn: async () => {
      const allMessages = await base44.entities.SupportChat.filter(
        { conversation_id: conversationId },
        '-created_date',
        100
      );
      return allMessages || [];
    },
    enabled: !!conversationId && isOpen,
    refetchInterval: isOpen ? 3000 : false,
  });

  useEffect(() => {
    if (!conversationId || !isOpen) return;

    const unsubscribe = base44.entities.SupportChat.subscribe((event) => {
      if (event.data?.conversation_id === conversationId) {
        queryClient.invalidateQueries({ queryKey: ['driverChat'] });
      }
    });

    return unsubscribe;
  }, [conversationId, isOpen, queryClient]);

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
      queryClient.invalidateQueries({ queryKey: ['driverChat'] });
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

  if (!order?.driver_email) {
    return null;
  }

  return (
    <>
      {/* Chat Button */}
      <Button
        onClick={() => setIsOpen(!isOpen)}
        variant="outline"
        size="sm"
        className="relative"
      >
        <MessageCircle className="w-4 h-4 mr-2" />
        Message Driver
        {unreadCount > 0 && (
          <Badge className="absolute -top-2 -right-2 bg-red-500 text-white text-xs h-5 w-5 flex items-center justify-center p-0">
            {unreadCount}
          </Badge>
        )}
      </Button>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-6 right-6 w-96 h-[500px] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col z-50 overflow-hidden"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-green-500 to-green-600 p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="text-white font-semibold text-sm">Your Driver</h3>
                  <p className="text-green-100 text-xs">{order.driver_email?.split('@')[0]}</p>
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
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-3">
                    <MessageCircle className="w-6 h-6 text-green-500" />
                  </div>
                  <p className="text-gray-600 text-sm">Start a conversation with your driver</p>
                </div>
              ) : (
                <>
                  {messages.slice().reverse().map((msg) => {
                    const isUser = msg.sender_type === 'user';
                    return (
                      <div key={msg.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[75%] ${isUser ? 'bg-green-500 text-white' : 'bg-white text-gray-800 border border-gray-200'} rounded-2xl px-3 py-2 shadow-sm`}>
                          {!isUser && (
                            <div className="flex items-center gap-2 mb-1">
                              <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                                <User className="w-3 h-3 text-white" />
                              </div>
                              <span className="text-xs font-semibold text-gray-700">Driver</span>
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
                          <div className={`flex items-center gap-1 mt-1 text-xs ${isUser ? 'text-green-100' : 'text-gray-500'}`}>
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
                    <div className="w-4 h-4 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
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
                  className="bg-green-500 text-white hover:bg-green-600 h-9 w-9"
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