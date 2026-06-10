-- ============================================================
-- CLOSED - Esquema completo de base de datos (Supabase/PostgreSQL)
-- Generado el 10/06/2026
-- ============================================================

-- ============================================================
-- EXTENSIONES
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "pgcrypto" SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" SCHEMA extensions;

-- ============================================================
-- TIPOS ENUM
-- ============================================================
CREATE TYPE public.member_role AS ENUM ('owner', 'admin', 'member');
CREATE TYPE public.group_status AS ENUM ('active', 'archived', 'deleted');
CREATE TYPE public.award_status AS ENUM ('draft', 'nominations', 'voting', 'completed', 'archived');
CREATE TYPE public.vote_type AS ENUM ('person', 'photo', 'video', 'audio', 'text');
CREATE TYPE public.invitation_status AS ENUM ('pending', 'accepted', 'declined', 'expired');
CREATE TYPE public.notification_type AS ENUM ('group_invite', 'award_created', 'nomination_received', 'voting_started', 'award_won', 'new_member', 'role_changed');
CREATE TYPE public.rsvp_status AS ENUM ('pending', 'accepted', 'declined', 'maybe');

-- ============================================================
-- TABLAS
-- ============================================================

-- Perfiles de usuario (vinculados a auth.users)
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id),
    username TEXT UNIQUE CHECK (char_length(username) >= 3 AND char_length(username) <= 30),
    display_name TEXT NOT NULL CHECK (char_length(display_name) >= 1 AND char_length(display_name) <= 100),
    avatar_url TEXT,
    bio TEXT,
    email TEXT,
    settings JSONB DEFAULT '{"theme": "auto", "notifications": true}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_seen_at TIMESTAMPTZ DEFAULT now()
);

-- Grupos
CREATE TABLE public.groups (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    name TEXT NOT NULL CHECK (char_length(name) >= 1 AND char_length(name) <= 100),
    description TEXT,
    icon TEXT DEFAULT '🏆'::text,
    cover_image_url TEXT,
    status public.group_status NOT NULL DEFAULT 'active'::group_status,
    is_public BOOLEAN DEFAULT false,
    invite_code TEXT UNIQUE DEFAULT upper(substr(md5((random())::text), 1, 6)),
    invite_code_expires_at TIMESTAMPTZ,
    settings JSONB DEFAULT '{"max_members": 100, "require_approval": false, "allow_member_voting": true, "allow_member_nominations": false}'::jsonb,
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    category TEXT DEFAULT 'Estándar'::text
);

-- Miembros de grupo
CREATE TABLE public.group_members (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    group_id UUID NOT NULL REFERENCES public.groups(id),
    user_id UUID NOT NULL REFERENCES public.profiles(id),
    role public.member_role NOT NULL DEFAULT 'member'::member_role,
    is_active BOOLEAN NOT NULL DEFAULT true,
    invited_by UUID REFERENCES public.profiles(id),
    joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    group_display_name TEXT,
    group_avatar_url TEXT,
    group_bio TEXT,
    UNIQUE (group_id, user_id)
);

-- Catálogo de widgets
CREATE TABLE public.widgets (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    name TEXT NOT NULL,
    subtitle TEXT,
    icon TEXT,
    category TEXT DEFAULT 'general'::text,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Widgets activos por grupo
CREATE TABLE public.group_widgets (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    group_id UUID NOT NULL REFERENCES public.groups(id),
    widget_id UUID NOT NULL REFERENCES public.widgets(id),
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (group_id, widget_id)
);

-- Galería de imágenes compartida
CREATE TABLE public.gallery_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES public.groups(id),
    uploaded_by UUID NOT NULL REFERENCES public.profiles(id),
    media_url TEXT NOT NULL,
    thumbnail_url TEXT,
    caption TEXT,
    file_size BIGINT,
    width INTEGER,
    height INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    media_type TEXT DEFAULT 'image'::text
);

-- Mensajes de chat
CREATE TABLE public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES public.groups(id),
    sender_id UUID NOT NULL REFERENCES auth.users(id),
    content TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'text'::text,
    metadata JSONB DEFAULT '{}'::jsonb,
    is_edited BOOLEAN DEFAULT false,
    is_deleted BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    reply_to_id UUID REFERENCES public.messages(id)
);

-- Notas compartidas (bloc)
CREATE TABLE public.notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES public.groups(id),
    title TEXT NOT NULL DEFAULT ''::text,
    content JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_pinned BOOLEAN NOT NULL DEFAULT false,
    created_by UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Eventos/Agenda
CREATE TABLE public.events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES public.groups(id),
    title TEXT NOT NULL,
    description TEXT,
    location TEXT,
    starts_at TIMESTAMPTZ NOT NULL,
    ends_at TIMESTAMPTZ,
    is_all_day BOOLEAN DEFAULT false,
    color TEXT DEFAULT '#6366F1'::text,
    created_by UUID NOT NULL REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Participantes de eventos
CREATE TABLE public.event_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES public.events(id),
    user_id UUID NOT NULL REFERENCES public.profiles(id),
    status public.rsvp_status NOT NULL DEFAULT 'pending'::rsvp_status,
    invited_by UUID REFERENCES auth.users(id),
    responded_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (event_id, user_id)
);

-- Enlace evento-galería
CREATE TABLE public.event_gallery_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES public.events(id),
    gallery_image_id UUID NOT NULL REFERENCES public.gallery_images(id),
    linked_by UUID REFERENCES auth.users(id),
    is_auto_linked BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (event_id, gallery_image_id)
);

-- Bucket list (planes)
CREATE TABLE public.bucket_list_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES public.groups(id),
    title TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL DEFAULT 'other'::text,
    image_url TEXT,
    is_completed BOOLEAN NOT NULL DEFAULT false,
    completed_at TIMESTAMPTZ,
    completed_by UUID REFERENCES auth.users(id),
    gallery_image_id UUID,
    created_by UUID NOT NULL REFERENCES auth.users(id),
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Gastos compartidos
CREATE TABLE public.shared_expenses (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    group_id UUID NOT NULL REFERENCES public.groups(id),
    amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
    description TEXT NOT NULL,
    paid_by UUID NOT NULL REFERENCES public.profiles(id),
    created_by UUID NOT NULL REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Splits de gastos
CREATE TABLE public.shared_expense_splits (
    expense_id UUID NOT NULL REFERENCES public.shared_expenses(id),
    user_id UUID NOT NULL REFERENCES public.profiles(id),
    PRIMARY KEY (expense_id, user_id)
);

-- Liquidaciones de gastos
CREATE TABLE public.shared_expense_settlements (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    group_id UUID NOT NULL REFERENCES public.groups(id),
    from_user_id UUID NOT NULL REFERENCES public.profiles(id),
    to_user_id UUID NOT NULL REFERENCES public.profiles(id),
    amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
    is_resolved BOOLEAN NOT NULL DEFAULT false,
    resolved_at TIMESTAMPTZ,
    resolved_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Premios/Votaciones
CREATE TABLE public.awards (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    group_id UUID NOT NULL REFERENCES public.groups(id),
    name TEXT NOT NULL CHECK (char_length(name) >= 1 AND char_length(name) <= 200),
    description TEXT,
    icon TEXT DEFAULT '🏆'::text,
    status public.award_status NOT NULL DEFAULT 'draft'::award_status,
    vote_type public.vote_type NOT NULL DEFAULT 'person'::vote_type,
    voting_settings JSONB DEFAULT '{"allow_self_vote": false, "anonymous_voting": true, "max_votes_per_user": 1, "show_results_before_end": false}'::jsonb,
    nominations_start_at TIMESTAMPTZ,
    nominations_end_at TIMESTAMPTZ,
    voting_start_at TIMESTAMPTZ,
    voting_end_at TIMESTAMPTZ,
    winner_id UUID REFERENCES public.profiles(id),
    is_revealed BOOLEAN DEFAULT false,
    created_by UUID NOT NULL REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ
);

-- Nominados
CREATE TABLE public.nominees (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    award_id UUID NOT NULL REFERENCES public.awards(id),
    user_id UUID NOT NULL REFERENCES public.profiles(id),
    nominated_by UUID REFERENCES public.profiles(id),
    nomination_reason TEXT,
    vote_count INTEGER DEFAULT 0,
    is_winner BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    content_url TEXT
);

-- Votos
CREATE TABLE public.votes (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    award_id UUID NOT NULL REFERENCES public.awards(id),
    voter_id UUID NOT NULL REFERENCES public.profiles(id),
    nominee_id UUID NOT NULL REFERENCES public.nominees(id),
    points INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (award_id, voter_id)
);

-- Flashback (cámara desechable)
CREATE TABLE public.flashback_parties (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    group_id UUID NOT NULL REFERENCES public.groups(id),
    name TEXT NOT NULL,
    created_by UUID NOT NULL REFERENCES public.profiles(id),
    starts_at TIMESTAMPTZ NOT NULL,
    ends_at TIMESTAMPTZ NOT NULL,
    reveals_at TIMESTAMPTZ NOT NULL,
    photo_limit INTEGER NOT NULL DEFAULT 36 CHECK (photo_limit = ANY (ARRAY[24, 36])),
    status TEXT NOT NULL DEFAULT 'scheduled'::text CHECK (status = ANY (ARRAY['scheduled', 'active', 'film_used', 'revealing', 'archived'])),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Fotos de flashback
CREATE TABLE public.flashback_photos (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    party_id UUID NOT NULL REFERENCES public.flashback_parties(id),
    taken_by UUID NOT NULL REFERENCES public.profiles(id),
    photo_url TEXT NOT NULL,
    shot_number INTEGER NOT NULL CHECK (shot_number > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Log de actividad
CREATE TABLE public.activity_log (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id),
    action TEXT NOT NULL,
    entity_type TEXT,
    entity_id UUID,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    ip_address INET,
    user_agent TEXT
);

-- ============================================================
-- ÍNDICES
-- ============================================================

CREATE INDEX idx_profiles_email ON public.profiles USING btree (email);
CREATE INDEX idx_profiles_username ON public.profiles USING btree (username);

CREATE INDEX idx_groups_created_by ON public.groups USING btree (created_by);
CREATE INDEX idx_groups_invite_code ON public.groups USING btree (invite_code);
CREATE INDEX idx_groups_status ON public.groups USING btree (status);

CREATE INDEX idx_group_members_group ON public.group_members USING btree (group_id);
CREATE INDEX idx_group_members_user ON public.group_members USING btree (user_id);
CREATE INDEX idx_group_members_role ON public.group_members USING btree (role);

CREATE INDEX idx_gallery_images_group_id ON public.gallery_images USING btree (group_id);
CREATE INDEX idx_gallery_images_created_at ON public.gallery_images USING btree (group_id, created_at DESC);

CREATE INDEX idx_messages_group_id_created_at ON public.messages USING btree (group_id, created_at DESC);
CREATE INDEX idx_messages_reply_to_id ON public.messages USING btree (reply_to_id) WHERE (reply_to_id IS NOT NULL);

CREATE INDEX idx_notes_group_updated ON public.notes USING btree (group_id, is_pinned DESC, updated_at DESC);

CREATE INDEX idx_events_group_date ON public.events USING btree (group_id, starts_at);
CREATE INDEX idx_event_participants_event ON public.event_participants USING btree (event_id);
CREATE INDEX idx_event_participants_user ON public.event_participants USING btree (user_id);
CREATE INDEX idx_event_gallery_event ON public.event_gallery_links USING btree (event_id);

CREATE INDEX idx_bucket_list_items_group_id ON public.bucket_list_items USING btree (group_id);
CREATE INDEX idx_bucket_list_items_category ON public.bucket_list_items USING btree (group_id, category);
CREATE INDEX idx_bucket_list_items_completed ON public.bucket_list_items USING btree (group_id, is_completed);

CREATE INDEX idx_shared_expenses_group ON public.shared_expenses USING btree (group_id);
CREATE INDEX idx_shared_expenses_paid_by ON public.shared_expenses USING btree (paid_by);
CREATE INDEX idx_shared_expense_settlements_group ON public.shared_expense_settlements USING btree (group_id);

CREATE INDEX idx_awards_group ON public.awards USING btree (group_id);
CREATE INDEX idx_awards_status ON public.awards USING btree (status);
CREATE INDEX idx_awards_created_by ON public.awards USING btree (created_by);
CREATE INDEX idx_awards_winner ON public.awards USING btree (winner_id);
CREATE INDEX idx_nominees_award ON public.nominees USING btree (award_id);
CREATE INDEX idx_nominees_user ON public.nominees USING btree (user_id);
CREATE INDEX idx_nominees_winner ON public.nominees USING btree (is_winner) WHERE (is_winner = true);
CREATE INDEX idx_votes_award ON public.votes USING btree (award_id);
CREATE INDEX idx_votes_voter ON public.votes USING btree (voter_id);
CREATE INDEX idx_votes_nominee ON public.votes USING btree (nominee_id);

CREATE INDEX idx_flashback_parties_group ON public.flashback_parties USING btree (group_id);
CREATE INDEX idx_flashback_parties_status ON public.flashback_parties USING btree (status);
CREATE INDEX idx_flashback_photos_party ON public.flashback_photos USING btree (party_id);

CREATE INDEX idx_activity_user ON public.activity_log USING btree (user_id);
CREATE INDEX idx_activity_action ON public.activity_log USING btree (action);
CREATE INDEX idx_activity_entity ON public.activity_log USING btree (entity_type, entity_id);
CREATE INDEX idx_activity_created ON public.activity_log USING btree (created_at DESC);

-- ============================================================
-- VISTAS
-- ============================================================

CREATE OR REPLACE VIEW public.group_members_view AS
SELECT
    gm.id,
    gm.group_id,
    gm.user_id,
    gm.role,
    gm.is_active,
    gm.invited_by,
    gm.joined_at,
    gm.updated_at,
    gm.group_display_name,
    gm.group_avatar_url,
    gm.group_bio,
    p.username,
    p.bio AS user_bio,
    COALESCE(NULLIF(gm.group_display_name, ''), p.display_name) AS display_name,
    NULLIF(gm.group_avatar_url, '') AS avatar_url
FROM group_members gm
JOIN profiles p ON gm.user_id = p.id
WHERE gm.is_active = true;

CREATE OR REPLACE VIEW public.awards_with_stats AS
SELECT
    a.id,
    a.group_id,
    a.name,
    a.description,
    a.icon,
    a.status,
    a.vote_type,
    a.voting_settings,
    a.nominations_start_at,
    a.nominations_end_at,
    a.voting_start_at,
    a.voting_end_at,
    a.winner_id,
    a.is_revealed,
    a.created_by,
    a.created_at,
    a.updated_at,
    a.completed_at,
    g.name AS group_name,
    count(n.id) AS nominee_count,
    COALESCE(sum(n.vote_count), 0) AS total_votes
FROM awards a
JOIN groups g ON g.id = a.group_id
LEFT JOIN nominees n ON n.award_id = a.id
GROUP BY a.id, g.name;

CREATE OR REPLACE VIEW public.messages_view AS
SELECT
    m.id,
    m.group_id,
    m.sender_id,
    m.content,
    m.type,
    m.metadata,
    m.is_edited,
    m.is_deleted,
    m.created_at,
    m.reply_to_id,
    COALESCE(gm.group_display_name, p.display_name) AS sender_name,
    COALESCE(gm.group_avatar_url, p.avatar_url) AS sender_avatar,
    left(rm.content, 100) AS reply_to_content,
    COALESCE(rgm.group_display_name, rp.display_name) AS reply_to_sender_name
FROM messages m
LEFT JOIN profiles p ON p.id = m.sender_id
LEFT JOIN group_members gm ON gm.user_id = m.sender_id AND gm.group_id = m.group_id
LEFT JOIN messages rm ON rm.id = m.reply_to_id
LEFT JOIN profiles rp ON rp.id = rm.sender_id
LEFT JOIN group_members rgm ON rgm.user_id = rm.sender_id AND rgm.group_id = rm.group_id;

-- ============================================================
-- FUNCIONES
-- ============================================================

-- Función helper: comprobar si el usuario es miembro de un grupo
CREATE OR REPLACE FUNCTION public.is_group_member(check_group_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_id = check_group_id
    AND user_id = auth.uid()
    AND is_active = true
  );
END;
$$;

-- Función helper: comprobar si el usuario es admin de un grupo
CREATE OR REPLACE FUNCTION public.is_group_admin(check_group_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_id = check_group_id
    AND user_id = auth.uid()
    AND role IN ('owner', 'admin')
    AND is_active = true
  );
END;
$$;

-- Función helper: comprobar si el usuario es owner de un grupo
CREATE OR REPLACE FUNCTION public.is_group_owner(check_group_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_id = check_group_id
    AND user_id = auth.uid()
    AND role = 'owner'
    AND is_active = true
  );
END;
$$;

-- Función helper: obtener IDs de grupos del usuario actual
CREATE OR REPLACE FUNCTION public.get_my_group_ids()
RETURNS SETOF UUID
LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT group_id FROM public.group_members
  WHERE user_id = auth.uid()
  AND is_active = true;
END;
$$;

-- Generar código de invitación aleatorio
CREATE OR REPLACE FUNCTION public.generate_invite_code(length INTEGER DEFAULT 6)
RETURNS TEXT
LANGUAGE plpgsql AS $$
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
$$;

-- Crear perfil automáticamente al registrar usuario
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER AS $$
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
$$;

-- Añadir creador como owner del grupo
CREATE OR REPLACE FUNCTION public.add_group_creator_as_owner()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.group_members (group_id, user_id, role)
  VALUES (NEW.id, NEW.created_by, 'owner');
  RETURN NEW;
END;
$$;

-- Asignar widgets por defecto al crear grupo
CREATE OR REPLACE FUNCTION public.add_default_widgets_to_group()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.group_widgets (group_id, widget_id, display_order, is_active)
  SELECT
    NEW.id,
    w.id,
    CASE w.name
      WHEN 'Archivo'   THEN 0
      WHEN 'Agenda'    THEN 1
      WHEN 'Bloc'      THEN 2
      WHEN 'Premios'   THEN 3
      WHEN 'Planes'    THEN 4
      WHEN 'Gastos'    THEN 5
      WHEN 'Flashback' THEN 6
      ELSE 99
    END,
    true
  FROM public.widgets w
  WHERE w.category != 'hidden'
    AND (
      w.category = 'general'
      OR (w.name = 'Premios'   AND NEW.category = 'Estándar')
      OR (w.name = 'Planes'    AND NEW.category = 'Pareja')
      OR (w.name = 'Gastos'    AND NEW.category = 'Viaje')
      OR (w.name = 'Flashback' AND NEW.category = 'Fiesta')
    );
  RETURN NEW;
END;
$$;

-- Actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Actualizar updated_at para bucket list
CREATE OR REPLACE FUNCTION public.update_bucket_list_item_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Actualizar conteo de votos en nominados
CREATE OR REPLACE FUNCTION public.update_nominee_vote_count()
RETURNS TRIGGER
LANGUAGE plpgsql AS $$
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
$$;

-- Comprobar expiración de premios y declarar ganador
CREATE OR REPLACE FUNCTION public.check_award_expiration(check_award_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  award_record RECORD;
  ref_time TIMESTAMPTZ;
BEGIN
  SELECT * INTO award_record FROM public.awards WHERE id = check_award_id;

  IF award_record IS NULL THEN
    RETURN '{"success": false, "error": "Award not found"}'::jsonb;
  END IF;

  IF award_record.status = 'completed' THEN
    RETURN '{"success": true, "status": "already_completed"}'::jsonb;
  END IF;

  ref_time := NOW();
  IF award_record.status = 'voting' AND award_record.voting_end_at IS NOT NULL AND award_record.voting_end_at <= ref_time THEN
    DECLARE
        max_votes INTEGER;
    BEGIN
        SELECT MAX(vote_count) INTO max_votes FROM public.nominees WHERE award_id = check_award_id;

        IF max_votes > 0 THEN
            UPDATE public.nominees
            SET is_winner = true
            WHERE award_id = check_award_id AND vote_count = max_votes;

            DECLARE
                any_winner_id UUID;
            BEGIN
                SELECT user_id INTO any_winner_id FROM public.nominees
                WHERE award_id = check_award_id AND is_winner = true
                LIMIT 1;

                UPDATE public.awards
                SET status = 'completed',
                    winner_id = any_winner_id,
                    completed_at = ref_time
                WHERE id = check_award_id;

                RETURN '{"success": true, "status": "completed_with_winners"}'::jsonb;
            END;
        ELSE
            UPDATE public.awards
            SET status = 'completed',
                completed_at = ref_time,
                winner_id = NULL
            WHERE id = check_award_id;

            RETURN '{"success": true, "status": "completed_no_winner"}'::jsonb;
        END IF;
    END;
  END IF;

  RETURN '{"success": false, "status": "not_expired"}'::jsonb;
END;
$$;

-- ============================================================
-- TRIGGERS
-- ============================================================

-- Auth: crear perfil al registrar usuario
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Grupos: añadir creador como owner
CREATE TRIGGER group_creator_trigger
    AFTER INSERT ON public.groups
    FOR EACH ROW EXECUTE FUNCTION public.add_group_creator_as_owner();

-- Grupos: asignar widgets por defecto
CREATE TRIGGER on_group_created
    AFTER INSERT ON public.groups
    FOR EACH ROW EXECUTE FUNCTION public.add_default_widgets_to_group();

-- Updated_at automático
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_groups_updated_at
    BEFORE UPDATE ON public.groups
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_group_members_updated_at
    BEFORE UPDATE ON public.group_members
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_awards_updated_at
    BEFORE UPDATE ON public.awards
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_shared_expenses_updated_at
    BEFORE UPDATE ON public.shared_expenses
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_flashback_parties_updated_at
    BEFORE UPDATE ON public.flashback_parties
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER bucket_list_items_updated_at
    BEFORE UPDATE ON public.bucket_list_items
    FOR EACH ROW EXECUTE FUNCTION public.update_bucket_list_item_updated_at();

-- Votos: actualizar conteo
CREATE TRIGGER votes_count_trigger
    AFTER INSERT OR DELETE OR UPDATE ON public.votes
    FOR EACH ROW EXECUTE FUNCTION public.update_nominee_vote_count();

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.widgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_widgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gallery_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_gallery_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bucket_list_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shared_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shared_expense_splits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shared_expense_settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.awards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nominees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flashback_parties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flashback_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

-- ---- PROFILES ----
CREATE POLICY "Users can view all profiles" ON public.profiles
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE TO authenticated USING (auth.uid() = id);

-- ---- GROUPS ----
CREATE POLICY "groups_select_policy" ON public.groups
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "groups_insert_policy" ON public.groups
    FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());
CREATE POLICY "groups_update_policy" ON public.groups
    FOR UPDATE TO authenticated
    USING (EXISTS (SELECT 1 FROM group_members WHERE group_members.group_id = groups.id AND group_members.user_id = auth.uid() AND group_members.role = ANY (ARRAY['owner'::member_role, 'admin'::member_role])))
    WITH CHECK (EXISTS (SELECT 1 FROM group_members WHERE group_members.group_id = groups.id AND group_members.user_id = auth.uid() AND group_members.role = ANY (ARRAY['owner'::member_role, 'admin'::member_role])));
CREATE POLICY "groups_delete_policy" ON public.groups
    FOR DELETE TO authenticated USING (true);

-- ---- GROUP MEMBERS ----
CREATE POLICY "group_members_select_policy" ON public.group_members
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "group_members_insert_policy" ON public.group_members
    FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "group_members_update_policy" ON public.group_members
    FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Admins can update members" ON public.group_members
    FOR UPDATE TO authenticated
    USING (
        group_id IN (SELECT gm.group_id FROM group_members gm WHERE gm.user_id = auth.uid() AND gm.role = ANY (ARRAY['owner'::member_role, 'admin'::member_role]) AND gm.is_active = true)
        AND (role <> 'owner'::member_role OR group_id IN (SELECT gm.group_id FROM group_members gm WHERE gm.user_id = auth.uid() AND gm.role = 'owner'::member_role AND gm.is_active = true))
    )
    WITH CHECK (
        group_id IN (SELECT gm.group_id FROM group_members gm WHERE gm.user_id = auth.uid() AND gm.role = ANY (ARRAY['owner'::member_role, 'admin'::member_role]) AND gm.is_active = true)
        AND (role <> 'owner'::member_role OR group_id IN (SELECT gm.group_id FROM group_members gm WHERE gm.user_id = auth.uid() AND gm.role = 'owner'::member_role AND gm.is_active = true))
    );

-- ---- WIDGETS ----
CREATE POLICY "Widgets are viewable by everyone." ON public.widgets
    FOR SELECT TO public USING (true);

-- ---- GROUP WIDGETS ----
CREATE POLICY "Group widgets are viewable by group members" ON public.group_widgets
    FOR SELECT TO public
    USING (EXISTS (SELECT 1 FROM group_members WHERE group_members.group_id = group_widgets.group_id AND group_members.user_id = auth.uid() AND group_members.is_active = true));
CREATE POLICY "Members or admins can insert group widgets" ON public.group_widgets
    FOR INSERT TO authenticated
    WITH CHECK (EXISTS (SELECT 1 FROM group_members gm JOIN groups g ON g.id = gm.group_id WHERE gm.group_id = group_widgets.group_id AND gm.user_id = auth.uid() AND gm.is_active = true AND (gm.role = ANY (ARRAY['owner'::member_role, 'admin'::member_role]) OR COALESCE((g.settings->>'allow_member_manage_widgets')::boolean, false))));
CREATE POLICY "Members or admins can update group widgets" ON public.group_widgets
    FOR UPDATE TO authenticated
    USING (EXISTS (SELECT 1 FROM group_members gm JOIN groups g ON g.id = gm.group_id WHERE gm.group_id = group_widgets.group_id AND gm.user_id = auth.uid() AND gm.is_active = true AND (gm.role = ANY (ARRAY['owner'::member_role, 'admin'::member_role]) OR COALESCE((g.settings->>'allow_member_manage_widgets')::boolean, false))));
CREATE POLICY "Group admins can delete group widgets" ON public.group_widgets
    FOR DELETE TO authenticated
    USING (EXISTS (SELECT 1 FROM group_members WHERE group_members.group_id = group_widgets.group_id AND group_members.user_id = auth.uid() AND group_members.is_active = true AND group_members.role = ANY (ARRAY['admin'::member_role, 'owner'::member_role])));

-- ---- GALLERY IMAGES ----
CREATE POLICY "Group members can view gallery images" ON public.gallery_images
    FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM group_members WHERE group_members.group_id = gallery_images.group_id AND group_members.user_id = auth.uid() AND group_members.is_active = true));
CREATE POLICY "Members can upload images if allowed" ON public.gallery_images
    FOR INSERT TO authenticated
    WITH CHECK (EXISTS (SELECT 1 FROM group_members gm JOIN groups g ON g.id = gm.group_id WHERE gm.group_id = gallery_images.group_id AND gm.user_id = auth.uid() AND gm.is_active = true AND (gm.role = ANY (ARRAY['owner'::member_role, 'admin'::member_role]) OR COALESCE((g.settings->>'allow_member_upload_gallery')::boolean, true))));
CREATE POLICY "Users can delete own images or admins can delete any" ON public.gallery_images
    FOR DELETE TO authenticated
    USING (uploaded_by = auth.uid() OR EXISTS (SELECT 1 FROM group_members WHERE group_members.group_id = gallery_images.group_id AND group_members.user_id = auth.uid() AND group_members.is_active = true AND group_members.role = ANY (ARRAY['admin'::member_role, 'owner'::member_role])));

-- ---- MESSAGES ----
CREATE POLICY "Users can view messages in their groups" ON public.messages
    FOR SELECT USING (EXISTS (SELECT 1 FROM group_members WHERE group_members.group_id = messages.group_id AND group_members.user_id = auth.uid()));
CREATE POLICY "Users can send messages to their groups" ON public.messages
    FOR INSERT WITH CHECK (auth.uid() = sender_id AND EXISTS (SELECT 1 FROM group_members WHERE group_members.group_id = messages.group_id AND group_members.user_id = auth.uid()));
CREATE POLICY "Users can delete their own messages" ON public.messages
    FOR DELETE USING (auth.uid() = sender_id);

-- ---- NOTES ----
CREATE POLICY "Group members can view notes" ON public.notes
    FOR SELECT USING (EXISTS (SELECT 1 FROM group_members gm WHERE gm.group_id = notes.group_id AND gm.user_id = auth.uid() AND gm.is_active = true));
CREATE POLICY "Members can create notes if allowed" ON public.notes
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = created_by AND EXISTS (SELECT 1 FROM group_members gm JOIN groups g ON g.id = gm.group_id WHERE gm.group_id = notes.group_id AND gm.user_id = auth.uid() AND gm.is_active = true AND (gm.role = ANY (ARRAY['owner'::member_role, 'admin'::member_role]) OR COALESCE((g.settings->>'allow_member_create_notes')::boolean, true))));
CREATE POLICY "Group members can update notes" ON public.notes
    FOR UPDATE USING (EXISTS (SELECT 1 FROM group_members gm WHERE gm.group_id = notes.group_id AND gm.user_id = auth.uid() AND gm.is_active = true));
CREATE POLICY "Author or admin can delete notes" ON public.notes
    FOR DELETE USING (created_by = auth.uid() OR EXISTS (SELECT 1 FROM group_members gm WHERE gm.group_id = notes.group_id AND gm.user_id = auth.uid() AND gm.is_active = true AND gm.role = ANY (ARRAY['owner'::member_role, 'admin'::member_role])));

-- ---- EVENTS ----
CREATE POLICY "Group members can view events" ON public.events
    FOR SELECT USING (EXISTS (SELECT 1 FROM group_members WHERE group_members.group_id = events.group_id AND group_members.user_id = auth.uid() AND group_members.is_active = true));
CREATE POLICY "Members can create events if allowed" ON public.events
    FOR INSERT TO authenticated
    WITH CHECK (EXISTS (SELECT 1 FROM group_members gm JOIN groups g ON g.id = gm.group_id WHERE gm.group_id = events.group_id AND gm.user_id = auth.uid() AND gm.is_active = true AND (gm.role = ANY (ARRAY['owner'::member_role, 'admin'::member_role]) OR COALESCE((g.settings->>'allow_member_create_events')::boolean, true))));
CREATE POLICY "Creator or admin can update events" ON public.events
    FOR UPDATE USING (created_by = auth.uid() OR EXISTS (SELECT 1 FROM group_members WHERE group_members.group_id = events.group_id AND group_members.user_id = auth.uid() AND group_members.is_active = true AND group_members.role = ANY (ARRAY['admin'::member_role, 'owner'::member_role])));
CREATE POLICY "Creator or admin can delete events" ON public.events
    FOR DELETE USING (created_by = auth.uid() OR EXISTS (SELECT 1 FROM group_members WHERE group_members.group_id = events.group_id AND group_members.user_id = auth.uid() AND group_members.is_active = true AND group_members.role = ANY (ARRAY['admin'::member_role, 'owner'::member_role])));

-- ---- EVENT PARTICIPANTS ----
CREATE POLICY "Group members can view participants" ON public.event_participants
    FOR SELECT USING (EXISTS (SELECT 1 FROM events e JOIN group_members gm ON gm.group_id = e.group_id WHERE e.id = event_participants.event_id AND gm.user_id = auth.uid() AND gm.is_active = true));
CREATE POLICY "Group members can add participants" ON public.event_participants
    FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM events e JOIN group_members gm ON gm.group_id = e.group_id WHERE e.id = event_participants.event_id AND gm.user_id = auth.uid() AND gm.is_active = true));
CREATE POLICY "Users can update own RSVP" ON public.event_participants
    FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "User or event creator or admin can delete participants" ON public.event_participants
    FOR DELETE USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM events e JOIN group_members gm ON gm.group_id = e.group_id WHERE e.id = event_participants.event_id AND gm.user_id = auth.uid() AND gm.is_active = true AND gm.role = ANY (ARRAY['admin'::member_role, 'owner'::member_role])));

-- ---- EVENT GALLERY LINKS ----
CREATE POLICY "Group members can view gallery links" ON public.event_gallery_links
    FOR SELECT USING (EXISTS (SELECT 1 FROM events e JOIN group_members gm ON gm.group_id = e.group_id WHERE e.id = event_gallery_links.event_id AND gm.user_id = auth.uid() AND gm.is_active = true));
CREATE POLICY "Group members can link gallery images" ON public.event_gallery_links
    FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM events e JOIN group_members gm ON gm.group_id = e.group_id WHERE e.id = event_gallery_links.event_id AND gm.user_id = auth.uid() AND gm.is_active = true));
CREATE POLICY "Linker or event creator can unlink gallery images" ON public.event_gallery_links
    FOR DELETE USING (linked_by = auth.uid() OR EXISTS (SELECT 1 FROM events e WHERE e.id = event_gallery_links.event_id AND e.created_by = auth.uid()));

-- ---- BUCKET LIST ITEMS ----
CREATE POLICY "Members can view bucket list items" ON public.bucket_list_items
    FOR SELECT TO authenticated USING (is_group_member(group_id));
CREATE POLICY "Members can create bucket list items" ON public.bucket_list_items
    FOR INSERT TO authenticated WITH CHECK (is_group_member(group_id) AND created_by = auth.uid());
CREATE POLICY "Members can update bucket list items" ON public.bucket_list_items
    FOR UPDATE TO authenticated USING (is_group_member(group_id));
CREATE POLICY "Creator or admin can delete bucket list items" ON public.bucket_list_items
    FOR DELETE TO authenticated USING (created_by = auth.uid() OR is_group_admin(group_id));

-- ---- SHARED EXPENSES ----
CREATE POLICY "Members can view shared expenses" ON public.shared_expenses
    FOR SELECT TO authenticated USING (is_group_member(group_id));
CREATE POLICY "Members can create shared expenses if allowed" ON public.shared_expenses
    FOR INSERT TO authenticated
    WITH CHECK (EXISTS (SELECT 1 FROM group_members gm JOIN groups g ON g.id = gm.group_id WHERE gm.group_id = shared_expenses.group_id AND gm.user_id = auth.uid() AND gm.is_active = true AND (gm.role = ANY (ARRAY['owner'::member_role, 'admin'::member_role]) OR COALESCE((g.settings->>'allow_member_create_expenses')::boolean, true))));
CREATE POLICY "Members can update shared expenses" ON public.shared_expenses
    FOR UPDATE TO authenticated USING (is_group_member(group_id));
CREATE POLICY "Creator or admin can delete shared expenses" ON public.shared_expenses
    FOR DELETE TO authenticated USING (created_by = auth.uid() OR is_group_admin(group_id));

-- ---- SHARED EXPENSE SPLITS ----
CREATE POLICY "Members can view expense splits" ON public.shared_expense_splits
    FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM shared_expenses e WHERE e.id = shared_expense_splits.expense_id AND is_group_member(e.group_id)));
CREATE POLICY "Members can create expense splits" ON public.shared_expense_splits
    FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM shared_expenses e WHERE e.id = shared_expense_splits.expense_id AND is_group_member(e.group_id)));
CREATE POLICY "Members can delete expense splits" ON public.shared_expense_splits
    FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM shared_expenses e WHERE e.id = shared_expense_splits.expense_id AND is_group_member(e.group_id)));

-- ---- SHARED EXPENSE SETTLEMENTS ----
CREATE POLICY "Members can view settlements" ON public.shared_expense_settlements
    FOR SELECT TO authenticated USING (is_group_member(group_id));
CREATE POLICY "Members can create settlements" ON public.shared_expense_settlements
    FOR INSERT TO authenticated WITH CHECK (is_group_member(group_id));
CREATE POLICY "Members can update settlements" ON public.shared_expense_settlements
    FOR UPDATE TO authenticated USING (is_group_member(group_id));
CREATE POLICY "Members can delete settlements" ON public.shared_expense_settlements
    FOR DELETE TO authenticated USING (is_group_member(group_id));

-- ---- AWARDS ----
CREATE POLICY "Users can view awards in their groups" ON public.awards
    FOR SELECT TO authenticated USING (is_group_member(group_id));
CREATE POLICY "Admins can create awards" ON public.awards
    FOR INSERT TO authenticated
    WITH CHECK (created_by = auth.uid() AND group_id IN (SELECT g.id FROM groups g JOIN group_members gm ON gm.group_id = g.id WHERE gm.user_id = auth.uid() AND gm.is_active = true AND (gm.role = ANY (ARRAY['owner'::member_role, 'admin'::member_role]) OR COALESCE((g.settings->>'allow_member_nominations')::boolean, false))));
CREATE POLICY "Members can create awards if allowed" ON public.awards
    FOR INSERT TO authenticated
    WITH CHECK (created_by = auth.uid() AND EXISTS (SELECT 1 FROM group_members gm JOIN groups g ON g.id = gm.group_id WHERE gm.group_id = awards.group_id AND gm.user_id = auth.uid() AND gm.is_active = true AND (gm.role = ANY (ARRAY['owner'::member_role, 'admin'::member_role]) OR (g.settings->>'allow_member_nominations')::boolean = true)));
CREATE POLICY "Admins can update awards" ON public.awards
    FOR UPDATE TO authenticated USING (is_group_admin(group_id));
CREATE POLICY "Admins can delete awards" ON public.awards
    FOR DELETE TO authenticated USING (is_group_admin(group_id));

-- ---- NOMINEES ----
CREATE POLICY "Users can view nominees in their groups" ON public.nominees
    FOR SELECT TO authenticated
    USING (award_id IN (SELECT a.id FROM awards a JOIN group_members gm ON a.group_id = gm.group_id WHERE gm.user_id = auth.uid() AND gm.is_active = true));
CREATE POLICY "Admins can manage nominees" ON public.nominees
    FOR ALL TO authenticated
    USING (award_id IN (SELECT a.id FROM awards a JOIN group_members gm ON a.group_id = gm.group_id WHERE gm.user_id = auth.uid() AND gm.role = ANY (ARRAY['owner'::member_role, 'admin'::member_role]) AND gm.is_active = true));
CREATE POLICY "Creators can manage nominees of their awards" ON public.nominees
    FOR ALL TO authenticated
    USING (award_id IN (SELECT awards.id FROM awards WHERE awards.created_by = auth.uid()));

-- ---- VOTES ----
CREATE POLICY "Users can view own votes" ON public.votes
    FOR SELECT TO authenticated USING (voter_id = auth.uid());
CREATE POLICY "Users can view votes in completed awards" ON public.votes
    FOR SELECT TO authenticated
    USING (award_id IN (SELECT a.id FROM awards a JOIN group_members gm ON a.group_id = gm.group_id WHERE gm.user_id = auth.uid() AND gm.is_active = true AND (a.status = 'completed'::award_status OR (a.voting_settings->>'anonymous_voting') = 'false')));
CREATE POLICY "Users can cast votes" ON public.votes
    FOR INSERT TO authenticated
    WITH CHECK (voter_id = auth.uid() AND award_id IN (SELECT a.id FROM awards a JOIN groups g ON g.id = a.group_id JOIN group_members gm ON gm.group_id = a.group_id WHERE gm.user_id = auth.uid() AND gm.is_active = true AND a.status = 'voting'::award_status AND (gm.role = ANY (ARRAY['owner'::member_role, 'admin'::member_role]) OR COALESCE((g.settings->>'allow_member_voting')::boolean, false))));
CREATE POLICY "Users can delete their own votes" ON public.votes
    FOR DELETE USING (auth.uid() = voter_id);
CREATE POLICY "Users can remove own votes when vote change enabled" ON public.votes
    FOR DELETE TO authenticated
    USING (voter_id = auth.uid() AND award_id IN (SELECT a.id FROM awards a JOIN groups g ON g.id = a.group_id JOIN group_members gm ON gm.group_id = a.group_id WHERE gm.user_id = auth.uid() AND gm.is_active = true AND a.status = 'voting'::award_status AND COALESCE((a.voting_settings->>'allow_vote_change')::boolean, false) AND (gm.role = ANY (ARRAY['owner'::member_role, 'admin'::member_role]) OR COALESCE((g.settings->>'allow_member_voting')::boolean, false))));
CREATE POLICY "Users can update their own votes" ON public.votes
    FOR UPDATE USING (auth.uid() = voter_id) WITH CHECK (auth.uid() = voter_id);

-- ---- FLASHBACK PARTIES ----
CREATE POLICY "Members can view flashback parties" ON public.flashback_parties
    FOR SELECT TO authenticated USING (is_group_member(group_id));
CREATE POLICY "Members can create flashback parties if allowed" ON public.flashback_parties
    FOR INSERT TO authenticated
    WITH CHECK (EXISTS (SELECT 1 FROM group_members gm JOIN groups g ON g.id = gm.group_id WHERE gm.group_id = flashback_parties.group_id AND gm.user_id = auth.uid() AND gm.is_active = true AND (gm.role = ANY (ARRAY['owner'::member_role, 'admin'::member_role]) OR COALESCE((g.settings->>'allow_member_create_flashback_party')::boolean, true))));
CREATE POLICY "Members can update flashback party status" ON public.flashback_parties
    FOR UPDATE TO authenticated USING (is_group_member(group_id));
CREATE POLICY "Creator or admin can delete flashback parties" ON public.flashback_parties
    FOR DELETE TO authenticated USING (created_by = auth.uid() OR is_group_admin(group_id));

-- ---- FLASHBACK PHOTOS ----
CREATE POLICY "Members can view flashback photos" ON public.flashback_photos
    FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM flashback_parties fp WHERE fp.id = flashback_photos.party_id AND is_group_member(fp.group_id)));
CREATE POLICY "Members can take flashback photos" ON public.flashback_photos
    FOR INSERT TO authenticated
    WITH CHECK (EXISTS (SELECT 1 FROM flashback_parties fp WHERE fp.id = flashback_photos.party_id AND is_group_member(fp.group_id) AND fp.status = 'active'));
CREATE POLICY "Creator, admin or photo taker can delete flashback photos" ON public.flashback_photos
    FOR DELETE TO authenticated
    USING (taken_by = auth.uid() OR EXISTS (SELECT 1 FROM flashback_parties fp WHERE fp.id = flashback_photos.party_id AND (fp.created_by = auth.uid() OR is_group_admin(fp.group_id))));

-- ============================================================
-- STORAGE BUCKETS
-- ============================================================

-- Todos los buckets son públicos (lectura)
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('awards', 'awards', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('bucket-list', 'bucket-list', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('gallery', 'gallery', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('groups', 'groups', true);

-- Storage policies
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "Auth Upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.role() = 'authenticated');
CREATE POLICY "Owner Update" ON storage.objects FOR UPDATE USING (bucket_id = 'avatars' AND auth.uid() = owner);

CREATE POLICY "Public Access Awards" ON storage.objects FOR SELECT USING (bucket_id = 'awards');
CREATE POLICY "Authenticated Upload Awards" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'awards');

CREATE POLICY "Public Access Groups" ON storage.objects FOR SELECT USING (bucket_id = 'groups');
CREATE POLICY "Authenticated Upload Groups" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'groups' AND auth.role() = 'authenticated');
CREATE POLICY "Authenticated Update Groups" ON storage.objects FOR UPDATE USING (bucket_id = 'groups' AND auth.role() = 'authenticated');
CREATE POLICY "Authenticated Delete Groups" ON storage.objects FOR DELETE USING (bucket_id = 'groups' AND auth.role() = 'authenticated');

CREATE POLICY "Anyone can view gallery images" ON storage.objects FOR SELECT USING (bucket_id = 'gallery');
CREATE POLICY "Group members can upload gallery images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'gallery');
CREATE POLICY "Users can delete own gallery images" ON storage.objects FOR DELETE USING (bucket_id = 'gallery');

CREATE POLICY "Anyone can view bucket list images" ON storage.objects FOR SELECT USING (bucket_id = 'bucket-list');
CREATE POLICY "Group members can upload bucket list images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'bucket-list' AND is_group_member((storage.foldername(name))[1]::uuid));
CREATE POLICY "Group members can update bucket list images" ON storage.objects FOR UPDATE USING (bucket_id = 'bucket-list' AND is_group_member((storage.foldername(name))[1]::uuid));
CREATE POLICY "Group members can delete bucket list images" ON storage.objects FOR DELETE USING (bucket_id = 'bucket-list' AND is_group_member((storage.foldername(name))[1]::uuid));

-- ============================================================
-- DATOS SEMILLA (Widgets)
-- ============================================================

INSERT INTO public.widgets (id, name, subtitle, icon, category) VALUES
    ('7b41b2e0-d347-4eee-a2a7-869148f67c69', 'Archivo', 'La Galería Compartida', 'images-outline', 'general'),
    ('902f79af-2b94-4cd4-90c6-ece7d14f5b19', 'Agenda', 'Calendario y Eventos', 'calendar-outline', 'general'),
    ('fbb554ef-3468-45f8-80fb-1fe771754ad3', 'Bloc', 'Listas Colaborativas', 'checkbox-outline', 'general'),
    ('c1bd211f-5f5a-434c-b8ab-9bd72b7ac563', 'Premios', 'Votaciones y Decisiones', 'trophy-outline', 'Estándar'),
    ('6acdd2e0-0989-4e09-af7a-b9ea2c0114ea', 'Planes', 'Cosas que queréis hacer juntos', 'compass-outline', 'Pareja'),
    ('1878a670-7911-41d2-9685-e59587bc493f', 'Gastos', 'Gastos compartidos del viaje', 'wallet-outline', 'Viaje'),
    ('53eb16f0-411d-4e23-bc42-44d2c1cb7b69', 'Flashback', 'Cámara desechable compartida', 'camera-outline', 'Fiesta');

-- ============================================================
-- REALTIME (habilitar para tablas con suscripciones)
-- ============================================================
-- Desde el dashboard de Supabase, habilitar Realtime para:
-- messages, shared_expenses, shared_expense_settlements,
-- bucket_list_items, flashback_parties, flashback_photos,
-- events, awards, nominees, votes
