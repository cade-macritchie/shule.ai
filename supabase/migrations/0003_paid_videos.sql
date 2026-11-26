-- Video guides are a paid add-on: nothing renders unless the client orders it.
alter table engagements alter column video_policy set default 'none';
alter table videos add column paid boolean not null default false;
alter table videos add column price_cents int;
