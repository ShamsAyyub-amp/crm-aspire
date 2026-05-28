-- crm-aspire v1 seed. Run after schema.sql on a fresh project.
-- Idempotent: truncates first, so it's safe to re-run during the build.

truncate activities, deals, contacts, companies, users restart identity cascade;

-- Users (5 reps + 1 leader). The first user is the default current user.
insert into users (id, name, email, role, avatar_url) values
  ('11111111-1111-1111-1111-111111111111', 'Sam Chen',      'sam@acme.test',     'rep',    null),
  ('22222222-2222-2222-2222-222222222222', 'Priya Natarajan','priya@acme.test',  'rep',    null),
  ('33333333-3333-3333-3333-333333333333', 'Marcus Webb',   'marcus@acme.test', 'rep',    null),
  ('44444444-4444-4444-4444-444444444444', 'Elena Rossi',   'elena@acme.test',  'rep',    null),
  ('55555555-5555-5555-5555-555555555555', 'Jordan Kim',    'jordan@acme.test', 'rep',    null),
  ('66666666-6666-6666-6666-666666666666', 'Ava Sutton',    'ava@acme.test',    'leader', null);

-- Companies
insert into companies (id, name, domain, industry, employees, city, country, owner_id) values
  ('a0000001-0000-0000-0000-000000000001', 'Northwind Logistics',  'northwind.test',  'Logistics',      850, 'Chicago',     'US', '11111111-1111-1111-1111-111111111111'),
  ('a0000001-0000-0000-0000-000000000002', 'Helios Energy',        'helios.test',     'Energy',        2400, 'Houston',     'US', '22222222-2222-2222-2222-222222222222'),
  ('a0000001-0000-0000-0000-000000000003', 'Mariner Foods',        'mariner.test',    'CPG',            420, 'Seattle',     'US', '33333333-3333-3333-3333-333333333333'),
  ('a0000001-0000-0000-0000-000000000004', 'Bramble Robotics',     'bramble.test',    'Manufacturing',  180, 'Pittsburgh',  'US', '11111111-1111-1111-1111-111111111111'),
  ('a0000001-0000-0000-0000-000000000005', 'Larkspur Health',      'larkspur.test',   'Healthcare',    3100, 'Boston',      'US', '44444444-4444-4444-4444-444444444444'),
  ('a0000001-0000-0000-0000-000000000006', 'Quill & Crown',        'quillcrown.test', 'Retail',         210, 'London',      'UK', '55555555-5555-5555-5555-555555555555'),
  ('a0000001-0000-0000-0000-000000000007', 'Trellis Software',     'trellis.test',    'SaaS',           620, 'Toronto',     'CA', '22222222-2222-2222-2222-222222222222'),
  ('a0000001-0000-0000-0000-000000000008', 'Pinedale Mortgage',    'pinedale.test',   'Financial',     1450, 'Denver',      'US', '33333333-3333-3333-3333-333333333333'),
  ('a0000001-0000-0000-0000-000000000009', 'Halcyon Travel',       'halcyon.test',    'Travel',         310, 'Lisbon',      'PT', '44444444-4444-4444-4444-444444444444'),
  ('a0000001-0000-0000-0000-00000000000a', 'Ironclad Defense',     'ironclad.test',   'Aerospace',     5200, 'Arlington',   'US', '55555555-5555-5555-5555-555555555555'),
  ('a0000001-0000-0000-0000-00000000000b', 'Sable & Stone',        'sablestone.test', 'Legal',          140, 'New York',    'US', '11111111-1111-1111-1111-111111111111'),
  ('a0000001-0000-0000-0000-00000000000c', 'Verdant Agritech',     'verdant.test',    'Agriculture',    280, 'Des Moines',  'US', '22222222-2222-2222-2222-222222222222');

-- Contacts (2-3 per company on average)
insert into contacts (id, first_name, last_name, email, phone, title, company_id, owner_id) values
  ('c0000001-0000-0000-0000-000000000001', 'Maria',   'Alvarez',  'maria@northwind.test',  '+1-312-555-0101', 'VP Operations',         'a0000001-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111'),
  ('c0000001-0000-0000-0000-000000000002', 'David',   'Okafor',   'david@northwind.test',  '+1-312-555-0102', 'Director, Fleet',       'a0000001-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111'),
  ('c0000001-0000-0000-0000-000000000003', 'Ravi',    'Mehta',    'ravi@helios.test',      '+1-713-555-0201', 'Head of Procurement',   'a0000001-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222'),
  ('c0000001-0000-0000-0000-000000000004', 'Hannah',  'Schmidt',  'hannah@helios.test',    '+1-713-555-0202', 'CFO',                   'a0000001-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222'),
  ('c0000001-0000-0000-0000-000000000005', 'Tom',     'Becker',   'tom@mariner.test',      '+1-206-555-0301', 'Supply Chain Lead',     'a0000001-0000-0000-0000-000000000003', '33333333-3333-3333-3333-333333333333'),
  ('c0000001-0000-0000-0000-000000000006', 'Lila',    'Park',     'lila@mariner.test',     '+1-206-555-0302', 'COO',                   'a0000001-0000-0000-0000-000000000003', '33333333-3333-3333-3333-333333333333'),
  ('c0000001-0000-0000-0000-000000000007', 'Anika',   'Patel',    'anika@bramble.test',    '+1-412-555-0401', 'VP Engineering',        'a0000001-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111'),
  ('c0000001-0000-0000-0000-000000000008', 'Marcus',  'Lin',      'marcus@bramble.test',   '+1-412-555-0402', 'Plant Manager',         'a0000001-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111'),
  ('c0000001-0000-0000-0000-000000000009', 'Diana',   'Foster',   'diana@larkspur.test',   '+1-617-555-0501', 'Chief Medical Officer', 'a0000001-0000-0000-0000-000000000005', '44444444-4444-4444-4444-444444444444'),
  ('c0000001-0000-0000-0000-00000000000a', 'Ben',     'Holloway', 'ben@larkspur.test',     '+1-617-555-0502', 'Head of IT',            'a0000001-0000-0000-0000-000000000005', '44444444-4444-4444-4444-444444444444'),
  ('c0000001-0000-0000-0000-00000000000b', 'Olivia',  'Carr',     'olivia@quillcrown.test','+44-20-5550-0601','Head of Merchandising', 'a0000001-0000-0000-0000-000000000006', '55555555-5555-5555-5555-555555555555'),
  ('c0000001-0000-0000-0000-00000000000c', 'Henry',   'Marsh',    'henry@quillcrown.test', '+44-20-5550-0602','CEO',                   'a0000001-0000-0000-0000-000000000006', '55555555-5555-5555-5555-555555555555'),
  ('c0000001-0000-0000-0000-00000000000d', 'Nadia',   'Brunner',  'nadia@trellis.test',    '+1-416-555-0701', 'VP Product',            'a0000001-0000-0000-0000-000000000007', '22222222-2222-2222-2222-222222222222'),
  ('c0000001-0000-0000-0000-00000000000e', 'Chris',   'Wallace',  'chris@trellis.test',    '+1-416-555-0702', 'Director RevOps',       'a0000001-0000-0000-0000-000000000007', '22222222-2222-2222-2222-222222222222'),
  ('c0000001-0000-0000-0000-00000000000f', 'Felipe',  'Cruz',     'felipe@pinedale.test',  '+1-303-555-0801', 'SVP Originations',      'a0000001-0000-0000-0000-000000000008', '33333333-3333-3333-3333-333333333333'),
  ('c0000001-0000-0000-0000-000000000010', 'Sara',    'Quinn',    'sara@pinedale.test',    '+1-303-555-0802', 'Head of Compliance',    'a0000001-0000-0000-0000-000000000008', '33333333-3333-3333-3333-333333333333'),
  ('c0000001-0000-0000-0000-000000000011', 'Joana',   'Pereira',  'joana@halcyon.test',    '+351-21-555-0901','Director, Partnerships','a0000001-0000-0000-0000-000000000009', '44444444-4444-4444-4444-444444444444'),
  ('c0000001-0000-0000-0000-000000000012', 'Ethan',   'Pham',     'ethan@halcyon.test',    '+351-21-555-0902','CMO',                   'a0000001-0000-0000-0000-000000000009', '44444444-4444-4444-4444-444444444444'),
  ('c0000001-0000-0000-0000-000000000013', 'Marisol', 'Reyes',    'marisol@ironclad.test', '+1-703-555-1001', 'Director, Programs',    'a0000001-0000-0000-0000-00000000000a', '55555555-5555-5555-5555-555555555555'),
  ('c0000001-0000-0000-0000-000000000014', 'Greg',    'Donnelly', 'greg@ironclad.test',    '+1-703-555-1002', 'CIO',                   'a0000001-0000-0000-0000-00000000000a', '55555555-5555-5555-5555-555555555555'),
  ('c0000001-0000-0000-0000-000000000015', 'Iris',    'Vance',    'iris@sablestone.test',  '+1-212-555-1101', 'Managing Partner',      'a0000001-0000-0000-0000-00000000000b', '11111111-1111-1111-1111-111111111111'),
  ('c0000001-0000-0000-0000-000000000016', 'Owen',    'Reed',     'owen@sablestone.test',  '+1-212-555-1102', 'Director of Ops',       'a0000001-0000-0000-0000-00000000000b', '11111111-1111-1111-1111-111111111111'),
  ('c0000001-0000-0000-0000-000000000017', 'Pavel',   'Novak',    'pavel@verdant.test',    '+1-515-555-1201', 'CTO',                   'a0000001-0000-0000-0000-00000000000c', '22222222-2222-2222-2222-222222222222'),
  ('c0000001-0000-0000-0000-000000000018', 'Sienna',  'Whitley',  'sienna@verdant.test',   '+1-515-555-1202', 'VP Sales',              'a0000001-0000-0000-0000-00000000000c', '22222222-2222-2222-2222-222222222222');

-- Deals (28 across stages). probabilities roughly track stage.
insert into deals (id, name, company_id, primary_contact_id, owner_id, stage, status, value_cents, probability, expected_close_date, source) values
  -- lead (6)
  ('d0000001-0000-0000-0000-000000000001','Northwind - Fleet pilot',          'a0000001-0000-0000-0000-000000000001','c0000001-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','lead','open',  4200000,  10, (current_date + 75), 'Inbound'),
  ('d0000001-0000-0000-0000-000000000002','Helios - Procurement audit',       'a0000001-0000-0000-0000-000000000002','c0000001-0000-0000-0000-000000000003','22222222-2222-2222-2222-222222222222','lead','open',  6800000,  10, (current_date + 90), 'Outbound'),
  ('d0000001-0000-0000-0000-000000000003','Sable & Stone - SMB seat expansion','a0000001-0000-0000-0000-00000000000b','c0000001-0000-0000-0000-000000000015','11111111-1111-1111-1111-111111111111','lead','open', 1800000,  10, (current_date + 60), 'Referral'),
  ('d0000001-0000-0000-0000-000000000004','Halcyon - Loyalty platform',       'a0000001-0000-0000-0000-000000000009','c0000001-0000-0000-0000-000000000011','44444444-4444-4444-4444-444444444444','lead','open', 5400000,  10, (current_date + 80), 'Event'),
  ('d0000001-0000-0000-0000-000000000005','Verdant - Field rep tools',        'a0000001-0000-0000-0000-00000000000c','c0000001-0000-0000-0000-000000000018','22222222-2222-2222-2222-222222222222','lead','open', 2900000,  10, (current_date + 70), 'Inbound'),
  ('d0000001-0000-0000-0000-000000000006','Quill & Crown - UK rollout',       'a0000001-0000-0000-0000-000000000006','c0000001-0000-0000-0000-00000000000b','55555555-5555-5555-5555-555555555555','lead','open', 3300000,  10, (current_date + 95), 'Inbound'),

  -- qualified (5)
  ('d0000001-0000-0000-0000-000000000007','Mariner - Supply visibility',      'a0000001-0000-0000-0000-000000000003','c0000001-0000-0000-0000-000000000005','33333333-3333-3333-3333-333333333333','qualified','open', 5200000, 25, (current_date + 55), 'Outbound'),
  ('d0000001-0000-0000-0000-000000000008','Bramble - Plant analytics',        'a0000001-0000-0000-0000-000000000004','c0000001-0000-0000-0000-000000000008','11111111-1111-1111-1111-111111111111','qualified','open', 3800000, 25, (current_date + 50), 'Inbound'),
  ('d0000001-0000-0000-0000-000000000009','Trellis - RevOps suite',           'a0000001-0000-0000-0000-000000000007','c0000001-0000-0000-0000-00000000000d','22222222-2222-2222-2222-222222222222','qualified','open', 7100000, 25, (current_date + 65), 'Partner'),
  ('d0000001-0000-0000-0000-00000000000a','Pinedale - Compliance module',     'a0000001-0000-0000-0000-000000000008','c0000001-0000-0000-0000-000000000010','33333333-3333-3333-3333-333333333333','qualified','open', 4600000, 25, (current_date + 60), 'Outbound'),
  ('d0000001-0000-0000-0000-00000000000b','Larkspur - IT consolidation',      'a0000001-0000-0000-0000-000000000005','c0000001-0000-0000-0000-00000000000a','44444444-4444-4444-4444-444444444444','qualified','open', 9200000, 25, (current_date + 85), 'Referral'),

  -- demo (4)
  ('d0000001-0000-0000-0000-00000000000c','Helios - CFO dashboard',           'a0000001-0000-0000-0000-000000000002','c0000001-0000-0000-0000-000000000004','22222222-2222-2222-2222-222222222222','demo','open', 8400000, 40, (current_date + 40), 'Outbound'),
  ('d0000001-0000-0000-0000-00000000000d','Ironclad - Programs portal',       'a0000001-0000-0000-0000-00000000000a','c0000001-0000-0000-0000-000000000013','55555555-5555-5555-5555-555555555555','demo','open',11500000, 40, (current_date + 45), 'Inbound'),
  ('d0000001-0000-0000-0000-00000000000e','Mariner - COO scorecard',          'a0000001-0000-0000-0000-000000000003','c0000001-0000-0000-0000-000000000006','33333333-3333-3333-3333-333333333333','demo','open', 6200000, 40, (current_date + 35), 'Outbound'),
  ('d0000001-0000-0000-0000-00000000000f','Verdant - Sales analytics',        'a0000001-0000-0000-0000-00000000000c','c0000001-0000-0000-0000-000000000017','22222222-2222-2222-2222-222222222222','demo','open', 4400000, 40, (current_date + 30), 'Inbound'),

  -- proposal (4)
  ('d0000001-0000-0000-0000-000000000010','Northwind - VP Ops platform',      'a0000001-0000-0000-0000-000000000001','c0000001-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','proposal','open',12800000, 60, (current_date + 25), 'Inbound'),
  ('d0000001-0000-0000-0000-000000000011','Bramble - Engineering rollout',    'a0000001-0000-0000-0000-000000000004','c0000001-0000-0000-0000-000000000007','11111111-1111-1111-1111-111111111111','proposal','open', 7600000, 60, (current_date + 20), 'Inbound'),
  ('d0000001-0000-0000-0000-000000000012','Halcyon - Partnerships hub',       'a0000001-0000-0000-0000-000000000009','c0000001-0000-0000-0000-000000000012','44444444-4444-4444-4444-444444444444','proposal','open', 5900000, 60, (current_date + 28), 'Event'),
  ('d0000001-0000-0000-0000-000000000013','Pinedale - Originations launchpad','a0000001-0000-0000-0000-000000000008','c0000001-0000-0000-0000-00000000000f','33333333-3333-3333-3333-333333333333','proposal','open', 9700000, 60, (current_date + 22), 'Outbound'),

  -- negotiation (3)
  ('d0000001-0000-0000-0000-000000000014','Trellis - RevOps - exec round',    'a0000001-0000-0000-0000-000000000007','c0000001-0000-0000-0000-00000000000e','22222222-2222-2222-2222-222222222222','negotiation','open',14200000, 80, (current_date + 10), 'Partner'),
  ('d0000001-0000-0000-0000-000000000015','Ironclad - CIO commit',            'a0000001-0000-0000-0000-00000000000a','c0000001-0000-0000-0000-000000000014','55555555-5555-5555-5555-555555555555','negotiation','open',22000000, 80, (current_date + 14), 'Inbound'),
  ('d0000001-0000-0000-0000-000000000016','Larkspur - CMO sign-off',          'a0000001-0000-0000-0000-000000000005','c0000001-0000-0000-0000-000000000009','44444444-4444-4444-4444-444444444444','negotiation','open',13500000, 80, (current_date +  7), 'Referral'),

  -- closed_won (4)
  ('d0000001-0000-0000-0000-000000000017','Northwind - Year 1 contract',      'a0000001-0000-0000-0000-000000000001','c0000001-0000-0000-0000-000000000002','11111111-1111-1111-1111-111111111111','closed_won','won', 6400000,100, (current_date - 14), 'Inbound'),
  ('d0000001-0000-0000-0000-000000000018','Quill & Crown - Pilot',            'a0000001-0000-0000-0000-000000000006','c0000001-0000-0000-0000-00000000000c','55555555-5555-5555-5555-555555555555','closed_won','won', 2200000,100, (current_date - 30), 'Inbound'),
  ('d0000001-0000-0000-0000-000000000019','Mariner - Phase 1',                'a0000001-0000-0000-0000-000000000003','c0000001-0000-0000-0000-000000000005','33333333-3333-3333-3333-333333333333','closed_won','won', 4900000,100, (current_date - 21), 'Outbound'),
  ('d0000001-0000-0000-0000-00000000001a','Helios - Pilot expansion',         'a0000001-0000-0000-0000-000000000002','c0000001-0000-0000-0000-000000000004','22222222-2222-2222-2222-222222222222','closed_won','won', 8800000,100, (current_date -  9), 'Outbound'),

  -- closed_lost (2)
  ('d0000001-0000-0000-0000-00000000001b','Sable & Stone - Enterprise',       'a0000001-0000-0000-0000-00000000000b','c0000001-0000-0000-0000-000000000016','11111111-1111-1111-1111-111111111111','closed_lost','lost', 4100000,  0, (current_date - 18), 'Referral'),
  ('d0000001-0000-0000-0000-00000000001c','Verdant - Custom build',           'a0000001-0000-0000-0000-00000000000c','c0000001-0000-0000-0000-000000000018','22222222-2222-2222-2222-222222222222','closed_lost','lost', 5800000,  0, (current_date - 25), 'Inbound');

update deals set closed_at = (current_date - 14) where status in ('won','lost') and closed_at is null;

-- Activities. Mix of types, recent and older.
insert into activities (deal_id, contact_id, type, subject, body, owner_id, occurred_at) values
  ('d0000001-0000-0000-0000-000000000001','c0000001-0000-0000-0000-000000000001','email_sent', 'Intro: fleet visibility', 'Hi Maria — sharing a quick overview of what we''ve done with similar fleets.', '11111111-1111-1111-1111-111111111111', now() - interval '2 days'),
  ('d0000001-0000-0000-0000-000000000001','c0000001-0000-0000-0000-000000000001','call',       'Discovery call',          '20 min. Pain: dispatch lag, no SLA reporting.', '11111111-1111-1111-1111-111111111111', now() - interval '1 day'),

  ('d0000001-0000-0000-0000-000000000002','c0000001-0000-0000-0000-000000000003','email_sent', 'Re: procurement benchmark', 'Sending the benchmark deck. Worth a 30-min look.', '22222222-2222-2222-2222-222222222222', now() - interval '4 days'),
  ('d0000001-0000-0000-0000-000000000002','c0000001-0000-0000-0000-000000000003','email_received','Re: procurement benchmark', 'Looks interesting, can we sync next week?', '22222222-2222-2222-2222-222222222222', now() - interval '3 days'),

  ('d0000001-0000-0000-0000-000000000007','c0000001-0000-0000-0000-000000000005','meeting','Discovery + scoping',         'Walked through current supply chain pain points.', '33333333-3333-3333-3333-333333333333', now() - interval '6 days'),
  ('d0000001-0000-0000-0000-000000000007','c0000001-0000-0000-0000-000000000005','note',   'Champion update',            'Tom is our champion. Budget owner is Lila (COO).', '33333333-3333-3333-3333-333333333333', now() - interval '5 days'),
  ('d0000001-0000-0000-0000-000000000007','c0000001-0000-0000-0000-000000000005','email_sent','Follow up + ROI model',    'Attaching the ROI model we discussed.', '33333333-3333-3333-3333-333333333333', now() - interval '2 days'),

  ('d0000001-0000-0000-0000-00000000000c','c0000001-0000-0000-0000-000000000004','meeting','Demo - CFO dashboard',       'Strong reaction to the variance view.', '22222222-2222-2222-2222-222222222222', now() - interval '5 days'),
  ('d0000001-0000-0000-0000-00000000000c','c0000001-0000-0000-0000-000000000004','email_sent','Recap + next steps',       'Recap and proposed proposal timeline.', '22222222-2222-2222-2222-222222222222', now() - interval '4 days'),
  ('d0000001-0000-0000-0000-00000000000c','c0000001-0000-0000-0000-000000000003','call',    'Procurement loop-in',        'Ravi is procurement gate. Will need security review.', '22222222-2222-2222-2222-222222222222', now() - interval '2 days'),

  ('d0000001-0000-0000-0000-00000000000d','c0000001-0000-0000-0000-000000000013','meeting','Demo - Programs portal',     'CIO not in the room. Marisol pushing hard.', '55555555-5555-5555-5555-555555555555', now() - interval '7 days'),
  ('d0000001-0000-0000-0000-00000000000d','c0000001-0000-0000-0000-000000000014','email_sent','Exec briefing offer',      'Offering a 30-min CIO briefing.', '55555555-5555-5555-5555-555555555555', now() - interval '3 days'),

  ('d0000001-0000-0000-0000-000000000010','c0000001-0000-0000-0000-000000000001','email_sent','Proposal v1', 'Attaching v1 proposal. Pricing on page 7.', '11111111-1111-1111-1111-111111111111', now() - interval '9 days'),
  ('d0000001-0000-0000-0000-000000000010','c0000001-0000-0000-0000-000000000001','email_received','Re: Proposal v1', 'Reviewing internally. Will revert by Friday.', '11111111-1111-1111-1111-111111111111', now() - interval '8 days'),
  ('d0000001-0000-0000-0000-000000000010','c0000001-0000-0000-0000-000000000001','note',   'Risk',                       'No reply since last Friday. Following up.', '11111111-1111-1111-1111-111111111111', now() - interval '3 days'),

  ('d0000001-0000-0000-0000-000000000014','c0000001-0000-0000-0000-00000000000e','meeting','Exec round 1',               'CFO concerns on year 2 ramp pricing.', '22222222-2222-2222-2222-222222222222', now() - interval '4 days'),
  ('d0000001-0000-0000-0000-000000000014','c0000001-0000-0000-0000-00000000000e','email_sent','Revised terms', 'Revised pricing per CFO feedback.', '22222222-2222-2222-2222-222222222222', now() - interval '2 days'),
  ('d0000001-0000-0000-0000-000000000014','c0000001-0000-0000-0000-00000000000e','task',   'Send red-lined MSA',          null, '22222222-2222-2222-2222-222222222222', now() - interval '0 days'),

  ('d0000001-0000-0000-0000-000000000015','c0000001-0000-0000-0000-000000000014','meeting','CIO commitment review',      'CIO verbally committed pending security.', '55555555-5555-5555-5555-555555555555', now() - interval '3 days'),
  ('d0000001-0000-0000-0000-000000000015','c0000001-0000-0000-0000-000000000014','email_sent','Security questionnaire',   'Sent the SIG-Lite + SOC2 docs.', '55555555-5555-5555-5555-555555555555', now() - interval '1 day'),

  ('d0000001-0000-0000-0000-000000000016','c0000001-0000-0000-0000-000000000009','call',   'CMO sign-off',                'Diana is aligned. Pending legal sign-off.', '44444444-4444-4444-4444-444444444444', now() - interval '2 days'),

  ('d0000001-0000-0000-0000-000000000017','c0000001-0000-0000-0000-000000000002','note',   'Contract signed',             'Year 1 signed. Kickoff scheduled.', '11111111-1111-1111-1111-111111111111', now() - interval '13 days'),
  ('d0000001-0000-0000-0000-00000000001a','c0000001-0000-0000-0000-000000000004','note',   'Pilot expansion booked',      'Helios extended to phase 2.', '22222222-2222-2222-2222-222222222222', now() - interval '8 days'),

  ('d0000001-0000-0000-0000-00000000001b','c0000001-0000-0000-0000-000000000016','note',   'Lost to incumbent',           'Went with incumbent on price.', '11111111-1111-1111-1111-111111111111', now() - interval '17 days'),
  ('d0000001-0000-0000-0000-00000000001c','c0000001-0000-0000-0000-000000000018','note',   'Lost - no budget',            'Verdant pushed budget to next fiscal.', '22222222-2222-2222-2222-222222222222', now() - interval '24 days');

-- Pre-compute some health scores so the dashboard isn't empty before the AI route runs.
update deals set health_score = 78, health_reasoning = 'Strong engagement, clear champion, recent meeting.', health_updated_at = now() where id = 'd0000001-0000-0000-0000-000000000007';
update deals set health_score = 84, health_reasoning = 'Active CFO conversation, demo went well, procurement looped in.', health_updated_at = now() where id = 'd0000001-0000-0000-0000-00000000000c';
update deals set health_score = 55, health_reasoning = 'CIO not yet engaged; champion alone is risky for this deal size.', health_updated_at = now() where id = 'd0000001-0000-0000-0000-00000000000d';
update deals set health_score = 42, health_reasoning = 'No response on proposal v1 in 8 days; momentum slipping.', health_updated_at = now() where id = 'd0000001-0000-0000-0000-000000000010';
update deals set health_score = 88, health_reasoning = 'Exec round 1 done, revised terms sent, strong intent signals.', health_updated_at = now() where id = 'd0000001-0000-0000-0000-000000000014';
update deals set health_score = 91, health_reasoning = 'CIO verbal commit; only security review remains.', health_updated_at = now() where id = 'd0000001-0000-0000-0000-000000000015';
update deals set health_score = 72, health_reasoning = 'CMO aligned; pending legal — typical for this segment.', health_updated_at = now() where id = 'd0000001-0000-0000-0000-000000000016';
