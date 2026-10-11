-- Store the signing secret so it can actually sign.
--
-- The secret was stored as a SHA-256 digest, on the model of `api_keys`. That
-- is right for a credential someone presents to us and wrong for one we present
-- to them: an HMAC needs the secret itself, so a hash-only column made delivery
-- impossible to build. The webhooks page has been saying deliveries are not
-- being sent yet, and this column is the reason.
--
-- Encrypted at the application layer with AES-256-GCM under a key held in the
-- environment, not in the database. A dump therefore still yields nothing that
-- can sign a payload, which was the property the hash was chosen for; what
-- changes is that the server, holding the key, can now recover the secret to
-- sign with.
--
-- No data to migrate: nothing has ever been delivered and there are no rows.
-- Existing endpoints, if any appear between writing this and running it, would
-- have to rotate, which the page already supports.

alter table public.user_webhooks drop column if exists secret_hash;
alter table public.user_webhooks add column if not exists secret_encrypted text not null default '';
alter table public.user_webhooks alter column secret_encrypted drop default;

comment on column public.user_webhooks.secret_encrypted is
  'AES-256-GCM ciphertext of the signing secret, keyed from the environment. Never sent to a browser.';

-- The signing key never leaves the server, not even encrypted.
--
-- This has to be a table-level revoke followed by a column-level grant, not a
-- column-level revoke: in PostgreSQL a table-wide SELECT covers every column,
-- and a later `revoke select (col)` against it does nothing at all. The grant
-- is re-issued here because the column list has changed.
revoke select on public.user_webhooks from authenticated, anon;
grant select (
  id, user_id, url, events, secret_last_four, is_active,
  created_at, last_delivery_at, failure_count
) on public.user_webhooks to authenticated;

-- The sender's lookup: active endpoints for one user subscribed to one event.
-- The existing gin index covers the events test; this covers the owner test in
-- the same scan rather than filtering afterwards.
create index if not exists user_webhooks_user_active_idx
  on public.user_webhooks (user_id)
  where is_active;

-- ---------------------------------------------------------------------------
-- Failure counting
-- ---------------------------------------------------------------------------
-- Incrementing from the sender would need a read, an add, and a write, and two
-- deliveries failing at once would lose one of them. Doing it in one statement
-- is both correct and one round trip from an edge function.
create or replace function public.count_webhook_failure(p_webhook uuid)
returns void
language sql
security definer
set search_path to ''
as $$
  update public.user_webhooks
     set failure_count = failure_count + 1
   where id = p_webhook;
$$;

revoke all on function public.count_webhook_failure(uuid) from public, anon, authenticated;
grant execute on function public.count_webhook_failure(uuid) to service_role;

comment on function public.count_webhook_failure(uuid) is
  'Records that a delivery to this endpoint failed. Service role only: it is written by the sender, never by a browser.';
