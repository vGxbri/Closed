-- Ocultar Balance del catálogo
UPDATE public.widgets SET category = 'hidden' WHERE name = 'Balance';

UPDATE public.widgets SET category = 'Pareja' WHERE name = 'Planes';

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
      WHEN 'Archivo' THEN 0
      WHEN 'Agenda' THEN 1
      WHEN 'Bloc' THEN 2
      WHEN 'Premios' THEN 3
      WHEN 'Planes' THEN 4
      ELSE 99
    END,
    true
  FROM public.widgets w
  WHERE w.category != 'hidden'
    AND (
      w.category = 'general'
      OR (w.name = 'Planes' AND NEW.category = 'Pareja')
    );
  RETURN NEW;
END;
$function$;

UPDATE public.group_widgets gw
SET is_active = false
FROM public.widgets w
WHERE w.id = gw.widget_id AND w.name = 'Balance' AND gw.is_active = true;

UPDATE public.group_widgets gw
SET
  is_active = true,
  display_order = ordered.new_order
FROM (
  SELECT
    gw.id AS group_widget_id,
    CASE w.name
      WHEN 'Archivo' THEN 0
      WHEN 'Agenda' THEN 1
      WHEN 'Bloc' THEN 2
      WHEN 'Premios' THEN 3
      WHEN 'Planes' THEN 4
      ELSE 99
    END AS new_order
  FROM public.group_widgets gw
  JOIN public.widgets w ON w.id = gw.widget_id
  WHERE w.category IN ('general', 'Pareja')
) AS ordered
WHERE gw.id = ordered.group_widget_id;

INSERT INTO public.group_widgets (group_id, widget_id, display_order, is_active)
SELECT g.id, w.id,
  CASE w.name WHEN 'Archivo' THEN 0 WHEN 'Agenda' THEN 1 WHEN 'Bloc' THEN 2 WHEN 'Premios' THEN 3 ELSE 99 END,
  true
FROM public.groups g
CROSS JOIN public.widgets w
WHERE w.category = 'general'
  AND NOT EXISTS (
    SELECT 1 FROM public.group_widgets gw
    WHERE gw.group_id = g.id AND gw.widget_id = w.id
  );

INSERT INTO public.group_widgets (group_id, widget_id, display_order, is_active)
SELECT g.id, w.id, 4, true
FROM public.groups g
CROSS JOIN public.widgets w
WHERE g.category = 'Pareja' AND w.name = 'Planes'
  AND NOT EXISTS (
    SELECT 1 FROM public.group_widgets gw
    WHERE gw.group_id = g.id AND gw.widget_id = w.id
  );
