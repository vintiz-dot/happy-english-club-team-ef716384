-- Chat persistence — WITHOUT giving the assistant a write path.
-- =============================================================
-- The chat edge function stays READ-ONLY (its hard rule). Persistence is a
-- CLIENT feature: the browser saves the transcript it already holds into
-- tables the user owns, exactly like any other user-owned write in this app.
-- The model never touches these tables, so prompt injection cannot write,
-- and a forged student_id in a tool call still reads zero rows.
--
-- Privacy stance: conversations are OWN-ROW ONLY. Deliberately no admin or
-- teacher read policy — children will chat with this and their conversations
-- are private. If moderation is ever needed, add it as an explicit,
-- announced policy decision, not a silent default.

CREATE TABLE IF NOT EXISTS public.chat_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL DEFAULT auth.uid(),
  title TEXT CHECK (char_length(title) <= 120),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  -- Cap stops a hostile client flooding storage through its own rows.
  content TEXT NOT NULL CHECK (char_length(content) <= 8000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_conversations_user
  ON public.chat_conversations(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation
  ON public.chat_messages(conversation_id, created_at);

ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Conversations: strictly the owner, for every operation. WITH CHECK stops
-- inserting/updating a row that claims someone else's user_id.
DROP POLICY IF EXISTS "own_chat_conversations" ON public.chat_conversations;
CREATE POLICY "own_chat_conversations" ON public.chat_conversations
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Messages: reachable only through a conversation the caller owns.
DROP POLICY IF EXISTS "own_chat_messages" ON public.chat_messages;
CREATE POLICY "own_chat_messages" ON public.chat_messages
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.chat_conversations c
    WHERE c.id = chat_messages.conversation_id AND c.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.chat_conversations c
    WHERE c.id = chat_messages.conversation_id AND c.user_id = auth.uid()
  ));
