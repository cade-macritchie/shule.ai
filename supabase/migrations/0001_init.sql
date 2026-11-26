-- ProcessScope schema. Run with `supabase db push` or paste into the SQL editor.
create extension if not exists pgcrypto;

create table orgs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  plan text not null default 'standard',
  created_at timestamptz not null default now()
);

create table org_members (
  org_id uuid references orgs on delete cascade,
  user_id uuid references auth.users on delete cascade,
  role text not null check (role in ('client_admin','client_viewer','staff')),
  primary key (org_id, user_id)
);

create table engagements (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs on delete cascade,
  title text not null,
  status text not null default 'intake'
    check (status in ('intake','outreach','scheduled','interviewing','processing','review','audited','delivered','follow_up','failed')),
  intake jsonb not null default '{}',
  auto_publish boolean not null default false,
  video_policy text not null default 'major' check (video_policy in ('major','all','none')),
  created_at timestamptz not null default now()
);

create table interviewees (
  id uuid primary key default gen_random_uuid(),
  engagement_id uuid not null references engagements on delete cascade,
  name text not null,
  email text not null,
  role text,
  booking_uid text unique,
  status text not null default 'invited' check (status in ('invited','booked','interviewed','declined','no_show')),
  reminders_sent int not null default 0,
  last_contacted_at timestamptz
);

create table interviews (
  id uuid primary key default gen_random_uuid(),
  engagement_id uuid not null references engagements on delete cascade,
  interviewee_id uuid references interviewees on delete set null,
  kind text not null default 'discovery' check (kind in ('discovery','follow_up')),
  start_at timestamptz not null,
  end_at timestamptz not null,
  zoom_url text not null,
  bot_id text unique,
  agent_token text not null default encode(gen_random_bytes(24),'hex'),
  status text not null default 'scheduled'
    check (status in ('scheduled','joining','live','done','processing','processed','declined','cancelled','failed')),
  recording_path text,
  created_at timestamptz not null default now()
);

create table interview_state (
  interview_id uuid primary key references interviews on delete cascade,
  plan jsonb not null default '{}',
  coverage jsonb not null default '{}',
  summary text not null default '',
  phase text not null default 'consent' check (phase in ('consent','interview','wrap_up','ended')),
  turn_lock_until timestamptz,
  bot_speaking boolean not null default false,
  turns int not null default 0
);

create table interview_utterances (
  id bigint generated always as identity primary key,
  interview_id uuid not null references interviews on delete cascade,
  speaker text not null,
  is_bot boolean not null default false,
  t_start real,
  t_end real,
  text text not null,
  created_at timestamptz not null default now()
);
create index on interview_utterances (interview_id, id);

create table pages (
  id uuid primary key default gen_random_uuid(),
  engagement_id uuid not null references engagements on delete cascade,
  path text not null,
  markdown text not null,
  meta jsonb not null default '{}',
  status text not null default 'draft' check (status in ('draft','current','needs-review')),
  version int not null default 1,
  updated_at timestamptz not null default now(),
  unique (engagement_id, path)
);

create table page_versions (
  id bigint generated always as identity primary key,
  page_id uuid not null references pages on delete cascade,
  markdown text not null,
  message text,
  author text,
  created_at timestamptz not null default now()
);

create table questions (
  id text primary key,                     -- q-xxxxxx
  engagement_id uuid not null references engagements on delete cascade,
  page_path text,
  step int,
  kind text,
  importance text not null default 'medium' check (importance in ('high','medium','low')),
  question text not null,
  why text,
  source text not null default 'audit' check (source in ('seed','capture','audit','ask','interview')),
  status text not null default 'open' check (status in ('open','answered','applied','dismissed')),
  answer text,
  answered_by text,
  answered_at timestamptz,
  applied_at timestamptz,
  created_at timestamptz not null default now()
);

create table audits (
  id uuid primary key default gen_random_uuid(),
  engagement_id uuid not null references engagements on delete cascade,
  kind text not null default 'audit' check (kind in ('audit','optimization')),
  scope jsonb not null default '{}',       -- {pages:[...]} or {finding_id}
  generate_video boolean not null default false,
  status text not null default 'queued' check (status in ('queued','running','done','failed')),
  result jsonb,                            -- sipoc, value_stream, ctq_tree, metrics, option_analysis...
  created_at timestamptz not null default now()
);

create table findings (
  id uuid primary key default gen_random_uuid(),
  audit_id uuid not null references audits on delete cascade,
  engagement_id uuid not null references engagements on delete cascade,
  rank int not null,
  title text not null,
  summary text not null,
  page_path text,
  steps int[] not null default '{}',
  waste text[] not null default '{}',
  value text check (value in ('VA','BVA','NVA')),
  root_causes jsonb not null default '[]',
  five_whys text[] not null default '{}',
  severity int check (severity between 1 and 10),
  occurrence int check (occurrence between 1 and 10),
  detection int check (detection between 1 and 10),
  rpn int generated always as (coalesce(severity,0) * coalesce(occurrence,0) * coalesce(detection,0)) stored,
  impact int check (impact between 1 and 5),
  effort int check (effort between 1 and 5),
  quadrant text,
  dmaic jsonb not null default '{}',
  recommendation jsonb not null default '{}',
  control_plan jsonb not null default '[]',
  evidence jsonb not null default '[]',
  confidence text check (confidence in ('high','medium','low')),
  major boolean not null default false
);

create table videos (
  id uuid primary key default gen_random_uuid(),
  engagement_id uuid not null references engagements on delete cascade,
  audit_id uuid references audits on delete set null,
  finding_ids uuid[] not null default '{}',
  title text,
  status text not null default 'queued' check (status in ('queued','storyboard','tts','rendering','checking','ready','failed')),
  storyboard jsonb,
  mp4_path text,
  srt_path text,
  duration_s real,
  created_at timestamptz not null default now()
);

create table jobs (
  id bigint generated always as identity primary key,
  kind text not null,
  payload jsonb not null default '{}',
  status text not null default 'queued' check (status in ('queued','running','done','failed')),
  run_after timestamptz not null default now(),
  attempts int not null default 0,
  locked_by text,
  locked_until timestamptz,
  error text,
  created_at timestamptz not null default now()
);
create index on jobs (status, run_after);

create table activity (
  id bigint generated always as identity primary key,
  engagement_id uuid references engagements on delete cascade,
  at timestamptz not null default now(),
  who text,
  action text not null,
  target text,
  detail jsonb
);

-- Queue: claim one job atomically (safe with many workers).
create or replace function claim_job(worker text, kinds text[], lease_seconds int default 900)
returns setof jobs language plpgsql as $$
begin
  return query
  update jobs set status = 'running', locked_by = worker,
         locked_until = now() + make_interval(secs => lease_seconds),
         attempts = attempts + 1
  where id = (
    select id from jobs
    where (status = 'queued' or (status = 'running' and locked_until < now()))
      and run_after <= now()
      and (kinds is null or kind = any(kinds))
    order by run_after, id
    for update skip locked
    limit 1)
  returning *;
end $$;

-- Live interviewer: take the per-interview turn lock (returns true if acquired).
create or replace function take_turn_lock(iid uuid, ms int default 8000)
returns boolean language plpgsql as $$
declare ok boolean;
begin
  update interview_state set turn_lock_until = now() + make_interval(secs => ms / 1000.0)
  where interview_id = iid and (turn_lock_until is null or turn_lock_until < now())
  returning true into ok;
  return coalesce(ok, false);
end $$;

-- RLS: clients read their own org's engagement data; writes go through the service role.
create or replace function is_member(eid uuid, roles text[] default null)
returns boolean language sql stable security definer as $$
  select exists (
    select 1 from engagements e join org_members m on m.org_id = e.org_id
    where e.id = eid and m.user_id = auth.uid() and (roles is null or m.role = any(roles)));
$$;

alter table orgs enable row level security;
alter table org_members enable row level security;
alter table engagements enable row level security;
alter table interviewees enable row level security;
alter table interviews enable row level security;
alter table interview_state enable row level security;
alter table interview_utterances enable row level security;
alter table pages enable row level security;
alter table page_versions enable row level security;
alter table questions enable row level security;
alter table audits enable row level security;
alter table findings enable row level security;
alter table videos enable row level security;
alter table jobs enable row level security;
alter table activity enable row level security;

create policy org_read on orgs for select using (exists (select 1 from org_members m where m.org_id = id and m.user_id = auth.uid()));
create policy members_read on org_members for select using (user_id = auth.uid());
create policy eng_read on engagements for select using (is_member(id));
create policy pages_read on pages for select using (is_member(engagement_id));
create policy pv_read on page_versions for select using (exists (select 1 from pages p where p.id = page_id and is_member(p.engagement_id)));
create policy q_read on questions for select using (is_member(engagement_id));
create policy q_answer on questions for update using (is_member(engagement_id, array['client_admin','staff']));
create policy audits_read on audits for select using (is_member(engagement_id));
create policy findings_read on findings for select using (is_member(engagement_id));
create policy videos_read on videos for select using (is_member(engagement_id));
create policy interviews_read on interviews for select using (is_member(engagement_id));
create policy utter_read on interview_utterances for select using (exists (select 1 from interviews i where i.id = interview_id and is_member(i.engagement_id)));
-- interview_state, jobs, activity, interviewees: service role only (no policies).

-- Storage: buckets are private; clients may read their own engagement's frames and videos.
insert into storage.buckets (id, name, public) values ('media','media',false), ('frames','frames',false), ('videos','videos',false)
  on conflict (id) do nothing;
create policy "client reads own videos" on storage.objects for select
  using (bucket_id in ('videos','frames') and is_member(((storage.foldername(name))[1])::uuid));
