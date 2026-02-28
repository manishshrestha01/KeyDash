-- Seed a large achievement catalog (1200+) for existing deployments.
-- Safe to rerun because names are unique and ON CONFLICT is used.

WITH generated_achievements AS (
  SELECT
    format('Drop Zone Sprinter %s', lpad(tier::text, 4, '0')) AS name,
    format('Hit %s+ WPM in a single test.', 29 + tier) AS description,
    (ARRAY['⚡', '🚀', '🏃', '💨'])[((tier - 1) % 4) + 1] AS icon,
    'speed' AS category,
    'wpm_single' AS requirement_type,
    29 + tier AS requirement_value,
    5 + (tier / 2) AS points,
    CASE
      WHEN tier >= 198 THEN 'legendary'
      WHEN tier >= 143 THEN 'epic'
      WHEN tier >= 77 THEN 'rare'
      ELSE 'common'
    END AS rarity
  FROM generate_series(1, 220) AS gs(tier)

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
