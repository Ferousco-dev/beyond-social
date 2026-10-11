-- A generation has to belong to a project its owner can actually reach.
--
-- `generate-video`, `generate-avatar` and `extend-video` all take `projectId`
-- from the request body. The insert policy on `video_generations` only checks
-- `user_id`, so somebody who knows another project's uuid could file a
-- generation of their own against it: their row, their credit, someone else's
-- project. The result is a record that reads as belonging to a project its
-- owner never created, and a thread that lists work nobody there asked for.
--
-- Fixed once in the database rather than three times in the functions, because
-- the functions are not the only writer and the next one will not remember.
--
-- The check is against the row's own `user_id`, deliberately, and not against
-- `auth.uid()`. These functions run with the service role, where `auth.uid()`
-- is null, so an `auth.uid()` trigger would reject every legitimate insert. The
-- row already carries who it is for, and that is the identity the project has
-- to be reachable by.

create or replace function public.enforce_project_access()
returns trigger
language plpgsql
security definer
set search_path to ''
as $$
begin
  -- Nullable on `assets`, where "not filed under a project" is a real state.
  if new.project_id is null then
    return new;
  end if;

  if not exists (
    select 1 from public.projects p
    where p.id = new.project_id
      and (
        p.user_id = new.user_id
        or (
          p.org_id is not null
          and exists (
            select 1 from public.organization_members m
            where m.org_id = p.org_id and m.user_id = new.user_id
          )
        )
      )
  ) then
    raise exception 'Project access denied'
      using errcode = '42501';
  end if;

  return new;
end; $$;

comment on function public.enforce_project_access() is
  'Refuses a row whose project_id names a project the row''s own user_id cannot reach. Written against new.user_id rather than auth.uid() so it holds for service-role writers too.';

-- Only on insert and on a changed project_id: re-validating an unchanged value
-- on every status update would put a lookup on the hottest write in the table.
create trigger video_generations_project_access
  before insert or update of project_id on public.video_generations
  for each row execute function public.enforce_project_access();

-- Same client-controlled field, same gap. `assets.project_id` is nullable, and
-- the function above lets a null through.
create trigger assets_project_access
  before insert or update of project_id on public.assets
  for each row execute function public.enforce_project_access();
