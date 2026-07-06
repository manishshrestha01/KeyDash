-- Add language and input_method columns to typing_history for Nepali mode.
-- Safe to run multiple times.

ALTER TABLE IF EXISTS public.typing_history
  ADD COLUMN IF NOT EXISTS language TEXT;

ALTER TABLE IF EXISTS public.typing_history
  ADD COLUMN IF NOT EXISTS input_method TEXT;

-- Copy existing Nepali-marker into the new language column from any prior convention.
-- The `language` field was never officially migrated, so this is best-effort.
UPDATE public.typing_history
SET language = 'english'
WHERE language IS NULL;
