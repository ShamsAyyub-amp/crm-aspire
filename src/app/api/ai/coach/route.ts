import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { geminiEnabled, geminiText } from "@/lib/gemini";
import { OPEN_STAGES } from "@/lib/types";
import type { Activity, Deal, Task, User } from "@/lib/types";

// POST /api/ai/coach  { message?, ownerId, mode?: "briefing" | "ask" }
// Returns { reply, actions, mocked } — a coaching answer with optional clickable links.
//
// "briefing" mode (default for dashboard hero): the morning briefing — what to do today.
// "ask" mode: the rep typed a freeform question. We route to a coaching response.

type Action = { label: string; href: string };

export async function POST(req: Request) {
  const { message = "", ownerId, mode = "briefing" } = await req.json().catch(() => ({}));
  const db = supabaseAdmin();

  const [{ data: meR }, { data: dealsR }, { data: tasksR }, { data: actsR }] = await Promise.all([
    ownerId ? db.from("users").select("*").eq("id", ownerId).single() : Promise.resolve({ data: null }),
    db.from("deals").select("*"),
    db.from("tasks").select("*"),
    db.from("activities").select("*").order("occurred_at", { ascending: false }).limit(200),
  ]);
  const me = meR as User | null;
  const allDeals = (dealsR as Deal[]) ?? [];
  const allTasks = (tasksR as Task[]) ?? [];
  const allActs = (actsR as Activity[]) ?? [];

  const myDeals = ownerId ? allDeals.filter((d) => d.owner_id === ownerId) : allDeals;
  const myTasks = ownerId ? allTasks.filter((t) => t.owner_id === ownerId) : allTasks;

  const ctx = { me, myDeals, myTasks, allActs, allDeals };
  const useAi = geminiEnabled();

  // Heuristic always computed — used as fallback and to seed the model with
  // pre-computed action chips (deep-links) the model can't invent itself.
  const heuristic = mode === "briefing" || !message.trim() ? morningBriefing(ctx) : answerQuestion(message, ctx);

  if (!useAi) {
    return NextResponse.json({ ...heuristic, mocked: true });
  }

  const aiReply = await coachWithGemini({ ctx, mode: mode === "ask" ? "ask" : "briefing", message, heuristic });
  if (!aiReply) {
    return NextResponse.json({ ...heuristic, mocked: false, fallback: true });
  }
  return NextResponse.json({ reply: aiReply, actions: heuristic.actions, mocked: false });
}

async function coachWithGemini(input: {
  ctx: Ctx;
  mode: "briefing" | "ask";
  message: string;
  heuristic: { reply: string; actions: Action[] };
}): Promise<string | null> {
  const { ctx, mode, message, heuristic } = input;
  const summary = serializeContext(ctx);

  const system = `You are an AI sales coach inside Pipelytics. You speak like a great VP of Sales: direct, practical, never fluffy.

Style rules:
- Keep replies tight: a punchy first sentence, then 2-4 short numbered items or sentences.
- Use **bold** for deal names and things the rep should do.
- Reference deal names EXACTLY as given in the data.
- Never invent deals, contacts, numbers, activities, or facts not in the data.
- Cite concrete data points (last touch days, emails sent vs received, health score, stage, value) when justifying advice.
- Don't add disclaimers, signatures, or "as an AI" preambles.
- Don't add follow-up offers like "let me know if you'd like more detail."

Mode rules:
- BRIEFING mode: start with a personal greeting using the rep's first name and time-of-day ("Good morning, Sam.", "Hey Priya.", "Evening, Marcus."). Then up to 3 numbered priorities.
- ASK mode: do NOT use a greeting. Do NOT start with "Good morning" / "Hey" / "Evening". Lead with the direct answer to the question. The rep is mid-flow and wants the answer, not pleasantries.
- The heuristic reply is a starting point only — you may borrow real names, numbers, and concrete observations from it, but rewrite the prose, never copy it verbatim, and never repeat the heuristic's filler suggestions (e.g. "use the slack to...").`;

  const userPrompt =
    mode === "briefing"
      ? `MODE: BRIEFING\n\nRep state:\n\n${summary}\n\nReturn the briefing the rep should read first thing. Start with the greeting + first name. Then up to 3 numbered priorities, each with the deal name + concrete reason (cite the data). If everything is calm, suggest one concrete high-ROI move using a named deal (e.g. a referral call on a recent closed_won).`
      : `MODE: ASK\n\nThe rep asked:\n"${message}"\n\nRep state:\n\n${summary}\n\nAnswer the question directly. Lead with the answer in the first sentence — no greeting, no preamble. Cite specific deals by name and concrete data points to justify each recommendation.\n\nThe heuristic engine returned the following draft for reference. You may borrow the deals and reasons it identified, but DO NOT copy its prose. Rewrite in your own voice and improve the reasoning:\n\n---\n${heuristic.reply}\n---`;

  return geminiText(userPrompt, { system, temperature: 0.4, maxOutputTokens: 700 });
}

function serializeContext(ctx: Ctx): string {
  const lines: string[] = [];
  const name = ctx.me?.name ?? "Unknown";
  lines.push(`Rep: ${name} (${ctx.me?.role ?? "rep"})`);

  const openMine = ctx.myDeals.filter((d) => OPEN_STAGES.includes(d.stage));
  lines.push(`Open deals owned: ${openMine.length}`);

  // Top 10 most relevant deals (highest value or worst health)
  const ranked = openMine.slice().sort((a, b) => {
    const ha = a.health_score ?? 100;
    const hb = b.health_score ?? 100;
    if (ha !== hb) return ha - hb;
    return b.value_cents - a.value_cents;
  });
  const byId = new Map<string, Activity[]>();
  for (const a of ctx.allActs) if (a.deal_id) byId.set(a.deal_id, [...(byId.get(a.deal_id) ?? []), a]);

  lines.push("");
  lines.push("Open deal details (most relevant first):");
  for (const d of ranked.slice(0, 10)) {
    const acts = byId.get(d.id) ?? [];
    const last = acts[0]
      ? `${Math.round((Date.now() - new Date(acts[0].occurred_at).getTime()) / 86400000)}d ago`
      : "never";
    const out = acts.filter((a) => a.type === "email_sent").length;
    const inb = acts.filter((a) => a.type === "email_received").length;
    const meet = acts.filter((a) => a.type === "meeting").length;
    lines.push(
      `- ${d.name} | stage=${d.stage} | $${Math.round(d.value_cents / 100).toLocaleString()} | prob=${d.probability}% | health=${d.health_score ?? "—"} | close=${d.expected_close_date ?? "—"} | lastTouch=${last} | emails(out/in)=${out}/${inb} | meetings=${meet}${d.health_reasoning ? ` | note: ${d.health_reasoning}` : ""}`
    );
  }

  const openTasks = ctx.myTasks.filter((t) => !t.completed_at);
  if (openTasks.length > 0) {
    lines.push("");
    lines.push("Open tasks:");
    for (const t of openTasks.slice(0, 8)) {
      const due = t.due_at ? new Date(t.due_at).toLocaleString() : "no due date";
      const overdue = t.due_at && new Date(t.due_at).getTime() < Date.now() ? " (OVERDUE)" : "";
      lines.push(`- [${t.priority}] ${t.title} | due ${due}${overdue}`);
    }
  }

  return lines.join("\n");
}

type Ctx = {
  me: User | null;
  myDeals: Deal[];
  myTasks: Task[];
  allActs: Activity[];
  allDeals: Deal[];
};

function morningBriefing(c: Ctx): { reply: string; actions: Action[] } {
  const name = c.me?.name?.split(" ")[0] ?? "there";
  const now = Date.now();
  const openMine = c.myDeals.filter((d) => OPEN_STAGES.includes(d.stage));

  const overdueTasks = c.myTasks.filter((t) => !t.completed_at && t.due_at && new Date(t.due_at).getTime() < now);
  const todayCutoff = new Date();
  todayCutoff.setHours(23, 59, 59, 999);
  const dueToday = c.myTasks.filter((t) => !t.completed_at && t.due_at && new Date(t.due_at) <= todayCutoff && new Date(t.due_at).getTime() >= now);

  // Top deals to nudge: high value + low health, or stale at a late stage.
  const byDeal = new Map<string, Activity[]>();
  for (const a of c.allActs) if (a.deal_id) byDeal.set(a.deal_id, [...(byDeal.get(a.deal_id) ?? []), a]);

  const flagged: { deal: Deal; reason: string; daysSince: number }[] = [];
  for (const d of openMine) {
    const da = byDeal.get(d.id) ?? [];
    const lastTouch = da[0] ? Math.round((now - new Date(da[0].occurred_at).getTime()) / 86400000) : 999;
    if ((d.stage === "proposal" || d.stage === "negotiation") && lastTouch > 5) {
      flagged.push({ deal: d, daysSince: lastTouch, reason: `late-stage, no touch for ${lastTouch}d` });
    } else if (d.expected_close_date) {
      const days = Math.round((new Date(d.expected_close_date).getTime() - now) / 86400000);
      if (days <= 7 && d.stage !== "negotiation" && d.stage !== "closed_won") {
        flagged.push({ deal: d, daysSince: days, reason: `close date in ${days}d but still ${d.stage}` });
      }
    } else if ((d.health_score ?? 100) < 50) {
      flagged.push({ deal: d, daysSince: lastTouch, reason: `health is ${d.health_score ?? "?"}` });
    }
  }
  flagged.sort((a, b) => b.deal.value_cents - a.deal.value_cents);

  const lines: string[] = [];
  const actions: Action[] = [];
  const hour = new Date().getHours();
  const greet = hour < 12 ? "Good morning" : hour < 17 ? "Hey" : "Evening";

  lines.push(`${greet}, ${name}. Here's how I'd play today.`);
  lines.push("");

  let n = 0;
  if (overdueTasks.length > 0) {
    n++;
    const t = overdueTasks[0];
    lines.push(`${n}. **Clear the overdue task first.** "${t.title}" is past due — that's the kind of slip that turns into a lost deal in two weeks.`);
    actions.push({ label: `Open: ${t.title.slice(0, 32)}${t.title.length > 32 ? "…" : ""}`, href: t.deal_id ? `/deals/${t.deal_id}` : `/tasks` });
  }
  if (flagged.length > 0 && n < 3) {
    n++;
    const f = flagged[0];
    lines.push(`${n}. **${f.deal.name}** — ${f.reason}. Make this the call you make before lunch, not after.`);
    actions.push({ label: `Coach me on ${f.deal.name.slice(0, 28)}`, href: `/deals/${f.deal.id}` });
  }
  if (flagged.length > 1 && n < 3) {
    n++;
    const f = flagged[1];
    lines.push(`${n}. **${f.deal.name}** — ${f.reason}. Lower priority than #${n - 1} but don't let it slip into next week.`);
    actions.push({ label: `Open ${f.deal.name.slice(0, 28)}`, href: `/deals/${f.deal.id}` });
  }
  if (dueToday.length > 0 && n < 4) {
    lines.push("");
    lines.push(`Also on the list today: ${dueToday.slice(0, 3).map((t) => `"${t.title}"`).join(", ")}.`);
    actions.push({ label: "Open task queue", href: "/tasks" });
  }
  if (n === 0) {
    // Calm pipeline — turn it into a productive coaching moment instead of filler.
    lines.push("You're in good shape — no overdue tasks, no late-stage deals slipping.");
    // Find a concrete, named follow-up that actually moves the rep forward.
    const wonLately = c.myDeals
      .filter((d) => d.status === "won" && d.closed_at)
      .sort((a, b) => new Date(b.closed_at!).getTime() - new Date(a.closed_at!).getTime())
      .slice(0, 1);
    if (wonLately[0]) {
      lines.push("");
      lines.push(`Use the slack to compound: **${wonLately[0].name}** closed recently — a short personal note to that champion is the highest-ROI thing you can do today. Referrals come from people who feel remembered.`);
      actions.push({ label: `Open ${wonLately[0].name.slice(0, 28)}`, href: `/deals/${wonLately[0].id}` });
    } else {
      const stableHigh = openMine
        .filter((d) => (d.health_score ?? 100) >= 70)
        .sort((a, b) => b.value_cents - a.value_cents)
        .slice(0, 1);
      if (stableHigh[0]) {
        lines.push("");
        lines.push(`Lean into momentum: **${stableHigh[0].name}** is healthy and high-value. 15 min of prep beats 30 min of recovery.`);
        actions.push({ label: `Open ${stableHigh[0].name.slice(0, 28)}`, href: `/deals/${stableHigh[0].id}` });
      }
    }
  }

  return { reply: lines.join("\n"), actions };
}

function answerQuestion(message: string, c: Ctx): { reply: string; actions: Action[] } {
  const q = message.toLowerCase();
  const now = Date.now();

  // ────────────────────────────────────────────────────────────────
  // Order matters: most specific intents first. "today" is too broad
  // to live in the focus branch — "who should I call today?" used to
  // accidentally trigger the morning briefing.
  // ────────────────────────────────────────────────────────────────

  // Call / who to contact — must come before any "today" matcher.
  if (matches(q, ["call", "who should i call", "who to call", "reach out", "phone"])) {
    return whoToCall(c);
  }

  // Risk / at-risk / stuck — also specific.
  if (matches(q, ["risk", "stuck", "at risk", "slip", "danger", "going to die"])) {
    return atRisk(c);
  }

  // Pipeline / forecast questions.
  if (matches(q, ["pipeline", "forecast", "how am i doing", "how are we doing", "numbers", "quota"])) {
    return pipelineSummary(c);
  }

  // Email / draft / write
  if (matches(q, ["email", "draft", "write a", "reply to"])) {
    const matchedDeal = c.allDeals.find((d) =>
      q.includes(d.name.toLowerCase().split(" - ")[0].toLowerCase()) || q.includes(d.name.toLowerCase())
    );
    if (matchedDeal) {
      return {
        reply: `Open **${matchedDeal.name}** — the email drafter on the right side of the deal page has four intents (follow-up, schedule demo, close, re-engage). Pick one, edit the draft, send. The draft uses the same context I'm reading right now.`,
        actions: [{ label: `Open ${matchedDeal.name.slice(0, 28)}`, href: `/deals/${matchedDeal.id}` }],
      };
    }
  }

  // Focus / priorities — only triggers on intent words, not on "today" alone.
  if (matches(q, ["focus", "priorit", "what should i", "do now", "first thing", "where do i start"])) {
    return morningBriefing(c);
  }

  // Help / tip / advice / generic coaching.
  if (matches(q, ["tip", "advice", "how do i", "coach me on selling", "coaching"])) {
    return coachingTip(c);
  }

  // Default: try to surface anything matching a deal name in the question.
  const matchedDeal = c.allDeals.find((d) =>
    q.includes(d.name.toLowerCase().split(" - ")[0].toLowerCase()) || q.includes(d.name.toLowerCase())
  );
  if (matchedDeal) {
    return {
      reply: `Got it — you want me to coach you on **${matchedDeal.name}**. Open the deal and the "Your coach on this deal" panel at the top has my read. The recommended next step is the punchline.`,
      actions: [{ label: `Open ${matchedDeal.name.slice(0, 28)}`, href: `/deals/${matchedDeal.id}` }],
    };
  }

  return {
    reply:
`I can help with these (try one):\n\n- **What should I focus on today?**\n- **How's my pipeline?**\n- **What's at risk?**\n- **Who should I call today?**\n- **Coach me on <deal name>**`,
    actions: [],
  };
}

// ── Intent handlers ────────────────────────────────────────────────

function whoToCall(c: Ctx): { reply: string; actions: Action[] } {
  const now = Date.now();
  const openMine = c.myDeals.filter((d) => OPEN_STAGES.includes(d.stage));

  const byDeal = new Map<string, Activity[]>();
  for (const a of c.allActs) if (a.deal_id) byDeal.set(a.deal_id, [...(byDeal.get(a.deal_id) ?? []), a]);

  // Score each open deal on a "call-worthiness" axis. We *always* return
  // candidates — the call is the rep's lever, the coach picks the best ones.
  type Cand = { d: Deal; reason: string; priority: number; daysSince: number };
  const cands: Cand[] = [];

  for (const d of openMine) {
    const da = byDeal.get(d.id) ?? [];
    const lastTouch = da[0] ? Math.round((now - new Date(da[0].occurred_at).getTime()) / 86400000) : 999;
    const emailsOut = da.filter((a) => a.type === "email_sent").length;
    const emailsIn = da.filter((a) => a.type === "email_received").length;

    // Channel switch — silent email thread, time for a human voice.
    if (emailsOut >= 2 && emailsIn === 0 && lastTouch >= 3) {
      cands.push({
        d,
        priority: 100 + d.value_cents / 100000,
        daysSince: lastTouch,
        reason: `${emailsOut} unanswered emails — switch channel. Email isn't working here.`,
      });
      continue;
    }
    // Late-stage stall.
    if ((d.stage === "proposal" || d.stage === "negotiation") && lastTouch >= 4) {
      cands.push({
        d,
        priority: 90 + d.value_cents / 100000,
        daysSince: lastTouch,
        reason: `${d.stage} stage, no contact for ${lastTouch}d. Late-stage silence kills deals.`,
      });
      continue;
    }
    // Close-date crunch.
    if (d.expected_close_date) {
      const days = Math.round((new Date(d.expected_close_date).getTime() - now) / 86400000);
      if (days <= 10 && d.stage !== "negotiation" && d.stage !== "closed_won") {
        cands.push({
          d,
          priority: 80 + d.value_cents / 100000,
          daysSince: lastTouch,
          reason: `Close target in ${days}d but still ${d.stage}. Either accelerate or move the date — call drives it.`,
        });
        continue;
      }
    }
    // Low health.
    if ((d.health_score ?? 100) < 55) {
      cands.push({
        d,
        priority: 60 + d.value_cents / 100000,
        daysSince: lastTouch,
        reason: `Health ${d.health_score}/100. ${d.health_reasoning ?? "Worth a temperature check."}`,
      });
      continue;
    }
    // Quiet ≥7d.
    if (lastTouch >= 7) {
      cands.push({
        d,
        priority: 50 + d.value_cents / 100000,
        daysSince: lastTouch,
        reason: `Quiet for ${lastTouch}d. One nudge before the rep gets pulled into a new quarter.`,
      });
    }
  }

  cands.sort((a, b) => b.priority - a.priority);
  const top = cands.slice(0, 3);

  // If nothing surfaced (rep is genuinely on top of everything), pivot to
  // referral generation — a recently-won champion is the highest-ROI call.
  if (top.length === 0) {
    const wonLately = c.myDeals
      .filter((d) => d.status === "won" && d.closed_at)
      .sort((a, b) => new Date(b.closed_at!).getTime() - new Date(a.closed_at!).getTime())
      .slice(0, 2);
    if (wonLately.length > 0) {
      const lines = [
        "Everyone live in your pipeline has been touched recently — that's a good problem to have.",
        "",
        "The smart call today isn't on an open deal, it's a **referral call** to a champion in a recent win:",
        "",
      ];
      wonLately.forEach((d, i) => {
        lines.push(`${i + 1}. **${d.name}** — ${d.closed_at ? `closed ${Math.round((now - new Date(d.closed_at).getTime()) / 86400000)}d ago` : "recent win"}. Ask who else in their world is feeling the same pain.`);
      });
      return { reply: lines.join("\n"), actions: wonLately.slice(0, 2).map((d) => ({ label: d.name.slice(0, 30), href: `/deals/${d.id}` })) };
    }
    return {
      reply: "Pipeline is too quiet for me to pick a call. Either it's genuinely empty (in which case prospect today), or activity isn't being logged. Check the pipeline view and tell me what's actually moving.",
      actions: [{ label: "Open pipeline", href: "/pipeline" }],
    };
  }

  const lines: string[] = [];
  lines.push(`Three calls, in order:`);
  lines.push("");
  top.forEach((x, i) => {
    lines.push(`${i + 1}. **${x.d.name}** — ${money$(x.d.value_cents)}, ${x.d.stage}. ${x.reason}`);
  });
  if (top.length === 1) {
    lines.push("");
    lines.push("Only one deal really demands a call today — make it count.");
  }
  return {
    reply: lines.join("\n"),
    actions: top.slice(0, 3).map((x) => ({ label: x.d.name.slice(0, 30), href: `/deals/${x.d.id}` })),
  };
}

function atRisk(c: Ctx): { reply: string; actions: Action[] } {
  const openMine = c.myDeals.filter((d) => OPEN_STAGES.includes(d.stage));
  const risky = openMine
    .filter((d) => (d.health_score ?? 100) < 60)
    .sort((a, b) => (a.health_score ?? 0) - (b.health_score ?? 0))
    .slice(0, 4);
  if (risky.length === 0) return { reply: "Nothing flagged at risk right now. Health scores are holding above 60 across your pipeline.", actions: [{ label: "Open pipeline", href: "/pipeline" }] };
  const lines = [`${risky.length} deals I'd watch:`, ""];
  risky.forEach((d, i) => {
    lines.push(`${i + 1}. **${d.name}** — health ${d.health_score ?? "?"}. ${d.health_reasoning ?? ""}`);
  });
  return {
    reply: lines.join("\n"),
    actions: risky.slice(0, 3).map((d) => ({ label: d.name.slice(0, 30), href: `/deals/${d.id}` })),
  };
}

function pipelineSummary(c: Ctx): { reply: string; actions: Action[] } {
  const openMine = c.myDeals.filter((d) => OPEN_STAGES.includes(d.stage));
  const open$ = openMine.reduce((a, b) => a + b.value_cents, 0);
  const weighted = openMine.reduce((a, b) => a + (b.value_cents * b.probability) / 100, 0);
  const wonClosed = c.myDeals.filter((d) => d.status === "won" || d.status === "lost");
  const winRate = wonClosed.length ? Math.round((wonClosed.filter((d) => d.status === "won").length / wonClosed.length) * 100) : 0;
  return {
    reply: `You have **${openMine.length} open deals** worth ${money$(open$)} in raw pipeline. Weighted by stage probability that's ${money$(weighted)}. Win rate on closed deals: **${winRate}%**.\n\nHonest take: pipeline is fine, what matters this week is the late-stage stuff — that's where dollars actually convert. Open the analytics page for the funnel + forecast cone.`,
    actions: [
      { label: "Open analytics", href: "/analytics" },
      { label: "Open pipeline", href: "/pipeline" },
    ],
  };
}

function coachingTip(c: Ctx): { reply: string; actions: Action[] } {
  return {
    reply:
`A coach's tip that compounds: **always book the next step on the call.** Not "I'll send some times" — actually pull up the calendar live and pencil it in.\n\nLook at your pipeline: every deal sitting at demo without a meeting logged probably violated this. The deals that close fastest are the ones where you never let the next-step gap go above 7 days.`,
    actions: [{ label: "Show me which deals", href: "/pipeline" }],
  };
}

function matches(q: string, kws: string[]): boolean {
  return kws.some((k) => q.includes(k));
}

function money$(cents: number): string {
  const v = cents / 100;
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${Math.round(v / 1_000)}K`;
  return `$${Math.round(v)}`;
}
