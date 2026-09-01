-- claim_delivery_for_send let 'sending' back into its own claimable set with
-- no check on how long the row had been there. That is deliberate for a
-- delivery genuinely abandoned by a crashed worker, but it also means a
-- worker still mid-flight inside provider.send() (a slow Resend response, or
-- a lock-renewal miss under load) can have its own in-progress delivery
-- reclaimed by whichever worker BullMQ hands the stalled job to next, and
-- both then call the provider for the same delivery. A 'sending' row is only
-- reclaimable now once it has sat there longer than any realistic in-flight
-- send would, the same shape admin_stuck_work (0035) already uses to define
-- "stuck" for a publish.
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
     and (
       d.status in ('pending', 'blocked')
       or (d.status = 'sending' and d.send_started_at < now() - interval '5 minutes')
     )
  returning d.id, d.to_email, d.template_key, d.payload, d.attempts;
$$;
