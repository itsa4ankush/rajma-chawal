create table public.telegram_bot_state (
  id int primary key check (id = 1),
  update_offset bigint not null default 0,
  updated_at timestamptz not null default now()
);

insert into public.telegram_bot_state (id, update_offset) values (1, 0);

create table public.telegram_messages (
  update_id bigint primary key,
  chat_id bigint not null,
  text text,
  raw_update jsonb not null,
  created_at timestamptz not null default now()
);

create index idx_telegram_messages_chat_id on public.telegram_messages (chat_id);
create index idx_telegram_messages_created_at on public.telegram_messages (created_at desc);

alter table public.telegram_bot_state enable row level security;
alter table public.telegram_messages enable row level security;