-- Period leaderboard sync + backfill
-- Run this in Supabase SQL editor after schema-migration.sql

-- Optional: keep explicit month label in DB for monthly leaderboard views (e.g. "Feb 2026")
ALTER TABLE public.leaderboard_monthly
ADD COLUMN IF NOT EXISTS month_label TEXT;

-- Rebuild daily / rolling-7-day weekly / exact monthly rows for a user and a reference timestamp.
CREATE OR REPLACE FUNCTION public.refresh_period_leaderboards_for_user(
  p_user_id UUID,
  p_reference_ts TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ref_day DATE;
  day_start_ts TIMESTAMPTZ;
  day_end_ts TIMESTAMPTZ;

  week_cursor_start DATE;
  week_cursor_start_ts TIMESTAMPTZ;
  week_cursor_end_ts TIMESTAMPTZ;
  week_offset INTEGER;

  month_start_date DATE;
  month_start_ts TIMESTAMPTZ;
  month_end_ts TIMESTAMPTZ;

  day_best RECORD;
  week_best RECORD;
  month_best RECORD;

  week_tests INTEGER;
  month_tests INTEGER;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN;
  END IF;

  ref_day := (p_reference_ts AT TIME ZONE 'UTC')::DATE;

  day_start_ts := (ref_day::TIMESTAMP AT TIME ZONE 'UTC');
  day_end_ts := ((ref_day + 1)::TIMESTAMP AT TIME ZONE 'UTC');

  month_start_date := DATE_TRUNC('month', ref_day::TIMESTAMP)::DATE;
  month_start_ts := (month_start_date::TIMESTAMP AT TIME ZONE 'UTC');
  month_end_ts := ((month_start_date + INTERVAL '1 month')::TIMESTAMP AT TIME ZONE 'UTC');

  -- Daily: exact calendar day in UTC.
  SELECT th.wpm, th.accuracy, COALESCE(th.errors, 0) AS errors, th.duration_seconds, th.created_at
  INTO day_best
  FROM public.typing_history th
  WHERE th.user_id = p_user_id
    AND th.is_completed = TRUE
    AND th.mode <> 'custom'
    AND th.created_at >= day_start_ts
    AND th.created_at < day_end_ts
  ORDER BY th.wpm DESC, th.accuracy DESC, COALESCE(th.errors, 0) ASC, th.created_at ASC
  LIMIT 1;

  IF day_best.wpm IS NOT NULL THEN
    INSERT INTO public.leaderboard_daily (user_id, date, wpm, accuracy, errors, duration_seconds, created_at)
    VALUES (p_user_id, ref_day, day_best.wpm, day_best.accuracy, day_best.errors, day_best.duration_seconds, day_best.created_at)
    ON CONFLICT (user_id, date)
    DO UPDATE SET
      wpm = EXCLUDED.wpm,
      accuracy = EXCLUDED.accuracy,
      errors = EXCLUDED.errors,
      duration_seconds = EXCLUDED.duration_seconds,
      created_at = EXCLUDED.created_at;
  ELSE
    DELETE FROM public.leaderboard_daily
    WHERE user_id = p_user_id
      AND date = ref_day;
  END IF;

  -- Weekly: maintain all rolling 7-day windows that include ref_day.
  -- Weekly rankings include daily + ai_battle + timed + sentence runs.
  FOR week_offset IN 0..6 LOOP
    week_cursor_start := (ref_day - week_offset);
    week_cursor_start_ts := (week_cursor_start::TIMESTAMP AT TIME ZONE 'UTC');
    week_cursor_end_ts := ((week_cursor_start + 7)::TIMESTAMP AT TIME ZONE 'UTC');

    SELECT th.wpm, th.accuracy, COALESCE(th.errors, 0) AS errors, th.created_at
    INTO week_best
    FROM public.typing_history th
    WHERE th.user_id = p_user_id
      AND th.is_completed = TRUE
      AND th.mode IN ('daily', 'ai_battle', 'timed', 'sentence')
      AND th.created_at >= week_cursor_start_ts
      AND th.created_at < week_cursor_end_ts
    ORDER BY th.wpm DESC, th.accuracy DESC, COALESCE(th.errors, 0) ASC, th.created_at ASC
    LIMIT 1;

    SELECT COUNT(*)::INTEGER
    INTO week_tests
    FROM public.typing_history th
    WHERE th.user_id = p_user_id
      AND th.is_completed = TRUE
      AND th.mode IN ('daily', 'ai_battle', 'timed', 'sentence')
      AND th.created_at >= week_cursor_start_ts
      AND th.created_at < week_cursor_end_ts;

    IF week_best.wpm IS NOT NULL THEN
      INSERT INTO public.leaderboard_weekly (user_id, week_start, wpm, accuracy, errors, total_tests, created_at)
      VALUES (p_user_id, week_cursor_start, week_best.wpm, week_best.accuracy, week_best.errors, week_tests, week_best.created_at)
      ON CONFLICT (user_id, week_start)
      DO UPDATE SET
        wpm = EXCLUDED.wpm,
        accuracy = EXCLUDED.accuracy,
        errors = EXCLUDED.errors,
        total_tests = EXCLUDED.total_tests,
        created_at = EXCLUDED.created_at;
    ELSE
      DELETE FROM public.leaderboard_weekly
      WHERE user_id = p_user_id
        AND week_start = week_cursor_start;
    END IF;
  END LOOP;

  -- Monthly: exact calendar month in UTC.
  -- Monthly rankings include daily + ai_battle + timed + sentence runs.
  SELECT th.wpm, th.accuracy, COALESCE(th.errors, 0) AS errors, th.created_at
  INTO month_best
  FROM public.typing_history th
  WHERE th.user_id = p_user_id
    AND th.is_completed = TRUE
    AND th.mode IN ('daily', 'ai_battle', 'timed', 'sentence')
    AND th.created_at >= month_start_ts
    AND th.created_at < month_end_ts
  ORDER BY th.wpm DESC, th.accuracy DESC, COALESCE(th.errors, 0) ASC, th.created_at ASC
  LIMIT 1;

  SELECT COUNT(*)::INTEGER
  INTO month_tests
  FROM public.typing_history th
  WHERE th.user_id = p_user_id
    AND th.is_completed = TRUE
    AND th.mode IN ('daily', 'ai_battle', 'timed', 'sentence')
    AND th.created_at >= month_start_ts
    AND th.created_at < month_end_ts;

  IF month_best.wpm IS NOT NULL THEN
    INSERT INTO public.leaderboard_monthly (user_id, month_start, month_label, wpm, accuracy, errors, total_tests, created_at)
    VALUES (
      p_user_id,
      month_start_date,
      TO_CHAR(month_start_date::TIMESTAMP, 'Mon YYYY'),
      month_best.wpm,
      month_best.accuracy,
      month_best.errors,
      month_tests,
      month_best.created_at
    )
    ON CONFLICT (user_id, month_start)
    DO UPDATE SET
      month_label = EXCLUDED.month_label,
      wpm = EXCLUDED.wpm,
      accuracy = EXCLUDED.accuracy,
      errors = EXCLUDED.errors,
      total_tests = EXCLUDED.total_tests,
      created_at = EXCLUDED.created_at;
  ELSE
    DELETE FROM public.leaderboard_monthly
    WHERE user_id = p_user_id
      AND month_start = month_start_date;
  END IF;
END;
$$;

-- Trigger wrapper for new typing history rows.
CREATE OR REPLACE FUNCTION public.sync_period_leaderboards_from_typing_history()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.user_id IS NULL OR NEW.is_completed IS DISTINCT FROM TRUE OR NEW.mode = 'custom' THEN
    RETURN NEW;
  END IF;

  PERFORM public.refresh_period_leaderboards_for_user(NEW.user_id, NEW.created_at);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_typing_history_period_leaderboards ON public.typing_history;
CREATE TRIGGER on_typing_history_period_leaderboards
  AFTER INSERT ON public.typing_history
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_period_leaderboards_from_typing_history();

-- Backfill helper for existing history rows.
CREATE OR REPLACE FUNCTION public.backfill_period_leaderboards(p_user_id UUID DEFAULT NULL)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rec RECORD;
BEGIN
  IF p_user_id IS NULL THEN
    TRUNCATE TABLE public.leaderboard_daily, public.leaderboard_weekly, public.leaderboard_monthly;
  ELSE
    DELETE FROM public.leaderboard_daily WHERE user_id = p_user_id;
    DELETE FROM public.leaderboard_weekly WHERE user_id = p_user_id;
    DELETE FROM public.leaderboard_monthly WHERE user_id = p_user_id;
  END IF;

  FOR rec IN
    SELECT DISTINCT
      th.user_id,
      (th.created_at AT TIME ZONE 'UTC')::DATE AS ref_day
    FROM public.typing_history th
    WHERE th.user_id IS NOT NULL
      AND th.is_completed = TRUE
      AND th.mode <> 'custom'
      AND (p_user_id IS NULL OR th.user_id = p_user_id)
    ORDER BY th.user_id, ref_day
  LOOP
    PERFORM public.refresh_period_leaderboards_for_user(
      rec.user_id,
      rec.ref_day::TIMESTAMP AT TIME ZONE 'UTC'
    );
  END LOOP;
END;
$$;

-- Run once after deploying this file to fill existing data.
-- For all users:
--   SELECT public.backfill_period_leaderboards();
-- For one user:
--   SELECT public.backfill_period_leaderboards('00000000-0000-0000-0000-000000000000'::UUID);
