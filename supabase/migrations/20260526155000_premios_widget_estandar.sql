-- 1. Change category of Premios widget to Estándar
UPDATE public.widgets
SET category = 'Estándar'
WHERE name = 'Premios';

-- 2. Update default widgets trigger function
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
      OR (w.name = 'Premios'   AND NEW.category = 'Estándar')
      OR (w.name = 'Planes'    AND NEW.category = 'Pareja')
      OR (w.name = 'Gastos'    AND NEW.category = 'Viaje')
      OR (w.name = 'Flashback' AND NEW.category = 'Fiesta')
    );
  RETURN NEW;
END;
$function$;

-- 3. Remove Premios widget from existing non-Estándar groups
DELETE FROM public.group_widgets gw
USING public.widgets w, public.groups g
WHERE gw.widget_id = w.id
  AND gw.group_id = g.id
  AND w.name = 'Premios'
  AND g.category != 'Estándar';
