import { useState } from 'react';
import { useVCNavigate } from '@vc/lib/navigation';
import { ArrowLeft, Camera, MapPin, Clock, Tag, Users } from 'lucide-react';
import { motion } from 'framer-motion';
import { FOOD_TAGS, DIETARY_TAGS } from '@vc/lib/types';
import { CLUB_LEADERBOARD } from '@vc/lib/clubData';
import BottomNav from '@vc/components/BottomNav';
import { toast } from 'sonner';

const BUILDINGS = [
  'Tisch Hall', 'Kaufman Management Center', 'Paulson Center',
  'Kimmel Center', 'Bobst Library', 'Stern Concourse',
  'Gould Plaza', 'Silver Center'
];

const PostFoodPage = () => {
  const navigate = useVCNavigate();
  const [foodName, setFoodName] = useState('');
  const [eventName, setEventName] = useState('');
  const [building, setBuilding] = useState('');
  const [room, setRoom] = useState('');
  const [quantity, setQuantity] = useState<'plenty' | 'some' | 'limited'>('some');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [instructions, setInstructions] = useState('');
  const [duration, setDuration] = useState('30');
  const [clubName, setClubName] = useState('');
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setPhotoPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  };

  const handleSubmit = () => {
    if (!foodName || !building) {
      toast.error('Please fill in food name and building');
      return;
    }
    toast.success('🎉 Food drop posted! Students nearby will be notified.');
    navigate('/feed');
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-40 glass-card px-5 py-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-muted flex items-center justify-center">
            <ArrowLeft className="w-4 h-4 text-foreground" />
          </button>
          <h1 className="font-heading font-bold text-lg text-foreground">Share Extra Food 🍽️</h1>
        </div>
      </div>

      <div className="px-5 pt-5 max-w-lg mx-auto space-y-5">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <p className="text-sm text-muted-foreground mb-5">
            Post in 30 seconds. Help save food, feed students! 🌱
          </p>

          {/* Photo */}
          <label className="relative w-full h-32 rounded-2xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-2 mb-5 active:bg-muted transition-colors cursor-pointer overflow-hidden">
            {photoPreview ? (
              <>
                <img src={photoPreview} alt="Food preview" className="absolute inset-0 w-full h-full object-cover rounded-2xl" />
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center rounded-2xl">
                  <span className="text-sm text-white font-medium">Tap to change</span>
                </div>
              </>
            ) : (
              <>
                <Camera className="w-6 h-6 text-muted-foreground" />
                <span className="text-sm text-muted-foreground font-medium">Add a photo (optional)</span>
              </>
            )}
            <input type="file" accept="image/*" capture="environment" onChange={handlePhotoSelect} className="hidden" />
          </label>

          {/* Food name */}
          <div className="mb-4">
            <label className="text-sm font-semibold text-foreground mb-1.5 block">What food is available? *</label>
            <input
              type="text"
              placeholder="e.g., Pizza, sushi, bagels..."
              value={foodName}
              onChange={e => setFoodName(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-muted text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          {/* Event */}
          <div className="mb-4">
            <label className="text-sm font-semibold text-foreground mb-1.5 block">Event name</label>
            <input
              type="text"
              placeholder="e.g., Finance Club meeting"
              value={eventName}
              onChange={e => setEventName(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-muted text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          {/* Club / Organization */}
          <div className="mb-4">
            <label className="text-sm font-semibold text-foreground mb-1.5 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" /> Club / Organization
            </label>
            <div className="flex flex-wrap gap-1.5">
              {CLUB_LEADERBOARD.map(club => (
                <button
                  key={club.id}
                  onClick={() => setClubName(club.name === clubName ? '' : club.name)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                    clubName === club.name ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {club.emoji} {club.name}
                </button>
              ))}
              <button
                onClick={() => setClubName(clubName && !CLUB_LEADERBOARD.some(c => c.name === clubName) ? '' : 'Other')}
                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                  clubName && !CLUB_LEADERBOARD.some(c => c.name === clubName) ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                }`}
              >
                Other
              </button>
            </div>
            {clubName === 'Other' && (
              <input
                type="text"
                placeholder="Enter club or organization name"
                onChange={e => setClubName(e.target.value || 'Other')}
                className="mt-2 w-full px-4 py-3 rounded-xl bg-muted text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            )}
          </div>

          {/* Location */}
          <div className="mb-4">
            <label className="text-sm font-semibold text-foreground mb-1.5 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5" /> Building *
            </label>
            <div className="flex flex-wrap gap-2">
              {BUILDINGS.map(b => (
                <button
                  key={b}
                  onClick={() => setBuilding(b)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    building === b ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {b}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-4">
            <label className="text-sm font-semibold text-foreground mb-1.5 block">Room / Floor</label>
            <input
              type="text"
              placeholder="e.g., Room 2-60"
              value={room}
              onChange={e => setRoom(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-muted text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          {/* Quantity */}
          <div className="mb-4">
            <label className="text-sm font-semibold text-foreground mb-1.5 block">How much is left?</label>
            <div className="flex gap-2">
              {([['plenty', '🟢 Plenty'], ['some', '🟡 Some'], ['limited', '🔴 Limited']] as const).map(([val, label]) => (
                <button
                  key={val}
                  onClick={() => setQuantity(val)}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-semibold transition-colors ${
                    quantity === val ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Duration */}
          <div className="mb-4">
            <label className="text-sm font-semibold text-foreground mb-1.5 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" /> How long will it last?
            </label>
            <div className="flex gap-2">
              {['15', '30', '60', '90'].map(d => (
                <button
                  key={d}
                  onClick={() => setDuration(d)}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-semibold transition-colors ${
                    duration === d ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {d} min
                </button>
              ))}
            </div>
          </div>

          {/* Tags */}
          <div className="mb-4">
            <label className="text-sm font-semibold text-foreground mb-1.5 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5" /> Tags
            </label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {[...FOOD_TAGS.slice(0, 10)].map(tag => (
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
          </div>

          {/* Instructions */}
          <div className="mb-6">
            <label className="text-sm font-semibold text-foreground mb-1.5 block">Pickup instructions</label>
            <textarea
              placeholder="e.g., Second floor kitchen, door is open..."
              value={instructions}
              onChange={e => setInstructions(e.target.value)}
              rows={3}
              className="w-full px-4 py-3 rounded-xl bg-muted text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
            />
          </div>

          <button
            onClick={handleSubmit}
            className="w-full py-4 rounded-2xl gradient-violet text-primary-foreground font-bold text-base shadow-violet active:scale-95 transition-transform"
          >
            🚀 Post Food Drop
          </button>
        </motion.div>
      </div>

      <BottomNav />
    </div>
  );
};

export default PostFoodPage;
