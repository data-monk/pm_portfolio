import { FoodPost } from '@vc/lib/types';
import { Clock, MapPin, Users, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import DietaryBadges from './DietaryBadges';

interface FoodCardProps {
  post: FoodPost;
  onClick: () => void;
  index?: number;
}

const getTimeAgo = (date: Date) => {
  const mins = Math.floor((Date.now() - date.getTime()) / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ago`;
};

const getUrgencyLabel = (post: FoodPost) => {
  const mins = Math.floor((Date.now() - post.postedAt.getTime()) / 60000);
  if (mins <= 5) return { text: 'Just posted 🔥', class: 'bg-success text-success-foreground' };
  if (post.quantity === 'limited') return { text: 'Likely gone soon', class: 'bg-urgent text-urgent-foreground' };
  if (post.headingThereCount >= 6) return { text: 'Popular right now', class: 'bg-warning text-warning-foreground' };
  return null;
};

const getQuantityColor = (q: string) => {
  if (q === 'plenty') return 'text-success';
  if (q === 'some') return 'text-warning';
  return 'text-urgent';
};

const FoodCard = ({ post, onClick, index = 0 }: FoodCardProps) => {
  const urgency = getUrgencyLabel(post);
  const nonDietaryTags = post.tags.filter(t => !['Vegetarian','Vegan','Halal','Kosher','Gluten-Free','Dairy-Free','Nut-Free'].includes(t));

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.4 }}
      onClick={onClick}
      className="bg-card rounded-2xl shadow-card hover:shadow-card-hover transition-all duration-300 overflow-hidden cursor-pointer group active:scale-[0.98]"
    >
      <div className="relative">
        <img
          src={post.photoUrl}
          alt={post.title}
          className="w-full h-40 object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />
        {urgency && (
          <span className={`absolute top-3 left-3 px-2.5 py-1 rounded-full text-xs font-semibold ${urgency.class}`}>
            {urgency.text}
          </span>
        )}
        <div className="absolute top-3 right-3 flex gap-1.5">
          {nonDietaryTags.slice(0, 2).map(tag => (
            <span key={tag} className="px-2 py-0.5 rounded-full text-xs font-medium bg-card/90 text-foreground backdrop-blur-sm">
              {tag}
            </span>
          ))}
        </div>
      </div>

      <div className="p-4">
        <h3 className="font-heading font-bold text-base text-foreground mb-1 leading-tight">{post.title}</h3>
        <p className="text-xs text-muted-foreground mb-2">{post.organization}</p>

        <DietaryBadges tags={post.tags} size="sm" />

        <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3 mt-2.5">
          <span className="flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5" />
            {post.building}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            {getTimeAgo(post.postedAt)}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className={`text-xs font-semibold ${getQuantityColor(post.quantity)}`}>
              {post.quantity === 'plenty' ? '🟢 Plenty left' : post.quantity === 'some' ? '🟡 Some left' : '🔴 Limited'}
            </span>
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Users className="w-3.5 h-3.5" />
              {post.headingThereCount} heading there
            </span>
          </div>
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center group-hover:bg-violet-glow transition-colors">
            <ArrowRight className="w-4 h-4 text-primary-foreground" />
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default FoodCard;
