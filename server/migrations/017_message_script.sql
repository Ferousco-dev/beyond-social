-- A script an assistant message proposed, kept structured so the screen and the
-- plan that follows can use it without parsing prose.
alter table public.messages add column script jsonb;
