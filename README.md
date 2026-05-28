# Pipelytics — your AI sales coach

A sales CRM repositioned around one promise: **make a rep's life easy**. Pipelytics has a coach that reads the pipeline every morning, tells the rep what to do next, drafts the next email, and surfaces what a manager would catch — without burning the rep's time on 1:1 status meetings.

Built for the Aspire Leadership Summit "Build a Sales CRM with Claude" workshop. Spine + AI-first features, every external mocked behind realistic heuristics so the app demos end-to-end without API keys.

## What's in v2

Built across two versions:
- **v1**: pipeline + dashboard + deal detail + AI health/draft/next-actions + contacts/companies
- **v2**: drag-and-drop pipeline, full analytics, ⌘K command palette, AI deal brief, integrations surface, quotas, sequences, conversation intelligence

### Features

- **Pipeline (Kanban)** — drag-and-drop between stages, aging chips (`12d in stage`) that turn amber → red as deals stall, red `stuck-glow` halo on long-stuck cards. Drop zones at the bottom for marking Won / Lost open a modal that captures the **win/loss reason** (drives the analytics donut).
- **Dashboard** — KPIs (open pipeline, weighted forecast, won, win rate, avg deal size, at-risk count), stage-funnel bars, leaderboard, top at-risk deals, **next-best-actions**, **"Claude noticed" cross-deal insights**, **quota progress** per rep, **recent activity** feed.
- **Deal detail** — every page leads with an **AI brief**: headline + narrative summary + signal chips + recommended next step. Below that: AI health ring with risks, AI email drafter (intent picker → editable draft → send), activity composer + timeline, **sequence enrollments** for the primary contact.
- **Analytics** — conversion funnel with stage-to-stage rates, 8-week **forecast cone** (Commit / Best / Pipeline), win rate by owner and by source, velocity (avg days in stage), **lost-reason donut**, pipeline coverage ratio, avg sales cycle.
- **Tasks** — Overdue / Due today / Upcoming / No date / Recently completed. Click-to-complete, deal-linked, owner-scoped.
- **Sequences** — multi-step email templates + enrollment dashboard. Replies trigger an auto-pause via Postgres trigger (no worker needed for demo). Manual pause/resume/cancel per enrollment.
- **Integrations** — settings page with 5 "Connected" cards (Gmail, Outlook Calendar, Slack, LinkedIn Sales Nav, Outbound Webhooks) showing last sync + activity counts, plus 3 available (Stripe, DocuSign, Twilio). In-app **Slack-style toast** fires when a deal moves to `closed_won`.
- **⌘K command palette** — global fuzzy search across deals/contacts/companies, jump-to navigation, **"Brief me on this deal"** runs the AI brief inline without leaving the palette.
- **Fake auth** — user switcher in the nav. Activities/ownership/quotas/next-actions all respect the current user.

### What's mocked (and how to swap)

| Surface | v2 behavior | Swap to real |
| --- | --- | --- |
| Deal health, brief, draft email, next-actions, cross-insights | Heuristic logic in `src/app/api/ai/*` — uses real activity recency, two-way engagement, close-date pressure, stage probabilities, etc. | Set `ANTHROPIC_API_KEY` and replace each `*WithClaude` function body with an Anthropic SDK call (structured output) |
| Email send | Writes an `email_sent` activity with `meta.mocked=true` | Set `RESEND_API_KEY` + `RESEND_FROM_EMAIL` and add the Resend call in `src/app/api/email/send/route.ts` |
| Sequence step execution | Schedule shown via `next_step_at`; not actually sent | Add a cron / scheduled function that picks up due `sequence_enrollments` and calls the email-send route |
| Slack/Gmail/Calendar/LinkedIn/Webhooks integrations | UI shows them as "Connected" with mocked sync stats and a Slack-style toast on `closed_won` | Each is a real OAuth integration — out of scope for v2 |
| Auth | Cookie-based user switcher | Replace `getCurrentUserId()` with Supabase auth + re-enable RLS in `schema.sql` |

The UI surfaces mocks honestly: `mocked send` chips on activities, "Heuristic mode" notes in AI panels.

## Setup

### Fresh install
1. **Supabase project** — create a fresh one, then in the SQL editor run **in order**:
   - `supabase/schema.sql` (creates the v1 tables; drops them if present)
   - `supabase/seed.sql` (seeds users / companies / contacts / deals / activities)
   - `supabase/migrations/002_v2_additions.sql` (adds quotas, tasks, sequences, won/lost reason, stage_entered_at)
   - `supabase/migrations/003_v2_seed.sql` (seeds quotas, tasks, sequences, enrollments)

2. **Env** — copy `.env.local.example` → `.env.local`, fill `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`. Leave AI/Resend blank for the heuristic demo.

3. **Install + run**
   ```bash
   npm install
   npm run dev
   ```
   App at http://localhost:3000. Press ⌘K to test the palette.

### Upgrading an existing v1 install
Just run the two v2 migration files. They're **additive** — no `DROP TABLE` against your existing data:
- `supabase/migrations/002_v2_additions.sql`
- `supabase/migrations/003_v2_seed.sql`

Then redeploy.

## Demo script (3 minutes)

1. **Dashboard (30s)** — "Here's the room a sales leader opens Monday morning." Point to weighted forecast, quota progress per rep, **"Claude noticed"** cross-deal patterns, leaderboard.
2. **Press ⌘K (30s)** — search "north" → pick the deal → hit **Brief me**. Claude paragraph appears inline. *"This is Claude at runtime, not at build time."*
3. **Pipeline (45s)** — drag a deal from Demo → Proposal. Watch weighted totals re-compute. Drag another to the **Won** drop zone — modal asks for reason, Slack-style toast fires in the corner: *"🏆 Deal Won — #sales-wins"*.
4. **Deal detail (45s)** — open a deal. **AI brief** at the top is the moneymaker. Hit **Re-score** on the health panel, watch the ring animate. Pick **Re-engage**, generate, edit one line, **Send**. Activity appears in timeline with the `mocked send` chip.
5. **Analytics (30s)** — show the funnel, the **forecast cone**, the lost-reason donut. *"Notice the reason capture from earlier already landed here."*

## Architecture

```
src/
  app/
    actions.ts                     server actions (move stage, log activity, enroll, complete task, rescore)
    layout.tsx                     nav + toaster + ⌘K palette wrapper
    dashboard/page.tsx             KPIs · quotas · cross-insights · next-actions · leaderboard · at-risk
    pipeline/page.tsx              DnD Kanban + aging + won/lost modal
    deals/[id]/page.tsx            AI brief · health panel · activity · sequences · details
    analytics/page.tsx             funnel · forecast cone · win rate · velocity · lost reasons
    tasks/page.tsx                 overdue / today / upcoming queue
    sequences/page.tsx             templates + enrollments dashboard
    contacts/page.tsx, companies/page.tsx
    integrations/page.tsx          mocked Gmail/Slack/Calendar/LinkedIn/Webhooks + Stripe/DocuSign/Twilio
    api/
      ai/deal-health, ai/draft-email, ai/next-actions, ai/deal-brief, ai/cross-insights
      email/send
      search                       Cmd+K backend
      deals/[id]/enrollments       deal-page enrollment data
  components/
    command-palette.tsx            cmdk-powered ⌘K with inline AI brief
    pipeline-board.tsx             @dnd-kit/sortable, aging, close-reason modal
    deal-brief.tsx, deal-ai-panel.tsx, deal-enrollments.tsx
    cross-insights.tsx, quota-widget.tsx, next-actions.tsx
    charts.tsx                     hand-rolled SVG funnel/donut/forecast/HBar
    toaster.tsx                    in-app Slack-style toast, listens for crm:deal-won
    activity-composer.tsx, task-row.tsx, enrollment-row.tsx
    nav.tsx, user-switcher.tsx, health-dot.tsx
  lib/
    supabase.ts, types.ts, user.ts, format.ts
supabase/
  schema.sql                       v1 schema
  seed.sql                         v1 seed (6 users, 12 companies, 24 contacts, 28 deals, ~25 activities)
  migrations/
    002_v2_additions.sql           quotas, tasks, sequences, enrollments, won_lost_reason, stage_entered_at trigger, auto-pause-on-reply trigger
    003_v2_seed.sql                quotas (this month + last), tasks (8), sequences (3 templates), enrollments (5)
```

## Stack

Next.js 15 (App Router) · React 19 · TypeScript · Tailwind · Supabase (Postgres) · @dnd-kit · cmdk · Anthropic API (swappable, mocked in v2) · Vercel.

## What's still next (v3 ideas)

- Real Anthropic SDK calls with structured output (currently heuristics behind the same interfaces).
- Cron / scheduled fn that walks `sequence_enrollments.next_step_at` and actually sends the next step.
- Real Resend send + open/click webhook → activity row.
- Inline edit on deal detail (click value/close-date to edit).
- Re-enable RLS and wire Supabase auth; today is god-mode via service role.
- Forecast accuracy chart (snapshotted forecast over time vs. actual).
- Conversation intelligence on real call transcripts (Gong-style).
