# Violet Crumbs — Product Specs

## Problem

Campus events at NYU Stern generate significant food waste: catered meals, leftover snacks, and excess beverages are routinely discarded after events end. Students nearby have no way to know food is available, and event organizers have no easy channel to alert others before food goes to waste.

## Solution

**Violet Crumbs** is a mobile-first food-sharing app for NYU Stern students. Event organizers post surplus food in seconds; nearby students see live alerts and can claim food before it expires.

**Core value proposition:** *Turn campus food waste into community wins.*

## Target Users

- **Posters:** Student org members, event coordinators, Career Center staff — anyone who has leftover catered food after an event
- **Finders:** NYU Stern students looking for free food between classes

## Core Features

### Feed (Browse)
- Real-time feed of active food posts sorted by recency and urgency
- Each card shows: food type, building/room, time posted, time until expiry, quantity (plenty/some/limited), dietary tags, "Heading There" count

### Food Detail
- Full post view: event name, organization, pickup instructions, photo, map pin
- Claim + "Heading There" actions (client-side state)
- Expiry countdown

### Post Food
- Quick-post form: title, food type, building, room, description, quantity, dietary tags, pickup instructions, expiry time
- Photo upload (UI only in MVP)

### Notifications
- New food nearby alerts
- Expiry warnings for saved posts
- Badge achievement notifications

### Campus Impact
- Community stats: total meals rescued, food saved (lbs), active posts today, active users
- Individual impact: meals rescued, food posted, impact points, earned badges

### Profile
- User stats and badge collection
- Favorite food types
- Activity history

## Gamification
Badges earned through activity:
- **First Bite** — rescued first meal
- **Waste Warrior** — rescued 10+ meals
- **Campus Saver** — posted food 3+ times
- **Free Food Finder** — found food 5 times
- **Sharing Star** — shared 5+ posts
- **Night Owl** — rescued food after 10pm

## Status

**Frontend MVP — no backend.** All data is client-side sample data (`lib/sampleData.ts`, `lib/clubData.ts`). The app is fully interactive but does not persist state or connect to any API.

Route: `/apps/violet-crumbs`

## Future Backend Needs

- User auth + profiles
- Real-time food post CRUD API
- Push notifications (expiry alerts, new food nearby)
- Geolocation-based filtering
- Claim/heading-there state persistence
- Image upload storage
