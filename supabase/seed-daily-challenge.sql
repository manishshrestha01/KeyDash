-- Seed Daily Challenge for Today
-- Run this in Supabase SQL Editor to create today's daily challenge

-- First, deactivate any existing daily challenges for today
UPDATE public.challenges 
SET is_active = false 
WHERE challenge_type = 'daily' 
AND start_date = CURRENT_DATE;

-- Insert today's daily challenge
INSERT INTO public.challenges (challenge_type, challenge_text, start_date, end_date, is_active)
VALUES (
  'daily',
  'The quick brown fox jumps over the lazy dog. Programming is the art of turning caffeine into code. Every expert was once a beginner, and every master was once a disaster. Keep practicing and you will improve.',
  CURRENT_DATE,
  CURRENT_DATE,
  true
);

-- Verify the challenge was created
SELECT * FROM public.challenges WHERE challenge_type = 'daily' AND start_date = CURRENT_DATE;
