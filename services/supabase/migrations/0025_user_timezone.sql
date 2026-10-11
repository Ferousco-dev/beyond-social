-- The user's IANA timezone, kept separately from any stored instant.
--
-- Instants are already correct: `scheduled_for` is `timestamptz`, which Postgres
-- stores as an absolute point in time, and the worker claims on
-- `scheduled_for <= now()`. Nothing in this schema has ever stored a local wall
-- clock time, so there is no data to migrate.
--
-- What was missing is the zone itself, which is needed for two things a UTC
-- instant cannot answer on its own:
--
--   1. Display. "8:00 UTC" has to be shown as 9:00 AM in Lagos and 4:00 AM in
--      New York, and only the zone knows which.
--   2. Recurrence. "Every day at 9am" is not a fixed UTC offset: in New York it
--      is 14:00 UTC in winter and 13:00 UTC in summer. Computing the next run
--      requires the zone at that future date, which is why an offset like
--      "UTC+1" is not a substitute for "Africa/Lagos".

alter table public.profiles
  add column if not exists timezone text not null default 'UTC';

comment on column public.profiles.timezone is
  'IANA timezone name, e.g. Africa/Lagos. Not an offset: offsets change with daylight saving, so they cannot be used to compute a future local time.';

-- Validated in the application rather than here. A CHECK constraint must be
-- immutable, and the list of valid zones lives in `pg_timezone_names`, which is
-- stable but not immutable because the tzdata it reflects is updated. The
-- application validates against Intl.supportedValuesOf('timeZone'), which is the
-- same list from the same source.
alter table public.profiles
  add constraint profiles_timezone_length check (length(timezone) between 1 and 64);
