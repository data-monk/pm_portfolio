# Creator Twin (EngageAI) — Product Specs

## Problem

As creators grow on platforms like TikTok, they face an engagement scalability bottleneck:

- Thousands of comments and DMs become unmanageable
- Engagement drops due to slow or no replies
- Monetization opportunities (product questions) are missed
- Audience connection weakens over time

TikTok optimizes content distribution but does not solve engagement scalability.

## Solution

**EngageAI (AI Creator Twin)** is a RAG-powered engagement copilot that:

- Automatically replies to comments in the creator's tone and style
- Mimics personality using past replies as grounding context
- Provides accurate, context-aware answers using past content
- Enables monetization via smart product linking

**Core value proposition:** *"Scale authentic engagement without losing your voice."*

## Target Users

- Mid to large creators (10k–1M followers)
- Influencers with monetizable audiences
- Creators receiving high comment volume

## Core Features

### 1. Smart Comment Reply
- AI responds to comments in the creator's tone
- Context-aware: uses video transcript + past replies via RAG

### 2. Personality Cloning
- Learns writing style, emoji usage, and tone (funny, casual, sarcastic)
- Produces a consistent voice grounded in real past replies

### 3. Product & Link Responses
- Detects product-related questions ("where", "link", "buy")
- Responds with relevant affiliate/product links

### 4. Persona Configuration
- Multiple selectable creator personas (each with distinct niche, tone, avatar)
- Per-persona Pinecone namespace for isolated knowledge

### 5. Safety Guardrails (Configurable)
- Guardrail toggles: no profanity, no hate speech, no medical/financial advice, etc.
- Confidence score from Pinecone similarity — lower score = less grounded reply

## Success Metrics

| Category | Metric |
|----------|--------|
| North Star | Replies per creator per day |
| Engagement | Comment reply rate (%), avg response time, engagement per reply |
| Monetization | Link CTR, conversion rate, GMV |
| Creator value | Time saved per day |

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Loss of authenticity | Human-in-the-loop approval (manual override) |
| Incorrect responses | RAG grounding + confidence filtering |
| Tone mismatch | Persona-specific few-shot examples from seed data |
| Spam/over-automation | Rate limiting + confidence threshold |

## Revision History

### UI/Settings Updates (6 Changes)

1. **Remove "App 1 — RAG Pipeline Demo"** — removed all occurrences of the old internal label from UI
2. **Rename to "EngageAI for Creators"** — new display name in header, nav, document title, config constants
3. **Update description copy** — "EngageAI — AI-powered creator engagement copilot. Built a style-aware reply generation system using RAG to mimic creator tone and increase engagement."
4. **Manual reply in influencer view** — added inline reply button + textarea; stores reply with `reply_type="manual"`, `created_by="creator"`; "Use AI draft" populates textarea without auto-posting
5. **Settings: macOS-style layout** — left sidebar (groups: Guardrails, Influencer View Metrics, Reply Automation) + right content panel; group persisted in URL query param
6. **Reply Automation settings group** — auto/manual/hybrid mode selector; confidence threshold slider; likes-based reply rule; comment type toggles; always-manual keyword list; rate limits; timing window; approval queue toggle
