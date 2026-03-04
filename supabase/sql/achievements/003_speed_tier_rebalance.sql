-- Rebalance speed achievements into tiered ranges and add conqueror rarity.
-- Safe to rerun.

DO $$
DECLARE
  rarity_constraint_name text;
BEGIN
  IF to_regclass('public.achievements') IS NULL THEN
    RETURN;
  END IF;

  -- Replace any existing rarity check so conqueror is accepted.
  FOR rarity_constraint_name IN
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'achievements'
      AND c.contype = 'c'
      AND pg_get_constraintdef(c.oid) ILIKE '%rarity%'
  LOOP
    EXECUTE format('ALTER TABLE public.achievements DROP CONSTRAINT IF EXISTS %I', rarity_constraint_name);
  END LOOP;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'achievements'
      AND c.conname = 'achievements_rarity_check'
  ) THEN
    ALTER TABLE public.achievements
      ADD CONSTRAINT achievements_rarity_check
      CHECK (lower(rarity) IN ('common', 'rare', 'epic', 'legendary', 'conqueror'));
  END IF;
END;
$$;

DELETE FROM public.user_achievements
WHERE achievement_id IN (
  SELECT id FROM public.achievements WHERE category = 'speed'
);

DELETE FROM public.achievements
WHERE category = 'speed';

WITH speed_cycles AS (
  SELECT
    gs.cycle,
    30 + (gs.cycle * 21) AS base_wpm
  FROM generate_series(0, 10) AS gs(cycle)
),
speed_tiers AS (
  SELECT
    cycle,
    3 AS tier_rank,
    'III' AS tier_label,
    base_wpm AS range_start,
    LEAST(base_wpm + 7, 260) AS range_end
  FROM speed_cycles

  UNION ALL

  SELECT
    cycle,
    2 AS tier_rank,
    'II' AS tier_label,
    base_wpm + 8 AS range_start,
    LEAST(base_wpm + 14, 260) AS range_end
  FROM speed_cycles

  UNION ALL

  SELECT
    cycle,
    1 AS tier_rank,
    'I' AS tier_label,
    base_wpm + 15 AS range_start,
    LEAST(base_wpm + 20, 260) AS range_end
  FROM speed_cycles
),
speed_named_tiers AS (
  SELECT
    st.*,
    (ARRAY[
      'Velocity Vanguard',
      'Turbo Striker',
      'Blaze Typist',
      'Rapid Pulse',
      'Thunder Keys',
      'Nitro Weaver',
      'Keystorm Rider',
      'Tempo Trailblazer'
    ])[((row_number() OVER (ORDER BY st.range_start, st.tier_rank) - 1) % 8) + 1] AS base_title
  FROM speed_tiers st
),
new_speed_achievements AS (
  SELECT
    format('%s Tier %s (%s-%s WPM)', base_title, tier_label, range_start, range_end) AS name,
    format('Reach %s-%s WPM in a single test.', range_start, range_end) AS description,
    'zap' AS icon,
    'speed' AS category,
    'wpm_single' AS requirement_type,
    range_start AS requirement_value,
    8 + floor((range_start - 30) / 4.0)::int AS points,
    CASE
      WHEN range_start > 210 THEN 'conqueror'
      WHEN range_start >= 111 THEN 'legendary'
      WHEN range_start >= 81 THEN 'epic'
      WHEN range_start >= 51 THEN 'rare'
      ELSE 'common'
    END AS rarity
  FROM speed_named_tiers
  WHERE range_start <= 260
)
INSERT INTO public.achievements (
  name,
  description,
  icon,
  category,
  requirement_type,
  requirement_value,
  points,
  rarity
)
SELECT
  name,
  description,
  icon,
  category,
  requirement_type,
  requirement_value,
  points,
  rarity
FROM new_speed_achievements
ON CONFLICT (name) DO UPDATE SET
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  category = EXCLUDED.category,
  requirement_type = EXCLUDED.requirement_type,
  requirement_value = EXCLUDED.requirement_value,
  points = EXCLUDED.points,
  rarity = EXCLUDED.rarity;

-- Remove featured IDs pointing to deleted achievements.
UPDATE public.profiles
SET featured_achievement_ids = COALESCE(
  ARRAY(
    SELECT achievement_id
    FROM unnest(COALESCE(featured_achievement_ids, '{}'::uuid[])) AS achievement_id
    WHERE EXISTS (
      SELECT 1
      FROM public.achievements a
      WHERE a.id = achievement_id
    )
  ),
  '{}'::uuid[]
);
