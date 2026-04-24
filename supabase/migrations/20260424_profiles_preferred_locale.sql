-- Persist each user's UI language preference so the PT/EN toggle survives
-- cookie loss, device change, cache clear, and re-login. Nullable: clients
-- fall back to the existing NEXT_LOCALE cookie (or PT default) when unset.
-- Reads/writes are guarded by the existing self-read/self-update RLS policies
-- on public.profiles (id = auth.uid()), so no policy changes are required.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS preferred_locale TEXT
  CHECK (preferred_locale IS NULL OR preferred_locale IN ('pt', 'en'));

COMMENT ON COLUMN public.profiles.preferred_locale IS
  'User-chosen UI locale. NULL = follow NEXT_LOCALE cookie / default PT.';
