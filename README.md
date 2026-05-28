# crm-aspire

A sales CRM built for the Aspire Leadership Summit "Build a Sales CRM with Claude" workshop. v1: spine + AI-first features, mock externals.

## What's in v1

- **Pipeline** — Kanban-style stage board, deals move via dropdown, weighted stage totals.
- **Deal detail** — full activity timeline, composer for notes/calls/meetings/emails.
- **Claude on this deal** — deal health score (0–100) with reasoning + risks; one-click re-score.
- **AI email drafter** — pick intent (follow up / schedule demo / close / re-engage) → drafted subject + body → editable → "send" (logs as activity in v1).
- **What to do today** — prioritized next-best-actions per rep across their open pipeline.
- **Executive dashboard** — open pipeline, weighted forecast, won, win rate, avg deal size, at-risk count, stage funnel, leaderboard, top at-risk deals.
- **Contacts + Companies** — list views with relations.
- **Fake auth** — user switcher in the nav. Activities and ownership respect the current user.

## What's mocked (and how to swap)

| Surface | v1 behavior | Swap to real |
| --- | --- | --- |
| Deal health, next-actions, draft email | Heuristic scoring/drafting in `src/app/api/ai/*` — realistic enough to demo | Set `ANTHROPIC_API_KEY` and swap the `*WithClaude` function bodies for Anthropic SDK calls |
| Email send | Writes an `email_sent` activity with `meta.mocked=true` | Set `RESEND_API_KEY` + `RESEND_FROM_EMAIL` and add the Resend call in `src/app/api/email/send/route.ts` |
| Auth | Cookie-based user switcher | Replace `getCurrentUserId()` with Supabase auth + re-enable RLS in `schema.sql` |

The brief gives points for being honest about mocks — the UI surfaces them with a chip.

## Setup

1. **Supabase project.** Create a fresh project, then in the SQL editor paste:
   - `supabase/schema.sql`
   - `supabase/seed.sql`

2. **Env.** Copy `.env.local.example` → `.env.local`, fill in `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` from your Supabase project's API settings. Leave `ANTHROPIC_API_KEY` and `RESEND_API_KEY` blank for v1.

3. **Install + run.**
   ```bash
   npm install
   npm run dev
   ```
   App at http://localhost:3000.

## Layout

```
src/
  app/
    actions.ts                  server actions (move stage, log activity, rescore)
    layout.tsx                  nav + user switcher
    page.tsx                    → /dashboard
    dashboard/page.tsx          executive view
    pipeline/page.tsx           Kanban
    deals/[id]/page.tsx         deal detail + AI panel
    contacts/page.tsx
    companies/page.tsx
    api/
      ai/deal-health/route.ts   POST { dealId } → { score, reasoning, risks }
      ai/draft-email/route.ts   POST { dealId, intent } → { subject, body }
      ai/next-actions/route.ts  POST { ownerId? } → { actions[] }
      email/send/route.ts       POST { dealId, contactId, subject, body }
  components/                   nav, pipeline-board, deal-ai-panel, etc.
  lib/                          supabase client, types, fake user, formatters
supabase/
  schema.sql                    full DB schema
  seed.sql                      6 users, 12 companies, 24 contacts, 28 deals, ~25 activities
```

## Demo flow (3 minutes)

1. **Dashboard** — "Here's the room a sales leader opens on Monday morning." Point to weighted forecast, at-risk count, the leaderboard.
2. **Pipeline** — "Here's where reps live. Drag a deal forward." Move one and show the dashboard recompute.
3. **Deal detail** — "Claude is the product here." Hit *Re-score* (watch the ring animate), point to the risks. Pick *Re-engage*, click *Generate*, edit a line, click *Send* — show the activity row land with the "mocked send" chip.
4. **What to do today** — "Switch to Priya." Point to her queue. "This isn't a static list — the same engine you saw on the deal is generating these."

## Stack

Next.js 15 (App Router) · React 19 · TypeScript · Tailwind · Supabase (Postgres) · Anthropic API (swappable, mocked in v1) · Vercel (deploy target).

## What's next (iteration ideas)

- Real Anthropic SDK call with structured output for health + risks + drafts.
- Resend integration for actual sends; track `email_opened` via webhook → activity.
- Drag-and-drop on the Kanban (currently dropdown — keeps v1 fast).
- Saved views and bulk import on contacts.
- Slack notifications on deal stage = closed_won.
- Forecasting (linear weighted, historical velocity) on the dashboard.
- Re-enable RLS and wire Supabase auth; today is god-mode via service role.
