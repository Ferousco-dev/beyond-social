-- The industry a user makes videos for.
--
-- Everything the product suggests is currently the same for everybody: the same
-- starter prompts, the same trend feed, the same blank textarea. None of it can
-- get more specific without knowing what the person actually sells, and asking
-- once is cheaper than inferring it wrongly from a prompt.
--
-- Free text rather than an enum, matching the trends table for the same reason:
-- the taxonomy is shared with trend categories, it will move as new niches turn
-- up, and a new niche must not require a migration. The list is validated in the
-- application, which is where it is defined.
--
-- Nullable, and stays that way. Somebody who skips the question still gets a
-- working product with unfiltered suggestions, so this must never become a
-- required field that blocks the first video.

alter table public.profiles
  add column if not exists industry text;

comment on column public.profiles.industry is
  'Trend category id this user creates for. Null when never chosen; see TREND_CATEGORIES.';
