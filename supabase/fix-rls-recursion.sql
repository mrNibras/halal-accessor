-- Fix infinite recursion in chat RLS policies
-- Run this in SQL Editor

-- Drop existing policies that cause recursion
DROP POLICY IF EXISTS "Users can view their conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can view participants of their conversations" ON public.participants;
DROP POLICY IF EXISTS "Users can read messages in their conversations" ON public.messages;
DROP POLICY IF EXISTS "Users can send messages to their conversations" ON public.messages;

-- Simpler policies without recursion
CREATE POLICY "Users can view their conversations" ON public.conversations FOR SELECT
  USING (created_by = auth.uid());

CREATE POLICY "Users can view participants of their conversations" ON public.participants FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can read messages in their conversations" ON public.messages FOR SELECT
  USING (sender_id = auth.uid());

CREATE POLICY "Users can send messages to their conversations" ON public.messages FOR INSERT
  WITH CHECK (sender_id = auth.uid());

SELECT 'Fixed! No more infinite recursion.' AS status;
