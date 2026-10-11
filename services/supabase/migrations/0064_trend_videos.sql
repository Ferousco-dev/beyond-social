-- The actual video behind a trend.
--
-- Discovery has until now produced prose: a title, a description and a brief,
-- extracted from articles about what is working. That is a claim about video,
-- not video. Someone deciding whether a format suits them needs to watch one,
-- and reading a paragraph describing a hook is a poor substitute for seeing it
-- land.
--
-- So a trend may now carry the post it was observed on. Nullable, because not
-- every trend has a single exemplar: plenty of what discovery finds is format
-- advice that no one clip owns, and inventing a representative video for it
-- would be worse than showing none.

alter table public.trends
  add column if not exists video_url text,
  add column if not exists author_handle text,
  -- Only ever set when a source actually reports it. The feed has always
  -- refused to invent view counts and this does not change that: null means
  -- nobody told us, and the interface says nothing rather than guessing.
  add column if not exists view_count bigint
    check (view_count is null or view_count >= 0);

comment on column public.trends.video_url is
  'Canonical URL of the post this trend was observed on. Null when no single clip represents it.';

comment on column public.trends.view_count is
  'Views as reported by the source. Null when unreported, and never estimated.';

-- The feed leads with trends that can be watched, so the ordering reads them
-- first rather than sorting the whole table and filtering afterwards.
create index if not exists trends_video_idx
  on public.trends (category, discovered_at desc)
  where video_url is not null;

-- A trend you can watch outranks one you can only read about, whatever the
-- extraction pass thought of its own confidence. `setof public.trends` means the
-- new columns are returned without restating the shape.
create or replace function public.trends_current(p_category text default null, p_limit int default 24)
returns setof public.trends
language sql
stable
set search_path = public
as $$
  select *
    from public.trends
   where expires_at > now()
     and (p_category is null or category = p_category)
   order by (video_url is not null) desc, confidence desc, discovered_at desc
   limit greatest(p_limit, 1);
$$;
