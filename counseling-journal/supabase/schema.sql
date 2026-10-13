-- 気づきノート：データベースの設定
-- Supabase の SQL Editor に、このファイルの中身をまるごと貼り付けて実行します。
--
-- 考え方
-- ・クライアントは自分のノートだけを読み書きできる
-- ・カウンセラー（麻美さん）は全員のノートを読み、返信を書ける
-- ・書いた内容は後から消したり書き換えたりできない（相談記録として残すため）

-- ------------------------------------------------------------
-- テーブル
-- ------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null default 'client' check (role in ('client', 'counselor')),
  display_name text not null default '' check (char_length(display_name) <= 40),
  created_at timestamptz not null default now()
);

-- client_id はそのノートの持ち主、author_id は書いた人
-- （クライアントの書き込みなら同じ人、麻美さんの返信なら麻美さん）
create table public.messages (
  id bigint generated always as identity primary key,
  client_id uuid not null references public.profiles (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 4000),
  created_at timestamptz not null default now()
);

create index messages_client_created_idx on public.messages (client_id, created_at);

-- ------------------------------------------------------------
-- 補助関数とトリガー
-- ------------------------------------------------------------

create or replace function public.is_counselor()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'counselor'
  );
$$;

create or replace function public.is_client(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = uid and role = 'client'
  );
$$;

-- ユーザーを追加すると、自動でプロフィールができる（最初は必ずクライアント）
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ------------------------------------------------------------
-- 行レベルセキュリティ（誰がどの行を見られるか）
-- ------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.messages enable row level security;

-- 自分のプロフィールと麻美さんのプロフィールは見られる。麻美さんは全員分を見られる
create policy "profiles_select" on public.profiles
  for select to authenticated
  using (id = auth.uid() or role = 'counselor' or public.is_counselor());

-- 自分の表示名だけ変えられる（役割は変えられない：下の列単位の権限で制限）
create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

revoke insert, update, delete on public.profiles from anon, authenticated;
grant update (display_name) on public.profiles to authenticated;

-- ノートは、持ち主のクライアント本人と麻美さんだけが見られる
create policy "messages_select" on public.messages
  for select to authenticated
  using (client_id = auth.uid() or public.is_counselor());

-- クライアントは自分のノートに、麻美さんはクライアントのノートに書ける
create policy "messages_insert" on public.messages
  for insert to authenticated
  with check (
    author_id = auth.uid()
    and public.is_client(client_id)
    and (client_id = auth.uid() or public.is_counselor())
  );

-- update / delete のポリシーは作らない（＝誰も書き換え・削除できない）
revoke update, delete on public.messages from anon, authenticated;

-- ------------------------------------------------------------
-- リアルタイム更新（新しい書き込みを画面にすぐ反映する）
-- ------------------------------------------------------------

alter publication supabase_realtime add table public.messages;
