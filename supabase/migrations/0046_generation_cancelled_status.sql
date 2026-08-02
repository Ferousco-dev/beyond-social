-- A cancelled generation is not a failed one. Failure means the render did not
-- happen and nothing is owed; cancelling means the person stopped waiting for a
-- render that is still running at the provider and is still chargeable.
--
-- Alone in its own migration because a new enum value cannot be used in the
-- same transaction that adds it, and 0047 uses this one.
alter type public.generation_status add value if not exists 'cancelled';
