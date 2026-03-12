import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MessageCircle, Send, Paperclip, CheckCheck, Clock, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import MobileHeader from '../components/mobile/MobileHeader';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function Support() {
  const [user, setUser] = useState(null);
  const [message, setMessage] = useState('');
  const [conversationId, setConversationId] = useState(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await base44.auth.me();
        setUser(userData);
        // Create or get conversation ID
        const convId = `${userData.email}_${Date.now()}`;
        setConversationId(convId);
      } catch (e) {
        base44.auth.redirectToLogin();
      }
    };
    loadUser();
  }, []);

  const { data: messages = [] } = useQuery({
    queryKey: ['supportChat', user?.email],
    queryFn: async () => {
      const allMessages = await base44.entities.SupportChat.filter(
        { user_email: user?.email },
        '-created_date',
        100
      );
      return allMessages || [];
    },
    enabled: !!user?.email,
    refetchInterval: 3000,
  });

  // Real-time subscription
  useEffect(() => {
    if (!user?.email) return;

    const unsubscribe = base44.entities.SupportChat.subscribe((event) => {
      if (event.data?.user_email === user.email) {
        queryClient.invalidateQueries({ queryKey: ['supportChat'] });
      }
    });

    return unsubscribe;
  }, [user?.email, queryClient]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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
      queryClient.invalidateQueries({ queryKey: ['supportChat'] });
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

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const hasMessages = messages.length > 0;
  const latestStatus = messages[0]?.status;

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col">
      <MobileHeader
        title="Support"
        subtitle="We're here to help"
        icon={MessageCircle}
        iconColor="text-blue-500"
      />

      <Card className="flex-1 flex flex-col mt-6 bg-card border-border overflow-hidden">
        <CardHeader className="border-b border-border flex-shrink-0">
          <div className="flex items-center justify-between">
            <CardTitle className="text-foreground flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-blue-500" />
              Live Support Chat
            </CardTitle>
            {hasMessages && (
              <Badge className={`${latestStatus === 'open' ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'} border-none`}>
                {latestStatus === 'open' ? 'Active' : 'Resolved'}
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
          {!hasMessages ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mb-4">
                <MessageCircle className="w-8 h-8 text-blue-500" />
              </div>
              <h3 className="text-foreground font-semibold mb-2">Start a Conversation</h3>
              <p className="text-muted-foreground text-sm max-w-sm">
                Our support team is here to help with any questions about your fitness journey, subscriptions, or app features.
              </p>
            </div>
          ) : (
            <>
              {messages.slice().reverse().map((msg) => {
                const isUser = msg.sender_type === 'user';
                return (
                  <div key={msg.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] ${isUser ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'} rounded-2xl px-4 py-2`}>
                      {!isUser && (
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                            <MessageCircle className="w-3 h-3 text-white" />
                          </div>
                          <span className="text-xs font-semibold text-foreground">Roki Support</span>
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
                      <div className={`flex items-center gap-1 mt-1 text-xs ${isUser ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
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
        </CardContent>

        <div className="border-t border-border p-4 flex-shrink-0">
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
            >
              {uploadingFile ? (
                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              ) : (
                <Paperclip className="w-4 h-4" />
              )}
            </Button>
            <Input
              placeholder="Type your message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              className="flex-1"
            />
            <Button
              onClick={handleSend}
              disabled={!message.trim() || sendMessageMutation.isPending}
            >
              <Send className="w-4 h-4 select-none" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}