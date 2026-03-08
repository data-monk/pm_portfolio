import { useState, useEffect } from 'react';
import { SAMPLE_USER, IMPACT_STATS } from '@vc/lib/sampleData';
import { ALL_BADGES, DIETARY_TAGS } from '@vc/lib/types';
import { Settings, LogOut, ChevronRight, Leaf, Trophy, Award, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';
import BottomNav from '@vc/components/BottomNav';
import { getUserDietaryPreferences, setUserDietaryPreferences, DietaryPreference } from '@vc/lib/userPreferences';
import { toast } from 'sonner';

const ProfilePage = () => {
  const user = SAMPLE_USER;
  const earnedIds = user.badges.map(b => b.id);
  const [dietaryPrefs, setDietaryPrefs] = useState<DietaryPreference[]>([]);

  useEffect(() => {
    setDietaryPrefs(getUserDietaryPreferences());
  }, []);

  const toggleDietaryPref = (tag: DietaryPreference) => {
    const updated = dietaryPrefs.includes(tag)
      ? dietaryPrefs.filter(t => t !== tag)
      : [...dietaryPrefs, tag];
    setDietaryPrefs(updated);
    setUserDietaryPreferences(updated);
    toast.success('Dietary preferences updated!');
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="gradient-violet px-5 pt-8 pb-12">
        <div className="flex items-center justify-between mb-6">
          <h1 className="font-heading font-bold text-xl text-primary-foreground">Profile</h1>
          <button className="w-9 h-9 rounded-full bg-primary-foreground/10 flex items-center justify-center">
            <Settings className="w-4 h-4 text-primary-foreground" />
          </button>
        </div>
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-primary-foreground/20 flex items-center justify-center text-2xl font-bold text-primary-foreground font-heading">
            {user.name.charAt(0)}
          </div>
          <div>
            <h2 className="font-heading font-bold text-lg text-primary-foreground">{user.name}</h2>
            <p className="text-sm text-primary-foreground/70">{user.email}</p>
            <p className="text-xs text-primary-foreground/50 mt-0.5">
              Member since {user.joinedAt.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
            </p>
          </div>
        </div>
      </div>

      <div className="px-5 -mt-6 max-w-lg mx-auto">
        {/* Impact Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-2xl shadow-card p-5 mb-5"
        >
          <h3 className="font-heading font-semibold text-foreground mb-4 flex items-center gap-2">
            <Trophy className="w-4 h-4 text-accent" /> Your Impact
          </h3>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="font-heading font-bold text-2xl text-primary">{user.mealsRescued}</div>
              <div className="text-xs text-muted-foreground">Meals Rescued</div>
            </div>
            <div>
              <div className="font-heading font-bold text-2xl text-success">{user.foodPosted}</div>
              <div className="text-xs text-muted-foreground">Food Posted</div>
            </div>
            <div>
              <div className="font-heading font-bold text-2xl text-accent">{user.impactPoints}</div>
              <div className="text-xs text-muted-foreground">Points</div>
            </div>
          </div>
        </motion.div>

        {/* Dietary Preferences */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-card rounded-2xl shadow-card p-5 mb-5"
        >
          <h3 className="font-heading font-semibold text-foreground mb-2 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-success" /> Dietary Preferences
          </h3>
          <p className="text-xs text-muted-foreground mb-3">
            Select your dietary needs — we'll highlight matching food and personalize your alerts.
          </p>
          <div className="flex flex-wrap gap-2">
            {[...DIETARY_TAGS].map(tag => (
              <button
                key={tag}
                onClick={() => toggleDietaryPref(tag as DietaryPreference)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                  dietaryPrefs.includes(tag as DietaryPreference)
                    ? 'bg-success text-success-foreground'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Badges */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-card rounded-2xl shadow-card p-5 mb-5"
        >
          <h3 className="font-heading font-semibold text-foreground mb-4 flex items-center gap-2">
            <Award className="w-4 h-4 text-primary" /> Badges
          </h3>
          <div className="grid grid-cols-3 gap-3">
            {ALL_BADGES.map(badge => {
              const earned = earnedIds.includes(badge.id);
              return (
                <div
                  key={badge.id}
                  className={`text-center p-3 rounded-xl transition-colors ${
                    earned ? 'bg-secondary' : 'bg-muted/50 opacity-40'
                  }`}
                >
                  <div className="text-2xl mb-1">{badge.icon}</div>
                  <p className="text-[10px] font-semibold text-foreground leading-tight">{badge.name}</p>
                </div>
              );
            })}
          </div>
        </motion.div>


        {/* Preferences */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-card rounded-2xl shadow-card p-5 mb-5"
        >
          <h3 className="font-heading font-semibold text-foreground mb-3">Favorite food types</h3>
          <div className="flex flex-wrap gap-2">
            {user.favoriteTypes.map(t => (
              <span key={t} className="px-3 py-1.5 rounded-full bg-secondary text-secondary-foreground text-xs font-medium">{t}</span>
            ))}
          </div>
        </motion.div>

        {/* Actions */}
        <div className="space-y-2 mb-6">
          {[
            { label: 'My Posts', icon: Leaf },
            { label: 'Notification Settings', icon: Settings },
          ].map(item => (
            <button key={item.label} className="w-full flex items-center justify-between bg-card rounded-2xl p-4 shadow-card active:scale-[0.98] transition-transform">
              <div className="flex items-center gap-3">
                <item.icon className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">{item.label}</span>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
          ))}
        </div>

        <button className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-muted text-muted-foreground text-sm font-medium active:scale-95 transition-transform">
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>

      <BottomNav />
    </div>
  );
};

export default ProfilePage;
