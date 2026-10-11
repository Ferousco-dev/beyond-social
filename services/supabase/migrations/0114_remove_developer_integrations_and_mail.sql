-- The developer API, outbound webhooks, and custom mail worker were removed.
-- Their schema is retired forward-only so deployed databases match the code.

drop function if exists public.api_key_owner(text);
drop table if exists public.api_keys;

drop function if exists public.count_webhook_failure(uuid);
drop table if exists public.user_webhooks;

drop function if exists public.retention_prune_mail(boolean, interval, interval);
drop function if exists public.claim_delivery_for_send(uuid);
drop function if exists public.block_delivery(uuid, text);
drop table if exists public.mail_deliveries;
drop table if exists public.mail_templates;

delete from public.managed_secrets where key = 'MAIL_PROVIDER_API_KEY';
update public.managed_secrets
set expected_by = 'worker',
    description = 'BullMQ connection for the publishing queue.'
where key = 'REDIS_URL';
