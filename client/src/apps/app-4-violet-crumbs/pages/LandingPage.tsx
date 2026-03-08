import { motion } from 'framer-motion';
import { useVCNavigate } from '@vc/lib/navigation';
import { ArrowRight, Leaf, Zap, Users, TrendingUp, MapPin, Clock, Star } from 'lucide-react';
import { SAMPLE_POSTS, IMPACT_STATS } from '@vc/lib/sampleData';
import FoodCard from '@vc/components/FoodCard';

const LandingPage = () => {
  const navigate = useVCNavigate();

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 glass-card">
        <div className="flex items-center justify-between px-5 py-3 max-w-lg mx-auto">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg gradient-violet flex items-center justify-center">
              <span className="text-sm">🍽️</span>
            </div>
            <span className="font-heading font-bold text-lg text-foreground">Violet Crumbs</span>
          </div>
          <button
            onClick={() => navigate('/feed')}
            className="px-4 py-2 rounded-full bg-primary text-primary-foreground text-sm font-semibold active:scale-95 transition-transform"
          >
            Open App
          </button>
        </div>
      </header>

      {/* Hero */}
      <section className="pt-24 pb-16 px-5 max-w-lg mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary text-secondary-foreground text-xs font-semibold mb-6">
            <Leaf className="w-3.5 h-3.5" />
            NYU Stern · Save food, fuel up
          </div>

          <h1 className="font-heading text-4xl sm:text-5xl font-bold text-foreground leading-[1.1] mb-4">
            Free food at Stern,{' '}
            <span className="text-gradient-violet">minus the waste.</span>
          </h1>

          <p className="text-base text-muted-foreground leading-relaxed mb-8 max-w-sm mx-auto">
            Discover excess food from campus events in real time. Turn extra catering into student wins.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-6">
            <button
              onClick={() => navigate('/feed')}
              className="w-full sm:w-auto px-8 py-3.5 rounded-2xl gradient-violet text-primary-foreground font-semibold text-base shadow-violet active:scale-95 transition-transform flex items-center justify-center gap-2"
            >
              Find Free Food
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => navigate('/post')}
              className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-secondary text-secondary-foreground font-semibold text-base active:scale-95 transition-transform"
            >
              Share Extra Food
            </button>
          </div>

          <p className="text-xs text-muted-foreground">
            Join {IMPACT_STATS.activeUsers}+ Stern students already saving food
          </p>
        </motion.div>
      </section>

      {/* Impact Stats */}
      <section className="px-5 pb-14 max-w-lg mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="grid grid-cols-2 gap-3"
        >
          {[
            { label: 'Meals Rescued', value: IMPACT_STATS.totalMealsRescued.toLocaleString(), icon: Zap, color: 'text-accent' },
            { label: 'Food Saved', value: IMPACT_STATS.totalFoodSaved, icon: Leaf, color: 'text-success' },
            { label: 'Active Today', value: IMPACT_STATS.activePostsToday, icon: TrendingUp, color: 'text-primary' },
            { label: 'Students', value: `${IMPACT_STATS.activeUsers}+`, icon: Users, color: 'text-violet-glow' },
          ].map((stat) => (
            <div key={stat.label} className="bg-card rounded-2xl p-4 shadow-card text-center">
              <stat.icon className={`w-5 h-5 mx-auto mb-2 ${stat.color}`} />
              <div className="font-heading font-bold text-2xl text-foreground">{stat.value}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{stat.label}</div>
            </div>
          ))}
        </motion.div>
      </section>

      {/* How it Works */}
      <section className="px-5 pb-14 max-w-lg mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <h2 className="font-heading text-2xl font-bold text-foreground text-center mb-8">
            How it works
          </h2>
          <div className="space-y-4">
            {[
              { step: '1', icon: '📣', title: 'Someone posts extra food', desc: 'Event hosts share excess food in seconds' },
              { step: '2', icon: '📍', title: 'Students get alerted', desc: 'Nearby food drops pop up on your feed, personalized to your diet' },
              { step: '3', icon: '🎉', title: 'Good food gets eaten', desc: 'Not wasted — you save money and the planet' },
            ].map((item) => (
              <div key={item.step} className="flex items-start gap-4 bg-card rounded-2xl p-4 shadow-card">
                <div className="w-10 h-10 rounded-xl gradient-violet flex items-center justify-center text-primary-foreground font-heading font-bold text-sm shrink-0">
                  {item.step}
                </div>
                <div>
                  <h3 className="font-heading font-semibold text-foreground mb-0.5">
                    {item.icon} {item.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* Live Feed Preview */}
      <section className="px-5 pb-14 max-w-lg mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-heading text-2xl font-bold text-foreground">
              Live right now 🔴
            </h2>
            <span className="text-xs text-muted-foreground animate-pulse-soft">
              {SAMPLE_POSTS.length} active
            </span>
          </div>
          <div className="space-y-4">
            {SAMPLE_POSTS.slice(0, 3).map((post, i) => (
              <FoodCard key={post.id} post={post} onClick={() => navigate('/feed')} index={i} />
            ))}
          </div>
          <button
            onClick={() => navigate('/feed')}
            className="mt-6 w-full py-3 rounded-2xl bg-secondary text-secondary-foreground font-semibold text-sm active:scale-95 transition-transform"
          >
            See all food drops →
          </button>
        </motion.div>
      </section>

      {/* Why it Matters */}
      <section className="px-5 pb-14 max-w-lg mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <h2 className="font-heading text-2xl font-bold text-foreground text-center mb-6">
            Why it matters
          </h2>
          <div className="space-y-3">
            {[
              { icon: '💰', title: 'Save money', desc: 'Free food from quality catering. Student budget approved.' },
              { icon: '🌍', title: 'Save the planet', desc: '40% of food in the US gets wasted. We\'re fixing that at Stern.' },
              { icon: '🤝', title: 'Build community', desc: 'Turn excess food into a shared campus moment.' },
            ].map((item) => (
              <div key={item.title} className="bg-card rounded-2xl p-4 shadow-card flex items-start gap-3">
                <span className="text-2xl">{item.icon}</span>
                <div>
                  <h3 className="font-heading font-semibold text-foreground">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* Testimonials */}
      <section className="px-5 pb-14 max-w-lg mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <h2 className="font-heading text-2xl font-bold text-foreground text-center mb-6">
            Students love it
          </h2>
          <div className="space-y-3">
            {[
              { name: 'Jessica M.', year: 'MBA \'26', quote: 'Found free sushi between classes. This app is literally a cheat code.', stars: 5 },
              { name: 'David K.', year: 'BS \'27', quote: 'Posted excess pizza from our club event. Gone in 8 minutes. Love it.', stars: 5 },
              { name: 'Priya S.', year: 'MBA \'25', quote: 'Makes me feel good about not wasting food. Plus, free meals!', stars: 5 },
            ].map((t) => (
              <div key={t.name} className="bg-card rounded-2xl p-4 shadow-card">
                <div className="flex items-center gap-1 mb-2">
                  {Array.from({ length: t.stars }).map((_, i) => (
                    <Star key={i} className="w-3.5 h-3.5 fill-accent text-accent" />
                  ))}
                </div>
                <p className="text-sm text-foreground mb-2">"{t.quote}"</p>
                <p className="text-xs text-muted-foreground font-medium">{t.name} · {t.year}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* Final CTA */}
      <section className="px-5 pb-20 max-w-lg mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="gradient-violet rounded-3xl p-8 text-center shadow-violet"
        >
          <h2 className="font-heading text-2xl font-bold text-primary-foreground mb-2">
            Good food deserves a second chance.
          </h2>
          <p className="text-primary-foreground/80 text-sm mb-6">
            Join the movement. Fuel up, waste less.
          </p>
          <button
            onClick={() => navigate('/feed')}
            className="px-8 py-3.5 rounded-2xl bg-card text-foreground font-semibold text-base active:scale-95 transition-transform"
          >
            Get Started Free →
          </button>
        </motion.div>
      </section>
    </div>
  );
};

export default LandingPage;
