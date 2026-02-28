-- KeyDash Multiplayer Observer Support
-- Run this in Supabase SQL Editor.
-- Safe to re-run (idempotent).

ALTER TABLE public.multiplayer_participants
  ADD COLUMN IF NOT EXISTS is_observer BOOLEAN DEFAULT false;

UPDATE public.multiplayer_participants
SET is_observer = false
WHERE is_observer IS NULL;

ALTER TABLE public.multiplayer_participants
  ALTER COLUMN is_observer SET DEFAULT false,
  ALTER COLUMN is_observer SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_multiplayer_participants_room_observer
  ON public.multiplayer_participants(room_id, is_observer);
