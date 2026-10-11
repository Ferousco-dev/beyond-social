-- Durable storage for finished renders. kie.ai result URLs expire, so the
-- callback copies each render here and stores this public URL instead.
-- Paths are unguessable (uploads/{user_id}/{task_id}.mp4) and finished videos
-- are user-published content, so public read is acceptable. Writes happen only
-- through the service role in the edge functions.

insert into storage.buckets (id, name, public)
values ('renders', 'renders', true)
on conflict (id) do nothing;
