-- Retention for mail_deliveries.
--
-- Two different things live in this table, and they deserve different lifetimes.
--
-- `payload` is the rendered contents of an email: names, links, whatever the
-- template was given. It is both the bulky column and the one holding personal
-- data, and it stops being useful the moment the send succeeds. It goes first.
--
-- The rest of the row, who was written to and whether it arrived, is a delivery
-- record. "Did you email me about this?" is a real question with a real answer,
-- and the answer costs a few dozen bytes to keep.
--
-- Failures are kept in full for longer. A delivery that failed is the one
-- somebody will ask about, and stripping its payload removes the evidence of
-- what was actually attempted.

/*
 * Clears payloads from delivered mail, then removes old records entirely.
 *
 * Dry run by default, like every other retention function here.
 */
create or replace function public.retention_prune_mail(
  p_dry_run boolean default true,
  p_strip_payload_after interval default interval '30 days',
  p_delete_after interval default interval '12 months'
)
returns table (payloads_cleared bigint, rows_deleted bigint, dry_run boolean)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_payloads bigint;
  v_rows bigint;
begin
  -- Only successful sends. A failed delivery keeps its payload, because the
  -- payload is what you need to work out why it failed.
  -- Emptied rather than nulled: the column is NOT NULL, and an empty object is
  -- also the more honest record. Null would read as "we never knew what was
  -- sent"; `{}` says the contents were deliberately discarded.
  select count(*) into v_payloads
  from public.mail_deliveries
  where status = 'sent'
    and payload <> '{}'::jsonb
    and created_at < now() - p_strip_payload_after;

  select count(*) into v_rows
  from public.mail_deliveries
  where created_at < now() - p_delete_after;

  if not p_dry_run then
    if v_payloads > 0 then
      update public.mail_deliveries
      set payload = '{}'::jsonb
      where status = 'sent'
        and payload <> '{}'::jsonb
        and created_at < now() - p_strip_payload_after;
    end if;

    if v_rows > 0 then
      delete from public.mail_deliveries
      where created_at < now() - p_delete_after;
    end if;
  end if;

  return query select v_payloads, v_rows, p_dry_run;
end;
$$;

revoke all on function public.retention_prune_mail(boolean, interval, interval) from public, anon, authenticated;
grant execute on function public.retention_prune_mail(boolean, interval, interval) to service_role;

-- Retention scans by age, and without this every run reads the whole table.
create index if not exists mail_deliveries_created_at_idx
  on public.mail_deliveries (created_at);
