import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MessageCircle, Send, CheckCircle, Clock, User, Paperclip, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { format, isToday, isYesterday } from 'date-fns';
import _ from 'lodash';

function formatTime(dateStr) {
  const d = new Date(dateStr);
  if (isToday(d)) return format(d, 'h:mm a');
  if (isYesterday(d)) return 'Yesterday';
  return format(d, 'MMM d');
}

export default function SupportAdmin() {
  const [user, setUser] = useState(null);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [message, setMessage] = useState('');
  const [search, setSearch] = useState('');
  const [uploadingFile, setUploadingFile] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(u => {
      if (u.role !== 'admin') { toast.error('Access denied'); window.location.href = '/Dashboard'; return; }
      setUser(u);
    }).catch(() => base44.auth.redirectToLogin());
  }, []);

  const { data: allMessages = [] } = useQuery({
    queryKey: ['supportAdminMessages'],
    queryFn: () => base44.entities.SupportChat.list('-created_date', 500),
    enabled: !!user,
    refetchInterval: 5000,
  });

  useEffect(() => {
    if (!user) return;
    const unsub = base44.entities.SupportChat.subscribe(() => {
      queryClient.invalidateQueries({ queryKey: ['supportAdminMessages'] });
    });
    return unsub;
  }, [user, queryClient]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [allMessages, selectedConversation]);

  const conversations = _.groupBy(allMessages, 'conversation_id');
  const conversationList = Object.entries(conversations).map(([convId, messages]) => {
    const sorted = _.orderBy(messages, 'created_date', 'desc');
    const latest = sorted[0];
    return {
      id: convId,
      userEmail: latest.user_email,
      status: latest.status,
      latestMessage: latest.message,
      latestTime: latest.created_date,
      messages: _.orderBy(messages, 'created_date', 'asc'),
      unreadCount: latest.status === 'open' ? sorted.filter(m => m.sender_type === 'user').length : 0,
    };
  }).sort((a, b) => new Date(b.latestTime) - new Date(a.latestTime));

  const filtered = conversationList.filter(c =>
    !search || c.userEmail.toLowerCase().includes(search.toLowerCase())
  );

  const openCount = conversationList.filter(c => c.status === 'open').length;

  const sendMutation = useMutation({
    mutationFn: ({ text, attachment }) => base44.entities.SupportChat.create({
      user_email: selectedConversation.userEmail,
      message: text,
      sender_type: 'support',
      conversation_id: selectedConversation.id,
      status: selectedConversation.status,
      attachment_url: attachment || undefined,
    }),
    onSuccess: () => {
      setMessage('');
      queryClient.invalidateQueries({ queryKey: ['supportAdminMessages'] });
    },
  });

  const resolveMutation = useMutation({
    mutationFn: async (convId) => {
      const conv = conversationList.find(c => c.id === convId);
      await Promise.all(conv.messages.map(m => base44.entities.SupportChat.update(m.id, { status: 'resolved' })));
    },
    onSuccess: () => {
      toast.success('Marked as resolved');
      queryClient.invalidateQueries({ queryKey: ['supportAdminMessages'] });
      setSelectedConversation(null);
    },
  });

  const handleSend = () => {
    if (!message.trim() || !selectedConversation) return;
    sendMutation.mutate({ text: message });
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingFile(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      sendMutation.mutate({ text: message || '📎 Attachment', attachment: file_url });
      toast.success('File uploaded');
    } catch { toast.error('Upload failed'); }
    finally { setUploadingFile(false); }
  };

  if (!user) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="flex flex-col h-[calc(100vh-5rem)] max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between py-3 flex-shrink-0">
        <div>
          <h1 className="text-lg font-bold text-foreground">Support</h1>
          <p className="text-muted-foreground text-xs">{openCount} open · {conversationList.length} total</p>
        </div>
        {openCount > 0 && (
          <Badge className="bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 font-mono text-xs">
            {openCount} open
          </Badge>
        )}
      </div>

      {/* Main layout */}
      <div className="flex gap-3 flex-1 min-h-0">

        {/* Sidebar */}
        <div className="w-72 flex-shrink-0 flex flex-col bg-card border border-border rounded-xl overflow-hidden">
          {/* Search */}
          <div className="p-3 border-b border-border">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search conversations…"
                className="pl-8 h-8 text-xs bg-muted border-0 focus-visible:ring-0"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2">
                  <X className="w-3 h-3 text-muted-foreground" />
                </button>
              )}
            </div>
          </div>

          {/* List */}
          <div className="overflow-y-auto flex-1">
            {filtered.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-xs">No conversations</p>
              </div>
            ) : (
              filtered.map(conv => (
                <button
                  key={conv.id}
                  onClick={() => setSelectedConversation(conv)}
                  className={`w-full p-3 text-left border-b border-border/50 transition-colors hover:bg-muted/50 ${
                    selectedConversation?.id === conv.id ? 'bg-green-500/5 border-l-2 border-l-green-500' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold ${
                        conv.status === 'open' ? 'bg-green-500/10 text-green-400' : 'bg-muted text-muted-foreground'
                      }`}>
                        {conv.userEmail[0].toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-foreground truncate">{conv.userEmail.split('@')[0]}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{conv.userEmail.split('@')[1]}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <span className="text-[10px] text-muted-foreground">{formatTime(conv.latestTime)}</span>
                      {conv.unreadCount > 0 && (
                        <span className="w-4 h-4 rounded-full bg-green-500 text-white text-[9px] font-bold flex items-center justify-center">
                          {conv.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="text-[11px] text-muted-foreground truncate mt-1.5 pl-9">{conv.latestMessage}</p>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Chat panel */}
        <div className="flex-1 flex flex-col bg-card border border-border rounded-xl overflow-hidden min-w-0">
          {!selectedConversation ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center text-muted-foreground gap-3">
              <MessageCircle className="w-12 h-12 opacity-20" />
              <div>
                <p className="text-sm font-medium">Select a conversation</p>
                <p className="text-xs opacity-60 mt-0.5">Choose from the list to start replying</p>
              </div>
            </div>
          ) : (
            <>
              {/* Chat header */}
              <div className="px-4 py-3 border-b border-border flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    selectedConversation.status === 'open' ? 'bg-green-500/10 text-green-400' : 'bg-muted text-muted-foreground'
                  }`}>
                    {selectedConversation.userEmail[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{selectedConversation.userEmail}</p>
                    <p className="text-xs text-muted-foreground">{selectedConversation.messages.length} messages</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={`text-[10px] font-mono border ${
                    selectedConversation.status === 'open'
                      ? 'bg-green-500/10 text-green-400 border-green-500/20'
                      : 'bg-muted text-muted-foreground border-border'
                  }`}>
                    {selectedConversation.status}
                  </Badge>
                  {selectedConversation.status === 'open' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => resolveMutation.mutate(selectedConversation.id)}
                      disabled={resolveMutation.isPending}
                      className="h-7 text-xs border-green-500/30 text-green-400 hover:bg-green-500/10"
                    >
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Resolve
                    </Button>
                  )}
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {selectedConversation.messages.map(msg => {
                  const isSupport = msg.sender_type === 'support';
                  return (
                    <div key={msg.id} className={`flex ${isSupport ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[75%] rounded-2xl px-3.5 py-2.5 ${
                        isSupport
                          ? 'bg-green-600 text-white'
                          : 'bg-muted text-foreground'
                      }`}>
                        <p className="text-sm leading-relaxed">{msg.message}</p>
                        {msg.attachment_url && (
                          <a href={msg.attachment_url} target="_blank" rel="noopener noreferrer"
                            className={`text-xs underline mt-1 block ${isSupport ? 'text-green-100' : 'text-muted-foreground'}`}>
                            View attachment ↗
                          </a>
                        )}
                        <p className={`text-[10px] mt-1 ${isSupport ? 'text-green-100/70' : 'text-muted-foreground'}`}>
                          {format(new Date(msg.created_date), 'h:mm a')}
                        </p>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="p-3 border-t border-border flex-shrink-0">
                <div className="flex items-center gap-2">
                  <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileUpload} accept="image/*,.pdf,.doc,.docx" />
                  <Button variant="ghost" size="icon" onClick={() => fileInputRef.current?.click()} disabled={uploadingFile}
                    className="h-8 w-8 text-muted-foreground hover:text-foreground flex-shrink-0">
                    {uploadingFile
                      ? <div className="w-3.5 h-3.5 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
                      : <Paperclip className="w-3.5 h-3.5" />}
                  </Button>
                  <Input
                    placeholder="Type a reply…"
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
                    className="flex-1 h-9 bg-muted border-0 text-sm focus-visible:ring-1 focus-visible:ring-green-500/30"
                  />
                  <Button
                    onClick={handleSend}
                    disabled={!message.trim() || sendMutation.isPending}
                    size="icon"
                    className="h-9 w-9 bg-green-600 hover:bg-green-500 text-white flex-shrink-0"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}