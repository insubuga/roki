import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { Bot, ArrowLeft, Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { motion, AnimatePresence } from 'framer-motion';
import MessageBubble from '../components/chat/MessageBubble';

export default function VantaBot() {
  const [user, setUser] = useState(null);
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await base44.auth.me();
        setUser(userData);
      } catch (e) {
        base44.auth.redirectToLogin();
      }
    };
    loadUser();
  }, []);

  useEffect(() => {
    if (user) {
      initConversation();
    }
  }, [user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const initConversation = async () => {
    try {
      // Try to get existing conversation
      const conversations = await base44.agents.listConversations({ agent_name: 'vantabot' });
      
      if (conversations && conversations.length > 0) {
        const existingConv = await base44.agents.getConversation(conversations[0].id);
        setConversation(existingConv);
        setMessages(existingConv.messages || []);
      } else {
        // Create new conversation
        const newConv = await base44.agents.createConversation({
          agent_name: 'vantabot',
          metadata: { name: 'VantaBot Chat' }
        });
        setConversation(newConv);
        setMessages([{
          role: 'assistant',
          content: "Hey! 👋 I'm VantaBot, your VANTA assistant. I can help you:\n\n• Check your locker status & access code\n• Reorder supplements\n• Schedule laundry pickup\n• Track your deliveries\n• Answer nutrition questions\n\nWhat can I help you with today?"
        }]);
      }
    } catch (e) {
      console.error('Failed to init conversation:', e);
      setMessages([{
        role: 'assistant',
        content: "Hey! 👋 I'm VantaBot, your VANTA assistant. How can I help you today?"
      }]);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    
    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      if (conversation) {
        // Subscribe to updates
        const unsubscribe = base44.agents.subscribeToConversation(conversation.id, (data) => {
          setMessages(data.messages || []);
        });

        await base44.agents.addMessage(conversation, {
          role: 'user',
          content: userMessage
        });

        // Clean up subscription after a delay
        setTimeout(() => unsubscribe(), 30000);
      }
    } catch (e) {
      console.error('Failed to send message:', e);
      // Fallback response
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: "I'm having trouble connecting right now. Please try again in a moment."
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const quickActions = [
    "Check my locker code",
    "What's my laundry status?",
    "Reorder my last supplement",
    "What should I take before legs?",
  ];

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-[#7cfc00] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-4 mb-4">
        <Link to={createPageUrl('Dashboard')}>
          <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-[#7cfc00] to-teal-500 rounded-xl flex items-center justify-center">
            <Bot className="w-6 h-6 text-black" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">VantaBot</h1>
            <p className="text-gray-400 text-sm">AI Assistant</p>
          </div>
        </div>
      </div>

      {/* Chat Container */}
      <div className="flex-1 bg-[#1a2332] rounded-xl border border-gray-800 flex flex-col overflow-hidden">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <AnimatePresence>
            {messages.map((message, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <MessageBubble message={message} />
              </motion.div>
            ))}
          </AnimatePresence>
          {isLoading && (
            <div className="flex items-center gap-2 text-gray-400">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">VantaBot is thinking...</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Actions */}
        {messages.length <= 2 && (
          <div className="p-4 border-t border-gray-800">
            <p className="text-gray-500 text-xs mb-2">Quick actions:</p>
            <div className="flex flex-wrap gap-2">
              {quickActions.map((action) => (
                <button
                  key={action}
                  onClick={() => {
                    setInput(action);
                    setTimeout(() => handleSend(), 100);
                  }}
                  className="px-3 py-1.5 bg-[#0d1320] border border-gray-700 rounded-full text-gray-300 text-sm hover:border-[#7cfc00] hover:text-[#7cfc00] transition-colors"
                >
                  {action}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <div className="p-4 border-t border-gray-800">
          <div className="flex gap-3">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Ask VantaBot anything..."
              className="bg-[#0d1320] border-gray-700 text-white placeholder:text-gray-500"
              disabled={isLoading}
            />
            <Button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="bg-[#7cfc00] text-black hover:bg-[#6be600]"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}