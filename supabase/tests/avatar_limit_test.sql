-- The sixth reusable avatar for one account is rejected by the database.
-- Runs in a transaction and leaves no test account or avatar rows behind.

begin;

insert into auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at
)
values (
  '55555555-5555-5555-5555-555555555555',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'avatar-limit-test@example.com',
  '',
  now(),
  now(),
  now()
);

insert into public.heygen_avatars (
  user_id,
  storage_path,
  consent_version,
  training_status,
  is_default
)
select
  '55555555-5555-5555-5555-555555555555',
  '55555555-5555-5555-5555-555555555555/avatar-' || value || '.mp4',
  1,
  'pending',
  value = 1
from generate_series(1, 5) as value;

do $$
begin
  begin
    insert into public.heygen_avatars (
      user_id,
      storage_path,
      consent_version,
      training_status
    )
    values (
      '55555555-5555-5555-5555-555555555555',
      '55555555-5555-5555-5555-555555555555/avatar-6.mp4',
      1,
      'pending'
    );

    raise exception 'expected the sixth avatar to be rejected';
  exception
    when check_violation then
      if sqlerrm <> 'avatar_limit_reached' then
        raise;
      end if;
  end;
end;
$$;

rollback;
