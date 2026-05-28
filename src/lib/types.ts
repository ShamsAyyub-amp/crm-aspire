export type DealStage =
  | "lead"
  | "qualified"
  | "demo"
  | "proposal"
  | "negotiation"
  | "closed_won"
  | "closed_lost";

export type DealStatus = "open" | "won" | "lost";

export type ActivityType =
  | "call"
  | "email_sent"
  | "email_received"
  | "meeting"
  | "note"
  | "stage_change"
  | "task";

export type User = {
  id: string;
  name: string;
  email: string;
  avatar_url: string | null;
  role: string;
};

export type Company = {
  id: string;
  name: string;
  domain: string | null;
  industry: string | null;
  employees: number | null;
  city: string | null;
  country: string | null;
  owner_id: string | null;
};

export type Contact = {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  title: string | null;
  company_id: string | null;
  owner_id: string | null;
};

export type Deal = {
  id: string;
  name: string;
  company_id: string | null;
  primary_contact_id: string | null;
  owner_id: string | null;
  stage: DealStage;
  status: DealStatus;
  value_cents: number;
  currency: string;
  probability: number;
  expected_close_date: string | null;
  source: string | null;
  health_score: number | null;
  health_reasoning: string | null;
  health_risks: { label: string; severity: "low" | "med" | "high" }[] | null;
  health_updated_at: string | null;
  won_lost_reason: string | null;
  stage_entered_at: string | null;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
};

export type Task = {
  id: string;
  deal_id: string | null;
  contact_id: string | null;
  owner_id: string | null;
  title: string;
  notes: string | null;
  priority: "low" | "normal" | "high";
  due_at: string | null;
  completed_at: string | null;
  created_at: string;
};

export type Quota = {
  id: string;
  user_id: string;
  month_start: string;
  target_cents: number;
  currency: string;
};

export type SequenceStep = {
  day_offset: number;
  subject: string;
  body: string;
  type?: "email" | "task";
};

export type Sequence = {
  id: string;
  name: string;
  description: string | null;
  owner_id: string | null;
  steps: SequenceStep[];
  active: boolean;
  created_at: string;
};

export type SequenceEnrollment = {
  id: string;
  sequence_id: string;
  contact_id: string;
  deal_id: string | null;
  current_step: number;
  status: "active" | "paused" | "completed" | "cancelled";
  paused_reason: string | null;
  enrolled_by: string | null;
  enrolled_at: string;
  last_step_at: string | null;
  next_step_at: string | null;
  completed_at: string | null;
};

export type Activity = {
  id: string;
  deal_id: string | null;
  contact_id: string | null;
  type: ActivityType;
  subject: string | null;
  body: string | null;
  owner_id: string | null;
  occurred_at: string;
  created_at: string;
  meta: Record<string, unknown> | null;
};

export const STAGES: { id: DealStage; label: string; probability: number }[] = [
  { id: "lead", label: "Lead", probability: 10 },
  { id: "qualified", label: "Qualified", probability: 25 },
  { id: "demo", label: "Demo", probability: 40 },
  { id: "proposal", label: "Proposal", probability: 60 },
  { id: "negotiation", label: "Negotiation", probability: 80 },
  { id: "closed_won", label: "Closed Won", probability: 100 },
  { id: "closed_lost", label: "Closed Lost", probability: 0 },
];

export const OPEN_STAGES: DealStage[] = ["lead", "qualified", "demo", "proposal", "negotiation"];
