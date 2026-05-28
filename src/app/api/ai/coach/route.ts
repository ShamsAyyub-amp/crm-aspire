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
- Keep replies tight: a punchy headline sentence, then 2-4 short bullets or sentences.
- Use **bold** for things the rep should do.
- Reference deal names exactly as given.
- Never invent deals, contacts, numbers, or activities not in the data.
- Don't add disclaimers, signatures, or "as an AI" preambles.
- Don't add follow-up offers like "let me know if you'd like more detail."`;

  const userPrompt =
    mode === "briefing"
      ? `Morning briefing. Here's the rep's state:\n\n${summary}\n\nReturn the briefing the rep should read first thing today. Lead with a 1-line headline. Then up to 3 numbered actions, each with the deal name + why it matters. End with one short coaching tip if relevant.`
      : `The rep asked:\n"${message}"\n\nHere's their state:\n\n${summary}\n\nAnswer the question directly using their data. If the question is vague, pick the most useful interpretation and answer that.\n\nHere is the heuristic reply for reference — feel free to draw from it but improve the tone and reasoning:\n\n"${heuristic.reply}"`;

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
    lines.push("You're in good shape — no overdue tasks, no late-stage deals slipping.");
    lines.push("");
    lines.push("Use the slack to do one thing that future-you will thank present-you for: send a personal note to a champion in a closed_won deal, or block 30 min to prep for the next demo.");
  }

  return { reply: lines.join("\n"), actions };
}

function answerQuestion(message: string, c: Ctx): { reply: string; actions: Action[] } {
  const q = message.toLowerCase();
  const now = Date.now();

  // Pipeline / forecast questions.
  if (matches(q, ["pipeline", "forecast", "how am i doing", "how are we doing", "numbers"])) {
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

  // Focus / priorities / today.
  if (matches(q, ["focus", "today", "priorit", "what should i", "do now", "first"])) {
    return morningBriefing(c);
  }

  // Risk / at-risk / stuck.
  if (matches(q, ["risk", "stuck", "at risk", "slip", "danger"])) {
    const openMine = c.myDeals.filter((d) => OPEN_STAGES.includes(d.stage));
    const risky = openMine
      .filter((d) => (d.health_score ?? 100) < 60)
      .sort((a, b) => (a.health_score ?? 0) - (b.health_score ?? 0))
      .slice(0, 4);
    if (risky.length === 0) return { reply: "Nothing flagged at risk right now. Health scores are holding above 60 across your pipeline.", actions: [{ label: "Open pipeline", href: "/pipeline" }] };
    const lines = ["Four deals I'd watch:", ""];
    risky.forEach((d, i) => {
      lines.push(`${i + 1}. **${d.name}** — health ${d.health_score ?? "?"}. ${d.health_reasoning ?? ""}`);
    });
    return {
      reply: lines.join("\n"),
      actions: risky.slice(0, 2).map((d) => ({ label: d.name.slice(0, 30), href: `/deals/${d.id}` })),
    };
  }

  // Call / who to contact.
  if (matches(q, ["call", "who should i", "who to", "reach out"])) {
    const openMine = c.myDeals.filter((d) => OPEN_STAGES.includes(d.stage));
    // Late stage, no activity recently.
    const byDeal = new Map<string, Activity[]>();
    for (const a of c.allActs) if (a.deal_id) byDeal.set(a.deal_id, [...(byDeal.get(a.deal_id) ?? []), a]);
    const cands = openMine
      .map((d) => {
        const da = byDeal.get(d.id) ?? [];
        const last = da[0] ? Math.round((now - new Date(da[0].occurred_at).getTime()) / 86400000) : 999;
        return { d, last };
      })
      .filter((x) => x.last >= 4)
      .sort((a, b) => b.d.value_cents - a.d.value_cents)
      .slice(0, 3);
    if (cands.length === 0) return { reply: "Everyone's been touched recently. Maybe today's the day for a non-deal call — a check-in with a closed_won champion to get a referral.", actions: [] };
    const lines = ["These three are due for a human touch:", ""];
    cands.forEach((c, i) => lines.push(`${i + 1}. **${c.d.name}** — ${c.last}d since last activity. ${money$(c.d.value_cents)}.`));
    return { reply: lines.join("\n"), actions: cands.slice(0, 2).map((c) => ({ label: c.d.name.slice(0, 30), href: `/deals/${c.d.id}` })) };
  }

  // Help / tip / advice / generic.
  if (matches(q, ["help", "tip", "advice", "how do i", "coach"])) {
    return {
      reply:
`A coach's tip that compounds: **always book the next step on the call.** Not "I'll send some times" — actually pull up the calendar live and pencil it in.\n\nLook at your pipeline: every deal sitting at demo without a meeting logged probably violated this. The deals that close fastest are the ones where you never let the next-step gap go above 7 days.`,
      actions: [{ label: "Show me which deals", href: "/pipeline" }],
    };
  }

  // Default: try to surface anything matching a deal name in the question.
  const matchedDeal = c.allDeals.find((d) => q.includes(d.name.toLowerCase().split(" - ")[0].toLowerCase()) || q.includes(d.name.toLowerCase()));
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

function matches(q: string, kws: string[]): boolean {
  return kws.some((k) => q.includes(k));
}

function money$(cents: number): string {
  const v = cents / 100;
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${Math.round(v / 1_000)}K`;
  return `$${Math.round(v)}`;
}
