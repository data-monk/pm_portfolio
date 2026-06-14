# Violet Crumbs — Architecture

## Stack

| Layer | Technology |
|-------|-----------|
| Language | TypeScript |
| Framework | React 18 (functional components + hooks) |
| Build tool | Vite (shared portfolio monorepo config) |
| Styling | Tailwind CSS + shadcn/ui component library |
| Animation | Framer Motion |
| Data fetching | TanStack Query (`@tanstack/react-query`) |
| Routing | React Router v6 (nested under `/apps/violet-crumbs/*`) |
| State | React local state + TanStack Query client cache |
| Data | Client-side only — `lib/sampleData.ts` + `lib/clubData.ts` |

## App Entry Point

`VioletCrumbsApp.tsx` is mounted as a nested route in the portfolio's `App.jsx`:

```jsx
<Route path="/apps/violet-crumbs/*" element={<VioletCrumbsApp />} />
```

Inside, it provides `QueryClient`, `TooltipProvider`, and `Toaster` wrappers, then defines sub-routes:

| Path | Component |
|------|-----------|
| `/apps/violet-crumbs` (index) | `LandingPage.tsx` |
| `/apps/violet-crumbs/feed` | `FeedPage.tsx` |
| `/apps/violet-crumbs/food/:id` | `FoodDetailPage.tsx` |
| `/apps/violet-crumbs/post` | `PostFoodPage.tsx` |
| `/apps/violet-crumbs/notifications` | `NotificationsPage.tsx` |
| `/apps/violet-crumbs/profile` | `ProfilePage.tsx` |
| `/apps/violet-crumbs/impact` | `CampusImpactPage.tsx` |

## Data Layer (Client-Side Only)

No backend. All data defined in:

| File | Contents |
|------|---------|
| `lib/sampleData.ts` | `SAMPLE_POSTS` (6 food posts), `SAMPLE_USER`, `SAMPLE_NOTIFICATIONS`, `IMPACT_STATS` |
| `lib/clubData.ts` | NYU Stern club/organization reference data |
| `lib/types.ts` | TypeScript interfaces: `FoodPost`, `UserProfile`, `Badge`, `Notification`; tag constants |
| `lib/userPreferences.ts` | User preference helpers |
| `lib/navigation.ts` | `VC_BASE` constant for route prefix |

### Core Data Types

```typescript
FoodPost {
  id, title, eventName, foodType, description,
  building, room, tags, quantity ('plenty'|'some'|'limited'),
  postedAt, expiresAt, postedBy, organization,
  pickupInstructions, photoUrl,
  claimedCount, headingThereCount, isGone,
  lat, lng
}

UserProfile {
  id, name, email, mealsRescued, foodPosted,
  impactPoints, badges, joinedAt, favoriteTypes
}

Badge { id, name, icon, description, earnedAt? }

Notification { id, title, message, type, read, createdAt, foodPostId? }
```

## Component Structure

```
VioletCrumbsApp.tsx          # Root with providers + router
├── pages/
│   ├── LandingPage.tsx      # Hero + CTA
│   ├── FeedPage.tsx         # Food post grid/list
│   ├── FoodDetailPage.tsx   # Single post detail + map
│   ├── PostFoodPage.tsx     # Post food form
│   ├── NotificationsPage.tsx
│   ├── ProfilePage.tsx      # User stats + badges
│   ├── CampusImpactPage.tsx # Community stats
│   └── NotFound.tsx
├── components/
│   ├── FoodCard.tsx         # Reusable post card
│   ├── BottomNav.tsx        # Mobile bottom navigation
│   ├── DietaryBadges.tsx    # Tag pill components
│   ├── NavLink.tsx          # Active-state nav link
│   └── ui/                  # shadcn/ui primitives (Button, Card, Badge, etc.)
├── hooks/
│   ├── use-mobile.tsx       # Responsive breakpoint hook
│   └── use-toast.ts         # Toast notification hook
└── lib/
    ├── types.ts
    ├── sampleData.ts
    ├── clubData.ts
    ├── userPreferences.ts
    ├── navigation.ts
    └── utils.ts             # cn() class merging utility
```

## Key Files

| File | Purpose |
|------|---------|
| `client/src/apps/app-4-violet-crumbs/VioletCrumbsApp.tsx` | App entry + routing |
| `client/src/apps/app-4-violet-crumbs/lib/types.ts` | All TypeScript interfaces + tag constants |
| `client/src/apps/app-4-violet-crumbs/lib/sampleData.ts` | All sample posts, user, notifications, impact stats |
| `client/src/apps/app-4-violet-crumbs/components/FoodCard.tsx` | Primary feed card component |
| `client/src/apps/app-4-violet-crumbs/components/BottomNav.tsx` | Mobile navigation bar |
| `client/src/apps/app-4-violet-crumbs/violet-crumbs.css` | App-scoped CSS overrides |

## Isolation

The app is scoped inside `.vc-app` CSS class to prevent style leakage into the rest of the portfolio. shadcn/ui components and Tailwind utilities are used only within this folder.
