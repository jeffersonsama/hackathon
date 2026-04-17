import { Bell, MessageCircle, Calendar, BookOpen, Shield, Users, CheckCheck, ChevronRight, Settings } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { useNotifications, useMarkNotificationRead, useMarkAllRead, useUnreadCount } from '@/hooks/use-notifications';

const typeIcons: Record<string, any> = {
  message: MessageCircle,
  post: Bell,
  comment: Bell,
  event: Calendar,
  course_update: BookOpen,
  system: Shield,
  group_invite: Users,
  exam: BookOpen,
};

const typeColors: Record<string, string> = {
  message: 'text-purple-600 bg-purple-50',
  post: 'text-blue-600 bg-blue-50',
  comment: 'text-blue-600 bg-blue-50',
  event: 'text-amber-600 bg-amber-50',
  course_update: 'text-blue-600 bg-blue-50',
  system: 'text-foreground bg-secondary',
  group_invite: 'text-green-600 bg-green-50',
  exam: 'text-red-600 bg-red-50',
};

const filterTabs = [
  { id: 'all', label: 'Toutes' },
  { id: 'unread', label: 'Non lues' },
  { id: 'message', label: 'Messages' },
  { id: 'course_update', label: 'Cours' },
  { id: 'event', label: 'Événements' },
];

function formatTime(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "À l'instant";
  if (mins < 60) return `il y a ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `il y a ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `il y a ${days}j`;
  return new Date(dateStr).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

export default function NotificationsPage() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState('all');

  const { data: notifications, isLoading } = useNotifications(filter === 'all' ? undefined : filter);
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllRead();
  const { data: unreadCount } = useUnreadCount();

  // Auto-mark all read after 3 seconds on the page
  useEffect(() => {
    const timer = setTimeout(() => {
      if (unreadCount && unreadCount > 0) markAllRead.mutate();
    }, 3000);
    return () => clearTimeout(timer);
  }, [unreadCount]);

  const handleClick = (notif: any) => {
    if (!notif.read_at) markRead.mutate(notif.id);
    if (notif.link) navigate(notif.link);
  };

  return (
    <div className="flex min-h-full flex-1 flex-col w-full bg-card pb-24 md:pb-6">

      {/* ── Sticky header ── */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-md border-b border-border">
        <div className="px-4 md:px-6 pt-5 pb-3 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">Notifications</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {unreadCount ? `${unreadCount} non lue${unreadCount > 1 ? 's' : ''}` : 'Restez informé de votre vie universitaire'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {(unreadCount || 0) > 0 && (
              <button
                onClick={() => markAllRead.mutate()}
                className="flex items-center gap-1.5 text-[12px] font-bold text-primary px-3 py-2 bg-primary/10 rounded-xl hover:bg-primary/20 transition-colors border border-primary/20"
              >
                <CheckCheck className="w-3.5 h-3.5" /> Tout lire
              </button>
            )}
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2 px-4 mt-2">
          {filterTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={clsx(
                'px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all',
                filter === tab.id
                  ? 'bg-[#5D2E8E] text-white shadow-md'
                  : 'bg-secondary text-muted-foreground hover:bg-secondary/80'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Notification list ── */}
      <div className="flex flex-1 flex-col py-4 pb-24 min-h-0 gap-4 w-full max-w-2xl mx-auto px-4 md:px-6">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-card rounded-[2rem] p-5 shadow-card border border-border flex gap-4 w-full">
              <div className="w-14 h-14 rounded-2xl animate-pulse shrink-0 bg-secondary" />
              <div className="flex-1 space-y-2 py-1">
                <div className="h-4 bg-secondary rounded-full animate-pulse w-3/4" />
                <div className="h-3 bg-secondary rounded-full animate-pulse w-full" />
                <div className="h-3 bg-secondary rounded-full animate-pulse w-1/3" />
              </div>
            </div>
          ))
        ) : notifications && notifications.length > 0 ? (
          notifications.map((notif: any) => {
            const Icon = typeIcons[notif.type] || Bell;
            const color = typeColors[notif.type] || 'text-foreground bg-secondary';
            const isUnread = !notif.read_at;

            return (
              <div
                key={notif.id}
                onClick={() => handleClick(notif)}
                className={clsx(
                  'p-5 transition-all cursor-pointer flex gap-4 items-start hover:bg-secondary/50 rounded-[2rem] border border-border bg-card shadow-sm w-full max-w-xl',
                  isUnread && 'border-l-4 border-l-primary'
                )}
              >
                <div className={clsx('w-14 h-14 rounded-2xl flex items-center justify-center shrink-0', color)}>
                  <Icon className="w-7 h-7" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-1">
                    <h3 className={clsx('text-sm truncate pr-2', isUnread ? 'font-bold text-foreground' : 'font-medium text-muted-foreground')}>
                      {notif.title}
                    </h3>
                    <span className="text-[10px] text-muted-foreground font-bold whitespace-nowrap uppercase tracking-tighter shrink-0">
                      {formatTime(notif.created_at)}
                    </span>
                  </div>
                  {notif.content && (
                    <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{notif.content}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0 mt-0.5">
                  {notif.link && <ChevronRight className="w-4 h-4 text-muted-foreground/50 group-hover:text-muted-foreground transition-colors" />}
                </div>
              </div>
            );
          })
        ) : (
          <div className="py-20 text-center">
            <Bell className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground font-bold">Rien à afficher ici</p>
            <p className="text-sm text-muted-foreground/80">Aucune notification pour ce filtre.</p>
          </div>
        )}
      </div>

      {/* Mark all read bottom button — only if not auto-marked yet */}
      {notifications && notifications.some((n: any) => !n.read_at) && (
        <div className="px-4 py-4">
          <button
            onClick={() => markAllRead.mutate()}
            className="w-full py-3 border border-dashed border-border rounded-[24px] text-xs font-bold text-muted-foreground hover:text-primary hover:border-primary/30 hover:bg-primary/10 transition-all active:scale-95"
          >
            Tout marquer comme lu
          </button>
        </div>
      )}
    </div>
  );
}
