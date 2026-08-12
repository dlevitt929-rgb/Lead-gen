# LeadForge

A real-data sales operations platform for a one-person website-development
business: find real local businesses, score them as website opportunities,
run a focused cold-calling pipeline, and generate a website concept to pitch.

The product name is intentionally easy to change — see [Settings → Product](#rename-the-product).

## What's real vs. what's not

Every business, phone number, rating, review count and website URL shown in
this app comes from a live provider call (Google Places or OpenStreetMap) —
**nothing is hardcoded or fabricated**. Where a fact can't be verified
(an email address, for example), the UI says so explicitly rather than
guessing. AI-generated content (sales angles, demo copy) is always labeled as
AI-generated or rule-based, never presented as a verified fact.

## Stack

- **Framework**: Next.js 16 (App Router), React 19, TypeScript
- **Styling**: Tailwind CSS v4, hand-built component primitives on Radix UI
  (no external UI kit dependency — full control, no black-box registry)
- **Database**: PostgreSQL via Prisma ORM (works with any Postgres, including
  Supabase)
- **Auth**: Auth.js (NextAuth v5) with email/password credentials — no
  external auth provider required to run this app
- **Maps**: Leaflet + OpenStreetMap tiles (free, no API key)
- **AI**: provider-agnostic abstraction over Anthropic Claude / OpenAI

## Architecture

```
src/lib/providers/        Lead-provider abstraction (Google Places, OpenStreetMap)
src/lib/services/         Business logic: scoring, auditing, AI, CRM, demos, analytics
src/lib/ai/               AI provider abstraction (Anthropic / OpenAI)
src/app/api/              Route handlers — thin wrappers around lib/services
src/app/(dashboard)/      The authenticated app (one route per nav item)
src/app/(auth)/           Sign in / sign up
src/components/           UI, grouped by feature area + components/ui primitives
prisma/schema.prisma      Full relational schema
```

### Data model

`Business` / `BusinessLocation` / `Contact` / `Website` / `WebsiteAudit` are a
**shared cache of real-world data** — discover a business once, reuse it
forever, the same way a CRM separates "company" data from "my relationship to
them." `Lead` is the per-user relationship to a `Business` (pipeline status,
value estimate). Everything sales-workflow-specific (`Call`, `Note`,
`FollowUp`, `Proposal`, `Demo`, `Activity`, `Tag`) hangs off `Lead`.

Every fact carries a `DataConfidence` (`VERIFIED` / `PUBLIC` / `AI_INFERRED` /
`ESTIMATED`) and a source string, shown in the UI, so you always know whether
you're looking at a fact or an inference.

### Lead providers (`src/lib/providers`)

`LeadProvider` is a small interface (`search(params)`); `OpenStreetMap` and
`GooglePlaces` both implement it, normalized to the same `RawBusinessResult`
shape. OpenStreetMap needs no key and is the default. Google Places is used
automatically once `GOOGLE_PLACES_API_KEY` is set, and results from both are
merged and de-duplicated when both are enabled. Adding a third provider means
implementing the interface and adding it to `PROVIDERS` in
`src/lib/providers/index.ts` — nothing else in the app is coupled to a vendor.

### Website auditor (`src/lib/services/website-auditor.ts`)

Runs a heuristic HTTP/HTML scan (SSL, mobile viewport, page title/meta
description, heading structure, alt text coverage, load time, CTA/booking/
WhatsApp/Google-Maps/social/contact-form detection, rough tech-stack
fingerprinting) — this always works, no key required. When
`GOOGLE_PAGESPEED_API_KEY` is set, real Lighthouse performance/accessibility/
SEO scores are merged in on top.

### Opportunity scoring (`src/lib/services/lead-scoring.ts`)

A deterministic, fully transparent point system (not an AI black box): no
website, missing HTTPS, no mobile viewport, poor performance, missing SEO
tags, no booking/CTA/WhatsApp/contact-form, combined with demand signals
(rating × review count) and contactability (do we have a phone number). Every
point added produces a human-readable reason, so the score doubles as your
call talking points.

### AI abstraction (`src/lib/ai`)

`getAIProvider()` picks Anthropic if `ANTHROPIC_API_KEY` is set, else OpenAI
if `OPENAI_API_KEY` is set, else `null`. `generateJSON()` wraps a provider
call with schema-validated JSON parsing. Every AI-backed feature
(`ai-sales-assistant.ts`) has a fully deterministic, rule-based fallback that
runs when no AI provider is configured — the app never blocks a feature on an
API key, it just gets less personalized.

## Getting started

```bash
pnpm install
cp .env.example .env
# fill in DATABASE_URL and AUTH_SECRET at minimum
pnpm prisma db push
pnpm dev
```

Open `http://localhost:3000`, create an account, and go to **Lead Finder**.
With no optional keys set, search uses OpenStreetMap and the website auditor
uses its heuristic scan — you'll get real businesses and real audits, just
without Google's richer contact data or Lighthouse's precise performance
numbers.

### Getting API keys

| Integration | Required? | Where to get it |
|---|---|---|
| PostgreSQL | Yes | Any Postgres, or [Supabase](https://supabase.com) (free tier) |
| Google Places API | No | [Google Cloud Console](https://developers.google.com/maps/documentation/places/web-service/get-api-key) — enable "Places API" |
| Google PageSpeed Insights | No | [Google Cloud Console](https://developers.google.com/speed/docs/insights/v5/get-started) |
| Anthropic Claude | No | [console.anthropic.com](https://console.anthropic.com/settings/keys) |
| OpenAI | No | [platform.openai.com](https://platform.openai.com/api-keys) |

See `.env.example` for the full list with inline explanations. **Settings →
Integrations** in the app shows live configured/not-configured status for
each — never guess.

### Rename the product

`Settings → Product` renames the app across the whole workspace (sidebar,
topbar, page titles) — it's stored per-user in the database, not hardcoded.

## MVP scope

Built in this order, per the brief's priority list — everything below is real
(no mocked data), fully wired end to end:

Authentication → Dashboard → Real business search (Google Places +
OpenStreetMap) → Business details → Lead saving → Website detection → Website
audit → Opportunity score → Lead table (Opportunities) → CRM (Kanban + table)
→ Calling workspace → Notes & follow-ups → AI sales angles → Map discovery →
Demo website generator → Analytics → Saved searches.

## Compliance & data quality

- No phone numbers, emails, ratings, reviews, or websites are ever invented.
  Missing data is shown as "No verified public email found," never guessed.
- Every contact fact shows its confidence level and source.
- **Do Not Contact**: marking a lead DNC is enforced in Settings, with a
  dedicated list to review, restore, or permanently delete that business's
  data.
- Search results are de-duplicated against previously discovered businesses
  (`Business` is a shared cache keyed by provider + place ID).
- This tool assists human-led, personalized outreach — there is no bulk
  messaging or automated dialing anywhere in the app.

## A note on this development environment

This build was developed inside a sandboxed session whose outbound network
allowlist covers only a few hosts (npm, PyPI, Anthropic, Google APIs) — it
does **not** include OpenStreetMap's Overpass/Nominatim services or arbitrary
business websites. That means the OpenStreetMap provider and the website
auditor's live HTTP checks could not be exercised end-to-end against the real
internet during development, even though they're implemented directly against
the documented, real APIs and were verified for correctness through
TypeScript, targeted route testing, and UI verification with seeded data. In
a normal hosting environment (Vercel, a VPS, etc.) these calls go out over
the open internet exactly as written. Google Places search and PageSpeed
Insights *are* reachable in this environment but require a real API key,
which this session does not have — so end-to-end live search could not be
demonstrated here either. Everything is wired for real data; add your keys
and it works.
