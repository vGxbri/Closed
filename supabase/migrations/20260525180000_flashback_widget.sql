-- =========================================================
-- Flashback widget — shared disposable camera for Fiesta groups
-- =========================================================

-- 1. Register widget in catalogue
INSERT INTO public.widgets (name, subtitle, icon, category)
VALUES ('Flashback', 'Cámara desechable compartida', 'camera-outline', 'Fiesta');

-- 2. Tables

CREATE TABLE public.flashback_parties (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id    UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  created_by  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  starts_at   TIMESTAMPTZ NOT NULL,
  reveals_at  TIMESTAMPTZ NOT NULL,
  photo_limit INT NOT NULL DEFAULT 36
                CHECK (photo_limit IN (24, 36)),
  status      TEXT NOT NULL DEFAULT 'scheduled'
                CHECK (status IN ('scheduled', 'active', 'film_used', 'revealing', 'archived')),
  created_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  CONSTRAINT reveals_after_start CHECK (reveals_at > starts_at)
);

CREATE TABLE public.flashback_photos (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  party_id    UUID NOT NULL REFERENCES public.flashback_parties(id) ON DELETE CASCADE,
  taken_by    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  photo_url   TEXT NOT NULL,
  shot_number INT NOT NULL CHECK (shot_number > 0),
  created_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_flashback_parties_group  ON public.flashback_parties(group_id);
CREATE INDEX idx_flashback_parties_status ON public.flashback_parties(status);
CREATE INDEX idx_flashback_photos_party   ON public.flashback_photos(party_id);

-- 3. Trigger for updated_at
CREATE TRIGGER update_flashback_parties_updated_at
  BEFORE UPDATE ON public.flashback_parties
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 4. RLS
ALTER TABLE public.flashback_parties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flashback_photos  ENABLE ROW LEVEL SECURITY;

-- flashback_parties policies
CREATE POLICY "Members can view flashback parties"
  ON public.flashback_parties FOR SELECT
  TO authenticated
  USING (public.is_group_member(group_id));

CREATE POLICY "Members can create flashback parties"
  ON public.flashback_parties FOR INSERT
  TO authenticated
  WITH CHECK (public.is_group_member(group_id));

CREATE POLICY "Members can update flashback party status"
  ON public.flashback_parties FOR UPDATE
  TO authenticated
  USING (public.is_group_member(group_id));

-- flashback_photos policies
CREATE POLICY "Members can view flashback photos"
  ON public.flashback_photos FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.flashback_parties fp
      WHERE fp.id = party_id AND public.is_group_member(fp.group_id)
    )
  );

CREATE POLICY "Members can take flashback photos"
  ON public.flashback_photos FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.flashback_parties fp
      WHERE fp.id = party_id
        AND public.is_group_member(fp.group_id)
        AND fp.status = 'active'
    )
  );

-- 5. Update trigger to include Flashback for Fiesta groups
CREATE OR REPLACE FUNCTION public.add_default_widgets_to_group()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
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
      OR (w.name = 'Planes'    AND NEW.category = 'Pareja')
      OR (w.name = 'Gastos'    AND NEW.category = 'Viaje')
      OR (w.name = 'Flashback' AND NEW.category = 'Fiesta')
    );
  RETURN NEW;
END;
$function$;

-- 6. Backfill: add Flashback widget to existing Fiesta groups
INSERT INTO public.group_widgets (group_id, widget_id, display_order, is_active)
SELECT g.id, w.id, 6, true
FROM public.groups g
CROSS JOIN public.widgets w
WHERE g.category = 'Fiesta' AND w.name = 'Flashback'
  AND NOT EXISTS (
    SELECT 1 FROM public.group_widgets gw
    WHERE gw.group_id = g.id AND gw.widget_id = w.id
  );
