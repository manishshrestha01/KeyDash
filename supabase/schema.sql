-- KeyDash v2 Database Schema
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
  total_time_practiced INTEGER DEFAULT 0, -- in seconds
  average_wpm DECIMAL(5,2) DEFAULT 0,
  average_accuracy DECIMAL(5,2) DEFAULT 0,
  -- Preferences
  theme TEXT DEFAULT 'dark',
  sound_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- TYPING HISTORY TABLE (Full history with retry support)
-- ============================================
CREATE TABLE IF NOT EXISTS public.typing_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  -- Mode info
  mode TEXT NOT NULL, -- 'english', 'nepali', 'coding', 'symbols', 'custom', 'daily', 'weekly', 'monthly', 'multiplayer', 'ai_battle'
  sub_mode TEXT, -- language/coding language/difficulty
  -- Text data
  original_text TEXT NOT NULL,
  typed_text TEXT NOT NULL,
  -- Stats
  wpm INTEGER NOT NULL,
  raw_wpm INTEGER,
  accuracy DECIMAL(5,2) NOT NULL,
  errors INTEGER DEFAULT 0,
  correct_chars INTEGER DEFAULT 0,
  total_chars INTEGER DEFAULT 0,
  duration_seconds DECIMAL(10,2) NOT NULL,
  -- Detailed tracking
  mistake_indices INTEGER[], -- Array of character indices where mistakes occurred
  corrections INTEGER DEFAULT 0, -- Number of backspaces/corrections
  -- Metadata
  is_completed BOOLEAN DEFAULT true,
  source TEXT, -- For custom text: where it came from
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_typing_history_user_id ON public.typing_history(user_id);
CREATE INDEX IF NOT EXISTS idx_typing_history_mode ON public.typing_history(mode);
CREATE INDEX IF NOT EXISTS idx_typing_history_created_at ON public.typing_history(created_at DESC);

-- ============================================
-- DAILY/WEEKLY/MONTHLY CHALLENGES
-- ============================================
CREATE TABLE IF NOT EXISTS public.challenges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  challenge_type TEXT NOT NULL, -- 'daily', 'weekly', 'monthly'
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
  UNIQUE(user_id, challenge_id) -- One attempt per user per challenge
);

-- ============================================
-- LEADERBOARDS (Time-based)
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
  status TEXT DEFAULT 'waiting', -- 'waiting', 'countdown', 'racing', 'finished'
  race_text TEXT,
  max_players INTEGER DEFAULT 5,
  current_players INTEGER DEFAULT 0,
  started_at TIMESTAMP WITH TIME ZONE,
  finished_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

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
  -- Progress tracking
  progress INTEGER DEFAULT 0, -- percentage 0-100
  current_position INTEGER DEFAULT 0, -- character position
  wpm INTEGER DEFAULT 0,
  accuracy DECIMAL(5,2) DEFAULT 100,
  errors INTEGER DEFAULT 0,
  finished_at TIMESTAMP WITH TIME ZONE,
  final_rank INTEGER,
  is_ready BOOLEAN DEFAULT false,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(room_id, user_id)
);

-- ============================================
-- AI BATTLE HISTORY
-- ============================================
CREATE TABLE IF NOT EXISTS public.ai_battles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  difficulty TEXT NOT NULL, -- 'easy', 'medium', 'hard', 'pro'
  race_text TEXT NOT NULL,
  -- User stats
  user_wpm INTEGER NOT NULL,
  user_accuracy DECIMAL(5,2) NOT NULL,
  user_errors INTEGER DEFAULT 0,
  user_duration DECIMAL(10,2) NOT NULL,
  -- AI stats
  ai_wpm INTEGER NOT NULL,
  ai_duration DECIMAL(10,2) NOT NULL,
  -- Result
  winner TEXT NOT NULL, -- 'user' or 'ai'
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
  category TEXT NOT NULL, -- 'speed', 'accuracy', 'streak', 'coding', 'symbols', 'multiplayer', 'ai', 'special'
  requirement_type TEXT NOT NULL, -- 'wpm_single', 'wpm_average', 'accuracy', 'streak', 'tests_count', 'win_count', etc.
  requirement_value INTEGER NOT NULL,
  points INTEGER DEFAULT 10,
  rarity TEXT DEFAULT 'common', -- 'common', 'rare', 'epic', 'legendary'
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
-- CUSTOM TEXTS (Saved by users)
-- ============================================
CREATE TABLE IF NOT EXISTS public.custom_texts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT,
  content TEXT NOT NULL,
  is_code BOOLEAN DEFAULT false,
  language TEXT, -- for code: 'javascript', 'python', etc.
  times_practiced INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- SHARED RESULTS (for social sharing)
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
-- ROW LEVEL SECURITY POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.typing_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenge_attempts ENABLE ROW LEVEL SECURITY;
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

-- PROFILES: Users can read all profiles but only update their own
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- TYPING HISTORY: Users can only see and manage their own history
CREATE POLICY "Users can view own typing history" ON public.typing_history
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own typing history" ON public.typing_history
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own typing history" ON public.typing_history
  FOR DELETE USING (auth.uid() = user_id);

-- CHALLENGES: Everyone can view active challenges
CREATE POLICY "Anyone can view challenges" ON public.challenges
  FOR SELECT USING (true);

-- CHALLENGE ATTEMPTS: Users can view their own and leaderboard
CREATE POLICY "Users can view own challenge attempts" ON public.challenge_attempts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view challenge leaderboard" ON public.challenge_attempts
  FOR SELECT USING (true);

CREATE POLICY "Users can submit challenge attempts" ON public.challenge_attempts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- LEADERBOARDS: Public read, user insert own
CREATE POLICY "Anyone can view daily leaderboard" ON public.leaderboard_daily
  FOR SELECT USING (true);

CREATE POLICY "Users can insert own daily score" ON public.leaderboard_daily
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own daily score" ON public.leaderboard_daily
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view weekly leaderboard" ON public.leaderboard_weekly
  FOR SELECT USING (true);

CREATE POLICY "Users can insert own weekly score" ON public.leaderboard_weekly
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own weekly score" ON public.leaderboard_weekly
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view monthly leaderboard" ON public.leaderboard_monthly
  FOR SELECT USING (true);

CREATE POLICY "Users can insert own monthly score" ON public.leaderboard_monthly
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own monthly score" ON public.leaderboard_monthly
  FOR UPDATE USING (auth.uid() = user_id);

-- MULTIPLAYER ROOMS: Public access for matchmaking
CREATE POLICY "Anyone can view rooms" ON public.multiplayer_rooms
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create rooms" ON public.multiplayer_rooms
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Room hosts can update rooms" ON public.multiplayer_rooms
  FOR UPDATE USING (auth.uid() = host_id OR auth.uid() IS NOT NULL);

-- MULTIPLAYER PARTICIPANTS: Public for live updates
CREATE POLICY "Anyone can view participants" ON public.multiplayer_participants
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can join rooms" ON public.multiplayer_participants
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own participation" ON public.multiplayer_participants
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can leave rooms" ON public.multiplayer_participants
  FOR DELETE USING (auth.uid() = user_id);

-- AI BATTLES: Users can only see their own
CREATE POLICY "Users can view own AI battles" ON public.ai_battles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own AI battles" ON public.ai_battles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ACHIEVEMENTS: Public read
CREATE POLICY "Anyone can view achievements" ON public.achievements
  FOR SELECT USING (true);

-- USER ACHIEVEMENTS: Users see their own, public leaderboard
CREATE POLICY "Anyone can view user achievements" ON public.user_achievements
  FOR SELECT USING (true);

CREATE POLICY "System can insert achievements" ON public.user_achievements
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- CUSTOM TEXTS: Users manage their own
CREATE POLICY "Users can view own custom texts" ON public.custom_texts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own custom texts" ON public.custom_texts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own custom texts" ON public.custom_texts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own custom texts" ON public.custom_texts
  FOR DELETE USING (auth.uid() = user_id);

-- SHARED RESULTS: Anyone can view, users manage own
CREATE POLICY "Anyone can view shared results" ON public.shared_results
  FOR SELECT USING (true);

CREATE POLICY "Users can create own shared results" ON public.shared_results
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update streak function
CREATE OR REPLACE FUNCTION public.update_user_streak(p_user_id UUID)
RETURNS void AS $$
DECLARE
  v_last_date DATE;
  v_today DATE := CURRENT_DATE;
BEGIN
  SELECT last_activity_date INTO v_last_date FROM public.profiles WHERE id = p_user_id;
  
  IF v_last_date IS NULL THEN
    -- First activity
    UPDATE public.profiles 
    SET current_streak = 1, longest_streak = 1, last_activity_date = v_today
    WHERE id = p_user_id;
  ELSIF v_last_date = v_today THEN
    -- Already active today, no change
    NULL;
  ELSIF v_last_date = v_today - INTERVAL '1 day' THEN
    -- Consecutive day
    UPDATE public.profiles 
    SET current_streak = current_streak + 1,
        longest_streak = GREATEST(longest_streak, current_streak + 1),
        last_activity_date = v_today
    WHERE id = p_user_id;
  ELSE
    -- Streak broken
    UPDATE public.profiles 
    SET current_streak = 1, last_activity_date = v_today
    WHERE id = p_user_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update profile stats function
CREATE OR REPLACE FUNCTION public.update_profile_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Update total tests and calculate new averages
  UPDATE public.profiles
  SET 
    total_tests = total_tests + 1,
    total_time_practiced = total_time_practiced + NEW.duration_seconds,
    average_wpm = (
      SELECT AVG(wpm) FROM public.typing_history WHERE user_id = NEW.user_id
    ),
    average_accuracy = (
      SELECT AVG(accuracy) FROM public.typing_history WHERE user_id = NEW.user_id
    ),
    updated_at = NOW()
  WHERE id = NEW.user_id;
  
  -- Update streak
  PERFORM public.update_user_streak(NEW.user_id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for stats update
DROP TRIGGER IF EXISTS on_typing_history_insert ON public.typing_history;
CREATE TRIGGER on_typing_history_insert
  AFTER INSERT ON public.typing_history
  FOR EACH ROW EXECUTE FUNCTION public.update_profile_stats();

-- ============================================
-- SEED DATA: DEFAULT ACHIEVEMENTS
-- ============================================
INSERT INTO public.achievements (name, description, icon, category, requirement_type, requirement_value, points, rarity) VALUES
-- Speed achievements
('Speed Demon', 'Reach 50 WPM in a single test', '⚡', 'speed', 'wpm_single', 50, 10, 'common'),
('Lightning Fingers', 'Reach 75 WPM in a single test', '🌩️', 'speed', 'wpm_single', 75, 25, 'rare'),
('Typing Thunder', 'Reach 100 WPM in a single test', '⛈️', 'speed', 'wpm_single', 100, 50, 'epic'),
('Speed of Light', 'Reach 125 WPM in a single test', '💫', 'speed', 'wpm_single', 125, 100, 'legendary'),
('Supersonic', 'Reach 150 WPM in a single test', '🚀', 'speed', 'wpm_single', 150, 200, 'legendary'),

-- Accuracy achievements
('Careful Typist', 'Complete a test with 95% accuracy', '🎯', 'accuracy', 'accuracy', 95, 10, 'common'),
('Precision Master', 'Complete a test with 98% accuracy', '🏹', 'accuracy', 'accuracy', 98, 25, 'rare'),
('Perfectionist', 'Complete a test with 100% accuracy', '💎', 'accuracy', 'accuracy', 100, 50, 'epic'),
('Flawless Victory', 'Complete 10 tests with 100% accuracy', '👑', 'accuracy', 'perfect_tests', 10, 100, 'legendary'),

-- Streak achievements
('Getting Started', 'Maintain a 3-day streak', '🔥', 'streak', 'streak', 3, 10, 'common'),
('Week Warrior', 'Maintain a 7-day streak', '🔥🔥', 'streak', 'streak', 7, 25, 'rare'),
('Dedicated Typist', 'Maintain a 30-day streak', '🔥🔥🔥', 'streak', 'streak', 30, 100, 'epic'),
('Streak Legend', 'Maintain a 100-day streak', '🏆🔥', 'streak', 'streak', 100, 500, 'legendary'),

-- Tests count achievements
('First Steps', 'Complete your first typing test', '👶', 'special', 'tests_count', 1, 5, 'common'),
('Getting Warmed Up', 'Complete 10 typing tests', '🏃', 'special', 'tests_count', 10, 15, 'common'),
('Regular Practitioner', 'Complete 50 typing tests', '💪', 'special', 'tests_count', 50, 30, 'rare'),
('Typing Enthusiast', 'Complete 100 typing tests', '🌟', 'special', 'tests_count', 100, 50, 'rare'),
('Keyboard Warrior', 'Complete 500 typing tests', '⚔️', 'special', 'tests_count', 500, 150, 'epic'),
('Typing Master', 'Complete 1000 typing tests', '🏅', 'special', 'tests_count', 1000, 300, 'legendary'),

-- Coding achievements
('Code Newbie', 'Complete 5 coding practice sessions', '💻', 'coding', 'coding_tests', 5, 15, 'common'),
('Code Enthusiast', 'Complete 25 coding practice sessions', '🖥️', 'coding', 'coding_tests', 25, 40, 'rare'),
('Code Master', 'Complete 100 coding practice sessions', '👨‍💻', 'coding', 'coding_tests', 100, 100, 'epic'),

-- Symbols achievements
('Symbol Starter', 'Complete 5 symbol practice sessions', '🔣', 'symbols', 'symbol_tests', 5, 15, 'common'),
('Symbol Expert', 'Complete 25 symbol practice sessions', '⌨️', 'symbols', 'symbol_tests', 25, 40, 'rare'),

-- Multiplayer achievements
('First Race', 'Win your first multiplayer race', '🏁', 'multiplayer', 'mp_wins', 1, 15, 'common'),
('Racing Pro', 'Win 10 multiplayer races', '🏎️', 'multiplayer', 'mp_wins', 10, 50, 'rare'),
('Racing Champion', 'Win 50 multiplayer races', '🏆', 'multiplayer', 'mp_wins', 50, 150, 'epic'),

-- AI Battle achievements
('AI Challenger', 'Beat Easy AI', '🤖', 'ai', 'ai_easy', 1, 10, 'common'),
('AI Fighter', 'Beat Medium AI', '🤖', 'ai', 'ai_medium', 1, 25, 'rare'),
('AI Warrior', 'Beat Hard AI', '🤖', 'ai', 'ai_hard', 1, 50, 'epic'),
('AI Slayer', 'Beat Pro AI', '🤖', 'ai', 'ai_pro', 1, 100, 'legendary')

ON CONFLICT (name) DO NOTHING;

-- ============================================
-- REALTIME SUBSCRIPTIONS
-- ============================================
-- Enable realtime for multiplayer tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.multiplayer_rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE public.multiplayer_participants;

-- ============================================
-- VIEWS FOR LEADERBOARDS
-- ============================================

-- Best scores view (combining all modes)
CREATE OR REPLACE VIEW public.best_overall_scores AS
SELECT 
  user_id,
  MAX(wpm) as best_wpm,
  MAX(accuracy) as best_accuracy,
  COUNT(*) as total_tests,
  AVG(wpm) as avg_wpm,
  AVG(accuracy) as avg_accuracy
FROM public.typing_history
WHERE is_completed = true
GROUP BY user_id
ORDER BY best_wpm DESC;
