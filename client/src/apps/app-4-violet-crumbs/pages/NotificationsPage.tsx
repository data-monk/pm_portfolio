import { SAMPLE_NOTIFICATIONS, SAMPLE_POSTS } from '@vc/lib/sampleData';
import { DIETARY_TAGS } from '@vc/lib/types';
import { Bell, Check } from 'lucide-react';
import { motion } from 'framer-motion';
import { useVCNavigate } from '@vc/lib/navigation';
import BottomNav from '@vc/components/BottomNav';
import { getUserDietaryPreferences } from '@vc/lib/userPreferences';

const getTimeAgo = (date: Date) => {
  const mins = Math.floor((Date.now() - date.getTime()) / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ago`;
};

const NotificationsPage = () => {
  const navigate = useVCNavigate();
  const userDietaryPrefs = getUserDietaryPreferences();

  // Generate personalized notifications based on dietary preferences
  const personalizedNotifications = (() => {
    if (userDietaryPrefs.length === 0) return SAMPLE_NOTIFICATIONS;
    
    const matchingPosts = SAMPLE_POSTS.filter(p => 
      p.tags.some(t => userDietaryPrefs.includes(t as any)) && !p.isGone
    );
    
    const dietaryNotifs = matchingPosts
      .filter(p => !SAMPLE_NOTIFICATIONS.some(n => n.foodPostId === p.id))
      .slice(0, 2)
      .map((p, i) => ({
        id: `diet-${i}`,
        title: `✨ Matches your preferences!`,
        message: `${p.title} at ${p.building} — ${p.tags.filter(t => (DIETARY_TAGS as readonly string[]).includes(t)).join(', ')}`,
        type: 'new_food' as const,
        read: false,
        createdAt: p.postedAt,
        foodPostId: p.id,
      }));
    
    return [...dietaryNotifs, ...SAMPLE_NOTIFICATIONS];
  })();

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="sticky top-0 z-40 glass-card px-5 py-4">
        <div className="flex items-center justify-between">
          <h1 className="font-heading font-bold text-xl text-foreground">Notifications 🔔</h1>
          <button className="text-xs text-primary font-semibold flex items-center gap-1">
            <Check className="w-3.5 h-3.5" /> Mark all read
          </button>
        </div>
      </div>

      <div className="px-5 pt-4 max-w-lg mx-auto space-y-2">
        {personalizedNotifications.map((n, i) => (
          <motion.button
            key={n.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.08 }}
            onClick={() => n.foodPostId && navigate(`/food/${n.foodPostId}`)}
            className={`w-full text-left p-4 rounded-2xl transition-colors active:scale-[0.98] ${
              n.read ? 'bg-card' : 'bg-secondary'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                n.type === 'new_food' ? 'gradient-violet' :
                n.type === 'expiring' ? 'gradient-warm' :
                n.type === 'badge' ? 'bg-accent' : 'bg-muted'
              }`}>
                <Bell className="w-4 h-4 text-primary-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">{n.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{n.message}</p>
                <p className="text-[10px] text-muted-foreground mt-1">{getTimeAgo(n.createdAt)}</p>
              </div>
              {!n.read && <div className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />}
            </div>
          </motion.button>
        ))}

        {/* Notification Preferences */}
        <div className="mt-6 bg-card rounded-2xl p-5 shadow-card">
          <h3 className="font-heading font-semibold text-foreground mb-3">Alert preferences</h3>
          <div className="space-y-3">
            {[
              { label: 'New food near me', enabled: true },
              { label: 'Favorite food types', enabled: true },
              { label: 'Expiring food alerts', enabled: false },
              { label: 'Badge achievements', enabled: true },
            ].map(pref => (
              <div key={pref.label} className="flex items-center justify-between">
                <span className="text-sm text-foreground">{pref.label}</span>
                <div className={`w-10 h-6 rounded-full relative cursor-pointer transition-colors ${
                  pref.enabled ? 'bg-primary' : 'bg-muted'
                }`}>
                  <div className={`absolute top-1 w-4 h-4 rounded-full bg-card shadow transition-transform ${
                    pref.enabled ? 'left-5' : 'left-1'
                  }`} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default NotificationsPage;
