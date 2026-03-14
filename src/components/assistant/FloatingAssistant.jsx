import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { Bot, X, Send, Trash2, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import ReactMarkdown from 'react-markdown';

const QUICK_ACTIONS = [
  { label: 'My cycle status', prompt: 'What is my current cycle status?' },
  { label: 'Locker & access code', prompt: 'What is my locker number and access code?' },
  { label: 'Subscription details', prompt: 'Show me my subscription plan and credits.' },
  { label: 'Next pickup schedule', prompt: 'When is my next scheduled pickup?' },
];

function TypingIndicator() {
  return (
    <div className="flex justify-start items-end gap-2">
      <div className="w-6 h-6 bg-green-600 rounded-full flex items-center justify-center flex-shrink-0">
        <Bot className="w-3 h-3 text-white" />
      </div>
      <div className="bg-muted rounded-2xl rounded-bl-sm px-4 py-3 flex gap-1 items-center">
        {[0, 1, 2].map(i => (
          <motion.div
            key={i}
            className="w-2 h-2 bg-muted-foreground rounded-full"
            animate={{ y: [0, -4, 0] }}
            transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
          />
        ))}
      </div>
    </div>
  );
}

const CONV_STORAGE_KEY = (email) => `rokibot_conv_${email}`;

export default function FloatingAssistant({ user }) {
  const [isOpen, setIsOpen] = useState(false);
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef(null);
  const unsubscribeRef = useRef(null);
  const inputRef = useRef(null);
  const location = useLocation();

  const shouldHide = !user || location.pathname.includes('DriverDashboard') || user?.role === 'driver';

  useEffect(() => {
    if (!conversation) return;
    unsubscribeRef.current = base44.agents.subscribeToConversation(conversation.id, (data) => {
      setMessages([...data.messages]);
      const lastMsg = data.messages[data.messages.length - 1];
      if (lastMsg?.role === 'assistant') setIsSending(false);
    });
    return () => { if (unsubscribeRef.current) unsubscribeRef.current(); };
  }, [conversation?.id]);

  useEffect(() => {
    if (isOpen) setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
  }, [messages, isOpen]);

  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 300);
  }, [isOpen]);

  if (shouldHide) return null;

  const openChat = async () => {
    setIsOpen(true);
    if (!conversation) {
      // Try to restore previous session from localStorage
      const storedId = user?.email ? localStorage.getItem(CONV_STORAGE_KEY(user.email)) : null;
      if (storedId) {
        try {
          const existing = await base44.agents.getConversation(storedId);
          if (existing?.id) {
            setConversation(existing);
            setMessages(existing.messages || []);
            return;
          }
        } catch (_) {
          localStorage.removeItem(CONV_STORAGE_KEY(user.email));
        }
      }
      const conv = await base44.agents.createConversation({
        agent_name: 'rokibot',
        metadata: {
          name: `${user.full_name || user.email} — Roki Session`,
          user_email: user.email,
          user_name: user.full_name || '',
          user_role: user.role || 'user',
        },
      });
      if (user?.email) localStorage.setItem(CONV_STORAGE_KEY(user.email), conv.id);
      setConversation(conv);
      setMessages(conv.messages || []);
    }
  };

  const handleSend = async (text) => {
    const msg = (text || input).trim();
    if (!msg || isSending || !conversation) return;
    setInput('');
    setIsSending(true);
    setMessages(prev => [...prev, { role: 'user', content: msg }]);
    await base44.agents.addMessage(conversation, { role: 'user', content: msg });
  };

  const handleClear = () => {
    if (user?.email) localStorage.removeItem(CONV_STORAGE_KEY(user.email));
    setConversation(null);
    setMessages([]);
  };

  const firstName = user?.full_name?.split(' ')[0] || 'there';
  const hasMessages = messages.filter(m => m.content).length > 0;

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
          className="h-14 w-14 rounded-full bg-gradient-to-br from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 shadow-xl transition-all relative"
        >
          <AnimatePresence mode="wait">
            {isOpen ? (
              <motion.div key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }}>
                <X className="w-6 h-6 text-white" />
              </motion.div>
            ) : (
              <motion.div key="open" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.15 }}>
                <Bot className="w-6 h-6 text-white" />
              </motion.div>
            )}
          </AnimatePresence>
        </Button>
      </motion.div>

      {/* Chat Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.93 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.93 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="fixed bottom-36 md:bottom-28 right-4 z-40 w-[360px] max-w-[calc(100vw-2rem)] h-[520px] bg-card border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-green-600 to-green-700 px-4 py-3 flex items-center gap-3 flex-shrink-0">
              <div className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-white font-bold text-sm tracking-wide">ROKIBOT</p>
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 bg-green-300 rounded-full animate-pulse" />
                  <p className="text-green-100 text-xs">Operations Assistant</p>
                </div>
              </div>
              {hasMessages && (
                <button
                  onClick={handleClear}
                  className="text-white/60 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/10"
                  title="Clear chat"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-background">
              {/* Empty state */}
              {!hasMessages && !isSending && (
                <div className="flex flex-col h-full">
                  <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
                    <div className="w-14 h-14 bg-green-50 rounded-2xl flex items-center justify-center mb-3">
                      <Zap className="w-7 h-7 text-green-600" />
                    </div>
                    <p className="text-foreground font-semibold text-sm mb-1">Hey {firstName} 👋</p>
                    <p className="text-muted-foreground text-xs leading-relaxed">
                      I have full access to your account. Ask me anything about your cycle, locker, subscription, or schedule.
                    </p>
                  </div>
                  {/* Quick action chips */}
                  <div className="grid grid-cols-2 gap-2 pb-1">
                    {QUICK_ACTIONS.map((action) => (
                      <button
                        key={action.label}
                        onClick={() => handleSend(action.prompt)}
                        disabled={!conversation}
                        className="text-left text-xs bg-muted hover:bg-accent border border-border rounded-xl px-3 py-2.5 text-foreground transition-colors leading-snug disabled:opacity-40"
                      >
                        {action.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Messages */}
              {messages.map((msg, i) => {
                if (!msg.content) return null;
                const isUser = msg.role === 'user';
                return (
                  <div key={i} className={`flex items-end gap-2 ${isUser ? 'justify-end' : 'justify-start'}`}>
                    {!isUser && (
                      <div className="w-6 h-6 bg-green-600 rounded-full flex items-center justify-center flex-shrink-0 mb-0.5">
                        <Bot className="w-3 h-3 text-white" />
                      </div>
                    )}
                    <div className={`max-w-[82%] rounded-2xl px-3 py-2 text-sm ${
                      isUser
                        ? 'bg-green-600 text-white rounded-br-sm'
                        : 'bg-muted text-foreground rounded-bl-sm'
                    }`}>
                      {isUser ? (
                        <p className="leading-relaxed">{msg.content}</p>
                      ) : (
                        <ReactMarkdown className="prose prose-sm max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 prose-p:leading-relaxed">
                          {msg.content}
                        </ReactMarkdown>
                      )}
                    </div>
                  </div>
                );
              })}

              {isSending && <TypingIndicator />}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="border-t border-border p-3 bg-card flex gap-2 flex-shrink-0">
              <input
                ref={inputRef}
                className="flex-1 bg-muted border-0 rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none"
                placeholder="Ask RokiBot..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                disabled={!conversation || isSending}
              />
              <Button
                size="icon"
                className="bg-green-600 hover:bg-green-700 h-10 w-10 rounded-xl flex-shrink-0"
                onClick={() => handleSend()}
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