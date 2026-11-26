-- In-app interview room (browser) as the default medium; Zoom + Recall stays optional.
alter table interviews add column medium text not null default 'room' check (medium in ('room','zoom'));
alter table interviews add column started_at timestamptz;
alter table interviews add column streams jsonb not null default '[]';  -- [{stream:'audio-ab12cd'|'screen-ab12cd-1', offset_s}]
alter table interviews alter column zoom_url drop not null;
alter table interviews drop constraint interviews_status_check;
alter table interviews add constraint interviews_status_check check (status in
  ('scheduled','joining','live','done','processing','processed','declined','cancelled','failed','no_show'));
