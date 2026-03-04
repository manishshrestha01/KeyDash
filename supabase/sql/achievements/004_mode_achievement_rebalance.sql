-- Rebalance accuracy/coding/symbols/multiplayer/ai achievements and remove streak achievements.
-- Safe to rerun.

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

DELETE FROM public.user_achievements
WHERE achievement_id IN (
  SELECT id
  FROM public.achievements
  WHERE category IN ('accuracy', 'streak', 'coding', 'symbols', 'multiplayer', 'ai')
);

DELETE FROM public.achievements
WHERE category IN ('accuracy', 'streak', 'coding', 'symbols', 'multiplayer', 'ai');

WITH mode_test_tiers AS (
  SELECT * FROM (
    VALUES
      ('V', '1-20 tests', 1, 'common', 10),
      ('IV', '21-50 tests', 21, 'rare', 22),
      ('III', '51-70 tests', 51, 'epic', 35),
      ('II', '71-100 tests', 71, 'legendary', 50),
      ('I', '101+ tests', 101, 'conqueror', 70)
  ) AS t(tier_label, range_label, requirement_value, rarity, points)
),
accuracy_streak_tiers AS (
  SELECT * FROM (
    VALUES
      ('V', '1x 100% accuracy', 1, 'common', 12),
      ('IV', '5x 100% accuracy', 5, 'rare', 25),
      ('III', '10x 100% accuracy', 10, 'epic', 40),
      ('II', '20x 100% accuracy', 20, 'legendary', 60),
      ('I', '21+ 100% accuracy', 21, 'conqueror', 75)
  ) AS t(tier_label, range_label, requirement_value, rarity, points)
),
ai_mode_tiers AS (
  SELECT * FROM (
    VALUES
      ('V', '1 win', 1, 'common', 14),
      ('IV', '5 wins', 5, 'rare', 28),
      ('III', '10 wins', 10, 'epic', 45),
      ('II', '20 wins', 20, 'legendary', 65),
      ('I', '21+ wins', 21, 'conqueror', 85)
  ) AS t(tier_label, range_label, requirement_value, rarity, points)
),
ai_modes AS (
  SELECT * FROM (
    VALUES
      ('easy', 'Easy'),
      ('medium', 'Medium'),
      ('hard', 'Hard'),
      ('pro', 'Pro')
  ) AS t(mode_key, mode_label)
),
rebalanced_achievements AS (
  SELECT
    format('Perfect Accuracy Tier %s (%s)', ast.tier_label, ast.range_label) AS name,
    format('Finish %s across all modes (excluding custom).', ast.range_label) AS description,
    'target' AS icon,
    'accuracy' AS category,
    'tests_count' AS requirement_type,
    ast.requirement_value,
    ast.points,
    ast.rarity
  FROM accuracy_streak_tiers ast

  UNION ALL

  SELECT
    format('Code Crafter Tier %s (%s)', mtt.tier_label, mtt.range_label) AS name,
    format('Complete %s in coding mode.', mtt.range_label) AS description,
    'code' AS icon,
    'coding' AS category,
    'tests_count' AS requirement_type,
    mtt.requirement_value,
    mtt.points,
    mtt.rarity
  FROM mode_test_tiers mtt

  UNION ALL

  SELECT
    format('Glyph Runner Tier %s (%s)', mtt.tier_label, mtt.range_label) AS name,
    format('Complete %s in symbols mode.', mtt.range_label) AS description,
    'hash' AS icon,
    'symbols' AS category,
    'tests_count' AS requirement_type,
    mtt.requirement_value,
    mtt.points,
    mtt.rarity
  FROM mode_test_tiers mtt

  UNION ALL

  SELECT
    format('Squad Racer Tier %s (%s)', mtt.tier_label, mtt.range_label) AS name,
    format('Complete %s in multiplayer mode.', mtt.range_label) AS description,
    'users' AS icon,
    'multiplayer' AS category,
    'tests_count' AS requirement_type,
    mtt.requirement_value,
    mtt.points,
    mtt.rarity
  FROM mode_test_tiers mtt

  UNION ALL

  SELECT
    format('AI %s Hunter Tier %s (%s)', am.mode_label, amt.tier_label, amt.range_label) AS name,
    format('Win %s in AI Battle %s mode.', amt.range_label, am.mode_label) AS description,
    'bot' AS icon,
    'ai' AS category,
    'win_count' AS requirement_type,
    amt.requirement_value,
    amt.points,
    amt.rarity
  FROM ai_modes am
  CROSS JOIN ai_mode_tiers amt
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
FROM rebalanced_achievements
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
