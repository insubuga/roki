import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { Bot, X, Send, Loader2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import ReactMarkdown from 'react-markdown';

export default function FloatingAssistant({ user }) {
  const [isOpen, setIsOpen] = useState(false);
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef(null);
  const unsubscribeRef = useRef(null);
  const location = useLocation();

  const shouldHide = !user || location.pathname.includes('DriverDashboard') || user?.role === 'driver';

  // Subscribe whenever conversation is set
  useEffect(() => {
    if (!conversation) return;
    unsubscribeRef.current = base44.agents.subscribeToConversation(conversation.id, (data) => {
      setMessages([...data.messages]);
      // Stop spinner once agent has replied
      const lastMsg = data.messages[data.messages.length - 1];
      if (lastMsg?.role === 'assistant') {
        setIsSending(false);
      }
    });
    return () => {
      if (unsubscribeRef.current) unsubscribeRef.current();
    };
  }, [conversation?.id]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    }
  }, [messages, isOpen]);

  if (shouldHide) return null;

  const openChat = async () => {
    setIsOpen(true);
    if (!conversation) {
      const conv = await base44.agents.createConversation({
        agent_name: 'rokibot',
        metadata: {
          name: `${user.full_name || user.email} — Roki Session`,
          user_email: user.email,
          user_name: user.full_name || '',
          user_role: user.role || 'user',
        },
      });
      setConversation(conv);
      setMessages(conv.messages || []);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isSending || !conversation) return;
    const text = input.trim();
    setInput('');
    setIsSending(true);
    // Optimistically show user message
    setMessages(prev => [...prev, { role: 'user', content: text }]);
    await base44.agents.addMessage(conversation, { role: 'user', content: text });
  };

  return (
    <>
      {/* Floating Button */}
      <motion.div
        className="fixed bottom-20 md:bottom-8 right-4 z-40"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
      >
        <Button
          onClick={isOpen ? () => setIsOpen(false) : openChat}
          className="h-14 w-14 rounded-full bg-gradient-to-br from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 shadow-xl transition-all"
        >
          {isOpen ? <X className="w-6 h-6 text-white" /> : <Bot className="w-6 h-6 text-white" />}
        </Button>
      </motion.div>

      {/* Chat Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-36 md:bottom-28 right-4 z-40 w-[340px] max-w-[calc(100vw-2rem)] h-[480px] bg-card border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-green-600 to-green-700 px-4 py-3 flex items-center gap-3">
              <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-white font-bold text-sm font-mono">ROKIBOT</p>
                <p className="text-green-100 text-xs">Operations Assistant</p>
              </div>
              <button
                onClick={() => {
                  setConversation(null);
                  setMessages([]);
                }}
                className="text-white/70 hover:text-white transition-colors p-1 rounded"
                title="Clear chat"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-background">
              {messages.length === 0 && !isSending && (
                <div className="flex flex-col items-center justify-center h-full text-center px-4">
                  <Bot className="w-10 h-10 text-muted-foreground mb-3" />
                  <p className="text-muted-foreground text-sm font-mono">Ready. Ask about your cycle, locker, or subscription.</p>
                </div>
              )}
              {messages.map((msg, i) => {
                if (!msg.content) return null;
                const isUser = msg.role === 'user';
                return (
                  <div key={i} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                      isUser ? 'bg-green-600 text-white' : 'bg-muted text-foreground'
                    }`}>
                      {isUser ? (
                        <p>{msg.content}</p>
                      ) : (
                        <ReactMarkdown className="prose prose-sm max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                          {msg.content}
                        </ReactMarkdown>
                      )}
                    </div>
                  </div>
                );
              })}
              {isSending && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-2xl px-3 py-2">
                    <Loader2 className="w-4 h-4 text-muted-foreground animate-spin" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="border-t border-border p-3 bg-card flex gap-2">
              <input
                className="flex-1 bg-muted border-0 rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none font-mono"
                placeholder="Ask RokiBot..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                disabled={!conversation || isSending}
              />
              <Button
                size="icon"
                className="bg-green-600 hover:bg-green-700 h-9 w-9 rounded-lg"
                onClick={handleSend}
                disabled={!input.trim() || isSending || !conversation}
              >
                <Send className="w-4 h-4 text-white" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}