-- Ensures per-group profile columns exist (no-op if already present)
ALTER TABLE public.group_members
  ADD COLUMN IF NOT EXISTS group_display_name TEXT,
  ADD COLUMN IF NOT EXISTS group_avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS group_bio TEXT;

-- Updates coalesced display_name / avatar_url (preserves existing view columns)
CREATE OR REPLACE VIEW public.group_members_view AS
 SELECT gm.id,
    gm.group_id,
    gm.user_id,
    gm.role,
    gm.is_active,
    gm.joined_at,
    COALESCE(NULLIF(gm.group_display_name, ''), p.display_name) AS display_name,
    gm.group_display_name,
    p.username,
    NULLIF(gm.group_avatar_url, '') AS avatar_url,
    gm.group_avatar_url,
    gm.group_bio,
    p.bio AS user_bio
   FROM public.group_members gm
     JOIN public.profiles p ON gm.user_id = p.id
  WHERE gm.is_active = true;
