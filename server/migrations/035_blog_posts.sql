-- Blog posts. Published posts are public; drafts are admin-only through the
-- Go API, which bypasses RLS and enforces the admin role itself.
create table public.blog_posts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  title text not null check (char_length(title) between 1 and 200),
  excerpt text not null default '' check (char_length(excerpt) <= 500),
  content text not null default '',
  featured_image text not null default '',
  category text not null default '' check (char_length(category) <= 80),
  tags text[] not null default '{}',
  seo_title text not null default '' check (char_length(seo_title) <= 200),
  seo_description text not null default '' check (char_length(seo_description) <= 500),
  status text not null default 'draft' check (status in ('draft', 'published')),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index blog_posts_status_published_idx on public.blog_posts (published_at desc) where status = 'published';

alter table public.blog_posts enable row level security;

-- Anonymous visitors may read published posts over PostgREST; everything else
-- goes through the Go API. The anon role only exists on Supabase, so plain
-- Postgres (CI, local tests) skips this the way 007 skips auth links.
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    execute
      'create policy blog_posts_public_read on public.blog_posts for select to anon using (status = ''published'')';
  end if;
end
$$;
