-- More than one avatar per person.
--
-- `user_id` was unique, so everybody had exactly one twin and recording a
-- second silently replaced the first: no library, no choosing, and no way back
-- to a likeness somebody was happy with. That is not how anyone uses this. A
-- person wants the one in a shirt for client work and the one in a t-shirt for
-- their own channel, and wants both to keep existing.
--
-- Each row is still one trained likeness with its own provider ids, its own
-- consent record and its own footage. What changes is that a person may hold
-- several, name them, and mark one as the one to use when nothing is chosen.

alter table public.heygen_avatars drop constraint if exists heygen_avatars_user_id_key;

alter table public.heygen_avatars
  add column if not exists name text,
  add column if not exists is_default boolean not null default false;

-- Existing rows predate naming and are the owner's only avatar, so they are the
-- default by definition.
update public.heygen_avatars
   set is_default = true,
       name = coalesce(name, 'My avatar')
 where is_default = false;

alter table public.heygen_avatars
  add constraint heygen_avatars_name_length
  check (name is null or length(trim(name)) between 1 and 60);

/*
 * One default per person, enforced by the database rather than by whoever
 * remembers to clear the old one. A partial unique index says exactly that and
 * says nothing about people with no default at all, which is the correct state
 * for somebody who has deleted their last avatar.
 */
create unique index if not exists heygen_avatars_one_default_idx
  on public.heygen_avatars (user_id)
  where is_default;

create index if not exists heygen_avatars_user_recent_idx
  on public.heygen_avatars (user_id, created_at desc);

/*
 * Moves the default to one avatar, atomically.
 *
 * Clearing the old default and setting the new one are one statement because
 * the unique index above rejects the intermediate state where two rows claim
 * it. Doing this as two updates from the application works only until two
 * tabs race, and then it fails in a way that reads as the database being
 * broken rather than as a missing transaction.
 */
create or replace function public.set_default_avatar(p_avatar uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare
  v_owner uuid;
begin
  select user_id into v_owner from public.heygen_avatars where id = p_avatar;
  if v_owner is null or v_owner <> auth.uid() then
    return false;
  end if;

  update public.heygen_avatars
     set is_default = (id = p_avatar),
         updated_at = now()
   where user_id = v_owner
     and is_default <> (id = p_avatar);

  return true;
end;
$$;

revoke all on function public.set_default_avatar(uuid) from public, anon;
grant execute on function public.set_default_avatar(uuid) to authenticated;

comment on column public.heygen_avatars.name is
  'What the owner calls this likeness. Null on rows that predate naming.';
comment on column public.heygen_avatars.is_default is
  'The avatar used when a generation does not name one. At most one per person.';
