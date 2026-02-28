-- KeyDash Multiplayer Invite Migration
-- Run this in Supabase SQL Editor.
-- Safe to re-run (idempotent).

-- ============================================
-- TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.multiplayer_invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID REFERENCES public.multiplayer_rooms(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  receiver_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  responded_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(room_id, receiver_id)
);

CREATE INDEX IF NOT EXISTS idx_multiplayer_invitations_receiver_status
  ON public.multiplayer_invitations(receiver_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_multiplayer_invitations_sender_status
  ON public.multiplayer_invitations(sender_id, status, created_at DESC);

-- ============================================
-- RLS
-- ============================================
ALTER TABLE public.multiplayer_invitations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view related invites" ON public.multiplayer_invitations;
DROP POLICY IF EXISTS "Users can send invites" ON public.multiplayer_invitations;
DROP POLICY IF EXISTS "Users can respond to invites" ON public.multiplayer_invitations;

CREATE POLICY "Users can view related invites" ON public.multiplayer_invitations
  FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can send invites" ON public.multiplayer_invitations
  FOR INSERT WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can respond to invites" ON public.multiplayer_invitations
  FOR UPDATE USING (auth.uid() = sender_id OR auth.uid() = receiver_id)
  WITH CHECK (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- ============================================
-- REALTIME
-- ============================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_publication
    WHERE pubname = 'supabase_realtime'
  ) THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = 'multiplayer_invitations'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.multiplayer_invitations;
    END IF;
  END IF;
END;
$$;
