import { useState, useMemo } from 'react';
import { Search, SlidersHorizontal, X, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { SAMPLE_POSTS } from '@vc/lib/sampleData';
import { FOOD_TAGS, DIETARY_TAGS } from '@vc/lib/types';
import FoodCard from '@vc/components/FoodCard';
import BottomNav from '@vc/components/BottomNav';
import { useVCNavigate } from '@vc/lib/navigation';
import { getUserDietaryPreferences } from '@vc/lib/userPreferences';

const FeedPage = () => {
  const navigate = useVCNavigate();
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const userDietaryPrefs = getUserDietaryPreferences();

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  };

  const filteredPosts = SAMPLE_POSTS.filter(post => {
    const matchSearch = !search || post.title.toLowerCase().includes(search.toLowerCase()) ||
      post.building.toLowerCase().includes(search.toLowerCase()) ||
      post.tags.some(t => t.toLowerCase().includes(search.toLowerCase()));
    const matchTags = selectedTags.length === 0 || selectedTags.some(t => post.tags.includes(t));
    return matchSearch && matchTags && !post.isGone;
  });

  // Sort: posts matching user dietary preferences come first
  const sortedPosts = useMemo(() => {
    if (userDietaryPrefs.length === 0) return filteredPosts;
    return [...filteredPosts].sort((a, b) => {
      const aMatch = a.tags.some(t => userDietaryPrefs.includes(t as any));
      const bMatch = b.tags.some(t => userDietaryPrefs.includes(t as any));
      if (aMatch && !bMatch) return -1;
      if (!aMatch && bMatch) return 1;
      return 0;
    });
  }, [filteredPosts, userDietaryPrefs]);

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-40 gradient-violet px-5 pt-4 pb-3">
        <div className="mb-3">
          <h1 className="font-heading font-bold text-xl text-primary-foreground">Violet Crumbs</h1>
          <p className="text-xs text-primary-foreground/70">{filteredPosts.length} food drops available</p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search food, buildings..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-muted text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`p-2.5 rounded-xl transition-colors ${showFilters ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>
        </div>

        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="pt-3 pb-1">
                <p className="text-xs font-semibold text-muted-foreground mb-2">Food Type</p>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {[...FOOD_TAGS.slice(0, 8)].map(tag => (
                    <button
                      key={tag}
                      onClick={() => toggleTag(tag)}
                      className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                        selectedTags.includes(tag) ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
                <p className="text-xs font-semibold text-muted-foreground mb-2">Dietary</p>
                <div className="flex flex-wrap gap-1.5">
                  {[...DIETARY_TAGS].map(tag => (
                    <button
                      key={tag}
                      onClick={() => toggleTag(tag)}
                      className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                        selectedTags.includes(tag) ? 'bg-success text-success-foreground' : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
                {selectedTags.length > 0 && (
                  <button onClick={() => setSelectedTags([])} className="mt-2 text-xs text-primary font-medium flex items-center gap-1">
                    <X className="w-3 h-3" /> Clear filters
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Personalized banner */}
      {userDietaryPrefs.length > 0 && (
        <div className="px-5 pt-3 max-w-lg mx-auto">
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-success/10 text-success text-xs font-medium">
            <Sparkles className="w-3.5 h-3.5 shrink-0" />
            Showing {userDietaryPrefs.join(', ')} options first
          </div>
        </div>
      )}

      {/* Feed */}
      <div className="px-5 pt-4 space-y-4 max-w-lg mx-auto">
        {sortedPosts.length > 0 ? (
          sortedPosts.map((post, i) => (
            <FoodCard key={post.id} post={post} onClick={() => navigate(`/food/${post.id}`)} index={i} />
          ))
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16"
          >
            <div className="text-5xl mb-4">🍽️</div>
            <h3 className="font-heading font-bold text-lg text-foreground mb-1">No food drops right now</h3>
            <p className="text-sm text-muted-foreground mb-4">Check back soon or be the first to post!</p>
            <button
              onClick={() => navigate('/post')}
              className="px-6 py-2.5 rounded-2xl gradient-violet text-primary-foreground font-semibold text-sm shadow-violet"
            >
              Share Extra Food
            </button>
          </motion.div>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default FeedPage;
