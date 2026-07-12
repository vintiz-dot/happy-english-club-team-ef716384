-- Create teacher_flipbooks table to store external book URLs for presentation
CREATE TABLE IF NOT EXISTS public.teacher_flipbooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  teacher_id UUID NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
  class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexing for speed
CREATE INDEX IF NOT EXISTS idx_tf_teacher_id ON public.teacher_flipbooks(teacher_id);
CREATE INDEX IF NOT EXISTS idx_tf_class_id ON public.teacher_flipbooks(class_id);

-- Enable RLS
ALTER TABLE public.teacher_flipbooks ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS tf_admin_all ON public.teacher_flipbooks;
DROP POLICY IF EXISTS tf_teacher_all ON public.teacher_flipbooks;

-- Admin Policy: Full access
CREATE POLICY tf_admin_all ON public.teacher_flipbooks
  FOR ALL USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Teacher Policy: Can manage their own flipbooks
CREATE POLICY tf_teacher_all ON public.teacher_flipbooks
  FOR ALL USING (
    teacher_id IN (
      SELECT id FROM public.teachers WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    teacher_id IN (
      SELECT id FROM public.teachers WHERE user_id = auth.uid()
    )
  );

-- Auto-update trigger for updated_at column
CREATE TRIGGER update_teacher_flipbooks_updated_at
  BEFORE UPDATE ON public.teacher_flipbooks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
