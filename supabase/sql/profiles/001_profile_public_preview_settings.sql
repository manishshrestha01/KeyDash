-- Public profile preview settings for achievements.
-- Safe to run multiple times.

ALTER TABLE IF EXISTS public.profiles
  ADD COLUMN IF NOT EXISTS is_profile_public BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE IF EXISTS public.profiles
  ADD COLUMN IF NOT EXISTS featured_achievement_ids UUID[] NOT NULL DEFAULT '{}';

UPDATE public.profiles
SET is_profile_public = true
WHERE is_profile_public IS NULL;

UPDATE public.profiles
SET featured_achievement_ids = '{}'
WHERE featured_achievement_ids IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'profiles_featured_achievement_ids_max_4'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_featured_achievement_ids_max_4
      CHECK (COALESCE(array_length(featured_achievement_ids, 1), 0) <= 4);
  END IF;
END;
$$;

ALTER TABLE IF EXISTS public.user_achievements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view unlocked achievements" ON public.user_achievements;
DROP POLICY IF EXISTS "Users can view achievements based on profile visibility" ON public.user_achievements;

CREATE POLICY "Users can view achievements based on profile visibility" ON public.user_achievements
  FOR SELECT USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE profiles.id = user_achievements.user_id
        AND COALESCE(profiles.is_profile_public, true) = true
    )
  );
