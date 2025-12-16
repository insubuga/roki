import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { Users, ArrowLeft, MessageCircle, Heart, Share2, Trophy, Flame } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';

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

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-[#7cfc00] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to={createPageUrl('Dashboard')}>
          <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Users className="w-8 h-8 text-pink-500" />
            Community
          </h1>
          <p className="text-gray-400 mt-1">Connect & share</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Feed */}
        <div className="lg:col-span-2 space-y-4">
          {mockPosts.map((post) => (
            <motion.div
              key={post.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="bg-[#1a2332] border-gray-800">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <Avatar className="h-12 w-12 bg-gradient-to-br from-[#7cfc00] to-teal-500">
                      <AvatarFallback className="text-black font-bold">{post.avatar}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-white font-semibold">{post.author}</p>
                        <Badge className="bg-purple-500/20 text-purple-400 border-none text-xs">
                          {post.badge}
                        </Badge>
                      </div>
                      <p className="text-gray-500 text-sm">{post.time}</p>
                      <p className="text-gray-300 mt-3">{post.content}</p>
                      <div className="flex items-center gap-6 mt-4">
                        <button className="flex items-center gap-2 text-gray-400 hover:text-pink-500 transition-colors">
                          <Heart className="w-5 h-5" />
                          <span className="text-sm">{post.likes}</span>
                        </button>
                        <button className="flex items-center gap-2 text-gray-400 hover:text-blue-400 transition-colors">
                          <MessageCircle className="w-5 h-5" />
                          <span className="text-sm">{post.comments}</span>
                        </button>
                        <button className="flex items-center gap-2 text-gray-400 hover:text-[#7cfc00] transition-colors">
                          <Share2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Leaderboard */}
          <Card className="bg-[#1a2332] border-gray-800">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Trophy className="w-5 h-5 text-amber-500" />
                <h3 className="text-white font-bold">Weekly Leaderboard</h3>
              </div>
              <div className="space-y-3">
                {leaderboard.map((member, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      idx === 0 ? 'bg-amber-500 text-black' :
                      idx === 1 ? 'bg-gray-400 text-black' :
                      idx === 2 ? 'bg-amber-700 text-white' :
                      'bg-gray-700 text-gray-400'
                    }`}>
                      {idx + 1}
                    </div>
                    <div className="flex-1">
                      <p className="text-white text-sm font-medium">{member.name}</p>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-400 text-xs">{member.points} pts</span>
                        <span className="text-orange-400 text-xs flex items-center gap-1">
                          <Flame className="w-3 h-3" />
                          {member.streak} day streak
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card className="bg-[#1a2332] border-gray-800">
            <CardContent className="p-6">
              <h3 className="text-white font-bold mb-4">Community Stats</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-[#7cfc00]">12.4K</p>
                  <p className="text-gray-400 text-sm">Members</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-[#7cfc00]">847</p>
                  <p className="text-gray-400 text-sm">Active Today</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}