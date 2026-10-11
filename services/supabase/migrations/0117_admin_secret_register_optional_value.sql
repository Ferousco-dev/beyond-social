-- p_value in 0116's admin_secret_register had no default, so Supabase's own
-- typegen inferred it as a required, non-nullable argument even though the
-- function body already treats a null value as "register the name without
-- one yet" — the exact case the console's own optional value field needs.
-- Fixing the signature so the generated types agree with what the function
-- already does, rather than fixing the caller around a signature that says
-- something the function does not mean.
create or replace function public.admin_secret_register(
  p_key text,
  p_description text,
  p_expected_by text,
  p_location text,
  p_value text default null,
  p_store_value boolean default false,
  p_ip inet default null
) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then
    raise exception 'Admin only';
  end if;

  if p_key !~ '^[A-Z][A-Z0-9_]*$' then
    raise exception 'Secret names are SCREAMING_SNAKE_CASE, like the environment variable they are';
  end if;

  if exists (select 1 from managed_secrets where key = p_key) then
    raise exception 'A secret named % is already registered', p_key;
  end if;

  if coalesce(trim(p_description), '') = '' then
    raise exception 'A secret needs a description: what reads it, and what breaks without it';
  end if;

  insert into managed_secrets (key, description, expected_by, location, is_set)
  values (p_key, p_description, p_expected_by, p_location, false);

  perform admin_log_action(
    'admin.secret_registered',
    'managed_secret',
    p_key,
    'Registered ' || p_key,
    null,
    jsonb_build_object('description', p_description, 'expected_by', p_expected_by, 'location', p_location),
    p_ip
  );

  if p_value is not null then
    perform admin_secret_rotate(p_key, p_value, p_store_value, p_ip);
  end if;
end; $$;
