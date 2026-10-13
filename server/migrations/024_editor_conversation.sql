-- Each chat has one editor project, opened from the chat's "Open editor" button.
alter table public.editor_projects
  add column conversation_id uuid references public.conversations (id) on delete cascade;
create unique index editor_projects_conversation_idx
  on public.editor_projects (user_id, conversation_id) where conversation_id is not null;
