-- KeyDash Multiplayer Host Participant Moderation Policies
-- Run this in Supabase SQL Editor.
-- Safe to re-run (idempotent).

ALTER TABLE public.multiplayer_participants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Host can moderate participants" ON public.multiplayer_participants;
DROP POLICY IF EXISTS "Host can remove participants" ON public.multiplayer_participants;

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
