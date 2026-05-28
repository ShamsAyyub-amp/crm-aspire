-- v2 additive seed. Safe to re-run.

-- Monthly quotas. Use current month + previous month.
delete from quotas where month_start in (date_trunc('month', current_date)::date, (date_trunc('month', current_date) - interval '1 month')::date);

insert into quotas (user_id, month_start, target_cents) values
  ('11111111-1111-1111-1111-111111111111', date_trunc('month', current_date)::date, 12000000),
  ('22222222-2222-2222-2222-222222222222', date_trunc('month', current_date)::date, 15000000),
  ('33333333-3333-3333-3333-333333333333', date_trunc('month', current_date)::date, 10000000),
  ('44444444-4444-4444-4444-444444444444', date_trunc('month', current_date)::date, 12000000),
  ('55555555-5555-5555-5555-555555555555', date_trunc('month', current_date)::date, 14000000),
  ('11111111-1111-1111-1111-111111111111', (date_trunc('month', current_date) - interval '1 month')::date, 12000000),
  ('22222222-2222-2222-2222-222222222222', (date_trunc('month', current_date) - interval '1 month')::date, 15000000),
  ('33333333-3333-3333-3333-333333333333', (date_trunc('month', current_date) - interval '1 month')::date, 10000000),
  ('44444444-4444-4444-4444-444444444444', (date_trunc('month', current_date) - interval '1 month')::date, 12000000),
  ('55555555-5555-5555-5555-555555555555', (date_trunc('month', current_date) - interval '1 month')::date, 14000000);

-- Tasks.
truncate tasks restart identity;
insert into tasks (deal_id, owner_id, title, priority, due_at) values
  ('d0000001-0000-0000-0000-000000000010', '11111111-1111-1111-1111-111111111111', 'Follow up on proposal v1', 'high',   now() + interval '1 day'),
  ('d0000001-0000-0000-0000-000000000014', '22222222-2222-2222-2222-222222222222', 'Send red-lined MSA',          'high',   now() + interval '6 hours'),
  ('d0000001-0000-0000-0000-000000000015', '55555555-5555-5555-5555-555555555555', 'Schedule CIO follow-up call', 'high',   now() + interval '2 days'),
  ('d0000001-0000-0000-0000-00000000000c', '22222222-2222-2222-2222-222222222222', 'Loop in procurement (Ravi)',  'normal', now() + interval '3 days'),
  ('d0000001-0000-0000-0000-000000000007', '33333333-3333-3333-3333-333333333333', 'Prep ROI model for Mariner',  'normal', now() + interval '4 days'),
  ('d0000001-0000-0000-0000-000000000016', '44444444-4444-4444-4444-444444444444', 'Push legal on Larkspur MSA',  'high',   now() - interval '1 day'),
  ('d0000001-0000-0000-0000-00000000000d', '55555555-5555-5555-5555-555555555555', 'Get CIO 30-min slot',         'normal', now() + interval '5 days'),
  ('d0000001-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222', 'Send benchmark deck',         'low',    now() + interval '7 days');

-- Backfill lost reasons on closed_lost deals (drives the lost-reason analytics).
update deals set won_lost_reason = 'Price — went with incumbent' where id = 'd0000001-0000-0000-0000-00000000001b';
update deals set won_lost_reason = 'No budget this fiscal year' where id = 'd0000001-0000-0000-0000-00000000001c';

-- Sequences (templates).
truncate sequences restart identity cascade;
insert into sequences (id, name, description, owner_id, steps) values
  ('5e000001-0000-0000-0000-000000000001', 'New inbound — 5 step', 'Generic warm-inbound follow-up cadence.', '11111111-1111-1111-1111-111111111111',
   '[
     {"day_offset":0, "subject":"Quick thanks + next step",        "body":"Hi {{first}}, thanks for the inbound. Sharing a 90-second overview and three time slots."},
     {"day_offset":3, "subject":"In case the inbox swallowed it",  "body":"Hi {{first}}, bumping this up. Are next Tue/Wed/Thu workable?"},
     {"day_offset":7, "subject":"One short proof point",           "body":"Hi {{first}}, a 30-sec teardown of how a similar team unlocked $X."},
     {"day_offset":12,"subject":"Different angle",                 "body":"Hi {{first}}, switching tack — should I introduce you to one of our customers in {{industry}} instead?"},
     {"day_offset":18,"subject":"Closing the loop",                "body":"Hi {{first}}, last note from my side. I''ll archive unless I hear back."}
   ]'::jsonb),
  ('5e000001-0000-0000-0000-000000000002', 'Cold outbound — VP Ops', 'Three-touch outbound to ops leaders, mid-market.', '22222222-2222-2222-2222-222222222222',
   '[
     {"day_offset":0, "subject":"{{company}} — 12 min on dispatch SLA?", "body":"Hi {{first}}, noticed {{company}} runs ~{{employees}} folks. Two of the three logistics teams we work with cut dispatch lag 40%+. Worth a fast look?"},
     {"day_offset":4, "subject":"Or skip the call — short Loom",         "body":"Hi {{first}}, here''s a 4-min Loom of what I had in mind for {{company}}. Honest feedback either way."},
     {"day_offset":10,"subject":"Closing tag",                            "body":"Hi {{first}}, parking this on my end. Reach out anytime."}
   ]'::jsonb),
  ('5e000001-0000-0000-0000-000000000003', 'Post-demo follow-up', 'Two-touch after a discovery + demo combo.', '33333333-3333-3333-3333-333333333333',
   '[
     {"day_offset":0, "subject":"Recap + 3 next steps",              "body":"Hi {{first}}, recap from earlier and three concrete next steps."},
     {"day_offset":5, "subject":"On the procurement loop-in",        "body":"Hi {{first}}, want me to loop in procurement directly so we don''t lose a week?"}
   ]'::jsonb);

-- Sample enrollments — some active, one paused (after the prospect replied).
truncate sequence_enrollments restart identity;
insert into sequence_enrollments (sequence_id, contact_id, deal_id, current_step, status, paused_reason, enrolled_by, enrolled_at, last_step_at, next_step_at) values
  ('5e000001-0000-0000-0000-000000000001', 'c0000001-0000-0000-0000-000000000001', 'd0000001-0000-0000-0000-000000000010', 2, 'active', null, '11111111-1111-1111-1111-111111111111', now() - interval '8 days', now() - interval '4 days', now() + interval '1 day'),
  ('5e000001-0000-0000-0000-000000000002', 'c0000001-0000-0000-0000-000000000003', 'd0000001-0000-0000-0000-000000000002', 1, 'paused', 'auto: prospect replied', '22222222-2222-2222-2222-222222222222', now() - interval '4 days', now() - interval '3 days', null),
  ('5e000001-0000-0000-0000-000000000001', 'c0000001-0000-0000-0000-000000000011', 'd0000001-0000-0000-0000-000000000004', 0, 'active', null, '44444444-4444-4444-4444-444444444444', now() - interval '1 day', now() - interval '1 day', now() + interval '2 days'),
  ('5e000001-0000-0000-0000-000000000003', 'c0000001-0000-0000-0000-000000000013', 'd0000001-0000-0000-0000-00000000000d', 1, 'active', null, '55555555-5555-5555-5555-555555555555', now() - interval '5 days', now() - interval '5 days', now()),
  ('5e000001-0000-0000-0000-000000000001', 'c0000001-0000-0000-0000-000000000018', 'd0000001-0000-0000-0000-000000000005', 0, 'active', null, '22222222-2222-2222-2222-222222222222', now() - interval '2 hours', null, now() + interval '3 days');

-- Mark some tasks completed so the "Today" view has both states.
update tasks set completed_at = now() - interval '6 hours' where title in ('Send benchmark deck');
