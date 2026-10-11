-- The critic pass on prompt enhancement, as a flag the console can see.
--
-- The engine grades an enhanced prompt and revises it once if the grade falls
-- short. That is a second and sometimes a third model call in front of starting
-- a generation, so it is the one part of this work that a person waiting on a
-- video can feel. Cheap against the alternative, which is a render costing
-- credits and minutes made from a prompt nobody checked, but a judgement worth
-- being able to reverse without a deploy.
--
-- `isFlagEnabled` already falls back to on for an unknown key, so this row does
-- not switch anything on. It exists so the switch is visible in the admin
-- console rather than being a default buried in a call site.

insert into feature_flags (key, enabled, description) values
  (
    'prompt_engine_critic',
    true,
    'Grade each enhanced prompt and revise it once if it falls short. Costs a judge call per enhancement, and a further generate plus judge when it revises.'
  )
on conflict (key) do nothing;
