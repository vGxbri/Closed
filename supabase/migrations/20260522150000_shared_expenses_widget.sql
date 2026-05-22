-- =========================================================
-- Shared Expenses widget for Viaje groups
-- =========================================================

-- 1. Rename Balance → Gastos and assign to Viaje category
UPDATE public.widgets SET
  name = 'Gastos',
  subtitle = 'Gastos compartidos del viaje',
  icon = 'wallet-outline',
  category = 'Viaje'
WHERE name = 'Balance';

-- 2. Tables

CREATE TABLE public.shared_expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  description TEXT NOT NULL,
  paid_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_shared_expenses_group ON public.shared_expenses(group_id);
CREATE INDEX idx_shared_expenses_paid_by ON public.shared_expenses(paid_by);

CREATE TABLE public.shared_expense_splits (
  expense_id UUID NOT NULL REFERENCES public.shared_expenses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  PRIMARY KEY (expense_id, user_id)
);

CREATE TABLE public.shared_expense_settlements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  from_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  to_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  is_resolved BOOLEAN DEFAULT false NOT NULL,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  CONSTRAINT different_users CHECK (from_user_id != to_user_id)
);

CREATE INDEX idx_shared_expense_settlements_group ON public.shared_expense_settlements(group_id);

-- 3. Trigger for updated_at
CREATE TRIGGER update_shared_expenses_updated_at
  BEFORE UPDATE ON public.shared_expenses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 4. RLS
ALTER TABLE public.shared_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shared_expense_splits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shared_expense_settlements ENABLE ROW LEVEL SECURITY;

-- shared_expenses policies
CREATE POLICY "Members can view shared expenses"
  ON public.shared_expenses FOR SELECT
  TO authenticated
  USING (public.is_group_member(group_id));

CREATE POLICY "Members can create shared expenses"
  ON public.shared_expenses FOR INSERT
  TO authenticated
  WITH CHECK (public.is_group_member(group_id));

CREATE POLICY "Members can update shared expenses"
  ON public.shared_expenses FOR UPDATE
  TO authenticated
  USING (public.is_group_member(group_id));

CREATE POLICY "Creator or admin can delete shared expenses"
  ON public.shared_expenses FOR DELETE
  TO authenticated
  USING (
    created_by = auth.uid()
    OR public.is_group_admin(group_id)
  );

-- shared_expense_splits policies (access through parent expense's group)
CREATE POLICY "Members can view expense splits"
  ON public.shared_expense_splits FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.shared_expenses e
      WHERE e.id = expense_id AND public.is_group_member(e.group_id)
    )
  );

CREATE POLICY "Members can create expense splits"
  ON public.shared_expense_splits FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.shared_expenses e
      WHERE e.id = expense_id AND public.is_group_member(e.group_id)
    )
  );

CREATE POLICY "Members can delete expense splits"
  ON public.shared_expense_splits FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.shared_expenses e
      WHERE e.id = expense_id AND public.is_group_member(e.group_id)
    )
  );

-- shared_expense_settlements policies
CREATE POLICY "Members can view settlements"
  ON public.shared_expense_settlements FOR SELECT
  TO authenticated
  USING (public.is_group_member(group_id));

CREATE POLICY "Members can create settlements"
  ON public.shared_expense_settlements FOR INSERT
  TO authenticated
  WITH CHECK (public.is_group_member(group_id));

CREATE POLICY "Members can update settlements"
  ON public.shared_expense_settlements FOR UPDATE
  TO authenticated
  USING (public.is_group_member(group_id));

CREATE POLICY "Members can delete settlements"
  ON public.shared_expense_settlements FOR DELETE
  TO authenticated
  USING (public.is_group_member(group_id));

-- 5. Update trigger to include Gastos for Viaje groups
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
      WHEN 'Gastos' THEN 5
      ELSE 99
    END,
    true
  FROM public.widgets w
  WHERE w.category != 'hidden'
    AND (
      w.category = 'general'
      OR (w.name = 'Planes' AND NEW.category = 'Pareja')
      OR (w.name = 'Gastos' AND NEW.category = 'Viaje')
    );
  RETURN NEW;
END;
$function$;

-- 6. Backfill: add Gastos widget to existing Viaje groups
INSERT INTO public.group_widgets (group_id, widget_id, display_order, is_active)
SELECT g.id, w.id, 5, true
FROM public.groups g
CROSS JOIN public.widgets w
WHERE g.category = 'Viaje' AND w.name = 'Gastos'
  AND NOT EXISTS (
    SELECT 1 FROM public.group_widgets gw
    WHERE gw.group_id = g.id AND gw.widget_id = w.id
  );

-- 7. Clean up old Balance group_widgets that were disabled in non-Viaje groups
DELETE FROM public.group_widgets gw
USING public.widgets w
WHERE gw.widget_id = w.id
  AND w.name = 'Gastos'
  AND gw.is_active = false
  AND NOT EXISTS (
    SELECT 1 FROM public.groups g
    WHERE g.id = gw.group_id AND g.category = 'Viaje'
  );
