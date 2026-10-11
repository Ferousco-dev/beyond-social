-- Deleting the default avatar left nobody marked default.
--
-- 0096 made "the default" a real, database-enforced concept: at most one row
-- per person, chosen automatically for the first avatar somebody trains and
-- changeable afterward through `set_default_avatar`. Nothing reassigns it
-- when that row is deleted. `findTwin` still renders something, since its
-- no-avatar-named path falls back to the newest row regardless of
-- `is_default`, so nothing breaks visibly. What breaks is the badge: the
-- library shows no avatar as default even though generation is quietly
-- using one, and that silently follows whichever row happens to be newest
-- as further avatars are trained, with no user choice behind it, until
-- somebody notices and picks one by hand.
--
-- Enforced here rather than in delete-heygen-avatar for the same reason 0096
-- put the one-default rule in the database instead of the application: a
-- second deletion path, an admin tool, a future GDPR sweep, should not have
-- to remember this too.

create or replace function public.reassign_default_avatar()
returns trigger
language plpgsql
as $$
begin
  if old.is_default then
    update public.heygen_avatars
       set is_default = true,
           updated_at = now()
     where id = (
       select id from public.heygen_avatars
        where user_id = old.user_id
        order by created_at desc
        limit 1
     );
  end if;
  return old;
end;
$$;

create trigger heygen_avatars_reassign_default
  after delete on public.heygen_avatars
  for each row execute function public.reassign_default_avatar();

comment on function public.reassign_default_avatar() is
  'Promotes the newest remaining avatar to default when the default one is deleted, so at most one person-visible default ever silently disappears.';
