import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, ArrowLeft, Send, Star, ThumbsUp, Bug, Lightbulb, Loader2, CheckCircle2, Paperclip, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

const feedbackTypes = [
  { id: 'feature', label: 'Feature Request', icon: Lightbulb },
  { id: 'bug', label: 'Bug Report', icon: Bug },
  { id: 'praise', label: 'Praise', icon: ThumbsUp },
  { id: 'other', label: 'Other', icon: MessageSquare },
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
        <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to={createPageUrl('Dashboard')}>
          <Button variant="ghost" size="icon" className="text-gray-600 hover:text-gray-900 hover:bg-gray-100">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <MessageSquare className="w-8 h-8 text-green-600" />
            Feedback
          </h1>
          <p className="text-gray-600 mt-1">Help us improve</p>
        </div>
      </div>

      {/* Feedback Form */}
      <Card className="bg-white border-gray-200 shadow-md">
        <CardHeader>
          <CardTitle className="text-gray-900">Share Your Thoughts</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Feedback Type */}
          <div>
            <Label className="text-gray-700 mb-3 block font-medium">What type of feedback?</Label>
            <div className="grid grid-cols-2 gap-3">
              {feedbackTypes.map((type) => {
                const Icon = type.icon;
                return (
                  <motion.button
                    key={type.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setFeedbackType(type.id)}
                    className={`p-4 rounded-lg border-2 ${
                      feedbackType === type.id
                        ? 'border-green-500 bg-green-50'
                        : 'border-gray-200 bg-white hover:bg-gray-50'
                    } flex items-center gap-3 transition-all`}
                  >
                    <Icon className={`w-5 h-5 ${type.color}`} />
                    <span className="text-gray-900 text-sm font-medium">{type.label}</span>
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* Rating */}
          <div>
            <Label className="text-gray-700 mb-3 block font-medium">How would you rate your experience?</Label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  className="p-2 transition-transform hover:scale-110"
                >
                  <Star
                    className={`w-8 h-8 ${
                      star <= rating ? 'text-green-500 fill-green-500' : 'text-gray-300'
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Message */}
          <div>
            <Label className="text-gray-700 mb-3 block font-medium">Tell us more</Label>
            <Textarea
              placeholder="Share your thoughts, suggestions, or report issues..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-400 min-h-[150px] focus:border-green-500 focus:ring-green-500"
            />
          </div>

          {/* Submit */}
          <Button
            className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700 font-semibold shadow-md"
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
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
      <div className="bg-green-50 rounded-lg p-6 border border-green-200 text-center">
        <p className="text-gray-700 text-sm">
          Your feedback helps us build a better ROKI for everyone. As a beta tester, your input is invaluable in shaping the future of this platform.
        </p>
      </div>
    </div>
  );
}