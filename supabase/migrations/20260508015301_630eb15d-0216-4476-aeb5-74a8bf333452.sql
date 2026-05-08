-- Create the resources bucket as private
INSERT INTO storage.buckets (id, name, public)
VALUES ('resources', 'resources', false)
ON CONFLICT (id) DO NOTHING;

-- Helper: drop policies if they already exist so we can recreate cleanly
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Authenticated users can view resources" ON storage.objects;
    DROP POLICY IF EXISTS "Authenticated users can upload resources" ON storage.objects;
    DROP POLICY IF EXISTS "Authenticated users can update own resources" ON storage.objects;
    DROP POLICY IF EXISTS "Authenticated users can delete own resources" ON storage.objects;
END $$;

-- Allow authenticated users to view files in the resources bucket
CREATE POLICY "Authenticated users can view resources"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'resources');

-- Allow authenticated users to upload files to the resources bucket
CREATE POLICY "Authenticated users can upload resources"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'resources');

-- Allow authenticated users to update files they uploaded (by owner in path)
CREATE POLICY "Authenticated users can update own resources"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'resources' AND auth.uid()::text = (storage.foldername(name))[1])
WITH CHECK (bucket_id = 'resources' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow authenticated users to delete files they uploaded (by owner in path)
CREATE POLICY "Authenticated users can delete own resources"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'resources' AND auth.uid()::text = (storage.foldername(name))[1]);