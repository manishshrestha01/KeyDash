-- All-time leaderboard + public profile stats sync
--
-- Problem this fixes:
--   The app only inserts into typing_history, which is readable only by its
--   owner (RLS). Daily/weekly/monthly boards work for everyone because a
--   SECURITY DEFINER trigger mirrors bests into public period tables, but the
--   All Time board and the public profile page read the legacy
--   leaderboard_timed / leaderboard_sentence tables and profile aggregate
--   columns that nothing was writing. Result: a new player's all-time score
--   was visible only to themselves, and their public profile showed 0s.
--
-- This migration:
--   1. Adds errors columns + per-user unique keys to the v1 all-time tables.
--   2. Adds a best_wpm column to profiles.
--   3. Defines refresh_all_time_stats_for_user() to upsert per-user bests
--      (per timed bucket / per sentence difficulty) and profile aggregates
--      from typing_history (excluding custom and Nepali runs, same rules as
--      the period leaderboards).
--   4. Installs an AFTER INSERT trigger on typing_history.
--   5. Provides a backfill helper.
--
-- Run in the Supabase SQL editor after 002_exclude_nepali_from_leaderboards.sql.
-- Safe to run multiple times. Then backfill once:
--   SELECT public.backfill_all_time_stats();

-- 1) Schema tweaks -----------------------------------------------------------

ALTER TABLE public.leaderboard_timed
  ADD COLUMN IF NOT EXISTS errors INTEGER DEFAULT 0;

ALTER TABLE public.leaderboard_sentence
  ADD COLUMN IF NOT EXISTS errors INTEGER DEFAULT 0;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS best_wpm INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS average_wpm DECIMAL(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS average_accuracy DECIMAL(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_tests INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_time_practiced INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_activity_date DATE,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Keep only each user's best row per bucket, then enforce uniqueness so the
-- sync function can upsert.
DELETE FROM public.leaderboard_timed lt
USING public.leaderboard_timed dup
WHERE lt.user_id = dup.user_id
  AND lt.time = dup.time
  AND lt.id <> dup.id
  AND (dup.wpm, dup.accuracy, dup.created_at, dup.id) >
      (lt.wpm, lt.accuracy, lt.created_at, lt.id);

DELETE FROM public.leaderboard_sentence ls
USING public.leaderboard_sentence dup
WHERE ls.user_id = dup.user_id
  AND ls.difficulty = dup.difficulty
  AND ls.id <> dup.id
  AND (dup.wpm, dup.accuracy, dup.created_at, dup.id) >
      (ls.wpm, ls.accuracy, ls.created_at, ls.id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_leaderboard_timed_user_time_unique
  ON public.leaderboard_timed(user_id, time);

CREATE UNIQUE INDEX IF NOT EXISTS idx_leaderboard_sentence_user_difficulty_unique
  ON public.leaderboard_sentence(user_id, difficulty);

-- 2) Sync function -----------------------------------------------------------

CREATE OR REPLACE FUNCTION public.refresh_all_time_stats_for_user(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  bucket INTEGER;
  diff TEXT;
  best RECORD;
  agg RECORD;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN;
  END IF;

  -- Timed mode: best run per duration bucket (client matches ±1s).
  FOREACH bucket IN ARRAY ARRAY[15, 30, 60, 120] LOOP
    SELECT th.wpm, th.accuracy, COALESCE(th.errors, 0) AS errors, th.created_at
    INTO best
    FROM public.typing_history th
    WHERE th.user_id = p_user_id
      AND th.is_completed = TRUE
      AND th.mode = 'timed'
      AND th.language IS DISTINCT FROM 'nepali'
      AND th.duration_seconds >= bucket - 1
      AND th.duration_seconds <= bucket + 1
    ORDER BY th.wpm DESC, th.accuracy DESC, COALESCE(th.errors, 0) ASC, th.created_at ASC
    LIMIT 1;

    IF best.wpm IS NOT NULL THEN
      INSERT INTO public.leaderboard_timed (user_id, wpm, accuracy, errors, time, created_at)
      VALUES (p_user_id, best.wpm, best.accuracy, best.errors, bucket, best.created_at)
      ON CONFLICT (user_id, time)
      DO UPDATE SET
        wpm = EXCLUDED.wpm,
        accuracy = EXCLUDED.accuracy,
        errors = EXCLUDED.errors,
        created_at = EXCLUDED.created_at;
    END IF;
  END LOOP;

  -- Sentence mode: best run per difficulty.
  FOREACH diff IN ARRAY ARRAY['easy', 'medium', 'hard', 'extreme'] LOOP
    SELECT th.wpm, th.accuracy, COALESCE(th.errors, 0) AS errors,
           ROUND(th.duration_seconds)::INTEGER AS time, th.created_at
    INTO best
    FROM public.typing_history th
    WHERE th.user_id = p_user_id
      AND th.is_completed = TRUE
      AND th.mode = 'sentence'
      AND th.sub_mode = diff
      AND th.language IS DISTINCT FROM 'nepali'
    ORDER BY th.wpm DESC, th.accuracy DESC, COALESCE(th.errors, 0) ASC, th.created_at ASC
    LIMIT 1;

    IF best.wpm IS NOT NULL THEN
      INSERT INTO public.leaderboard_sentence (user_id, wpm, accuracy, errors, difficulty, time, created_at)
      VALUES (p_user_id, best.wpm, best.accuracy, best.errors, diff, best.time, best.created_at)
      ON CONFLICT (user_id, difficulty)
      DO UPDATE SET
        wpm = EXCLUDED.wpm,
        accuracy = EXCLUDED.accuracy,
        errors = EXCLUDED.errors,
        time = EXCLUDED.time,
        created_at = EXCLUDED.created_at;
    END IF;
  END LOOP;

  -- Profile aggregates shown on the public profile page.
  SELECT
    COUNT(*)::INTEGER AS total_tests,
    COALESCE(MAX(th.wpm), 0)::INTEGER AS best_wpm,
    COALESCE(ROUND(AVG(th.wpm)::NUMERIC, 2), 0) AS average_wpm,
    COALESCE(ROUND(AVG(th.accuracy)::NUMERIC, 2), 0) AS average_accuracy,
    COALESCE(ROUND(SUM(th.duration_seconds))::INTEGER, 0) AS total_time
  INTO agg
  FROM public.typing_history th
  WHERE th.user_id = p_user_id
    AND th.is_completed = TRUE;

  UPDATE public.profiles
  SET
    total_tests = agg.total_tests,
    best_wpm = agg.best_wpm,
    average_wpm = agg.average_wpm,
    average_accuracy = agg.average_accuracy,
    total_time_practiced = agg.total_time,
    updated_at = NOW()
  WHERE id = p_user_id;
END;
$$;

-- 3) Trigger on typing_history -----------------------------------------------
-- Replaces the old update_profile_stats trigger (this function recomputes the
-- same aggregates exactly instead of incrementing counters).

CREATE OR REPLACE FUNCTION public.sync_all_time_stats_from_typing_history()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.user_id IS NULL OR NEW.is_completed IS DISTINCT FROM TRUE THEN
    RETURN NEW;
  END IF;

  PERFORM public.refresh_all_time_stats_for_user(NEW.user_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_typing_history_insert ON public.typing_history;
DROP TRIGGER IF EXISTS on_typing_history_all_time_stats ON public.typing_history;
CREATE TRIGGER on_typing_history_all_time_stats
  AFTER INSERT ON public.typing_history
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_all_time_stats_from_typing_history();

-- Keep last_activity_date fresh (previously done by update_profile_stats).
CREATE OR REPLACE FUNCTION public.touch_profile_last_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET last_activity_date = CURRENT_DATE
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_typing_history_last_activity ON public.typing_history;
CREATE TRIGGER on_typing_history_last_activity
  AFTER INSERT ON public.typing_history
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_profile_last_activity();

-- 4) Backfill helper -----------------------------------------------------------

CREATE OR REPLACE FUNCTION public.backfill_all_time_stats(p_user_id UUID DEFAULT NULL)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN
    SELECT DISTINCT th.user_id
    FROM public.typing_history th
    WHERE th.user_id IS NOT NULL
      AND th.is_completed = TRUE
      AND (p_user_id IS NULL OR th.user_id = p_user_id)
  LOOP
    PERFORM public.refresh_all_time_stats_for_user(rec.user_id);
  END LOOP;
END;
$$;

-- Run once after deploying this file to fill existing data:
--   SELECT public.backfill_all_time_stats();
