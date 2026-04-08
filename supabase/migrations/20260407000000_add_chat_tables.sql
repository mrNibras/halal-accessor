-- Conversations table
CREATE TABLE public.conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

-- Participants table (links users to conversations)
CREATE TABLE public.participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(conversation_id, user_id)
);

ALTER TABLE public.participants ENABLE ROW LEVEL SECURITY;

-- Messages table
CREATE TABLE public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for conversations
-- Users can see conversations they are participants of
CREATE POLICY "Users can view their conversations"
  ON public.conversations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.participants
      WHERE participants.conversation_id = conversations.id
      AND participants.user_id = auth.uid()
    )
  );

-- Users can create conversations
CREATE POLICY "Users can create conversations"
  ON public.conversations
  FOR INSERT
  WITH CHECK (auth.uid() = created_by);

-- RLS Policies for participants
-- Users can view participants of their conversations
CREATE POLICY "Users can view participants of their conversations"
  ON public.participants
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.participants p2
      WHERE p2.conversation_id = participants.conversation_id
      AND p2.user_id = auth.uid()
    )
  );

-- Users can add themselves to conversations
CREATE POLICY "Users can join conversations"
  ON public.participants
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for messages
-- Users can read messages in their conversations
CREATE POLICY "Users can read messages in their conversations"
  ON public.messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.participants
      WHERE participants.conversation_id = messages.conversation_id
      AND participants.user_id = auth.uid()
    )
  );

-- Users can send messages to their conversations
CREATE POLICY "Users can send messages to their conversations"
  ON public.messages
  FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM public.participants
      WHERE participants.conversation_id = messages.conversation_id
      AND participants.user_id = auth.uid()
    )
  );

-- Indexes for performance
CREATE INDEX idx_participants_conversation ON public.participants(conversation_id);
CREATE INDEX idx_participants_user ON public.participants(user_id);
CREATE INDEX idx_messages_conversation ON public.messages(conversation_id);
CREATE INDEX idx_messages_created ON public.messages(created_at);

-- Updated_at trigger for conversations
CREATE TRIGGER update_conversations_updated_at
  BEFORE UPDATE ON public.conversations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for these tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.participants;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
