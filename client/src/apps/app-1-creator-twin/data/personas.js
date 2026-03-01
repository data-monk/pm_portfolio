/**
 * Client-side persona configs for AI Creator Twin.
 * Mirrors server-side personas — kept in sync manually.
 * The full list is also fetched from /api/app-1/personas at runtime.
 */
export const PERSONAS = [
  {
    id: 'tech',
    name: 'Alex (TechTok)',
    handle: '@TechCreatorAlex',
    niche: 'Tech product reviews & setups',
    avatar: '🖥️',
    videoTitle: 'My Full Desk Setup Tour 2024 🖥️',
    videoDescription: 'Showing off my whole battle station — monitors, peripherals, and all the gear that helps me create content.',
    accentColor: '#00d4ff',   // neon blue
    thumbnail: null,           // no image; we'll render a styled placeholder
  },
  {
    id: 'lifestyle',
    name: 'Mia (LifestyleTok)',
    handle: '@MiaVibesOnly',
    niche: 'Fashion, self-care & daily routines',
    avatar: '✨',
    videoTitle: 'My Sunday Reset Routine ✨',
    videoDescription: 'Sharing my whole self-care Sunday — skincare, journaling, meal prep, and the little things that keep me grounded.',
    accentColor: '#f472b6',   // pink
    thumbnail: null,
  },
  {
    id: 'fitness',
    name: 'Jake (FitTok)',
    handle: '@JakeFitHome',
    niche: 'Home workouts & fitness motivation',
    avatar: '💪',
    videoTitle: '30-Min No-Equipment Full Body Burn 🔥',
    videoDescription: 'Zero equipment. Zero excuses. Full body workout you can do anywhere.',
    accentColor: '#f97316',   // orange
    thumbnail: null,
  },
]

export const PERSONA_MAP = Object.fromEntries(PERSONAS.map((p) => [p.id, p]))
