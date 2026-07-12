-- Resource Hub schema: resources, resource_class_access
-- Supports multi-class visibility, Bloom's Taxonomy, PYP Themes, vocabulary tags

-- ----------------------------------------------------------------
-- Resources table
-- ----------------------------------------------------------------
CREATE TABLE public.resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  file_name TEXT,
  file_size BIGINT,
  file_type TEXT,                          -- MIME type
  storage_key TEXT,                        -- Supabase storage path
  external_url TEXT,                       -- Optional link resource
  thumbnail_url TEXT,                      -- Auto-generated or uploaded
  visibility TEXT NOT NULL DEFAULT 'shared'
    CHECK (visibility IN ('private', 'shared')),
  -- Taxonomy tags stored as TEXT arrays for GIN indexing
  blooms_levels TEXT[] DEFAULT '{}',
  pyp_themes TEXT[] DEFAULT '{}',
  vocab_tags TEXT[] DEFAULT '{}',
  uploaded_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------
-- Junction: which classes can see a resource
-- ----------------------------------------------------------------
CREATE TABLE public.resource_class_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id UUID NOT NULL REFERENCES public.resources(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  UNIQUE(resource_id, class_id)
);

-- ----------------------------------------------------------------
-- Indexes
-- ----------------------------------------------------------------
CREATE INDEX idx_resources_uploaded_by ON public.resources(uploaded_by);
CREATE INDEX idx_resources_visibility ON public.resources(visibility);
CREATE INDEX idx_resources_created_at ON public.resources(created_at DESC);
CREATE INDEX idx_resource_class_access_resource ON public.resource_class_access(resource_id);
CREATE INDEX idx_resource_class_access_class ON public.resource_class_access(class_id);

-- GIN indexes for array-contains queries
CREATE INDEX idx_resources_blooms ON public.resources USING GIN (blooms_levels);
CREATE INDEX idx_resources_pyp ON public.resources USING GIN (pyp_themes);
CREATE INDEX idx_resources_vocab ON public.resources USING GIN (vocab_tags);

-- ----------------------------------------------------------------
-- Trigger: auto-update updated_at
-- ----------------------------------------------------------------
CREATE TRIGGER update_resources_updated_at BEFORE UPDATE ON public.resources
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ----------------------------------------------------------------
-- Row-Level Security
-- ----------------------------------------------------------------
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resource_class_access ENABLE ROW LEVEL SECURITY;

-- Teachers/admins can see ALL resources
CREATE POLICY "Teachers and admins can view all resources"
  ON public.resources FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role IN ('admin', 'teacher')
    )
  );

-- Teachers can manage their own resources
CREATE POLICY "Teachers can insert own resources"
  ON public.resources FOR INSERT
  WITH CHECK (uploaded_by = auth.uid());

CREATE POLICY "Teachers can update own resources"
  ON public.resources FOR UPDATE
  USING (uploaded_by = auth.uid());

CREATE POLICY "Teachers can delete own resources"
  ON public.resources FOR DELETE
  USING (uploaded_by = auth.uid());

-- Admins can manage ALL resources
CREATE POLICY "Admins can manage all resources"
  ON public.resources FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role = 'admin'
    )
  );

-- Students can see SHARED resources assigned to their enrolled classes
CREATE POLICY "Students can view shared resources for their classes"
  ON public.resources FOR SELECT
  USING (
    visibility = 'shared'
    AND EXISTS (
      SELECT 1 FROM public.resource_class_access rca
      JOIN public.enrollments e ON e.class_id = rca.class_id
      JOIN public.students s ON s.id = e.student_id
      WHERE rca.resource_id = resources.id
        AND s.linked_user_id = auth.uid()
        AND e.end_date IS NULL
    )
  );

-- Resource class access: teachers/admins can manage
CREATE POLICY "Teachers and admins can manage resource class access"
  ON public.resource_class_access FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role IN ('admin', 'teacher')
    )
  );

-- Resource class access: students can see their enrolled classes
CREATE POLICY "Students can view resource access for their classes"
  ON public.resource_class_access FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.enrollments e
      JOIN public.students s ON s.id = e.student_id
      WHERE e.class_id = resource_class_access.class_id
        AND s.linked_user_id = auth.uid()
        AND e.end_date IS NULL
    )
  );
