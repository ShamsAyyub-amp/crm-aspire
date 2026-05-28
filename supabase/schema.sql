-- crm-aspire v1 schema. Run in the Supabase SQL editor on a fresh project.
-- v1 disables RLS (auth is faked client-side). Lock down before any real use.

create extension if not exists "pgcrypto";

drop table if exists activities cascade;
drop table if exists deals cascade;
drop table if exists contacts cascade;
drop table if exists companies cascade;
drop table if exists users cascade;
drop type if exists deal_stage cascade;
drop type if exists deal_status cascade;
drop type if exists activity_type cascade;

create type deal_stage as enum (
  'lead', 'qualified', 'demo', 'proposal', 'negotiation', 'closed_won', 'closed_lost'
);

create type deal_status as enum ('open', 'won', 'lost');

create type activity_type as enum (
  'call', 'email_sent', 'email_received', 'meeting', 'note', 'stage_change', 'task'
);

create table users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null unique,
  avatar_url text,
  role text not null default 'rep',
  created_at timestamptz not null default now()
);

create table companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  domain text,
  industry text,
  employees int,
  city text,
  country text,
  owner_id uuid references users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table contacts (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null,
  email text,
  phone text,
  title text,
  company_id uuid references companies(id) on delete set null,
  owner_id uuid references users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table deals (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  company_id uuid references companies(id) on delete set null,
  primary_contact_id uuid references contacts(id) on delete set null,
  owner_id uuid references users(id) on delete set null,
  stage deal_stage not null default 'lead',
  status deal_status not null default 'open',
  value_cents bigint not null default 0,
  currency text not null default 'USD',
  probability int not null default 10,
  expected_close_date date,
  source text,
  health_score int,
  health_reasoning text,
  health_risks jsonb,
  health_updated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  closed_at timestamptz
);

create table activities (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid references deals(id) on delete cascade,
  contact_id uuid references contacts(id) on delete set null,
  type activity_type not null,
  subject text,
  body text,
  owner_id uuid references users(id) on delete set null,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  meta jsonb
);

create index activities_deal_idx on activities(deal_id, occurred_at desc);
create index activities_owner_idx on activities(owner_id, occurred_at desc);
create index deals_owner_idx on deals(owner_id);
create index deals_stage_idx on deals(stage);
create index contacts_company_idx on contacts(company_id);

-- Keep updated_at fresh on deal edits.
create or replace function touch_updated_at() returns trigger as $$
begin new.updated_at := now(); return new; end; $$ language plpgsql;

create trigger deals_touch before update on deals
  for each row execute function touch_updated_at();

-- v1: RLS off. Re-enable + add policies before exposing to real users.
alter table users disable row level security;
alter table companies disable row level security;
alter table contacts disable row level security;
alter table deals disable row level security;
alter table activities disable row level security;
