-- Harden group settings permissions:
-- - allow members to create awards only when group setting allows it
-- - allow members to vote only when group setting allows it
-- - protect owner membership rows from admin updates/removals
-- - allow vote deletion when vote-change is enabled

-- Awards create policy: admins always allowed, members only when enabled in group settings.
DROP POLICY IF EXISTS "Admins can create awards" ON public.awards;
CREATE POLICY "Admins can create awards"
  ON public.awards FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND group_id IN (
      SELECT g.id
      FROM public.groups g
      JOIN public.group_members gm ON gm.group_id = g.id
      WHERE gm.user_id = auth.uid()
        AND gm.is_active = true
        AND (
          gm.role IN ('owner', 'admin')
          OR COALESCE((g.settings->>'allow_member_nominations')::boolean, false)
        )
    )
  );

-- Group members update policy: admins can manage members but cannot edit owner rows.
DROP POLICY IF EXISTS "Admins can update members" ON public.group_members;
CREATE POLICY "Admins can update members"
  ON public.group_members FOR UPDATE
  TO authenticated
  USING (
    group_id IN (
      SELECT gm.group_id
      FROM public.group_members gm
      WHERE gm.user_id = auth.uid()
        AND gm.role IN ('owner', 'admin')
        AND gm.is_active = true
    )
    AND (
      role <> 'owner'
      OR group_id IN (
        SELECT gm.group_id
        FROM public.group_members gm
        WHERE gm.user_id = auth.uid()
          AND gm.role = 'owner'
          AND gm.is_active = true
      )
    )
  )
  WITH CHECK (
    group_id IN (
      SELECT gm.group_id
      FROM public.group_members gm
      WHERE gm.user_id = auth.uid()
        AND gm.role IN ('owner', 'admin')
        AND gm.is_active = true
    )
    AND (
      role <> 'owner'
      OR group_id IN (
        SELECT gm.group_id
        FROM public.group_members gm
        WHERE gm.user_id = auth.uid()
          AND gm.role = 'owner'
          AND gm.is_active = true
      )
    )
  );

-- Votes insert policy: admins always allowed, members only when enabled in group settings.
DROP POLICY IF EXISTS "Users can cast votes" ON public.votes;
CREATE POLICY "Users can cast votes"
  ON public.votes FOR INSERT
  TO authenticated
  WITH CHECK (
    voter_id = auth.uid()
    AND award_id IN (
      SELECT a.id
      FROM public.awards a
      JOIN public.groups g ON g.id = a.group_id
      JOIN public.group_members gm ON gm.group_id = a.group_id
      WHERE gm.user_id = auth.uid()
        AND gm.is_active = true
        AND a.status = 'voting'
        AND (
          gm.role IN ('owner', 'admin')
          OR COALESCE((g.settings->>'allow_member_voting')::boolean, false)
        )
    )
  );

-- Votes delete policy: allow retracting own vote only if vote change is enabled.
DROP POLICY IF EXISTS "Users can remove own votes when vote change enabled" ON public.votes;
CREATE POLICY "Users can remove own votes when vote change enabled"
  ON public.votes FOR DELETE
  TO authenticated
  USING (
    voter_id = auth.uid()
    AND award_id IN (
      SELECT a.id
      FROM public.awards a
      JOIN public.groups g ON g.id = a.group_id
      JOIN public.group_members gm ON gm.group_id = a.group_id
      WHERE gm.user_id = auth.uid()
        AND gm.is_active = true
        AND a.status = 'voting'
        AND COALESCE((a.voting_settings->>'allow_vote_change')::boolean, false)
        AND (
          gm.role IN ('owner', 'admin')
          OR COALESCE((g.settings->>'allow_member_voting')::boolean, false)
        )
    )
  );
