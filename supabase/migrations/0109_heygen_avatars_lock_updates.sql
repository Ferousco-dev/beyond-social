-- 0079's update policy let a caller update any column on their own row,
-- despite that migration's own comment saying training_status and the
-- provider ids are meant to be service-role-only, written once the provider
-- responds. No client code has ever updated this table: listTwins, the
-- training-status poll, and check-now all only select. set_default_avatar
-- and reassign_default_avatar are the one legitimate write path for
-- is_default, and both already run as definer functions that bypass RLS.
--
-- So there is no case this policy exists to serve, and the case it
-- accidentally allows is a real one: a signed-in user can currently write
-- their own training_status to 'ready' and set provider_avatar_id/
-- provider_look_id/provider_voice_id to arbitrary strings, including ids
-- that belong to a different trained avatar under the same HeyGen account.
-- generate-heygen-avatar only checks that the row belongs to the caller, not
-- that its provider ids were ever actually returned by HeyGen for a job of
-- theirs, so a forged row lets a video render against a likeness that was
-- never that caller's to use.
--
-- Removing the client's update grant entirely closes that without touching
-- anything that works today, since the service role writes through the
-- admin client, which was never subject to this policy in the first place.
drop policy if exists "Users update own heygen avatar" on public.heygen_avatars;

comment on table public.heygen_avatars is
  'A HeyGen-trained digital twin, opt-in and owner-deletable. Deleting a row does not by itself remove the storage object or the provider-side asset; the action that deletes must do both. Rows are otherwise service-role write-only: no client update path exists or should exist, since training_status and the provider ids are attestations about what HeyGen actually returned, not something the owner of the row gets to assert.';
