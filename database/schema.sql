-- =========================================================
-- CLOSED - Database Schema for Supabase (PostgreSQL)
-- =========================================================
-- Version: 1.0.0
-- Created: 2024-12-11
-- Description: Complete database schema for awards ceremony app
-- =========================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =========================================================
-- ENUMS (Expandable status types)
-- =========================================================

-- Member roles in a group
CREATE TYPE member_role AS ENUM ('owner', 'admin', 'member');

-- Group status
CREATE TYPE group_status AS ENUM ('active', 'archived', 'deleted');

-- Award status (expandable for voting flow)
CREATE TYPE award_status AS ENUM (
  'draft',       -- Created but not published
  'nominations', -- Open for nominations (future)
  'voting',      -- Voting in progress (future)
  'completed',   -- Winner announced
  'archived'     -- Past awards
);

-- Invitation status
CREATE TYPE invitation_status AS ENUM ('pending', 'accepted', 'declined', 'expired');

-- Notification types (for future push notifications)
CREATE TYPE notification_type AS ENUM (
  'group_invite',
  'award_created',
  'nomination_received',
  'voting_started',
  'award_won',
  'new_member',
  'role_changed'
);

-- =========================================================
-- TABLES
-- =========================================================

-- ---------------------------------------------------------
-- Users (extends Supabase auth.users)
-- ---------------------------------------------------------
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  bio TEXT,
  email TEXT,
  
  -- Settings (JSON for flexibility)
  settings JSONB DEFAULT '{"notifications": true, "theme": "auto"}'::jsonb,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  last_seen_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT username_length CHECK (char_length(username) >= 3 AND char_length(username) <= 30),
  CONSTRAINT display_name_length CHECK (char_length(display_name) >= 1 AND char_length(display_name) <= 100)
);

-- Index for faster lookups
CREATE INDEX idx_profiles_username ON public.profiles(username);
CREATE INDEX idx_profiles_email ON public.profiles(email);

-- ---------------------------------------------------------
-- Groups
-- ---------------------------------------------------------
CREATE TABLE public.groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Basic info
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT DEFAULT '🏆',
  cover_image_url TEXT,
  
  -- Status and visibility
  status group_status DEFAULT 'active' NOT NULL,
  is_public BOOLEAN DEFAULT false, -- For future public groups feature
  
  -- Invite system
  invite_code TEXT UNIQUE NOT NULL DEFAULT upper(substr(md5(random()::text), 1, 8)),
  invite_code_expires_at TIMESTAMPTZ, -- NULL = never expires
  
  -- Settings (JSON for flexibility)
  settings JSONB DEFAULT '{
    "allow_member_nominations": false,
    "allow_member_voting": true,
    "max_members": 100,
    "require_approval": false
  }'::jsonb,
  
  -- Metadata
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Constraints
  CONSTRAINT name_length CHECK (char_length(name) >= 1 AND char_length(name) <= 100)
);

-- Indexes
CREATE INDEX idx_groups_invite_code ON public.groups(invite_code);
CREATE INDEX idx_groups_created_by ON public.groups(created_by);
CREATE INDEX idx_groups_status ON public.groups(status);

-- ---------------------------------------------------------
-- Group Members (Many-to-Many with roles)
-- ---------------------------------------------------------
CREATE TABLE public.group_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Relations
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Role and status
  role member_role DEFAULT 'member' NOT NULL,
  is_active BOOLEAN DEFAULT true NOT NULL, -- Soft delete for members
  
  -- Invite tracking
  invited_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  
  -- Metadata
  joined_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Unique constraint: one membership per user per group
  UNIQUE(group_id, user_id)
);

-- Indexes
CREATE INDEX idx_group_members_group ON public.group_members(group_id);
CREATE INDEX idx_group_members_user ON public.group_members(user_id);
CREATE INDEX idx_group_members_role ON public.group_members(role);

-- ---------------------------------------------------------
-- Group Invitations (Pending invites)
-- ---------------------------------------------------------
CREATE TABLE public.group_invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Relations
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  invited_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  invited_user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE, -- NULL if invited by email/link
  
  -- Invite details
  invite_email TEXT, -- For email invitations
  invite_code TEXT NOT NULL DEFAULT upper(substr(md5(random()::text), 1, 12)),
  
  -- Status
  status invitation_status DEFAULT 'pending' NOT NULL,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
  responded_at TIMESTAMPTZ,
  
  -- Constraints
  UNIQUE(invite_code)
);

-- Indexes
CREATE INDEX idx_invitations_group ON public.group_invitations(group_id);
CREATE INDEX idx_invitations_user ON public.group_invitations(invited_user_id);
CREATE INDEX idx_invitations_code ON public.group_invitations(invite_code);
CREATE INDEX idx_invitations_status ON public.group_invitations(status);

-- ---------------------------------------------------------
-- Award Categories (Reusable templates - future)
-- ---------------------------------------------------------
CREATE TABLE public.award_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Category info
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT DEFAULT '🏆',
  
  -- Scope
  is_global BOOLEAN DEFAULT false, -- Global templates vs group-specific
  group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE, -- NULL if global
  
  -- Metadata
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Constraints
  CONSTRAINT category_scope CHECK (
    (is_global = true AND group_id IS NULL) OR 
    (is_global = false AND group_id IS NOT NULL)
  )
);

-- Index
CREATE INDEX idx_award_categories_group ON public.award_categories(group_id);

-- ---------------------------------------------------------
-- Awards
-- ---------------------------------------------------------
CREATE TABLE public.awards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Relations
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.award_categories(id) ON DELETE SET NULL,
  
  -- Award info
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT DEFAULT '🏆',
  
  -- Status and flow
  status award_status DEFAULT 'draft' NOT NULL,
  
  -- Voting settings (for future voting feature)
  voting_settings JSONB DEFAULT '{
    "allow_self_vote": false,
    "max_votes_per_user": 1,
    "anonymous_voting": true,
    "show_results_before_end": false
  }'::jsonb,
  
  -- Schedule (for future scheduled awards)
  nominations_start_at TIMESTAMPTZ,
  nominations_end_at TIMESTAMPTZ,
  voting_start_at TIMESTAMPTZ,
  voting_end_at TIMESTAMPTZ,
  
  -- Winner (filled after voting)
  winner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  
  -- Metadata
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  completed_at TIMESTAMPTZ,
  
  -- Constraints
  CONSTRAINT name_length CHECK (char_length(name) >= 1 AND char_length(name) <= 200)
);

-- Indexes
CREATE INDEX idx_awards_group ON public.awards(group_id);
CREATE INDEX idx_awards_status ON public.awards(status);
CREATE INDEX idx_awards_created_by ON public.awards(created_by);
CREATE INDEX idx_awards_winner ON public.awards(winner_id);

-- ---------------------------------------------------------
-- Nominees (Users nominated for an award)
-- ---------------------------------------------------------
CREATE TABLE public.nominees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Relations
  award_id UUID NOT NULL REFERENCES public.awards(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Nomination info
  nominated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  nomination_reason TEXT, -- Optional reason for nomination
  
  -- Voting results (filled during/after voting)
  vote_count INTEGER DEFAULT 0,
  is_winner BOOLEAN DEFAULT false,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Unique constraint: one nomination per user per award
  UNIQUE(award_id, user_id)
);

-- Indexes
CREATE INDEX idx_nominees_award ON public.nominees(award_id);
CREATE INDEX idx_nominees_user ON public.nominees(user_id);
CREATE INDEX idx_nominees_winner ON public.nominees(is_winner) WHERE is_winner = true;

-- ---------------------------------------------------------
-- Votes (For future voting feature)
-- ---------------------------------------------------------
CREATE TABLE public.votes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Relations
  award_id UUID NOT NULL REFERENCES public.awards(id) ON DELETE CASCADE,
  voter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  nominee_id UUID NOT NULL REFERENCES public.nominees(id) ON DELETE CASCADE,
  
  -- Vote details
  points INTEGER DEFAULT 1, -- For weighted voting (future)
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Constraints: one vote per user per award (can be modified for ranked voting)
  UNIQUE(award_id, voter_id)
);

-- Indexes
CREATE INDEX idx_votes_award ON public.votes(award_id);
CREATE INDEX idx_votes_voter ON public.votes(voter_id);
CREATE INDEX idx_votes_nominee ON public.votes(nominee_id);

-- ---------------------------------------------------------
-- Ceremonies (Future: Group multiple awards into events)
-- ---------------------------------------------------------
CREATE TABLE public.ceremonies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Relations
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  
  -- Ceremony info
  name TEXT NOT NULL,
  description TEXT,
  cover_image_url TEXT,
  
  -- Schedule
  scheduled_at TIMESTAMPTZ,
  
  -- Status
  is_live BOOLEAN DEFAULT false,
  is_completed BOOLEAN DEFAULT false,
  
  -- Metadata
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Link awards to ceremonies
CREATE TABLE public.ceremony_awards (
  ceremony_id UUID NOT NULL REFERENCES public.ceremonies(id) ON DELETE CASCADE,
  award_id UUID NOT NULL REFERENCES public.awards(id) ON DELETE CASCADE,
  display_order INTEGER DEFAULT 0,
  
  PRIMARY KEY (ceremony_id, award_id)
);

-- Indexes
CREATE INDEX idx_ceremonies_group ON public.ceremonies(group_id);
CREATE INDEX idx_ceremony_awards_ceremony ON public.ceremony_awards(ceremony_id);

-- ---------------------------------------------------------
-- Notifications (For future push notifications)
-- ---------------------------------------------------------
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Recipient
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Content
  type notification_type NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  data JSONB DEFAULT '{}'::jsonb, -- Flexible data payload
  
  -- Related entities
  group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE,
  award_id UUID REFERENCES public.awards(id) ON DELETE CASCADE,
  
  -- Status
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes
CREATE INDEX idx_notifications_user ON public.notifications(user_id);
CREATE INDEX idx_notifications_unread ON public.notifications(user_id, is_read) WHERE is_read = false;
CREATE INDEX idx_notifications_created ON public.notifications(created_at DESC);

-- ---------------------------------------------------------
-- Activity Log (Audit trail for future analytics)
-- ---------------------------------------------------------
CREATE TABLE public.activity_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Actor
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  
  -- Action
  action TEXT NOT NULL, -- e.g., 'group.created', 'award.voted', 'member.joined'
  
  -- Related entities
  entity_type TEXT, -- 'group', 'award', 'nominee', etc.
  entity_id UUID,
  
  -- Details
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  ip_address INET,
  user_agent TEXT
);

-- Indexes
CREATE INDEX idx_activity_user ON public.activity_log(user_id);
CREATE INDEX idx_activity_action ON public.activity_log(action);
CREATE INDEX idx_activity_entity ON public.activity_log(entity_type, entity_id);
CREATE INDEX idx_activity_created ON public.activity_log(created_at DESC);

-- =========================================================
-- VIEWS (For easier querying)
-- =========================================================

-- Group members with profile info
CREATE OR REPLACE VIEW public.group_members_view AS
SELECT 
  gm.id,
  gm.group_id,
  gm.user_id,
  gm.role,
  gm.is_active,
  gm.joined_at,
  p.display_name,
  p.username,
  p.avatar_url
FROM public.group_members gm
JOIN public.profiles p ON gm.user_id = p.id
WHERE gm.is_active = true;

-- Awards with nominee count
CREATE OR REPLACE VIEW public.awards_with_stats AS
SELECT 
  a.*,
  g.name as group_name,
  COUNT(n.id) as nominee_count,
  COALESCE(SUM(n.vote_count), 0) as total_votes
FROM public.awards a
JOIN public.groups g ON a.group_id = g.id
LEFT JOIN public.nominees n ON a.id = n.award_id
GROUP BY a.id, g.name;

-- =========================================================
-- FUNCTIONS & TRIGGERS
-- =========================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to relevant tables
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_groups_updated_at
  BEFORE UPDATE ON public.groups
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_group_members_updated_at
  BEFORE UPDATE ON public.group_members
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_awards_updated_at
  BEFORE UPDATE ON public.awards
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_ceremonies_updated_at
  BEFORE UPDATE ON public.ceremonies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Function to update vote counts on nominees
CREATE OR REPLACE FUNCTION update_nominee_vote_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.nominees 
    SET vote_count = vote_count + NEW.points
    WHERE id = NEW.nominee_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.nominees 
    SET vote_count = vote_count - OLD.points
    WHERE id = OLD.nominee_id;
  ELSIF TG_OP = 'UPDATE' AND NEW.nominee_id != OLD.nominee_id THEN
    UPDATE public.nominees SET vote_count = vote_count - OLD.points WHERE id = OLD.nominee_id;
    UPDATE public.nominees SET vote_count = vote_count + NEW.points WHERE id = NEW.nominee_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER votes_count_trigger
  AFTER INSERT OR DELETE OR UPDATE ON public.votes
  FOR EACH ROW EXECUTE FUNCTION update_nominee_vote_count();

-- Function to create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, email, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email,
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user signup (connects to Supabase Auth)
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Function to auto-add group creator as owner
CREATE OR REPLACE FUNCTION add_group_creator_as_owner()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.group_members (group_id, user_id, role)
  VALUES (NEW.id, NEW.created_by, 'owner');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER group_creator_trigger
  AFTER INSERT ON public.groups
  FOR EACH ROW EXECUTE FUNCTION add_group_creator_as_owner();

-- Function to generate unique invite codes
CREATE OR REPLACE FUNCTION generate_invite_code(length INTEGER DEFAULT 8)
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..length LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- =========================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =========================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.award_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.awards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nominees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ceremonies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ceremony_awards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------
-- Profiles Policies
-- ---------------------------------------------------------
CREATE POLICY "Users can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- ---------------------------------------------------------
-- Groups Policies
-- ---------------------------------------------------------
CREATE POLICY "Users can view groups they belong to"
  ON public.groups FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT group_id FROM public.group_members 
      WHERE user_id = auth.uid() AND is_active = true
    )
    OR is_public = true
  );

CREATE POLICY "Users can create groups"
  ON public.groups FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Admins can update their groups"
  ON public.groups FOR UPDATE
  TO authenticated
  USING (
    id IN (
      SELECT group_id FROM public.group_members 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin') AND is_active = true
    )
  );

CREATE POLICY "Owners can delete their groups"
  ON public.groups FOR DELETE
  TO authenticated
  USING (
    id IN (
      SELECT group_id FROM public.group_members 
      WHERE user_id = auth.uid() AND role = 'owner' AND is_active = true
    )
  );

-- ---------------------------------------------------------
-- Group Members Policies
-- ---------------------------------------------------------
CREATE POLICY "Users can view members of their groups"
  ON public.group_members FOR SELECT
  TO authenticated
  USING (
    group_id IN (
      SELECT group_id FROM public.group_members 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Admins can add members"
  ON public.group_members FOR INSERT
  TO authenticated
  WITH CHECK (
    group_id IN (
      SELECT group_id FROM public.group_members 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin') AND is_active = true
    )
    OR user_id = auth.uid() -- Users can join themselves via invite
  );

CREATE POLICY "Admins can update members"
  ON public.group_members FOR UPDATE
  TO authenticated
  USING (
    group_id IN (
      SELECT group_id FROM public.group_members 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin') AND is_active = true
    )
  );

-- ---------------------------------------------------------
-- Awards Policies
-- ---------------------------------------------------------
CREATE POLICY "Users can view awards in their groups"
  ON public.awards FOR SELECT
  TO authenticated
  USING (
    group_id IN (
      SELECT group_id FROM public.group_members 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Admins can create awards"
  ON public.awards FOR INSERT
  TO authenticated
  WITH CHECK (
    group_id IN (
      SELECT group_id FROM public.group_members 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin') AND is_active = true
    )
    AND created_by = auth.uid()
  );

CREATE POLICY "Admins can update awards"
  ON public.awards FOR UPDATE
  TO authenticated
  USING (
    group_id IN (
      SELECT group_id FROM public.group_members 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin') AND is_active = true
    )
  );

CREATE POLICY "Admins can delete awards"
  ON public.awards FOR DELETE
  TO authenticated
  USING (
    group_id IN (
      SELECT group_id FROM public.group_members 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin') AND is_active = true
    )
  );

-- ---------------------------------------------------------
-- Nominees Policies
-- ---------------------------------------------------------
CREATE POLICY "Users can view nominees in their groups"
  ON public.nominees FOR SELECT
  TO authenticated
  USING (
    award_id IN (
      SELECT a.id FROM public.awards a
      JOIN public.group_members gm ON a.group_id = gm.group_id
      WHERE gm.user_id = auth.uid() AND gm.is_active = true
    )
  );

CREATE POLICY "Admins can manage nominees"
  ON public.nominees FOR ALL
  TO authenticated
  USING (
    award_id IN (
      SELECT a.id FROM public.awards a
      JOIN public.group_members gm ON a.group_id = gm.group_id
      WHERE gm.user_id = auth.uid() AND gm.role IN ('owner', 'admin') AND gm.is_active = true
    )
  );

-- ---------------------------------------------------------
-- Votes Policies
-- ---------------------------------------------------------
CREATE POLICY "Users can view votes in completed awards"
  ON public.votes FOR SELECT
  TO authenticated
  USING (
    award_id IN (
      SELECT a.id FROM public.awards a
      JOIN public.group_members gm ON a.group_id = gm.group_id
      WHERE gm.user_id = auth.uid() AND gm.is_active = true
      AND (a.status = 'completed' OR a.voting_settings->>'anonymous_voting' = 'false')
    )
  );

CREATE POLICY "Users can cast votes"
  ON public.votes FOR INSERT
  TO authenticated
  WITH CHECK (
    voter_id = auth.uid()
    AND award_id IN (
      SELECT a.id FROM public.awards a
      JOIN public.group_members gm ON a.group_id = gm.group_id
      WHERE gm.user_id = auth.uid() AND gm.is_active = true
      AND a.status = 'voting'
    )
  );

-- ---------------------------------------------------------
-- Notifications Policies
-- ---------------------------------------------------------
CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- =========================================================
-- SEED DATA (Optional - for testing)
-- =========================================================

-- Insert global award categories
INSERT INTO public.award_categories (name, description, icon, is_global, group_id) VALUES
  ('Mejor Amigo', 'El que siempre está ahí cuando lo necesitas', '🌟', true, NULL),
  ('Más Gracioso', 'El payaso del grupo', '😂', true, NULL),
  ('MVP', 'Most Valuable Person', '🏅', true, NULL),
  ('Mejor Consejero', 'Siempre da los mejores consejos', '🧠', true, NULL),
  ('Alma de la Fiesta', 'El que anima cualquier evento', '🎉', true, NULL),
  ('Más Leal', 'Nunca te fallaría', '💪', true, NULL),
  ('Mejor Cocinero', 'Sus platos son increíbles', '👨‍🍳', true, NULL),
  ('Más Aventurero', 'Siempre listo para la aventura', '🏔️', true, NULL)
ON CONFLICT DO NOTHING;
