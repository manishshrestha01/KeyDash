-- Allow public profile pages to show earned achievements.
-- Safe to run multiple times.

ALTER TABLE IF EXISTS public.user_achievements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view unlocked achievements" ON public.user_achievements;
CREATE POLICY "Anyone can view unlocked achievements" ON public.user_achievements
  FOR SELECT USING (true);

