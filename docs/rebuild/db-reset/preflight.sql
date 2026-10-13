-- READ ONLY. Run this first and check the numbers before wiping anything.
select current_database() as database, current_user as role, inet_server_addr() as server;

select 'auth.users' as what, count(*) as rows from auth.users
union all select 'storage.objects', count(*) from storage.objects
union all select 'storage.buckets', count(*) from storage.buckets;

-- Every table that exists in public, with its row count estimate.
select relname as public_table, reltuples::bigint as approx_rows
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r' order by 1;

-- Schemas the wipe will drop besides public (custom ones only).
select nspname as custom_schema from pg_namespace
where nspname !~ '^pg_' and nspname not in (
  'information_schema', 'public', 'auth', 'storage', 'extensions', 'graphql', 'graphql_public',
  'realtime', 'vault', 'pgsodium', 'pgsodium_masks', 'supabase_functions', 'supabase_migrations',
  'cron', 'net', 'pgbouncer', '_realtime', '_analytics', 'pg_catalog');

-- Scheduled jobs that will be removed.
select jobid, jobname, schedule from cron.job;
