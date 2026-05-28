-- v2 additive migration. Safe to run on an existing v1 database.
-- Adds: won/lost reason on deals, quotas, tasks, sequences + enrollments.

-- Deals: capture *why* a deal closed.
alter table deals add column if not exists won_lost_reason text;
alter table deals add column if not exists stage_entered_at timestamptz;

-- Backfill stage_entered_at from updated_at for existing rows.
update deals set stage_entered_at = updated_at where stage_entered_at is null;

-- Keep stage_entered_at fresh whenever stage changes.
create or replace function touch_stage_entered() returns trigger as $$
begin
  if new.stage is distinct from old.stage then
    new.stage_entered_at := now();
  end if;
  return new;
end; $$ language plpgsql;

drop trigger if exists deals_stage_entered on deals;
create trigger deals_stage_entered before update on deals
  for each row execute function touch_stage_entered();

-- Quotas: monthly revenue target per rep.
create table if not exists quotas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  month_start date not null,
  target_cents bigint not null,
  currency text not null default 'USD',
  created_at timestamptz not null default now(),
  unique (user_id, month_start)
);

-- Tasks: distinct from activities. A task is something to do, not something logged.
create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid references deals(id) on delete cascade,
  contact_id uuid references contacts(id) on delete set null,
  owner_id uuid references users(id) on delete set null,
  title text not null,
  notes text,
  priority text not null default 'normal', -- low, normal, high
  due_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists tasks_owner_open_idx on tasks(owner_id, completed_at, due_at);
create index if not exists tasks_deal_idx on tasks(deal_id);

-- Sequences: multi-step email drips.
create table if not exists sequences (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  owner_id uuid references users(id) on delete set null,
  steps jsonb not null default '[]'::jsonb, -- [{day_offset:0, subject, body, type:'email'|'task'}, ...]
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists sequence_enrollments (
  id uuid primary key default gen_random_uuid(),
  sequence_id uuid not null references sequences(id) on delete cascade,
  contact_id uuid not null references contacts(id) on delete cascade,
  deal_id uuid references deals(id) on delete set null,
  current_step int not null default 0,
  status text not null default 'active', -- active, paused, completed, cancelled
  paused_reason text,
  enrolled_by uuid references users(id) on delete set null,
  enrolled_at timestamptz not null default now(),
  last_step_at timestamptz,
  next_step_at timestamptz,
  completed_at timestamptz
);
create index if not exists enrollments_contact_idx on sequence_enrollments(contact_id, status);
create index if not exists enrollments_next_step_idx on sequence_enrollments(next_step_at) where status = 'active';

-- Pause active enrollments for a contact when a reply lands.
-- Wired as a trigger so the demo "feels" intelligent without a worker.
create or replace function pause_enrollments_on_reply() returns trigger as $$
begin
  if new.type = 'email_received' and new.contact_id is not null then
    update sequence_enrollments
      set status = 'paused',
          paused_reason = 'auto: prospect replied',
          last_step_at = now()
    where contact_id = new.contact_id
      and status = 'active';
  end if;
  return new;
end; $$ language plpgsql;

drop trigger if exists activities_pause_seq on activities;
create trigger activities_pause_seq after insert on activities
  for each row execute function pause_enrollments_on_reply();

-- v2: RLS still off. Re-enable + policy before any real use.
alter table quotas disable row level security;
alter table tasks disable row level security;
alter table sequences disable row level security;
alter table sequence_enrollments disable row level security;
