import { useParams } from 'react-router-dom';
import { useVCNavigate } from '@vc/lib/navigation';
import { SAMPLE_POSTS } from '@vc/lib/sampleData';
import { ArrowLeft, MapPin, Clock, Users, Share2, Flag, Navigation } from 'lucide-react';
import { motion } from 'framer-motion';
import BottomNav from '@vc/components/BottomNav';
import DietaryBadges from '@vc/components/DietaryBadges';

const getTimeAgo = (date: Date) => {
  const mins = Math.floor((Date.now() - date.getTime()) / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ago`;
};

const getTimeLeft = (date: Date) => {
  const mins = Math.floor((date.getTime() - Date.now()) / 60000);
  if (mins <= 0) return 'Expired';
  if (mins < 60) return `~${mins} min left`;
  return `~${Math.floor(mins / 60)}h left`;
};

const FoodDetailPage = () => {
  const { id } = useParams();
  const navigate = useVCNavigate();
  const post = SAMPLE_POSTS.find(p => p.id === id);

  if (!post) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center pb-20">
        <div className="text-center">
          <div className="text-5xl mb-4">😕</div>
          <h2 className="font-heading font-bold text-lg text-foreground mb-1">Post not found</h2>
          <p className="text-sm text-muted-foreground mb-4">This food drop may have been removed</p>
          <button onClick={() => navigate('/feed')} className="px-6 py-2.5 rounded-2xl bg-primary text-primary-foreground font-semibold text-sm">
            Back to Feed
          </button>
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Image */}
      <div className="relative">
        <img src={post.photoUrl} alt={post.title} className="w-full h-56 object-cover" />
        <button
          onClick={() => navigate(-1)}
          className="absolute top-4 left-4 w-10 h-10 rounded-full glass-card flex items-center justify-center"
        >
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <div className="absolute bottom-3 right-3 flex gap-1.5">
          {post.tags.map(tag => (
            <span key={tag} className="px-2.5 py-1 rounded-full text-xs font-semibold bg-card/90 text-foreground backdrop-blur-sm">
              {tag}
            </span>
          ))}
        </div>
      </div>

      <div className="px-5 pt-5 max-w-lg mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          {/* Title */}
          <h1 className="font-heading text-2xl font-bold text-foreground mb-1">{post.title}</h1>
          <p className="text-sm text-primary font-medium mb-2">{post.organization} · {post.eventName}</p>
          <div className="mb-4">
            <DietaryBadges tags={post.tags} size="md" />
          </div>

          {/* Meta */}
          <div className="flex flex-wrap items-center gap-3 mb-5 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5 bg-muted px-3 py-1.5 rounded-full">
              <MapPin className="w-3.5 h-3.5" />
              {post.building}, {post.room}
            </span>
            <span className="flex items-center gap-1.5 bg-muted px-3 py-1.5 rounded-full">
              <Clock className="w-3.5 h-3.5" />
              {getTimeAgo(post.postedAt)}
            </span>
            <span className="flex items-center gap-1.5 bg-muted px-3 py-1.5 rounded-full">
              <Users className="w-3.5 h-3.5" />
              {post.headingThereCount} heading there
            </span>
          </div>

          {/* Urgency bar */}
          <div className="flex items-center justify-between bg-secondary rounded-2xl p-4 mb-5">
            <div>
              <p className="text-xs text-muted-foreground">Time remaining</p>
              <p className="font-heading font-bold text-foreground">{getTimeLeft(post.expiresAt)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Quantity</p>
              <p className={`font-heading font-bold ${
                post.quantity === 'plenty' ? 'text-success' : post.quantity === 'some' ? 'text-warning' : 'text-urgent'
              }`}>
                {post.quantity === 'plenty' ? '🟢 Plenty' : post.quantity === 'some' ? '🟡 Some left' : '🔴 Limited'}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Claimed</p>
              <p className="font-heading font-bold text-foreground">{post.claimedCount}</p>
            </div>
          </div>

          {/* Description */}
          <div className="mb-5">
            <h3 className="font-heading font-semibold text-foreground mb-2">What's available</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{post.description}</p>
          </div>

          {/* Pickup */}
          <div className="mb-6">
            <h3 className="font-heading font-semibold text-foreground mb-2">📍 Pickup instructions</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{post.pickupInstructions}</p>
          </div>

          {/* Posted by */}
          <div className="flex items-center gap-3 mb-6 bg-muted rounded-2xl p-4">
            <div className="w-10 h-10 rounded-full gradient-violet flex items-center justify-center text-primary-foreground font-bold text-sm">
              {post.postedBy.charAt(0)}
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">{post.postedBy}</p>
              <p className="text-xs text-muted-foreground">{post.organization}</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 mb-4">
            <button className="flex-1 py-3.5 rounded-2xl gradient-violet text-primary-foreground font-semibold text-sm shadow-violet active:scale-95 transition-transform flex items-center justify-center gap-2">
              <Navigation className="w-4 h-4" />
              I'm on my way!
            </button>
          </div>
          <div className="flex gap-3">
            <button className="flex-1 py-3 rounded-2xl bg-secondary text-secondary-foreground font-semibold text-sm flex items-center justify-center gap-2 active:scale-95 transition-transform">
              <Share2 className="w-4 h-4" />
              Share
            </button>
            <button className="flex-1 py-3 rounded-2xl bg-muted text-muted-foreground font-semibold text-sm flex items-center justify-center gap-2 active:scale-95 transition-transform">
              <Flag className="w-4 h-4" />
              Report gone
            </button>
          </div>
        </motion.div>
      </div>

      <BottomNav />
    </div>
  );
};

export default FoodDetailPage;
