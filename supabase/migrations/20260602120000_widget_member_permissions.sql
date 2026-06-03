-- Per-widget member permissions configurable from group settings.
-- Admins/owners can always act. Members can act only when the related group
-- setting allows it. "Open" widgets default to true (preserving previous
-- behaviour where any member could act); widget management defaults to false
-- (previously admin-only).
--
-- Also closes a security hole: group_widgets previously allowed INSERT to any
-- authenticated user regardless of group membership or role.

-- ─── group_widgets: manage (add/reactivate) ──────────────────────────────
DROP POLICY IF EXISTS "Anyone authenticated can insert group widgets" ON public.group_widgets;
CREATE POLICY "Members or admins can insert group widgets"
  ON public.group_widgets FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.group_members gm
      JOIN public.groups g ON g.id = gm.group_id
      WHERE gm.group_id = group_widgets.group_id
        AND gm.user_id = auth.uid()
        AND gm.is_active = true
        AND (
          gm.role IN ('owner', 'admin')
          OR COALESCE((g.settings->>'allow_member_manage_widgets')::boolean, false)
        )
    )
  );

-- group_widgets removal/reactivation happens through UPDATE (is_active toggle).
DROP POLICY IF EXISTS "Group admins can update group widgets" ON public.group_widgets;
CREATE POLICY "Members or admins can update group widgets"
  ON public.group_widgets FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.group_members gm
      JOIN public.groups g ON g.id = gm.group_id
      WHERE gm.group_id = group_widgets.group_id
        AND gm.user_id = auth.uid()
        AND gm.is_active = true
        AND (
          gm.role IN ('owner', 'admin')
          OR COALESCE((g.settings->>'allow_member_manage_widgets')::boolean, false)
        )
    )
  );

-- ─── events: create ───────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Group members can create events" ON public.events;
CREATE POLICY "Members can create events if allowed"
  ON public.events FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.group_members gm
      JOIN public.groups g ON g.id = gm.group_id
      WHERE gm.group_id = events.group_id
        AND gm.user_id = auth.uid()
        AND gm.is_active = true
        AND (
          gm.role IN ('owner', 'admin')
          OR COALESCE((g.settings->>'allow_member_create_events')::boolean, true)
        )
    )
  );

-- ─── gallery_images: upload ────────────────────────────────────────────────
DROP POLICY IF EXISTS "Group members can upload images" ON public.gallery_images;
CREATE POLICY "Members can upload images if allowed"
  ON public.gallery_images FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.group_members gm
      JOIN public.groups g ON g.id = gm.group_id
      WHERE gm.group_id = gallery_images.group_id
        AND gm.user_id = auth.uid()
        AND gm.is_active = true
        AND (
          gm.role IN ('owner', 'admin')
          OR COALESCE((g.settings->>'allow_member_upload_gallery')::boolean, true)
        )
    )
  );

-- ─── notes: create ─────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Group members can create notes" ON public.notes;
CREATE POLICY "Members can create notes if allowed"
  ON public.notes FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = created_by
    AND EXISTS (
      SELECT 1
      FROM public.group_members gm
      JOIN public.groups g ON g.id = gm.group_id
      WHERE gm.group_id = notes.group_id
        AND gm.user_id = auth.uid()
        AND gm.is_active = true
        AND (
          gm.role IN ('owner', 'admin')
          OR COALESCE((g.settings->>'allow_member_create_notes')::boolean, true)
        )
    )
  );

-- ─── shared_expenses: create ───────────────────────────────────────────────
DROP POLICY IF EXISTS "Members can create shared expenses" ON public.shared_expenses;
CREATE POLICY "Members can create shared expenses if allowed"
  ON public.shared_expenses FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.group_members gm
      JOIN public.groups g ON g.id = gm.group_id
      WHERE gm.group_id = shared_expenses.group_id
        AND gm.user_id = auth.uid()
        AND gm.is_active = true
        AND (
          gm.role IN ('owner', 'admin')
          OR COALESCE((g.settings->>'allow_member_create_expenses')::boolean, true)
        )
    )
  );

-- ─── flashback_parties: create ─────────────────────────────────────────────
DROP POLICY IF EXISTS "Members can create flashback parties" ON public.flashback_parties;
CREATE POLICY "Members can create flashback parties if allowed"
  ON public.flashback_parties FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.group_members gm
      JOIN public.groups g ON g.id = gm.group_id
      WHERE gm.group_id = flashback_parties.group_id
        AND gm.user_id = auth.uid()
        AND gm.is_active = true
        AND (
          gm.role IN ('owner', 'admin')
          OR COALESCE((g.settings->>'allow_member_create_flashback_party')::boolean, true)
        )
    )
  );
