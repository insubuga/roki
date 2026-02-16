import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MessageCircle, Send, CheckCircle, Clock, User, Paperclip } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { format } from 'date-fns';
import _ from 'lodash';

export default function SupportAdmin() {
  const [user, setUser] = useState(null);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [message, setMessage] = useState('');
  const [uploadingFile, setUploadingFile] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await base44.auth.me();
        if (userData.role !== 'admin') {
          toast.error('Access denied: Admin only');
          window.location.href = '/Dashboard';
          return;
        }
        setUser(userData);
      } catch (e) {
        base44.auth.redirectToLogin();
      }
    };
    loadUser();
  }, []);

  const { data: allMessages = [] } = useQuery({
    queryKey: ['supportAdminMessages'],
    queryFn: async () => {
      const messages = await base44.entities.SupportChat.list('-created_date', 500);
      return messages;
    },
    enabled: !!user,
    refetchInterval: 3000,
  });

  // Real-time subscription
  useEffect(() => {
    if (!user) return;

    const unsubscribe = base44.entities.SupportChat.subscribe((event) => {
      queryClient.invalidateQueries({ queryKey: ['supportAdminMessages'] });
    });

    return unsubscribe;
  }, [user, queryClient]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [allMessages, selectedConversation]);

  // Group messages by conversation
  const conversations = _.groupBy(allMessages, 'conversation_id');
  const conversationList = Object.entries(conversations).map(([convId, messages]) => {
    const sortedMessages = _.orderBy(messages, 'created_date', 'desc');
    const latestMessage = sortedMessages[0];
    const userEmail = latestMessage.user_email;
    const status = latestMessage.status;
    const unreadCount = sortedMessages.filter(m => m.sender_type === 'user').length;
    
    return {
      id: convId,
      userEmail,
      status,
      latestMessage: latestMessage.message,
      latestTime: latestMessage.created_date,
      messages: _.orderBy(messages, 'created_date', 'asc'),
      unreadCount: status === 'open' ? unreadCount : 0,
    };
  }).sort((a, b) => new Date(b.latestTime) - new Date(a.latestTime));

  const sendMessageMutation = useMutation({
    mutationFn: async ({ text, attachment }) => {
      return base44.entities.SupportChat.create({
        user_email: selectedConversation.userEmail,
        message: text,
        sender_type: 'support',
        conversation_id: selectedConversation.id,
        status: selectedConversation.status,
        attachment_url: attachment || undefined,
      });
    },
    onSuccess: () => {
      setMessage('');
      queryClient.invalidateQueries({ queryKey: ['supportAdminMessages'] });
    },
  });

  const resolveConversationMutation = useMutation({
    mutationFn: async (conversationId) => {
      const conversation = conversationList.find(c => c.id === conversationId);
      if (!conversation) return;
      
      // Update all messages in this conversation to resolved
      const updates = conversation.messages.map(msg => 
        base44.entities.SupportChat.update(msg.id, { status: 'resolved' })
      );
      await Promise.all(updates);
    },
    onSuccess: () => {
      toast.success('Conversation marked as resolved');
      queryClient.invalidateQueries({ queryKey: ['supportAdminMessages'] });
      setSelectedConversation(null);
    },
  });

  const handleSend = () => {
    if (!message.trim() || !selectedConversation) return;
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

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-8rem)]">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)] flex items-center gap-2">
          <MessageCircle className="w-6 h-6 text-blue-500" />
          Support Admin
        </h1>
        <p className="text-[var(--color-text-secondary)] text-sm">Manage customer support conversations</p>
      </div>

      <div className="grid grid-cols-12 gap-4 h-[calc(100%-5rem)]">
        {/* Conversations List */}
        <Card className="col-span-12 md:col-span-4 bg-[var(--color-bg-card)] border-[var(--color-border)] overflow-hidden flex flex-col">
          <CardHeader className="border-b border-[var(--color-border)]">
            <CardTitle className="text-[var(--color-text-primary)] text-sm">
              Conversations ({conversationList.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 overflow-y-auto flex-1">
            {conversationList.length === 0 ? (
              <div className="p-8 text-center text-[var(--color-text-secondary)]">
                <MessageCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No conversations yet</p>
              </div>
            ) : (
              <div className="divide-y divide-[var(--color-border)]">
                {conversationList.map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => setSelectedConversation(conv)}
                    className={`w-full p-4 text-left hover:bg-[var(--color-bg-secondary)] transition-colors ${
                      selectedConversation?.id === conv.id ? 'bg-[var(--color-bg-secondary)]' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-[var(--color-text-secondary)]" />
                        <span className="text-sm font-medium text-[var(--color-text-primary)] truncate">
                          {conv.userEmail}
                        </span>
                      </div>
                      {conv.status === 'open' && conv.unreadCount > 0 && (
                        <Badge className="bg-red-500/20 text-red-400 text-xs border-none">
                          {conv.unreadCount}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-[var(--color-text-secondary)] truncate mb-1">
                      {conv.latestMessage}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-[var(--color-text-muted)]">
                        {format(new Date(conv.latestTime), 'MMM d, h:mm a')}
                      </span>
                      <Badge className={`${conv.status === 'open' ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'} border-none text-xs`}>
                        {conv.status}
                      </Badge>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Chat Area */}
        <Card className="col-span-12 md:col-span-8 bg-[var(--color-bg-card)] border-[var(--color-border)] overflow-hidden flex flex-col">
          {!selectedConversation ? (
            <div className="flex-1 flex items-center justify-center text-center p-8">
              <div>
                <MessageCircle className="w-16 h-16 mx-auto mb-4 text-[var(--color-text-secondary)] opacity-50" />
                <p className="text-[var(--color-text-secondary)]">Select a conversation to view messages</p>
              </div>
            </div>
          ) : (
            <>
              <CardHeader className="border-b border-[var(--color-border)]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <User className="w-5 h-5 text-blue-500" />
                    <div>
                      <CardTitle className="text-[var(--color-text-primary)] text-sm">
                        {selectedConversation.userEmail}
                      </CardTitle>
                      <p className="text-xs text-[var(--color-text-secondary)]">
                        {selectedConversation.messages.length} messages
                      </p>
                    </div>
                  </div>
                  {selectedConversation.status === 'open' && (
                    <Button
                      onClick={() => resolveConversationMutation.mutate(selectedConversation.id)}
                      disabled={resolveConversationMutation.isPending}
                      size="sm"
                      className="bg-green-500/20 text-green-400 hover:bg-green-500/30 select-none"
                    >
                      <CheckCircle className="w-4 h-4 mr-2 select-none" />
                      Mark Resolved
                    </Button>
                  )}
                </div>
              </CardHeader>

              <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
                {selectedConversation.messages.map((msg) => {
                  const isSupport = msg.sender_type === 'support';
                  return (
                    <div key={msg.id} className={`flex ${isSupport ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] ${isSupport ? 'bg-blue-500 text-white' : 'bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)]'} rounded-2xl px-4 py-2`}>
                        {!isSupport && (
                          <div className="flex items-center gap-2 mb-1">
                            <div className="w-5 h-5 bg-gray-600 rounded-full flex items-center justify-center">
                              <User className="w-3 h-3 text-white" />
                            </div>
                            <span className="text-xs font-semibold">Customer</span>
                          </div>
                        )}
                        <p className="text-sm">{msg.message}</p>
                        {msg.attachment_url && (
                          <a
                            href={msg.attachment_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs underline mt-1 block"
                          >
                            View attachment
                          </a>
                        )}
                        <div className={`flex items-center gap-1 mt-1 text-xs ${isSupport ? 'text-blue-100' : 'text-[var(--color-text-secondary)]'}`}>
                          <Clock className="w-3 h-3" />
                          {format(new Date(msg.created_date), 'h:mm a')}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </CardContent>

              <div className="border-t border-[var(--color-border)] p-4">
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
                    className="border-[var(--color-border)] select-none"
                  >
                    {uploadingFile ? (
                      <div className="w-4 h-4 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Paperclip className="w-4 h-4 select-none" />
                    )}
                  </Button>
                  <Input
                    placeholder="Type your response..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                    className="flex-1 bg-[var(--color-bg-secondary)] border-[var(--color-border)] text-[var(--color-text-primary)]"
                  />
                  <Button
                    onClick={handleSend}
                    disabled={!message.trim() || sendMessageMutation.isPending}
                    className="bg-blue-500 text-white hover:bg-blue-600 select-none"
                  >
                    <Send className="w-4 h-4 select-none" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}