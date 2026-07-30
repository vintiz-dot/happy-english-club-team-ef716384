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
  content TEXT NOT NULL CHECK (char_length(content) <= 8000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_conversations TO authenticated;
GRANT ALL ON public.chat_conversations TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_messages TO authenticated;
GRANT ALL ON public.chat_messages TO service_role;

CREATE INDEX IF NOT EXISTS idx_chat_conversations_user
  ON public.chat_conversations(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation
  ON public.chat_messages(conversation_id, created_at);

ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own_chat_conversations" ON public.chat_conversations;
CREATE POLICY "own_chat_conversations" ON public.chat_conversations
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

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

-- Family read access to children's learning data (SELECT only)
DROP POLICY IF EXISTS "family_read_children_attendance" ON public.attendance;
CREATE POLICY "family_read_children_attendance" ON public.attendance
  FOR SELECT TO authenticated
  USING (public.can_view_student(student_id, auth.uid()));

DROP POLICY IF EXISTS "family_read_children_points" ON public.point_transactions;
CREATE POLICY "family_read_children_points" ON public.point_transactions
  FOR SELECT TO authenticated
  USING (public.can_view_student(student_id, auth.uid()));

DROP POLICY IF EXISTS "family_read_children_student_points" ON public.student_points;
CREATE POLICY "family_read_children_student_points" ON public.student_points
  FOR SELECT TO authenticated
  USING (public.can_view_student(student_id, auth.uid()));

DROP POLICY IF EXISTS "family_read_children_learning_profiles" ON public.student_learning_profiles;
CREATE POLICY "family_read_children_learning_profiles" ON public.student_learning_profiles
  FOR SELECT TO authenticated
  USING (public.can_view_student(student_id, auth.uid()));

DROP POLICY IF EXISTS "family_read_children_cefr" ON public.cefr_assessments;
CREATE POLICY "family_read_children_cefr" ON public.cefr_assessments
  FOR SELECT TO authenticated
  USING (public.can_view_student(student_id, auth.uid()));

DROP POLICY IF EXISTS "family_read_children_lesson_overviews" ON public.lesson_overviews;
CREATE POLICY "family_read_children_lesson_overviews" ON public.lesson_overviews
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1
    FROM public.enrollments e
    JOIN public.students s ON s.id = e.student_id
    JOIN public.families f ON f.id = s.family_id
    WHERE e.class_id = lesson_overviews.class_id
      AND f.primary_user_id = auth.uid()
  ));