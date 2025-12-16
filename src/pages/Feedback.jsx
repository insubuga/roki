import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { MessageSquare, ArrowLeft, Send, Star, ThumbsUp, Bug, Lightbulb } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

const feedbackTypes = [
  { id: 'feature', label: 'Feature Request', icon: Lightbulb, color: 'text-amber-500' },
  { id: 'bug', label: 'Bug Report', icon: Bug, color: 'text-red-500' },
  { id: 'praise', label: 'Praise', icon: ThumbsUp, color: 'text-green-500' },
  { id: 'other', label: 'Other', icon: MessageSquare, color: 'text-blue-500' },
];

export default function Feedback() {
  const [user, setUser] = useState(null);
  const [feedbackType, setFeedbackType] = useState('feature');
  const [message, setMessage] = useState('');
  const [rating, setRating] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const handleSubmit = async () => {
    if (!message.trim()) {
      toast.error('Please enter your feedback');
      return;
    }
    setIsSubmitting(true);
    // Simulate submission
    await new Promise(resolve => setTimeout(resolve, 1000));
    toast.success('Thank you for your feedback!');
    setMessage('');
    setRating(0);
    setIsSubmitting(false);
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-[#7cfc00] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to={createPageUrl('Dashboard')}>
          <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <MessageSquare className="w-8 h-8 text-orange-500" />
            Beta Feedback
          </h1>
          <p className="text-gray-400 mt-1">Help us improve</p>
        </div>
      </div>

      {/* Feedback Form */}
      <Card className="bg-[#1a2332] border-gray-800">
        <CardHeader>
          <CardTitle className="text-white">Share Your Thoughts</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Feedback Type */}
          <div>
            <Label className="text-gray-400 mb-3 block">What type of feedback?</Label>
            <div className="grid grid-cols-2 gap-3">
              {feedbackTypes.map((type) => {
                const Icon = type.icon;
                return (
                  <motion.button
                    key={type.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setFeedbackType(type.id)}
                    className={`p-4 rounded-lg border ${
                      feedbackType === type.id
                        ? 'border-[#7cfc00] bg-[#7cfc00]/10'
                        : 'border-gray-700 bg-[#0d1320]'
                    } flex items-center gap-3 transition-all`}
                  >
                    <Icon className={`w-5 h-5 ${type.color}`} />
                    <span className="text-white text-sm">{type.label}</span>
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* Rating */}
          <div>
            <Label className="text-gray-400 mb-3 block">How would you rate your experience?</Label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  className="p-2 transition-transform hover:scale-110"
                >
                  <Star
                    className={`w-8 h-8 ${
                      star <= rating ? 'text-amber-500 fill-amber-500' : 'text-gray-600'
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Message */}
          <div>
            <Label className="text-gray-400 mb-3 block">Tell us more</Label>
            <Textarea
              placeholder="Share your thoughts, suggestions, or report issues..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="bg-[#0d1320] border-gray-700 text-white placeholder:text-gray-500 min-h-[150px]"
            />
          </div>

          {/* Submit */}
          <Button
            className="w-full bg-[#7cfc00] text-black hover:bg-[#6be600] font-semibold"
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Submit Feedback
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Info */}
      <div className="bg-[#1a2332]/50 rounded-lg p-6 border border-gray-800 text-center">
        <p className="text-gray-400 text-sm">
          Your feedback helps us build a better VANTA for everyone. As a beta tester, your input is invaluable in shaping the future of this platform.
        </p>
      </div>
    </div>
  );
}