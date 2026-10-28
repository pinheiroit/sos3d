ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'seller';

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS picker_id uuid,
  ADD COLUMN IF NOT EXISTS picker_name text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS picking_status text NOT NULL DEFAULT 'aguardando',
  ADD COLUMN IF NOT EXISTS picking_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS picked_at timestamptz,
  ADD COLUMN IF NOT EXISTS picked_item_ids jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.orders
  ADD CONSTRAINT orders_picking_status_check
  CHECK (picking_status IN ('aguardando', 'em_separacao', 'separado'));

CREATE INDEX IF NOT EXISTS orders_picker_idx ON public.orders (picker_id);
CREATE INDEX IF NOT EXISTS orders_picking_status_idx ON public.orders (picking_status);

COMMENT ON COLUMN public.orders.picker_id IS 'Vendedor (user id) que pegou o pedido para separação física.';
COMMENT ON COLUMN public.orders.picked_item_ids IS 'IDs de order_items já separados (checklist item por item).';