-- Transactional mail: the templates we send, and the record of every send.
--
-- Two things are being protected here.
--
-- The first is the inbox. The mail service retries five times with exponential
-- backoff, and a socket that dies after the provider accepted a message looks
-- exactly like one that died before it. Without a guard the same password reset
-- or receipt arrives twice, and unlike a failed send that is not a state anyone
-- can undo for the user. The guard is claim_delivery_for_send below: the row is
-- transitioned and read in one statement, so two instances racing for the same
-- delivery cannot both proceed, and a row already carrying a provider message id
-- is never claimed at all.
--
-- The second is the truth of the record. There are no mail credentials yet, so
-- every send currently fails closed and lands in 'blocked'. A blocked row means
-- "this was never sent and is waiting on configuration", which is deliberately
-- distinguishable from 'failed' ("the provider refused it") and from 'sent'.

create table if not exists mail_templates (
  key        text primary key check (key ~ '^[a-z0-9_.]{2,60}$'),
  subject    text not null,
  -- Plain text with {{placeholder}} tokens. Nothing renders HTML, so nothing
  -- here can inject it into somebody's mail client.
  body       text not null,
  updated_at timestamptz not null default now()
);

create table if not exists mail_deliveries (
  id                  uuid primary key default gen_random_uuid(),
  to_email            text not null check (position('@' in to_email) > 1),
  template_key        text not null references mail_templates(key) on delete restrict,
  payload             jsonb not null default '{}'::jsonb,
  status              text not null default 'pending'
                        check (status in ('pending', 'sending', 'sent', 'blocked', 'failed')),
  provider_message_id text,
  error               text,
  attempts            integer not null default 0,
  created_at          timestamptz not null default now(),
  -- When the provider call started. Set before the call, not after, so a job
  -- that dies mid-flight leaves evidence that it may already have sent.
  send_started_at     timestamptz,
  sent_at             timestamptz
);

comment on column mail_deliveries.send_started_at is
  'Set immediately before the provider call, so a retry can tell "never tried" from "may already have sent".';
comment on column mail_deliveries.status is
  'blocked means no provider is configured and nothing was sent, which is not the same as failed.';

-- One row per accepted message. A duplicate provider id would mean two rows
-- claim the same email, which is precisely the state the claim exists to prevent.
create unique index if not exists mail_deliveries_provider_message_idx
  on mail_deliveries (provider_message_id)
  where provider_message_id is not null;

-- The operational query: what still needs sending, oldest first.
create index if not exists mail_deliveries_pending_idx
  on mail_deliveries (status, created_at)
  where status in ('pending', 'sending', 'blocked');

-- Same trigger every other table uses, so updated_at cannot drift by a caller
-- forgetting to set it.
drop trigger if exists mail_templates_set_updated_at on mail_templates;
create trigger mail_templates_set_updated_at
  before update on mail_templates
  for each row execute function public.set_updated_at();

alter table mail_templates enable row level security;
alter table mail_deliveries enable row level security;

-- No policies, deliberately. Both tables are service-role only: templates are
-- operator content and deliveries carry recipient addresses, and neither has a
-- reason to be reachable from a browser session. RLS with no policy denies
-- every ordinary role, and the service role bypasses it.

/*
 * Claims one delivery for sending, once.
 *
 * Returns nothing if the row is not in a claimable state, which is what makes a
 * duplicate job a no-op rather than a second email. Anything with a provider
 * message id is done, whatever its status column says.
 *
 * 'blocked' is claimable because nothing was sent: the moment credentials exist,
 * the parked backlog can be replayed through the same path.
 */
create or replace function claim_delivery_for_send(p_delivery uuid)
returns table (
  id           uuid,
  to_email     text,
  template_key text,
  payload      jsonb,
  attempts     integer
)
language sql
volatile
security definer
set search_path = ''
as $$
  update public.mail_deliveries d
     set status          = 'sending',
         send_started_at = now(),
         attempts        = d.attempts + 1
   where d.id = p_delivery
     and d.provider_message_id is null
     and d.status in ('pending', 'sending', 'blocked')
  returning d.id, d.to_email, d.template_key, d.payload, d.attempts;
$$;

revoke all on function claim_delivery_for_send(uuid) from public, anon, authenticated;
grant execute on function claim_delivery_for_send(uuid) to service_role;

/*
 * Parks a delivery that could not be attempted because no provider is
 * configured. Releases the claim so a replay can pick it up unchanged, and
 * refuses to touch a row that already reached the provider.
 */
create or replace function block_delivery(p_delivery uuid, p_error text)
returns void
language sql
volatile
security definer
set search_path = ''
as $$
  update public.mail_deliveries d
     set status          = 'blocked',
         error           = p_error,
         send_started_at = null
   where d.id = p_delivery
     and d.provider_message_id is null;
$$;

revoke all on function block_delivery(uuid, text) from public, anon, authenticated;
grant execute on function block_delivery(uuid, text) to service_role;

-- One transactional template, the only one there is a real product surface for
-- today. More get added when the flow that sends them exists, not before.
insert into mail_templates (key, subject, body) values (
  'password_reset',
  'Reset your Beyond Social password',
  'Hi {{name}},

Use the link below to set a new password. It expires in one hour.

{{reset_url}}

If you did not ask for this, you can ignore this email and nothing will change.

Beyond Social'
) on conflict (key) do nothing;
