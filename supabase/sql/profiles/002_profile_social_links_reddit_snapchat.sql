-- Add Reddit and Snapchat social links to profiles.
-- Safe to run multiple times.

ALTER TABLE IF EXISTS public.profiles
  ADD COLUMN IF NOT EXISTS reddit TEXT;

ALTER TABLE IF EXISTS public.profiles
  ADD COLUMN IF NOT EXISTS snapchat TEXT;
