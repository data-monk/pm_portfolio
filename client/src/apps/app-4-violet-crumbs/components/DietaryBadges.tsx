import { DIETARY_TAGS } from '@vc/lib/types';

interface DietaryBadgesProps {
  tags: string[];
  size?: 'sm' | 'md';
}

const DIETARY_ICONS: Record<string, string> = {
  'Vegetarian': '🥬',
  'Vegan': '🌱',
  'Halal': '☪️',
  'Kosher': '✡️',
  'Gluten-Free': '🌾',
  'Dairy-Free': '🥛',
  'Nut-Free': '🥜',
};

const DietaryBadges = ({ tags, size = 'sm' }: DietaryBadgesProps) => {
  const dietaryTags = tags.filter(t => (DIETARY_TAGS as readonly string[]).includes(t));
  
  if (dietaryTags.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1">
      {dietaryTags.map(tag => (
        <span
          key={tag}
          className={`inline-flex items-center gap-0.5 rounded-full bg-success/15 text-success font-semibold ${
            size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs'
          }`}
        >
          {DIETARY_ICONS[tag] || '✓'} {tag}
        </span>
      ))}
    </div>
  );
};

export default DietaryBadges;
