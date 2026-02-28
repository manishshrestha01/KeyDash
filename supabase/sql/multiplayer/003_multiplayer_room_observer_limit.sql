-- KeyDash Multiplayer Room Observer Limit
-- Run this in Supabase SQL Editor.
-- Safe to re-run (idempotent).

ALTER TABLE public.multiplayer_rooms
  ADD COLUMN IF NOT EXISTS max_observers INTEGER DEFAULT 10;

UPDATE public.multiplayer_rooms
SET max_observers = 10
WHERE max_observers IS NULL;

ALTER TABLE public.multiplayer_rooms
  ALTER COLUMN max_observers SET DEFAULT 10,
  ALTER COLUMN max_observers SET NOT NULL;
