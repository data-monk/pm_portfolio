export interface ClubImpact {
  id: string;
  name: string;
  emoji: string;
  foodPosts: number;
  mealsRescued: number;
  foodSavedLbs: number;
  co2AvoidedLbs: number;
}

export const CLUB_LEADERBOARD: ClubImpact[] = [
  { id: 'c1', name: 'Management Consulting Association', emoji: '💼', foodPosts: 34, mealsRescued: 189, foodSavedLbs: 126, co2AvoidedLbs: 252 },
  { id: 'c2', name: 'Stern Finance Club', emoji: '📈', foodPosts: 28, mealsRescued: 156, foodSavedLbs: 104, co2AvoidedLbs: 208 },
  { id: 'c3', name: 'South Asian Business Society', emoji: '🌏', foodPosts: 25, mealsRescued: 142, foodSavedLbs: 95, co2AvoidedLbs: 190 },
  { id: 'c4', name: 'Marketing Society', emoji: '🎯', foodPosts: 22, mealsRescued: 118, foodSavedLbs: 79, co2AvoidedLbs: 158 },
  { id: 'c5', name: 'Women in Business', emoji: '💪', foodPosts: 19, mealsRescued: 105, foodSavedLbs: 70, co2AvoidedLbs: 140 },
  { id: 'c6', name: 'Stern Student Government', emoji: '🏛️', foodPosts: 17, mealsRescued: 94, foodSavedLbs: 63, co2AvoidedLbs: 126 },
  { id: 'c7', name: 'Tech & Entrepreneurship Club', emoji: '🚀', foodPosts: 15, mealsRescued: 83, foodSavedLbs: 55, co2AvoidedLbs: 110 },
  { id: 'c8', name: 'Career Center Events', emoji: '🎓', foodPosts: 14, mealsRescued: 78, foodSavedLbs: 52, co2AvoidedLbs: 104 },
  { id: 'c9', name: 'Luxury & Retail Club', emoji: '✨', foodPosts: 11, mealsRescued: 61, foodSavedLbs: 41, co2AvoidedLbs: 82 },
  { id: 'c10', name: 'Stern Sustainability Club', emoji: '🌱', foodPosts: 10, mealsRescued: 55, foodSavedLbs: 37, co2AvoidedLbs: 74 },
];

export const CAMPUS_IMPACT = {
  totalMealsRescued: 2847,
  totalFoodSavedLbs: 1902,
  totalCo2AvoidedLbs: 3804,
  totalFoodPosts: 412,
  totalStudentsServed: 1563,
};

export const WEEKLY_TREND = [
  { day: 'Mon', meals: 42 },
  { day: 'Tue', meals: 58 },
  { day: 'Wed', meals: 71 },
  { day: 'Thu', meals: 65 },
  { day: 'Fri', meals: 38 },
  { day: 'Sat', meals: 15 },
  { day: 'Sun', meals: 12 },
];

export const MONTHLY_GROWTH = [
  { month: 'Sep', meals: 180 },
  { month: 'Oct', meals: 340 },
  { month: 'Nov', meals: 520 },
  { month: 'Dec', meals: 410 },
  { month: 'Jan', meals: 580 },
  { month: 'Feb', meals: 720 },
  { month: 'Mar', meals: 97 },
];

export const MILESTONES = [
  { text: 'Stern clubs helped save 720 meals last month', icon: '🎉' },
  { text: 'Top food-sharing club this week: Management Consulting Association', icon: '🏆' },
  { text: 'Campus food rescue grew 24% month-over-month', icon: '📈' },
  { text: '10 clubs actively contributing this semester', icon: '🤝' },
];
