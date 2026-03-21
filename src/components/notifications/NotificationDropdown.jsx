import React, { useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, X, Bot, CreditCard, Activity, Shirt, Truck, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../../utils';
import { format } from 'date-fns';

const notificationIcons = {
  vantabot: Bot,
  subscription: CreditCard,
  wearable: Activity,
  cycle: Truck,
  delivery: Truck,
  system: Bell,
};

const notificationColors = {
  vantabot: 'text-[#7cfc00]',
  subscription: 'text-indigo-400',
  wearable: 'text-purple-400',
  cycle: 'text-cyan-400',
  delivery: 'text-orange-400',
  system: 'text-gray-400',
};

export default function NotificationDropdown({ user }) {
  const queryClient = useQueryClient();

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications', user?.email],
    queryFn: () => base44.entities.Notification.filter({ user_email: user?.email }, '-created_date', 20),
    enabled: !!user?.email,
    refetchInterval: 10000,
  });

  // Subscribe to real-time updates
  useEffect(() => {
    if (!user?.email) return;
    
    const unsubscribe = base44.entities.Notification.subscribe((event) => {
      if (event.data.user_email === user.email) {
        queryClient.invalidateQueries({ queryKey: ['notifications'] });
      }
    });

    return unsubscribe;
  }, [user?.email, queryClient]);

  const markAsReadMutation = useMutation({
    mutationFn: (id) => base44.entities.Notification.update(id, { read: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const unreadNotifs = notifications.filter(n => !n.read);
      await Promise.all(unreadNotifs.map(n => 
        base44.entities.Notification.update(n.id, { read: true })
      ));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const deleteNotificationMutation = useMutation({
    mutationFn: (id) => base44.entities.Notification.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          aria-label={unreadCount > 0 ? `Notifications — ${unreadCount} unread` : 'Notifications'}
          className="bg-transparent border-gray-700 hover:bg-gray-800 relative"
        >
          <Bell className="w-5 h-5 text-gray-300" aria-hidden="true" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-2 -right-2 bg-red-500 text-white text-xs h-5 w-5 flex items-center justify-center p-0" aria-hidden="true">
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        className="bg-[#1a2332] border-gray-700 w-96 max-h-[600px] overflow-hidden flex flex-col"
        align="end"
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-700 flex items-center justify-between sticky top-0 bg-[#1a2332] z-10">
          <div>
            <h3 className="text-white font-bold">Notifications</h3>
            <p className="text-gray-400 text-xs">{unreadCount} unread</p>
          </div>
          {unreadCount > 0 && (
            <Button
              size="sm"
              variant="ghost"
              className="text-[#7cfc00] hover:text-[#6be600] text-xs"
              onClick={() => markAllAsReadMutation.mutate()}
            >
              <Check className="w-3 h-3 mr-1" />
              Mark all read
            </Button>
          )}
        </div>

        {/* Notifications List */}
        <div className="overflow-y-auto flex-1">
          {notifications.length === 0 ? (
            <div className="p-8 text-center">
              <Bell className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400 text-sm">No notifications yet</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-700">
              {notifications.map((notif) => {
                const Icon = notificationIcons[notif.type] || Bell;
                const iconColor = notificationColors[notif.type] || 'text-gray-400';
                
                return (
                  <div
                    key={notif.id}
                    className={`p-4 hover:bg-[#0d1320] transition-colors ${!notif.read ? 'bg-[#0d1320]/50' : ''}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`${iconColor} mt-1`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h4 className={`font-semibold text-sm ${!notif.read ? 'text-white' : 'text-gray-300'}`}>
                            {notif.title}
                          </h4>
                          {!notif.read && (
                            <div className="w-2 h-2 bg-[#7cfc00] rounded-full flex-shrink-0 mt-1" />
                          )}
                        </div>
                        <p className="text-gray-400 text-xs mb-2">{notif.message}</p>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-500 text-xs">
                            {format(new Date(notif.created_date), 'MMM d, h:mm a')}
                          </span>
                          <div className="flex items-center gap-2">
                            {notif.action_url && (
                              <Link to={createPageUrl(notif.action_url)}>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-[#7cfc00] hover:text-[#6be600] text-xs h-6 px-2"
                                  onClick={() => !notif.read && markAsReadMutation.mutate(notif.id)}
                                >
                                  View
                                </Button>
                              </Link>
                            )}
                            {!notif.read && (
                              <Button
                                size="sm"
                                variant="ghost"
                                aria-label="Mark as read"
                                className="text-gray-400 hover:text-white text-xs h-6 px-2"
                                onClick={() => markAsReadMutation.mutate(notif.id)}
                              >
                                <Check className="w-3 h-3" aria-hidden="true" />
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              aria-label="Dismiss notification"
                              className="text-gray-400 hover:text-red-400 text-xs h-6 px-2"
                              onClick={() => deleteNotificationMutation.mutate(notif.id)}
                            >
                              <X className="w-3 h-3" aria-hidden="true" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}