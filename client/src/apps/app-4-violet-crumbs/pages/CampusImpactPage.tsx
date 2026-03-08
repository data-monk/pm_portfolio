import { motion } from 'framer-motion';
import { useVCNavigate } from '@vc/lib/navigation';
import { ArrowLeft, Leaf, Users, TrendingUp, Award, Utensils, CloudOff, BarChart3 } from 'lucide-react';
import { CLUB_LEADERBOARD, CAMPUS_IMPACT, WEEKLY_TREND, MONTHLY_GROWTH, MILESTONES } from '@vc/lib/clubData';
import BottomNav from '@vc/components/BottomNav';
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip,
  AreaChart, Area,
} from 'recharts';

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};

const CampusImpactPage = () => {
  const navigate = useVCNavigate();

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-40 glass-card border-b border-border">
        <div className="flex items-center gap-3 px-4 py-3 max-w-lg mx-auto">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-secondary transition-colors">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <div>
            <h1 className="font-heading font-bold text-lg text-foreground">Campus Impact</h1>
            <p className="text-xs text-muted-foreground">Celebrating our collective sustainability</p>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-5 space-y-6">
        {/* Campus-wide Impact Stats */}
        <motion.section {...fadeUp} transition={{ delay: 0.05 }}>
          <div className="gradient-violet rounded-2xl p-5 text-primary-foreground">
            <div className="flex items-center gap-2 mb-4">
              <Leaf className="w-5 h-5" />
              <h2 className="font-heading font-bold text-base">Campus-Wide Impact</h2>
            </div>
            <div className="grid grid-cols-3 gap-3 mb-3">
              <div className="text-center">
                <p className="text-2xl font-bold">{CAMPUS_IMPACT.totalMealsRescued.toLocaleString()}</p>
                <p className="text-[10px] opacity-80">Meals Saved</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">{CAMPUS_IMPACT.totalFoodSavedLbs.toLocaleString()}</p>
                <p className="text-[10px] opacity-80">Lbs Rescued</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">{CAMPUS_IMPACT.totalStudentsServed.toLocaleString()}</p>
                <p className="text-[10px] opacity-80">Students Served</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white/15 rounded-xl p-3 text-center">
                <CloudOff className="w-4 h-4 mx-auto mb-1 opacity-80" />
                <p className="text-lg font-bold">{CAMPUS_IMPACT.totalCo2AvoidedLbs.toLocaleString()} lbs</p>
                <p className="text-[10px] opacity-80">CO₂ Avoided</p>
              </div>
              <div className="bg-white/15 rounded-xl p-3 text-center">
                <BarChart3 className="w-4 h-4 mx-auto mb-1 opacity-80" />
                <p className="text-lg font-bold">{CAMPUS_IMPACT.totalFoodPosts}</p>
                <p className="text-[10px] opacity-80">Food Posts</p>
              </div>
            </div>
          </div>
        </motion.section>

        {/* Milestones */}
        <motion.section {...fadeUp} transition={{ delay: 0.1 }}>
          <h2 className="font-heading font-bold text-base text-foreground mb-3 flex items-center gap-2">
            <Award className="w-4 h-4 text-primary" /> Milestones & Highlights
          </h2>
          <div className="space-y-2">
            {MILESTONES.map((m, i) => (
              <div key={i} className="flex items-start gap-3 bg-card rounded-xl border border-border p-3">
                <span className="text-xl mt-0.5">{m.icon}</span>
                <p className="text-sm text-foreground font-medium leading-snug">{m.text}</p>
              </div>
            ))}
          </div>
        </motion.section>

        {/* Club Leaderboard */}
        <motion.section {...fadeUp} transition={{ delay: 0.15 }}>
          <h2 className="font-heading font-bold text-base text-foreground mb-1 flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" /> Top Contributing Clubs
          </h2>
          <p className="text-xs text-muted-foreground mb-3">Clubs making the biggest impact this semester</p>

          <div className="space-y-2">
            {CLUB_LEADERBOARD.map((club, i) => (
              <div
                key={club.id}
                className={`flex items-center gap-3 bg-card rounded-xl border p-3 transition-colors ${
                  i === 0 ? 'border-primary/40 bg-secondary/50' : 'border-border'
                }`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                  i === 0 ? 'gradient-violet text-primary-foreground' :
                  i === 1 ? 'bg-secondary text-secondary-foreground' :
                  i === 2 ? 'bg-secondary text-secondary-foreground' :
                  'bg-muted text-muted-foreground'
                }`}>
                  {i < 3 ? ['🥇', '🥈', '🥉'][i] : i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">
                    {club.emoji} {club.name}
                  </p>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-[10px] text-muted-foreground">{club.foodPosts} posts</span>
                    <span className="text-[10px] text-muted-foreground">{club.mealsRescued} meals</span>
                    <span className="text-[10px] text-muted-foreground">{club.foodSavedLbs} lbs saved</span>
                  </div>
                </div>
                {i === 0 && (
                  <span className="text-[10px] font-semibold text-primary bg-secondary px-2 py-0.5 rounded-full shrink-0">
                    Top Club
                  </span>
                )}
              </div>
            ))}
          </div>
        </motion.section>

        {/* Weekly Activity Trend */}
        <motion.section {...fadeUp} transition={{ delay: 0.2 }}>
          <h2 className="font-heading font-bold text-base text-foreground mb-1 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" /> This Week's Activity
          </h2>
          <p className="text-xs text-muted-foreground mb-3">Meals rescued per day</p>
          <div className="bg-card rounded-xl border border-border p-4">
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={WEEKLY_TREND} barSize={28}>
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: 'hsl(260 10% 45%)' }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip
                  contentStyle={{
                    background: 'hsl(0 0% 100%)',
                    border: '1px solid hsl(260 15% 90%)',
                    borderRadius: '0.75rem',
                    fontSize: 12,
                  }}
                  labelStyle={{ fontWeight: 600 }}
                />
                <Bar dataKey="meals" fill="hsl(267 54% 35%)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.section>

        {/* Monthly Growth */}
        <motion.section {...fadeUp} transition={{ delay: 0.25 }}>
          <h2 className="font-heading font-bold text-base text-foreground mb-1 flex items-center gap-2">
            <Utensils className="w-4 h-4 text-primary" /> Rescue Growth Over Time
          </h2>
          <p className="text-xs text-muted-foreground mb-3">Monthly meals rescued since launch</p>
          <div className="bg-card rounded-xl border border-border p-4">
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={MONTHLY_GROWTH}>
                <defs>
                  <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(267 54% 35%)" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="hsl(267 54% 35%)" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'hsl(260 10% 45%)' }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip
                  contentStyle={{
                    background: 'hsl(0 0% 100%)',
                    border: '1px solid hsl(260 15% 90%)',
                    borderRadius: '0.75rem',
                    fontSize: 12,
                  }}
                  labelStyle={{ fontWeight: 600 }}
                />
                <Area type="monotone" dataKey="meals" stroke="hsl(267 54% 35%)" strokeWidth={2} fill="url(#areaGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.section>

        {/* Closing message */}
        <motion.div {...fadeUp} transition={{ delay: 0.3 }} className="text-center py-4">
          <p className="text-sm text-muted-foreground italic">
            "Every meal rescued is a step toward a more sustainable campus." 🌱
          </p>
        </motion.div>
      </div>

      <BottomNav />
    </div>
  );
};

export default CampusImpactPage;
