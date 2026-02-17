import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Users, MessageCircle, Heart, Share2, Trophy, Flame, TrendingUp, Award } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { motion } from 'framer-motion';
import MobileHeader from '@/components/mobile/MobileHeader';
import PullToRefresh from '@/components/mobile/PullToRefresh';
import { useQueryClient } from '@tanstack/react-query';

const mockPosts = [
  {
    id: 1,
    author: 'Mike Johnson',
    avatar: 'MJ',
    time: '2 hours ago',
    content: 'Just crushed a new PR on deadlifts! 💪 The pre-workout from VANTA really helped push through that last rep.',
    likes: 24,
    comments: 8,
    badge: 'Elite Member',
  },
  {
    id: 2,
    author: 'Sarah Chen',
    avatar: 'SC',
    time: '4 hours ago',
    content: 'Love the laundry service! Fresh gym clothes waiting for me every morning makes such a difference. ✨',
    likes: 18,
    comments: 5,
    badge: 'Pro Member',
  },
  {
    id: 3,
    author: 'David Park',
    avatar: 'DP',
    time: '6 hours ago',
    content: 'Rush delivery saved my leg day! Forgot my creatine at home but had it delivered to my gym locker in 25 minutes 🚀',
    likes: 32,
    comments: 12,
    badge: 'Elite Member',
  },
];

const leaderboard = [
  { name: 'Alex Thompson', points: 2840, streak: 45 },
  { name: 'Maria Garcia', points: 2650, streak: 38 },
  { name: 'James Wilson', points: 2420, streak: 32 },
  { name: 'Emma Davis', points: 2180, streak: 28 },
  { name: 'Chris Lee', points: 1950, streak: 21 },
];

export default function Community() {
  const [user, setUser] = useState(null);
  const [likedPosts, setLikedPosts] = useState(new Set());
  const queryClient = useQueryClient();

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

  const handleRefresh = async () => {
    await queryClient.invalidateQueries();
  };

  const handleLike = (postId) => {
    setLikedPosts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(postId)) {
        newSet.delete(postId);
      } else {
        newSet.add(postId);
      }
      return newSet;
    });
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-[#7cfc00] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="space-y-6">
        <MobileHeader 
          title="Community" 
          subtitle="Connect with fellow VANTA members"
          icon={Users}
          iconColor="text-pink-500"
        />

        {/* Tabs */}
        <Tabs defaultValue="feed" className="w-full">
          <TabsList className="w-full bg-[var(--color-bg-card)] border border-[var(--color-border)] mb-6">
            <TabsTrigger value="feed" className="flex-1">
              <TrendingUp className="w-4 h-4 mr-2" />
              Feed
            </TabsTrigger>
            <TabsTrigger value="leaderboard" className="flex-1">
              <Trophy className="w-4 h-4 mr-2" />
              Leaderboard
            </TabsTrigger>
          </TabsList>

          <TabsContent value="feed" className="space-y-4">
            {mockPosts.map((post) => (
              <motion.div
                key={post.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card className="bg-[var(--color-bg-card)] border-[var(--color-border)]">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <Avatar className="h-12 w-12 bg-gradient-to-br from-[var(--color-primary)] to-teal-500">
                        <AvatarFallback className="text-black font-bold">{post.avatar}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-[var(--color-text-primary)] font-semibold">{post.author}</p>
                          <Badge className="bg-purple-500/20 text-purple-400 border-none text-xs">
                            {post.badge}
                          </Badge>
                        </div>
                        <p className="text-[var(--color-text-muted)] text-sm">{post.time}</p>
                        <p className="text-[var(--color-text-secondary)] mt-3">{post.content}</p>
                        <div className="flex items-center gap-6 mt-4">
                          <button 
                            onClick={() => handleLike(post.id)}
                            className={`flex items-center gap-2 transition-colors ${
                              likedPosts.has(post.id) 
                                ? 'text-pink-500' 
                                : 'text-[var(--color-text-muted)] hover:text-pink-500'
                            }`}
                          >
                            <Heart className={`w-5 h-5 ${likedPosts.has(post.id) ? 'fill-pink-500' : ''}`} />
                            <span className="text-sm">{post.likes + (likedPosts.has(post.id) ? 1 : 0)}</span>
                          </button>
                          <button className="flex items-center gap-2 text-[var(--color-text-muted)] hover:text-blue-400 transition-colors">
                            <MessageCircle className="w-5 h-5" />
                            <span className="text-sm">{post.comments}</span>
                          </button>
                          <button className="flex items-center gap-2 text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-colors">
                            <Share2 className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </TabsContent>

          <TabsContent value="leaderboard" className="space-y-6">
            {/* Your Rank */}
            <Card className="bg-gradient-to-br from-[var(--color-primary)]/20 to-purple-500/20 border-[var(--color-primary)]">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-14 w-14 bg-gradient-to-br from-[var(--color-primary)] to-teal-500">
                      <AvatarFallback className="text-black font-bold text-lg">
                        {user?.full_name?.split(' ').map(n => n[0]).join('') || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-[var(--color-text-primary)] font-bold">Your Rank</p>
                      <p className="text-[var(--color-text-secondary)] text-sm">Keep pushing!</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-bold text-[var(--color-primary)]">#12</p>
                    <p className="text-[var(--color-text-secondary)] text-sm">1,840 pts</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Top Members */}
            <Card className="bg-[var(--color-bg-card)] border-[var(--color-border)]">
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Trophy className="w-5 h-5 text-amber-500" />
                  <h3 className="text-[var(--color-text-primary)] font-bold">Top Members</h3>
                </div>
                <div className="space-y-4">
                  {leaderboard.map((member, idx) => (
                    <div key={idx} className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
                        idx === 0 ? 'bg-amber-500 text-black' :
                        idx === 1 ? 'bg-gray-400 text-black' :
                        idx === 2 ? 'bg-amber-700 text-white' :
                        'bg-[var(--color-bg-secondary)] text-[var(--color-text-muted)]'
                      }`}>
                        {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                      </div>
                      <Avatar className="h-10 w-10 bg-gradient-to-br from-[var(--color-primary)] to-teal-500">
                        <AvatarFallback className="text-black font-bold text-sm">
                          {member.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="text-[var(--color-text-primary)] font-medium">{member.name}</p>
                        <div className="flex items-center gap-3">
                          <span className="text-[var(--color-text-secondary)] text-sm flex items-center gap-1">
                            <Award className="w-3 h-3" />
                            {member.points} pts
                          </span>
                          <span className="text-orange-400 text-sm flex items-center gap-1">
                            <Flame className="w-3 h-3" />
                            {member.streak}d
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Community Stats */}
            <Card className="bg-[var(--color-bg-card)] border-[var(--color-border)]">
              <CardContent className="p-6">
                <h3 className="text-[var(--color-text-primary)] font-bold mb-4">Community Stats</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-[var(--color-bg-secondary)] rounded-lg">
                    <p className="text-3xl font-bold text-[var(--color-primary)]">12.4K</p>
                    <p className="text-[var(--color-text-secondary)] text-sm mt-1">Total Members</p>
                  </div>
                  <div className="text-center p-4 bg-[var(--color-bg-secondary)] rounded-lg">
                    <p className="text-3xl font-bold text-[var(--color-primary)]">847</p>
                    <p className="text-[var(--color-text-secondary)] text-sm mt-1">Active Today</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

      </div>
    </PullToRefresh>
  );
}