# Project Overview: AI Tech Product Manager Portfolio

## Vision

A world-class, extensible portfolio website for an AI Tech Product Manager. The site is a central hub (Landing Page) showcasing standalone web applications that demonstrate product thinking and technical execution.

## Design Principles

- **Vibe:** Classy, minimalistic, AI-forward aesthetic
- **Color palette:** Dark mode (deep charcoal/black) with neon blue (`#00d4ff`) and soft purple (`#a855f7`) accents
- **Typography:** Inter / SF Pro — clean, modern, legible
- **Components:** Glassmorphism and subtle shadows for depth

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite + Tailwind CSS v3 + React Router v6 |
| Backend | Node.js + Express |
| Database | SQLite (portfolio meta) + Postgres (RaaS) |
| Vector DB | Pinecone |
| Deployment | Docker Compose + Nginx + Vultr VPS |

## Monorepo Structure

```
portfolio-monorepo/
├── client/               # React frontend (Vite)
│   └── src/
│       ├── components/   # Shared: Navbar, Footer, AppCard
│       ├── pages/        # LandingPage.jsx
│       └── apps/         # One subfolder per portfolio app
├── server/               # Node/Express backend
│   ├── routes/           # API route definitions
│   ├── controllers/      # Business logic per app
│   └── lib/              # Shared libs (embeddings, Pinecone, LLM)
├── database/             # init.sql + raas-schema.sql
└── docker-compose.yml    # Orchestrates all services
```

## Portfolio Apps

| # | Name | Route | Status | Key Tech | Docs |
|---|------|-------|--------|----------|------|
| 1 | EngageAI (Creator Twin) | `/apps/creator-twin` | MVP built; needs seed + OPENAI_API_KEY | RAG, Pinecone, OpenAI | [creator-twin/](creator-twin/) |
| 2 | AI Chatbot | `/apps/chatbot` | Placeholder | — | — |
| 3 | RAG as a Service | `/apps/raas` | Full MVP built; needs env vars + Pinecone index | Postgres, JWT, Google Drive, Pinecone | [raas/](raas/) |
| 4 | Violet Crumbs | `/apps/violet-crumbs` | Frontend MVP (no backend) | TypeScript, shadcn/ui, Framer Motion | [violet-crumbs/](violet-crumbs/) |

## Adding a New App

1. Add a row to `portfolio_apps` in `database/init.sql`
2. Add a route in `client/src/App.jsx`
3. Create UI in `client/src/apps/app-N-name/`
4. Add controller in `server/controllers/app-N/`

## Branch & Deploy

- Branch strategy: `dev` (development) → `prod` (triggers auto-deploy)
- See `git_strategy.md` for workflow details
- See `Deployment.md` for VPS/CI/CD infrastructure details
