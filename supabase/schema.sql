create table if not exists notifications (
  notification_id text primary key,
  event_id text not null,
  event_type text not null,
  producer text,
  correlation_id text,
  user_id text not null,
  type text not null,
  title text not null,
  message text not null,
  read boolean not null default false,
  push_sent boolean not null default false,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create table if not exists processed_events (
  event_id text primary key,
  event_type text not null,
  producer text,
  correlation_id text,
  processed_at timestamptz not null default now()
);

create table if not exists push_subscriptions (
  subscription_id text primary key,
  user_id text not null,
  platform text not null default 'web',
  subscription jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_notifications_user_id
on notifications(user_id);

create index if not exists idx_notifications_created_at
on notifications(created_at desc);

create index if not exists idx_notifications_event_type
on notifications(event_type);

create index if not exists idx_notifications_read
on notifications(read);

create unique index if not exists idx_notifications_event_id_unique
on notifications(event_id);
