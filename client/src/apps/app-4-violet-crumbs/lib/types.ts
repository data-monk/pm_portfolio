export interface FoodPost {
  id: string;
  title: string;
  eventName: string;
  foodType: string;
  description: string;
  building: string;
  room: string;
  tags: string[];
  quantity: 'plenty' | 'some' | 'limited';
  postedAt: Date;
  expiresAt: Date;
  postedBy: string;
  organization: string;
  pickupInstructions: string;
  photoUrl: string;
  claimedCount: number;
  headingThereCount: number;
  isGone: boolean;
  lat: number;
  lng: number;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  mealsRescued: number;
  foodPosted: number;
  impactPoints: number;
  badges: Badge[];
  joinedAt: Date;
  favoriteTypes: string[];
}

export interface Badge {
  id: string;
  name: string;
  icon: string;
  description: string;
  earnedAt?: Date;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'new_food' | 'expiring' | 'badge' | 'system';
  read: boolean;
  createdAt: Date;
  foodPostId?: string;
}

export const FOOD_TAGS = [
  'Pizza', 'Bagels', 'Sushi', 'Boba', 'Dessert', 'Sandwiches', 
  'Salad', 'Tacos', 'Indian', 'Chinese', 'Mediterranean', 'Fruit',
  'Coffee', 'Snacks', 'Wraps', 'Pasta', 'Cookies', 'Juice'
] as const;

export const DIETARY_TAGS = [
  'Vegetarian', 'Vegan', 'Halal', 'Kosher', 'Gluten-Free', 
  'Dairy-Free', 'Nut-Free'
] as const;

export const MEAL_TAGS = [
  'Breakfast', 'Lunch', 'Dinner', 'Late Night', 'Snack'
] as const;

export const ALL_BADGES: Badge[] = [
  { id: 'waste-warrior', name: 'Waste Warrior', icon: '⚔️', description: 'Rescued 10+ meals' },
  { id: 'free-food-finder', name: 'Free Food Finder', icon: '🔍', description: 'Found food 5 times' },
  { id: 'campus-saver', name: 'Campus Saver', icon: '🌱', description: 'Posted food 3+ times' },
  { id: 'first-bite', name: 'First Bite', icon: '🍕', description: 'Rescued your first meal' },
  { id: 'sharing-star', name: 'Sharing Star', icon: '⭐', description: 'Shared 5+ food posts' },
  { id: 'night-owl', name: 'Night Owl', icon: '🦉', description: 'Rescued food after 10pm' },
];
