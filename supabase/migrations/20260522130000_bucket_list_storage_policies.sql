-- Políticas de Storage para imágenes de planes (bucket-list)
-- Rutas: {group_id}/{filename}

CREATE POLICY "Anyone can view bucket list images"
ON storage.objects FOR SELECT
USING (bucket_id = 'bucket-list');

CREATE POLICY "Group members can upload bucket list images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'bucket-list'
  AND public.is_group_member(((storage.foldername(name))[1])::uuid)
);

CREATE POLICY "Group members can update bucket list images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'bucket-list'
  AND public.is_group_member(((storage.foldername(name))[1])::uuid)
);

CREATE POLICY "Group members can delete bucket list images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'bucket-list'
  AND public.is_group_member(((storage.foldername(name))[1])::uuid)
);
