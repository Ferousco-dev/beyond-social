-- Five reusable avatars per account keeps the product limit predictable and
-- prevents clients from bypassing it by calling the Edge Function directly.

create or replace function public.enforce_heygen_avatar_limit()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  perform pg_advisory_xact_lock(hashtextextended(new.user_id::text, 0));

  if (
    select count(*)
      from public.heygen_avatars
     where user_id = new.user_id
  ) >= 5 then
    raise exception using
      errcode = '23514',
      message = 'avatar_limit_reached';
  end if;

  return new;
end;
$$;

drop trigger if exists heygen_avatars_limit on public.heygen_avatars;
create trigger heygen_avatars_limit
  before insert on public.heygen_avatars
  for each row execute function public.enforce_heygen_avatar_limit();

comment on function public.enforce_heygen_avatar_limit() is
  'Rejects a sixth reusable avatar for one account, including concurrent inserts.';
