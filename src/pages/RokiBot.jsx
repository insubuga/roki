import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { Bot, ArrowLeft, Send, Loader2, Activity, Heart, TrendingUp, Zap, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';
import MessageBubble from '../components/chat/MessageBubble';

export default function RokiBot() {
  const [user, setUser] = useState(null);
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showInsights, setShowInsights] = useState(true);
  const messagesEndRef = useRef(null);

  const { data: wearableData } = useQuery({
    queryKey: ['wearableData', user?.email],
    queryFn: async () => {
      const data = await base44.entities.WearableData.filter({ user_email: user?.email }, '-created_date', 1);
      return data[0] || null;
    },
    enabled: !!user?.email,
    refetchInterval: 30000,
  });

  const { data: subscription } = useQuery({
    queryKey: ['subscription', user?.email],
    queryFn: async () => {
      const subs = await base44.entities.Subscription.filter({ user_email: user?.email });
      return subs[0];
    },
    enabled: !!user?.email,
  });

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

  // Handle query parameter for pre-filled questions
  useEffect(() => {
    if (!conversation || messages.length === 0) return;
    
    const urlParams = new URLSearchParams(window.location.search);
    const queryQuestion = urlParams.get('q');
    
    if (queryQuestion) {
      window.history.replaceState({}, '', window.location.pathname);
      
      setTimeout(() => {
        if (queryQuestion.trim() && !isLoading) {
          setInput('');
          setIsLoading(true);
          
          const unsubscribe = base44.agents.subscribeToConversation(conversation.id, (data) => {
            setMessages(data.messages || []);
            setIsLoading(false);
          });

          base44.agents.addMessage(conversation, {
            role: 'user',
            content: queryQuestion
          }).catch(() => {
            setIsLoading(false);
          });
          
          setTimeout(() => unsubscribe(), 10000);
        }
      }, 500);
    }
  }, [conversation, messages.length]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const initConversation = async () => {
    try {
      // Try to get existing conversation
      const conversations = await base44.agents.listConversations({ agent_name: 'rokibot' });
      
      if (conversations && conversations.length > 0) {
        const existingConv = await base44.agents.getConversation(conversations[0].id);
        setConversation(existingConv);
        setMessages(existingConv.messages || []);
      } else {
        // Create new conversation
        const newConv = await base44.agents.createConversation({
          agent_name: 'rokibot',
          metadata: { name: 'RokiBot Chat' }
        });
        setConversation(newConv);
        setMessages([{
          role: 'assistant',
          content: "Hey! 👋 I'm RokiBot, your ROKI assistant. I can help you:\n\n• Check your locker status & access code\n• Reorder supplements\n• Schedule laundry pickup\n• Track your deliveries\n• Answer nutrition questions\n\nWhat can I help you with today?"
        }]);
      }
    } catch (e) {
      console.error('Failed to init conversation:', e);
      setMessages([{
        role: 'assistant',
        content: "Hey! 👋 I'm RokiBot, your ROKI assistant. How can I help you today?"
      }]);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    
    const userMessage = input.trim();
    setInput('');
    setIsLoading(true);

    try {
      if (conversation) {
        // Subscribe to updates before sending
        const unsubscribe = base44.agents.subscribeToConversation(conversation.id, (data) => {
          setMessages(data.messages || []);
          setIsLoading(false);
        });

        await base44.agents.addMessage(conversation, {
          role: 'user',
          content: userMessage
        });

        // Clean up subscription after response is complete
        setTimeout(() => {
          unsubscribe();
          setIsLoading(false);
        }, 10000);
      }
    } catch (e) {
      console.error('Failed to send message:', e);
      setIsLoading(false);
    }
  };

  // Generate smart quick actions based on wearable data
  const getSmartQuickActions = () => {
    if (!wearableData) {
      return [
        "Check my locker code",
        "What's my laundry status?",
        "Reorder my last supplement",
        "What should I take before legs?",
      ];
    }

    const actions = [];
    
    // High heart rate
    if (wearableData.heart_rate > 85) {
      actions.push("My heart rate is elevated, what should I do?");
    }
    
    // High activity
    if (wearableData.steps > 8000 || wearableData.active_minutes > 60) {
      actions.push("I've been very active today, any nutrition tips?");
    }
    
    // Low recovery
    if (wearableData.recovery_score < 75) {
      actions.push("My recovery score is low, what can help?");
    }
    
    // Workout-specific
    if (wearableData.workout_type) {
      actions.push(`What supplements for ${wearableData.workout_type} day?`);
    }
    
    // Add defaults if not enough smart suggestions
    if (actions.length < 3) {
      actions.push("Upgrade my subscription");
      actions.push("Check my locker code");
    }
    
    return actions.slice(0, 4);
  };

  const quickActions = getSmartQuickActions();

  // Generate proactive insights
  const getProactiveInsights = () => {
    if (!wearableData) return [];
    
    const insights = [];
    
    if (wearableData.heart_rate > 90) {
      insights.push({
        type: 'warning',
        icon: AlertCircle,
        color: 'text-orange-500',
        title: 'Heart Rate Elevated',
        message: 'Hydration recommended. Electrolytes available at shop.',
      });
    }
    
    if (wearableData.steps > 10000) {
      insights.push({
        type: 'success',
        icon: TrendingUp,
        color: 'text-green-500',
        title: 'High Activity Detected',
        message: 'Extra protein may support recovery.',
      });
    }
    
    if (wearableData.recovery_score < 70) {
      insights.push({
        type: 'info',
        icon: Activity,
        color: 'text-blue-500',
        title: 'Recovery Low',
        message: 'Lighter training or recovery support recommended.',
      });
    }
    
    if (wearableData.hydration_level === 'low') {
      insights.push({
        type: 'warning',
        icon: Zap,
        color: 'text-cyan-500',
        title: 'Hydration Low',
        message: 'Electrolytes ready when you are.',
      });
    }

    if (wearableData.sleep_hours && wearableData.sleep_hours < 6) {
      insights.push({
        type: 'info',
        icon: Activity,
        color: 'text-indigo-500',
        title: 'Low Sleep Detected',
        message: 'Recovery focus recommended. Magnesium available.',
      });
    }
    
    return insights;
  };

  const proactiveInsights = getProactiveInsights();

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
          <Button variant="ghost" size="icon" className="text-gray-600 hover:text-gray-900">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-md">
            <Bot className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">RokiBot</h1>
            <p className="text-gray-600 text-sm">AI Assistant</p>
          </div>
        </div>
      </div>

      {/* Proactive Insights */}
      {showInsights && proactiveInsights.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid md:grid-cols-2 gap-3 mb-4"
        >
          {proactiveInsights.map((insight, idx) => {
            const Icon = insight.icon;
            return (
              <Card key={idx} className="bg-white border-gray-200 shadow-md">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={`${insight.color} mt-1`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <p className="text-gray-900 font-semibold text-sm">{insight.title}</p>
                      <p className="text-gray-600 text-xs mt-1">{insight.message}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </motion.div>
      )}

      {/* Wearable Stats Summary */}
      {wearableData && (
        <Card className="bg-white border-gray-200 shadow-lg mb-4">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-gray-900 font-semibold text-sm">Your Current Stats</h3>
              <Badge className="bg-green-100 text-green-700 border-green-300 text-xs">Live</Badge>
            </div>
            <div className="grid grid-cols-4 gap-3">
              <div className="text-center">
                <Heart className="w-4 h-4 text-red-500 mx-auto mb-1" />
                <p className="text-gray-900 font-bold text-sm">{wearableData.heart_rate}</p>
                <p className="text-gray-600 text-xs">BPM</p>
              </div>
              <div className="text-center">
                <Activity className="w-4 h-4 text-blue-500 mx-auto mb-1" />
                <p className="text-gray-900 font-bold text-sm">{wearableData.steps}</p>
                <p className="text-gray-600 text-xs">Steps</p>
              </div>
              <div className="text-center">
                <Zap className="w-4 h-4 text-amber-500 mx-auto mb-1" />
                <p className="text-gray-900 font-bold text-sm">{wearableData.calories_burned}</p>
                <p className="text-gray-600 text-xs">Cal</p>
              </div>
              <div className="text-center">
                <TrendingUp className="w-4 h-4 text-green-500 mx-auto mb-1" />
                <p className="text-gray-900 font-bold text-sm">{wearableData.recovery_score}</p>
                <p className="text-gray-600 text-xs">Recovery</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Chat Container */}
      <div className="flex-1 bg-white rounded-xl border border-gray-200 shadow-lg flex flex-col overflow-hidden">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <AnimatePresence mode="popLayout">
            {messages.map((message, idx) => (
              <motion.div
                key={`${idx}-${message.role}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
              >
                <MessageBubble message={message} />
              </motion.div>
            ))}
            {isLoading && messages.length > 0 && messages[messages.length - 1]?.role === 'user' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-2 text-gray-600"
              >
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">RokiBot is thinking...</span>
              </motion.div>
            )}
          </AnimatePresence>
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Actions */}
        {messages.length <= 2 && (
          <div className="p-4 border-t border-gray-200">
            <p className="text-gray-600 text-xs mb-2">
              {wearableData ? 'Based on your current state:' : 'Common tasks:'}
            </p>
            <div className="flex flex-wrap gap-2">
              {quickActions.map((action) => (
                <button
                  key={action}
                  onClick={() => {
                    setInput(action);
                    setTimeout(() => handleSend(), 100);
                  }}
                  className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-full text-gray-700 text-sm hover:border-green-500 hover:bg-green-50 hover:text-green-700 transition-colors shadow-sm"
                >
                  {action}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <div className="p-4 border-t border-gray-200">
          <div className="flex gap-3">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Ask RokiBot anything..."
              className="bg-gray-50 border-gray-300 text-gray-900 placeholder:text-gray-500 focus:ring-2 focus:ring-green-500"
              disabled={isLoading}
            />
            <Button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700 shadow-md"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}