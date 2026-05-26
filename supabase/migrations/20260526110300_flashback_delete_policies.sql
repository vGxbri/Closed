-- Migration: Add DELETE RLS policies for flashback_parties and flashback_photos
-- Date: 2026-05-26

CREATE POLICY "Creator or admin can delete flashback parties"
  ON public.flashback_parties FOR DELETE
  TO authenticated
  USING (
    created_by = auth.uid()
    OR public.is_group_admin(group_id)
  );

CREATE POLICY "Creator, admin or photo taker can delete flashback photos"
  ON public.flashback_photos FOR DELETE
  TO authenticated
  USING (
    taken_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.flashback_parties fp
      WHERE fp.id = party_id AND (
        fp.created_by = auth.uid()
        OR public.is_group_admin(fp.group_id)
      )
    )
  );
