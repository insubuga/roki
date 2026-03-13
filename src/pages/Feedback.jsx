import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, ArrowLeft, Send, Star, ThumbsUp, Bug, Lightbulb, Loader2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  const [submitted, setSubmitted] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await base44.auth.me();
        setUser(userData);
      } catch (e) {
        navigate('/Configuration');
      }
    };
    loadUser();
  }, [navigate]);

  const handleSubmit = async () => {
    if (!message.trim()) {
      toast.error('Please enter your feedback');
      return;
    }
    setIsSubmitting(true);
    try {
      await base44.entities.Feedback.create({
        user_email: user.email,
        type: feedbackType,
        rating: rating || null,
        message: message.trim(),
        status: 'new',
      });
      setSubmitted(true);
      setTimeout(() => {
        navigate('/Configuration');
      }, 2500);
    } catch (error) {
      toast.error('Failed to submit feedback');
      setIsSubmitting(false);
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (submitted) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="min-h-screen flex items-center justify-center px-4"
      >
        <div className="text-center max-w-md">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-6"
          >
            <CheckCircle2 className="w-10 h-10 text-white" />
          </motion.div>
          <h2 className="text-2xl font-bold text-foreground font-mono mb-2">THANK YOU</h2>
          <p className="text-muted-foreground font-mono text-sm mb-4">
            Your feedback has been recorded. We'll review it and use it to improve ROKI.
          </p>
          <p className="text-muted-foreground font-mono text-xs">Redirecting...</p>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/Configuration')} className="text-muted-foreground hover:text-foreground -ml-2">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-foreground text-xl font-bold font-mono uppercase tracking-tight">Feedback</h1>
          <p className="text-muted-foreground text-xs font-mono mt-0.5">Help us improve ROKI</p>
        </div>
      </div>

      {/* Feedback Form */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-foreground font-mono text-sm uppercase">Share Your Thoughts</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Feedback Type */}
          <div>
            <Label className="text-muted-foreground font-mono text-xs uppercase mb-3 block">Type</Label>
            <div className="grid grid-cols-2 gap-3">
              {feedbackTypes.map((type) => {
                const Icon = type.icon;
                return (
                  <motion.button
                    key={type.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setFeedbackType(type.id)}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      feedbackType === type.id
                        ? 'border-green-600 bg-green-600/10'
                        : 'border-border bg-muted hover:bg-muted/80'
                    }`}
                  >
                    <Icon className="w-5 h-5 text-green-600 mb-2" />
                    <span className="text-foreground text-xs font-mono font-medium block">{type.label}</span>
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* Rating */}
          <div>
            <Label className="text-muted-foreground font-mono text-xs uppercase mb-3 block">Experience Rating</Label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  className="p-2 transition-transform hover:scale-110"
                  aria-label={`Rate ${star} stars`}
                >
                  <Star
                    className={`w-8 h-8 ${
                      star <= rating ? 'text-green-600 fill-green-600' : 'text-muted-foreground'
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Message */}
          <div>
            <Label className="text-muted-foreground font-mono text-xs uppercase mb-3 block">Message</Label>
            <Textarea
              placeholder="Share your thoughts, suggestions, or report issues..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="bg-muted border-border text-foreground placeholder:text-muted-foreground min-h-[150px] focus-visible:ring-green-600"
            />
            <p className="text-muted-foreground font-mono text-xs mt-2">{message.length} / 5000 characters</p>
          </div>

          {/* Submit */}
          <Button
            className="w-full bg-green-600 hover:bg-green-700 text-white font-mono font-bold"
            onClick={handleSubmit}
            disabled={isSubmitting || !message.trim()}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                SUBMITTING...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                SUBMIT FEEDBACK
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Info Banner */}
      <Card className="bg-green-600/10 border-green-600/30">
        <CardContent className="p-4">
          <p className="text-muted-foreground font-mono text-xs">
            💡 Your feedback helps shape ROKI. We review every submission and prioritize features based on user demand.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}