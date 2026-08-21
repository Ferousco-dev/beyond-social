-- A place for a system prompt to live outside the code that reads it.
--
-- The idea refiner and Discover's script compiler each hardcode their system
-- prompt as a string constant, which means fixing one, even a single line
-- someone found sloppy in review, is a full app deploy: no faster path exists
-- between "we know the wording is wrong" and it actually changing for the
-- next request. It also means there is no record of which wording produced
-- which output; a rejection can be traced to a generation, never to the
-- prompt that shaped it, because the prompt was never a row anywhere to
-- point at.
--
-- This does not move every prompt at once. It gives the ones that most want
-- iterating on, without a redeploy, somewhere to live, and the app falls back
-- to its own hardcoded text whenever a key has no row: an empty table is a
-- table that has not been used yet, not a broken app.

create table if not exists public.prompt_templates (
  id uuid primary key default gen_random_uuid(),

  -- Which prompt this is, stable across versions: "discover.analysis.system",
  -- "script.write.system". Dotted so a family of related prompts sorts and
  -- filters together.
  key text not null,

  -- Versions accumulate; only one per key is ever active. Kept rather than
  -- overwritten so a bad edit is a new row to deactivate, not a value nobody
  -- can get back.
  version integer not null,
  content text not null,

  -- Exactly one active version per key, enforced below. A prompt that has
  -- never been overridden simply has no active row, which is what "fall back
  -- to the code's own text" reads as.
  is_active boolean not null default false,

  -- Free text: why this version exists, for the next person reading history
  -- rather than guessing from a diff of prompt bodies.
  note text not null default '',

  created_at timestamptz not null default now(),
  created_by uuid references auth.users (id) on delete set null
);

-- One active version per key. A partial unique index rather than a check
-- constraint, because "unique among the active ones" is a property of the
-- set, not of a single row.
create unique index if not exists prompt_templates_one_active_idx
  on public.prompt_templates (key)
  where is_active;

create index if not exists prompt_templates_key_idx
  on public.prompt_templates (key, version desc);

alter table public.prompt_templates enable row level security;

-- Same shape as model_catalog: a shopping window. Any authenticated caller
-- may read the active prompts, because reading one is exactly what serving a
-- request already does; nobody writes from a client, because there is no
-- admin surface for this yet and a malformed system prompt reaching every
-- request for a key is not a mistake a policy should make possible.
drop policy if exists "Active prompts are readable" on public.prompt_templates;
create policy "Active prompts are readable" on public.prompt_templates
  for select using (is_active);

comment on table public.prompt_templates is
  'System prompts that can be overridden without a deploy. A key with no active row falls back to the caller''s own hardcoded text.';
