-- W1–2 Social Layer: tables, RLS, storage bucket (clean corrected)
-- 1) FOLLOWS
create table if not exists public.follows (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  target_type text not null check (target_type in ('user','org','category','city')),
  target_id text not null,
  created_at timestamptz not null default now(),
  unique(user_id, target_type, target_id)
);

alter table public.follows enable row level security;

drop policy if exists follows_select_own on public.follows;
create policy follows_select_own
on public.follows for select
using (auth.uid() = user_id);

drop policy if exists follows_insert_owner on public.follows;
create policy follows_insert_owner
on public.follows for insert
with check (auth.uid() = user_id);

drop policy if exists follows_delete_owner on public.follows;
create policy follows_delete_owner
on public.follows for delete
using (auth.uid() = user_id);

-- 2) POSTS
create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null,
  org_id uuid,
  type text not null default 'case',
  title text,
  content text,
  city text,
  category_id uuid,
  visibility text not null default 'public' check (visibility in ('public','followers')),
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.posts enable row level security;

drop policy if exists posts_select_public_or_author_or_admin on public.posts;
create policy posts_select_public_or_author_or_admin
on public.posts for select
using (
  visibility = 'public' OR author_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role)
);

drop policy if exists posts_insert_author_only on public.posts;
create policy posts_insert_author_only
on public.posts for insert
with check (author_id = auth.uid());

drop policy if exists posts_update_author_or_admin on public.posts;
create policy posts_update_author_or_admin
on public.posts for update
using (author_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
with check (author_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'set_posts_updated_at'
  ) THEN
    EXECUTE 'drop trigger set_posts_updated_at on public.posts';
  END IF;
END $$;
create trigger set_posts_updated_at
before update on public.posts
for each row execute function public.set_updated_at();

-- 3) POST_PHOTOS
create table if not exists public.post_photos (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null,
  file_url text not null,
  created_at timestamptz not null default now()
);

alter table public.post_photos enable row level security;

drop policy if exists post_photos_select_public_or_author_or_admin on public.post_photos;
create policy post_photos_select_public_or_author_or_admin
on public.post_photos for select
using (
  exists (
    select 1 from public.posts p
    where p.id = post_photos.post_id
      and (p.visibility = 'public' or p.author_id = auth.uid() or has_role(auth.uid(), 'admin'::app_role))
  )
);

drop policy if exists post_photos_insert_author_only on public.post_photos;
create policy post_photos_insert_author_only
on public.post_photos for insert
with check (
  exists (
    select 1 from public.posts p
    where p.id = post_photos.post_id and p.author_id = auth.uid()
  )
);

-- 4) COMMENTS
create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null,
  author_id uuid not null,
  content text not null,
  created_at timestamptz not null default now()
);

alter table public.comments enable row level security;

drop policy if exists comments_select_public_or_author_or_admin on public.comments;
create policy comments_select_public_or_author_or_admin
on public.comments for select
using (
  exists (
    select 1 from public.posts p
    where p.id = comments.post_id
      and (p.visibility = 'public' or p.author_id = auth.uid() or has_role(auth.uid(), 'admin'::app_role))
  )
);

drop policy if exists comments_insert_owner on public.comments;
create policy comments_insert_owner
on public.comments for insert
with check (author_id = auth.uid());

drop policy if exists comments_delete_owner_or_admin on public.comments;
create policy comments_delete_owner_or_admin
on public.comments for delete
using (author_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

-- 5) LIKES
create table if not exists public.likes (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null,
  user_id uuid not null,
  created_at timestamptz not null default now(),
  unique(post_id, user_id)
);

alter table public.likes enable row level security;

drop policy if exists likes_select_public_or_user_or_admin on public.likes;
create policy likes_select_public_or_user_or_admin
on public.likes for select
using (
  exists (
    select 1 from public.posts p
    where p.id = likes.post_id and (p.visibility = 'public' or has_role(auth.uid(), 'admin'::app_role) or likes.user_id = auth.uid())
  )
);

drop policy if exists likes_insert_owner on public.likes;
create policy likes_insert_owner
on public.likes for insert
with check (user_id = auth.uid());

drop policy if exists likes_delete_owner_or_admin on public.likes;
create policy likes_delete_owner_or_admin
on public.likes for delete
using (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

-- 6) ENDORSEMENTS
create table if not exists public.endorsements (
  id uuid primary key default gen_random_uuid(),
  from_id uuid not null,
  to_id uuid not null,
  skill text not null,
  weight numeric not null default 1.0,
  note text,
  created_at timestamptz not null default now(),
  unique(from_id, to_id, skill)
);

alter table public.endorsements enable row level security;

drop policy if exists endorsements_public_select on public.endorsements;
create policy endorsements_public_select
on public.endorsements for select
using (true);

drop policy if exists endorsements_insert_from_user on public.endorsements;
create policy endorsements_insert_from_user
on public.endorsements for insert
with check (from_id = auth.uid());

drop policy if exists endorsements_delete_from_user_or_admin on public.endorsements;
create policy endorsements_delete_from_user_or_admin
on public.endorsements for delete
using (from_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

-- 7) BADGES
create table if not exists public.badges (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  title_ru text,
  title_ro text,
  criteria jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.badges enable row level security;

drop policy if exists badges_public_select on public.badges;
create policy badges_public_select
on public.badges for select using (true);

drop policy if exists badges_admin_ins on public.badges;
create policy badges_admin_ins
on public.badges for insert with check (has_role(auth.uid(), 'admin'::app_role));

drop policy if exists badges_admin_upd on public.badges;
create policy badges_admin_upd
on public.badges for update using (has_role(auth.uid(), 'admin'::app_role)) with check (has_role(auth.uid(), 'admin'::app_role));

drop policy if exists badges_admin_del on public.badges;
create policy badges_admin_del
on public.badges for delete using (has_role(auth.uid(), 'admin'::app_role));

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'set_badges_updated_at'
  ) THEN
    EXECUTE 'drop trigger set_badges_updated_at on public.badges';
  END IF;
END $$;
create trigger set_badges_updated_at
before update on public.badges
for each row execute function public.set_updated_at();

-- 8) USER_BADGES
create table if not exists public.user_badges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  badge_id uuid not null,
  granted_by uuid,
  created_at timestamptz not null default now(),
  unique(user_id, badge_id)
);

alter table public.user_badges enable row level security;

drop policy if exists user_badges_public_select on public.user_badges;
create policy user_badges_public_select
on public.user_badges for select using (true);

drop policy if exists user_badges_admin_insert on public.user_badges;
create policy user_badges_admin_insert
on public.user_badges for insert with check (has_role(auth.uid(), 'admin'::app_role));

drop policy if exists user_badges_admin_delete on public.user_badges;
create policy user_badges_admin_delete
on public.user_badges for delete using (has_role(auth.uid(), 'admin'::app_role));

-- 9) SCORES (reputation cache)
create table if not exists public.scores (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null check (entity_type in ('user','org')),
  entity_id uuid not null,
  quality numeric not null default 0,
  reliability numeric not null default 0,
  price_fairness numeric not null default 0,
  social_trust numeric not null default 0,
  total numeric not null default 0,
  updated_at timestamptz not null default now(),
  unique(entity_type, entity_id)
);

alter table public.scores enable row level security;

drop policy if exists scores_public_select on public.scores;
create policy scores_public_select
on public.scores for select using (true);

drop policy if exists scores_admin_or_service_upsert on public.scores;
create policy scores_admin_or_service_upsert
on public.scores for insert with check (has_role(auth.uid(), 'admin'::app_role) OR auth.role() = 'service_role');

drop policy if exists scores_admin_or_service_update on public.scores;
create policy scores_admin_or_service_update
on public.scores for update using (has_role(auth.uid(), 'admin'::app_role) OR auth.role() = 'service_role') with check (has_role(auth.uid(), 'admin'::app_role) OR auth.role() = 'service_role');

-- 10) STORAGE BUCKET FOR POSTS
insert into storage.buckets (id, name, public)
values ('posts', 'posts', true)
on conflict (id) do nothing;

-- Storage policies for public read, owner write (first folder = user id)
drop policy if exists posts_public_read on storage.objects;
create policy posts_public_read
on storage.objects for select
using (bucket_id = 'posts');

drop policy if exists posts_owner_insert on storage.objects;
create policy posts_owner_insert
on storage.objects for insert
with check (
  bucket_id = 'posts' and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists posts_owner_update on storage.objects;
create policy posts_owner_update
on storage.objects for update
using (
  bucket_id = 'posts' and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists posts_owner_delete on storage.objects;
create policy posts_owner_delete
on storage.objects for delete
using (
  bucket_id = 'posts' and auth.uid()::text = (storage.foldername(name))[1]
);
