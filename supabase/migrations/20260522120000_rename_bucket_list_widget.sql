-- Renombrar widget "Bucket List" → "Planes"
UPDATE widgets
SET
  name = 'Planes',
  subtitle = 'Cosas que queréis hacer juntos',
  icon = 'compass-outline'
WHERE name = 'Bucket List';
