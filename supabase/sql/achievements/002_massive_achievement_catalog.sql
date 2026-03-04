-- Seed achievement catalog.
-- Safe to rerun because names are unique and ON CONFLICT is used.

DO $$
DECLARE
  rarity_constraint_name text;
BEGIN
  IF to_regclass('public.achievements') IS NULL THEN
    RETURN;
  END IF;

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
generated_achievements AS (
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

  UNION ALL

  SELECT
    format('Headshot Accuracy %s', lpad(tier::text, 4, '0')) AS name,
    format('Finish a test with %s%%+ accuracy.', 79 + tier) AS description,
    (ARRAY['🎯', '💯', '🧠'])[((tier - 1) % 3) + 1] AS icon,
    'accuracy' AS category,
    'accuracy' AS requirement_type,
    79 + tier AS requirement_value,
    8 + (tier * 2) AS points,
    CASE
      WHEN tier >= 19 THEN 'legendary'
      WHEN tier >= 14 THEN 'epic'
      WHEN tier >= 7 THEN 'rare'
      ELSE 'common'
    END AS rarity
  FROM generate_series(1, 21) AS gs(tier)

  UNION ALL

  SELECT
    format('Survivor Streak %s', lpad(tier::text, 4, '0')) AS name,
    format('Keep a %s-day login streak alive.', tier) AS description,
    (ARRAY['🔥', '📅', '🛡️', '⏳'])[((tier - 1) % 4) + 1] AS icon,
    'streak' AS category,
    'streak' AS requirement_type,
    tier AS requirement_value,
    6 + (tier / 3) AS points,
    CASE
      WHEN tier >= 234 THEN 'legendary'
      WHEN tier >= 169 THEN 'epic'
      WHEN tier >= 91 THEN 'rare'
      ELSE 'common'
    END AS rarity
  FROM generate_series(1, 260) AS gs(tier)

  UNION ALL

  SELECT
    format('Code Royale Tier %s', lpad(tier::text, 4, '0')) AS name,
    format('Complete %s coding tests.', tier * 5) AS description,
    (ARRAY['💻', '⌨️', '🧠', '⚙️'])[((tier - 1) % 4) + 1] AS icon,
    'coding' AS category,
    'tests_count' AS requirement_type,
    tier * 5 AS requirement_value,
    8 + (tier / 2) AS points,
    CASE
      WHEN tier >= 162 THEN 'legendary'
      WHEN tier >= 117 THEN 'epic'
      WHEN tier >= 63 THEN 'rare'
      ELSE 'common'
    END AS rarity
  FROM generate_series(1, 180) AS gs(tier)

  UNION ALL

  SELECT
    format('Glyph Guardian Tier %s', lpad(tier::text, 4, '0')) AS name,
    format('Complete %s symbols tests.', tier * 5) AS description,
    (ARRAY['🔣', '✍️', '📐', '🧩'])[((tier - 1) % 4) + 1] AS icon,
    'symbols' AS category,
    'tests_count' AS requirement_type,
    tier * 5 AS requirement_value,
    8 + (tier / 2) AS points,
    CASE
      WHEN tier >= 144 THEN 'legendary'
      WHEN tier >= 104 THEN 'epic'
      WHEN tier >= 56 THEN 'rare'
      ELSE 'common'
    END AS rarity
  FROM generate_series(1, 160) AS gs(tier)

  UNION ALL

  SELECT
    format('Squad Conqueror Tier %s', lpad(tier::text, 4, '0')) AS name,
    format('Win %s multiplayer races.', tier * 3) AS description,
    (ARRAY['🏆', '👥', '🎖️', '🥇'])[((tier - 1) % 4) + 1] AS icon,
    'multiplayer' AS category,
    'win_count' AS requirement_type,
    tier * 3 AS requirement_value,
    10 + tier AS points,
    CASE
      WHEN tier >= 126 THEN 'legendary'
      WHEN tier >= 91 THEN 'epic'
      WHEN tier >= 49 THEN 'rare'
      ELSE 'common'
    END AS rarity
  FROM generate_series(1, 140) AS gs(tier)

  UNION ALL

  SELECT
    format('Bot Hunter Tier %s', lpad(tier::text, 4, '0')) AS name,
    format('Defeat AI opponents %s times.', tier * 3) AS description,
    (ARRAY['🤖', '🛸', '⚔️', '🧨'])[((tier - 1) % 4) + 1] AS icon,
    'ai' AS category,
    'win_count' AS requirement_type,
    tier * 3 AS requirement_value,
    10 + tier AS points,
    CASE
      WHEN tier >= 126 THEN 'legendary'
      WHEN tier >= 91 THEN 'epic'
      WHEN tier >= 49 THEN 'rare'
      ELSE 'common'
    END AS rarity
  FROM generate_series(1, 140) AS gs(tier)

  UNION ALL

  SELECT
    format('Battle Pass Level %s', lpad(tier::text, 4, '0')) AS name,
    format('Complete %s total typing tests.', tier * 10) AS description,
    (ARRAY['⭐', '🎯', '🏅', '👑'])[((tier - 1) % 4) + 1] AS icon,
    'special' AS category,
    'tests_count' AS requirement_type,
    tier * 10 AS requirement_value,
    5 + (tier / 2) AS points,
    CASE
      WHEN tier >= 108 THEN 'legendary'
      WHEN tier >= 78 THEN 'epic'
      WHEN tier >= 42 THEN 'rare'
      ELSE 'common'
    END AS rarity
  FROM generate_series(1, 120) AS gs(tier)
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
FROM generated_achievements
ON CONFLICT (name) DO NOTHING;
