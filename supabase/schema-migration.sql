-- KeyDash v2 Database Schema (Migration Safe)
-- This version drops existing policies before creating new ones
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- PROFILES TABLE (Extended)
-- ============================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  email TEXT,
  bio TEXT,
  twitter TEXT,
  github TEXT,
  linkedin TEXT,
  instagram TEXT,
  youtube TEXT,
  twitch TEXT,
  website TEXT,
  -- Streak tracking
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_activity_date DATE,
  -- Stats
  total_tests INTEGER DEFAULT 0,
  total_time_practiced INTEGER DEFAULT 0,
  average_wpm DECIMAL(5,2) DEFAULT 0,
  average_accuracy DECIMAL(5,2) DEFAULT 0,
  -- Preferences
  theme TEXT DEFAULT 'dark',
  sound_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- TYPING HISTORY TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.typing_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  mode TEXT NOT NULL,
  sub_mode TEXT,
  original_text TEXT NOT NULL,
  typed_text TEXT NOT NULL,
  wpm INTEGER NOT NULL,
  raw_wpm INTEGER,
  accuracy DECIMAL(5,2) NOT NULL,
  errors INTEGER DEFAULT 0,
  correct_chars INTEGER DEFAULT 0,
  total_chars INTEGER DEFAULT 0,
  duration_seconds DECIMAL(10,2) NOT NULL,
  mistake_indices INTEGER[],
  corrections INTEGER DEFAULT 0,
  is_completed BOOLEAN DEFAULT true,
  source TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_typing_history_user_id ON public.typing_history(user_id);
CREATE INDEX IF NOT EXISTS idx_typing_history_mode ON public.typing_history(mode);
CREATE INDEX IF NOT EXISTS idx_typing_history_created_at ON public.typing_history(created_at DESC);

-- ============================================
-- CHALLENGES
-- ============================================
CREATE TABLE IF NOT EXISTS public.challenges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  challenge_type TEXT NOT NULL,
  challenge_text TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_challenges_type_date ON public.challenges(challenge_type, start_date, end_date);

-- ============================================
-- CHALLENGE ATTEMPTS
-- ============================================
CREATE TABLE IF NOT EXISTS public.challenge_attempts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  challenge_id UUID REFERENCES public.challenges(id) ON DELETE CASCADE,
  wpm INTEGER NOT NULL,
  accuracy DECIMAL(5,2) NOT NULL,
  errors INTEGER DEFAULT 0,
  duration_seconds DECIMAL(10,2) NOT NULL,
  typed_text TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, challenge_id)
);

-- ============================================
-- LEADERBOARDS (V1 Tables - for backward compatibility)
-- ============================================

-- Timed mode leaderboard (15s, 30s, 60s, 120s)
CREATE TABLE IF NOT EXISTS public.leaderboard_timed (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  wpm INTEGER NOT NULL,
  accuracy DECIMAL(5,2) NOT NULL,
  time INTEGER NOT NULL, -- 15, 30, 60, 120
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_leaderboard_timed_user_id ON public.leaderboard_timed(user_id);
CREATE INDEX IF NOT EXISTS idx_leaderboard_timed_time ON public.leaderboard_timed(time);
CREATE INDEX IF NOT EXISTS idx_leaderboard_timed_wpm ON public.leaderboard_timed(wpm DESC);

-- Sentence mode leaderboard (easy, medium, hard, extreme)
CREATE TABLE IF NOT EXISTS public.leaderboard_sentence (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  wpm INTEGER NOT NULL,
  accuracy DECIMAL(5,2) NOT NULL,
  difficulty TEXT NOT NULL, -- easy, medium, hard, extreme
  time DECIMAL(10,2), -- completion time in seconds
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_leaderboard_sentence_user_id ON public.leaderboard_sentence(user_id);
CREATE INDEX IF NOT EXISTS idx_leaderboard_sentence_difficulty ON public.leaderboard_sentence(difficulty);
CREATE INDEX IF NOT EXISTS idx_leaderboard_sentence_wpm ON public.leaderboard_sentence(wpm DESC);

-- Best timed scores (for quick lookup - stores only best per user per time)
CREATE TABLE IF NOT EXISTS public.best_timed_scores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  wpm INTEGER NOT NULL,
  accuracy DECIMAL(5,2) NOT NULL,
  time INTEGER NOT NULL, -- 15, 30, 60, 120
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, time)
);

CREATE INDEX IF NOT EXISTS idx_best_timed_scores_time ON public.best_timed_scores(time);
CREATE INDEX IF NOT EXISTS idx_best_timed_scores_wpm ON public.best_timed_scores(wpm DESC);

-- Best sentence scores (for quick lookup - stores only best per user per difficulty)
CREATE TABLE IF NOT EXISTS public.best_sentence_scores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  wpm INTEGER NOT NULL,
  accuracy DECIMAL(5,2) NOT NULL,
  difficulty TEXT NOT NULL, -- easy, medium, hard, extreme
  time DECIMAL(10,2), -- completion time in seconds
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, difficulty)
);

CREATE INDEX IF NOT EXISTS idx_best_sentence_scores_difficulty ON public.best_sentence_scores(difficulty);
CREATE INDEX IF NOT EXISTS idx_best_sentence_scores_wpm ON public.best_sentence_scores(wpm DESC);

-- ============================================
-- LEADERBOARDS (V2 - Period based)
-- ============================================
CREATE TABLE IF NOT EXISTS public.leaderboard_daily (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  wpm INTEGER NOT NULL,
  accuracy DECIMAL(5,2) NOT NULL,
  errors INTEGER DEFAULT 0,
  duration_seconds DECIMAL(10,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, date)
);

CREATE TABLE IF NOT EXISTS public.leaderboard_weekly (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  wpm INTEGER NOT NULL,
  accuracy DECIMAL(5,2) NOT NULL,
  errors INTEGER DEFAULT 0,
  total_tests INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, week_start)
);

CREATE TABLE IF NOT EXISTS public.leaderboard_monthly (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  month_start DATE NOT NULL,
  wpm INTEGER NOT NULL,
  accuracy DECIMAL(5,2) NOT NULL,
  errors INTEGER DEFAULT 0,
  total_tests INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, month_start)
);

-- ============================================
-- MULTIPLAYER ROOMS
-- ============================================
CREATE TABLE IF NOT EXISTS public.multiplayer_rooms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_code TEXT UNIQUE NOT NULL,
  host_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'waiting',
  race_text TEXT,
  max_players INTEGER DEFAULT 5,
  max_observers INTEGER NOT NULL DEFAULT 10,
  current_players INTEGER DEFAULT 0,
  started_at TIMESTAMP WITH TIME ZONE,
  finished_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.multiplayer_rooms
  ADD COLUMN IF NOT EXISTS max_observers INTEGER DEFAULT 10;

UPDATE public.multiplayer_rooms
SET max_observers = 10
WHERE max_observers IS NULL;

ALTER TABLE public.multiplayer_rooms
  ALTER COLUMN max_observers SET DEFAULT 10,
  ALTER COLUMN max_observers SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_rooms_status ON public.multiplayer_rooms(status);
CREATE INDEX IF NOT EXISTS idx_rooms_code ON public.multiplayer_rooms(room_code);

-- ============================================
-- MULTIPLAYER PARTICIPANTS
-- ============================================
CREATE TABLE IF NOT EXISTS public.multiplayer_participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID REFERENCES public.multiplayer_rooms(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  is_observer BOOLEAN NOT NULL DEFAULT false,
  progress INTEGER DEFAULT 0,
  current_position INTEGER DEFAULT 0,
  wpm INTEGER DEFAULT 0,
  accuracy DECIMAL(5,2) DEFAULT 100,
  errors INTEGER DEFAULT 0,
  finished_at TIMESTAMP WITH TIME ZONE,
  final_rank INTEGER,
  is_ready BOOLEAN DEFAULT false,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(room_id, user_id)
);

-- Backward-compatible multiplayer observer support.
ALTER TABLE public.multiplayer_participants
  ADD COLUMN IF NOT EXISTS is_observer BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_multiplayer_participants_room_observer
  ON public.multiplayer_participants(room_id, is_observer);

-- ============================================
-- AI BATTLES
-- ============================================
CREATE TABLE IF NOT EXISTS public.ai_battles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  difficulty TEXT NOT NULL,
  race_text TEXT NOT NULL,
  user_wpm INTEGER NOT NULL,
  user_accuracy DECIMAL(5,2) NOT NULL,
  user_errors INTEGER DEFAULT 0,
  user_duration DECIMAL(10,2) NOT NULL,
  ai_wpm INTEGER NOT NULL,
  ai_duration DECIMAL(10,2) NOT NULL,
  winner TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- ACHIEVEMENTS
-- ============================================
CREATE TABLE IF NOT EXISTS public.achievements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT UNIQUE NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL,
  category TEXT NOT NULL,
  requirement_type TEXT NOT NULL,
  requirement_value INTEGER NOT NULL,
  points INTEGER DEFAULT 10,
  rarity TEXT DEFAULT 'common',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- USER ACHIEVEMENTS
-- ============================================
CREATE TABLE IF NOT EXISTS public.user_achievements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  achievement_id UUID REFERENCES public.achievements(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, achievement_id)
);

-- ============================================
-- CUSTOM TEXTS
-- ============================================
CREATE TABLE IF NOT EXISTS public.custom_texts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT,
  content TEXT NOT NULL,
  is_code BOOLEAN DEFAULT false,
  language TEXT,
  times_practiced INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- SHARED RESULTS
-- ============================================
CREATE TABLE IF NOT EXISTS public.shared_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  typing_history_id UUID REFERENCES public.typing_history(id) ON DELETE CASCADE,
  share_code TEXT UNIQUE NOT NULL,
  image_url TEXT,
  wpm INTEGER NOT NULL,
  accuracy DECIMAL(5,2) NOT NULL,
  mode TEXT NOT NULL,
  views INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shared_results_code ON public.shared_results(share_code);

-- ============================================
-- DROP EXISTING POLICIES (Safe to run multiple times)
-- ============================================

-- Profiles policies
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- Typing history policies
DROP POLICY IF EXISTS "Users can view own typing history" ON public.typing_history;
DROP POLICY IF EXISTS "Users can insert own typing history" ON public.typing_history;
DROP POLICY IF EXISTS "Users can delete own typing history" ON public.typing_history;
DROP POLICY IF EXISTS "Anyone can view typing history for leaderboard" ON public.typing_history;

-- Challenges policies
DROP POLICY IF EXISTS "Anyone can view challenges" ON public.challenges;

-- Challenge attempts policies
DROP POLICY IF EXISTS "Users can view own challenge attempts" ON public.challenge_attempts;
DROP POLICY IF EXISTS "Anyone can view challenge leaderboard" ON public.challenge_attempts;
DROP POLICY IF EXISTS "Users can submit challenge attempts" ON public.challenge_attempts;

-- Leaderboard timed policies (v1)
DROP POLICY IF EXISTS "Anyone can view timed leaderboard" ON public.leaderboard_timed;
DROP POLICY IF EXISTS "Users can insert own timed score" ON public.leaderboard_timed;

-- Leaderboard sentence policies (v1)
DROP POLICY IF EXISTS "Anyone can view sentence leaderboard" ON public.leaderboard_sentence;
DROP POLICY IF EXISTS "Users can insert own sentence score" ON public.leaderboard_sentence;

-- Best timed scores policies
DROP POLICY IF EXISTS "Anyone can view best timed scores" ON public.best_timed_scores;
DROP POLICY IF EXISTS "Users can upsert own best timed score" ON public.best_timed_scores;

-- Best sentence scores policies
DROP POLICY IF EXISTS "Anyone can view best sentence scores" ON public.best_sentence_scores;
DROP POLICY IF EXISTS "Users can upsert own best sentence score" ON public.best_sentence_scores;

-- Daily leaderboard policies
DROP POLICY IF EXISTS "Anyone can view daily leaderboard" ON public.leaderboard_daily;
DROP POLICY IF EXISTS "Users can insert own daily score" ON public.leaderboard_daily;
DROP POLICY IF EXISTS "Users can update own daily score" ON public.leaderboard_daily;

-- Weekly leaderboard policies
DROP POLICY IF EXISTS "Anyone can view weekly leaderboard" ON public.leaderboard_weekly;
DROP POLICY IF EXISTS "Users can insert own weekly score" ON public.leaderboard_weekly;
DROP POLICY IF EXISTS "Users can update own weekly score" ON public.leaderboard_weekly;

-- Monthly leaderboard policies
DROP POLICY IF EXISTS "Anyone can view monthly leaderboard" ON public.leaderboard_monthly;
DROP POLICY IF EXISTS "Users can insert own monthly score" ON public.leaderboard_monthly;
DROP POLICY IF EXISTS "Users can update own monthly score" ON public.leaderboard_monthly;

-- Multiplayer rooms policies
DROP POLICY IF EXISTS "Anyone can view rooms" ON public.multiplayer_rooms;
DROP POLICY IF EXISTS "Authenticated users can create rooms" ON public.multiplayer_rooms;
DROP POLICY IF EXISTS "Host can update room" ON public.multiplayer_rooms;
DROP POLICY IF EXISTS "Host can delete room" ON public.multiplayer_rooms;

-- Multiplayer participants policies
DROP POLICY IF EXISTS "Anyone can view participants" ON public.multiplayer_participants;
DROP POLICY IF EXISTS "Authenticated users can join rooms" ON public.multiplayer_participants;
DROP POLICY IF EXISTS "Users can update own participant data" ON public.multiplayer_participants;
DROP POLICY IF EXISTS "Users can leave rooms" ON public.multiplayer_participants;
DROP POLICY IF EXISTS "Host can moderate participants" ON public.multiplayer_participants;
DROP POLICY IF EXISTS "Host can remove participants" ON public.multiplayer_participants;

-- AI battles policies
DROP POLICY IF EXISTS "Users can view own AI battles" ON public.ai_battles;
DROP POLICY IF EXISTS "Users can insert own AI battles" ON public.ai_battles;

-- Achievements policies
DROP POLICY IF EXISTS "Anyone can view achievements" ON public.achievements;

-- User achievements policies
DROP POLICY IF EXISTS "Users can view own achievements" ON public.user_achievements;
DROP POLICY IF EXISTS "Anyone can view unlocked achievements" ON public.user_achievements;
DROP POLICY IF EXISTS "System can grant achievements" ON public.user_achievements;

-- Custom texts policies
DROP POLICY IF EXISTS "Users can view own custom texts" ON public.custom_texts;
DROP POLICY IF EXISTS "Users can insert own custom texts" ON public.custom_texts;
DROP POLICY IF EXISTS "Users can update own custom texts" ON public.custom_texts;
DROP POLICY IF EXISTS "Users can delete own custom texts" ON public.custom_texts;

-- Shared results policies
DROP POLICY IF EXISTS "Anyone can view shared results" ON public.shared_results;
DROP POLICY IF EXISTS "Users can share own results" ON public.shared_results;

-- ============================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.typing_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenge_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leaderboard_timed ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leaderboard_sentence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.best_timed_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.best_sentence_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leaderboard_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leaderboard_weekly ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leaderboard_monthly ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.multiplayer_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.multiplayer_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_battles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_texts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shared_results ENABLE ROW LEVEL SECURITY;

-- ============================================
-- CREATE NEW POLICIES
-- ============================================

-- PROFILES
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- TYPING HISTORY
CREATE POLICY "Users can view own typing history" ON public.typing_history
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view typing history for leaderboard" ON public.typing_history
  FOR SELECT USING (true);

CREATE POLICY "Users can insert own typing history" ON public.typing_history
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own typing history" ON public.typing_history
  FOR DELETE USING (auth.uid() = user_id);

-- CHALLENGES
CREATE POLICY "Anyone can view challenges" ON public.challenges
  FOR SELECT USING (true);

-- CHALLENGE ATTEMPTS
CREATE POLICY "Users can view own challenge attempts" ON public.challenge_attempts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view challenge leaderboard" ON public.challenge_attempts
  FOR SELECT USING (true);

CREATE POLICY "Users can submit challenge attempts" ON public.challenge_attempts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- LEADERBOARD TIMED (v1)
CREATE POLICY "Anyone can view timed leaderboard" ON public.leaderboard_timed
  FOR SELECT USING (true);

CREATE POLICY "Users can insert own timed score" ON public.leaderboard_timed
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- LEADERBOARD SENTENCE (v1)
CREATE POLICY "Anyone can view sentence leaderboard" ON public.leaderboard_sentence
  FOR SELECT USING (true);

CREATE POLICY "Users can insert own sentence score" ON public.leaderboard_sentence
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- BEST TIMED SCORES
CREATE POLICY "Anyone can view best timed scores" ON public.best_timed_scores
  FOR SELECT USING (true);

CREATE POLICY "Users can upsert own best timed score" ON public.best_timed_scores
  FOR ALL USING (auth.uid() = user_id);

-- BEST SENTENCE SCORES
CREATE POLICY "Anyone can view best sentence scores" ON public.best_sentence_scores
  FOR SELECT USING (true);

CREATE POLICY "Users can upsert own best sentence score" ON public.best_sentence_scores
  FOR ALL USING (auth.uid() = user_id);

-- DAILY LEADERBOARD
CREATE POLICY "Anyone can view daily leaderboard" ON public.leaderboard_daily
  FOR SELECT USING (true);

CREATE POLICY "Users can insert own daily score" ON public.leaderboard_daily
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own daily score" ON public.leaderboard_daily
  FOR UPDATE USING (auth.uid() = user_id);

-- WEEKLY LEADERBOARD
CREATE POLICY "Anyone can view weekly leaderboard" ON public.leaderboard_weekly
  FOR SELECT USING (true);

CREATE POLICY "Users can insert own weekly score" ON public.leaderboard_weekly
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own weekly score" ON public.leaderboard_weekly
  FOR UPDATE USING (auth.uid() = user_id);

-- MONTHLY LEADERBOARD
CREATE POLICY "Anyone can view monthly leaderboard" ON public.leaderboard_monthly
  FOR SELECT USING (true);

CREATE POLICY "Users can insert own monthly score" ON public.leaderboard_monthly
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own monthly score" ON public.leaderboard_monthly
  FOR UPDATE USING (auth.uid() = user_id);

-- MULTIPLAYER ROOMS
CREATE POLICY "Anyone can view rooms" ON public.multiplayer_rooms
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create rooms" ON public.multiplayer_rooms
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Host can update room" ON public.multiplayer_rooms
  FOR UPDATE USING (auth.uid() = host_id);

CREATE POLICY "Host can delete room" ON public.multiplayer_rooms
  FOR DELETE USING (auth.uid() = host_id);

-- MULTIPLAYER PARTICIPANTS
CREATE POLICY "Anyone can view participants" ON public.multiplayer_participants
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can join rooms" ON public.multiplayer_participants
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own participant data" ON public.multiplayer_participants
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can leave rooms" ON public.multiplayer_participants
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Host can moderate participants" ON public.multiplayer_participants
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.multiplayer_rooms
      WHERE multiplayer_rooms.id = multiplayer_participants.room_id
        AND multiplayer_rooms.host_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.multiplayer_rooms
      WHERE multiplayer_rooms.id = multiplayer_participants.room_id
        AND multiplayer_rooms.host_id = auth.uid()
    )
  );

CREATE POLICY "Host can remove participants" ON public.multiplayer_participants
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM public.multiplayer_rooms
      WHERE multiplayer_rooms.id = multiplayer_participants.room_id
        AND multiplayer_rooms.host_id = auth.uid()
    )
  );

-- AI BATTLES
CREATE POLICY "Users can view own AI battles" ON public.ai_battles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own AI battles" ON public.ai_battles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ACHIEVEMENTS
CREATE POLICY "Anyone can view achievements" ON public.achievements
  FOR SELECT USING (true);

-- USER ACHIEVEMENTS
CREATE POLICY "Anyone can view unlocked achievements" ON public.user_achievements
  FOR SELECT USING (true);

CREATE POLICY "System can grant achievements" ON public.user_achievements
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- CUSTOM TEXTS
CREATE POLICY "Users can view own custom texts" ON public.custom_texts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own custom texts" ON public.custom_texts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own custom texts" ON public.custom_texts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own custom texts" ON public.custom_texts
  FOR DELETE USING (auth.uid() = user_id);

-- SHARED RESULTS
CREATE POLICY "Anyone can view shared results" ON public.shared_results
  FOR SELECT USING (true);

CREATE POLICY "Users can share own results" ON public.shared_results
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================
-- INSERT DEFAULT ACHIEVEMENTS
-- ============================================
INSERT INTO public.achievements (name, description, icon, category, requirement_type, requirement_value, points, rarity) VALUES
  ('Speed Demon', 'Achieve 100+ WPM in a single test', '🚀', 'speed', 'wpm_single', 100, 50, 'epic'),
  ('Lightning Fast', 'Achieve 80+ WPM in a single test', '⚡', 'speed', 'wpm_single', 80, 30, 'rare'),
  ('Quick Fingers', 'Achieve 60+ WPM in a single test', '🏃', 'speed', 'wpm_single', 60, 20, 'common'),
  ('Perfectionist', 'Complete a test with 100% accuracy', '💯', 'accuracy', 'accuracy', 100, 40, 'rare'),
  ('Sharpshooter', 'Complete a test with 98%+ accuracy', '🎯', 'accuracy', 'accuracy', 98, 25, 'common'),
  ('Week Warrior', '7-day typing streak', '🔥', 'streak', 'streak', 7, 30, 'rare'),
  ('Daily Driver', '3-day typing streak', '📅', 'streak', 'streak', 3, 15, 'common'),
  ('Code Master', 'Complete 10 coding challenges', '💻', 'coding', 'tests_count', 10, 25, 'rare'),
  ('Symbol Savant', 'Complete 10 symbol tests', '🔣', 'symbols', 'tests_count', 10, 25, 'rare'),
  ('AI Slayer', 'Beat AI on hard difficulty', '🤖', 'ai', 'win_count', 1, 40, 'epic'),
  ('Race Champion', 'Win 5 multiplayer races', '🏆', 'multiplayer', 'win_count', 5, 35, 'rare'),
  ('First Steps', 'Complete your first typing test', '👶', 'special', 'tests_count', 1, 5, 'common'),
  ('Dedicated Typist', 'Complete 50 typing tests', '🎖️', 'special', 'tests_count', 50, 30, 'rare'),
  ('Typing Legend', 'Complete 200 typing tests', '👑', 'special', 'tests_count', 200, 100, 'legendary')
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- INSERT EXTENDED ACHIEVEMENT TRACKS (1200+)
-- ============================================
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

-- ============================================
-- FUNCTIONS FOR AUTO-UPDATING
-- ============================================

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update profile stats after typing test
CREATE OR REPLACE FUNCTION public.update_profile_stats()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.profiles
  SET
    total_tests = total_tests + 1,
    total_time_practiced = total_time_practiced + NEW.duration_seconds,
    last_activity_date = CURRENT_DATE,
    updated_at = NOW()
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for typing history insert
DROP TRIGGER IF EXISTS on_typing_history_insert ON public.typing_history;
CREATE TRIGGER on_typing_history_insert
  AFTER INSERT ON public.typing_history
  FOR EACH ROW EXECUTE FUNCTION public.update_profile_stats();

-- ============================================
-- REALTIME SUBSCRIPTIONS (for multiplayer)
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.multiplayer_rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE public.multiplayer_participants;
