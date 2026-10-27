CREATE OR REPLACE FUNCTION public.replace_pending_order_items(
  _order_id uuid,
  _items jsonb,
  _shipping numeric,
  _discount numeric
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _status text;
  _subtotal numeric;
  _total numeric;
  _ref text;
  r record;
BEGIN
  SELECT status, reference INTO _status, _ref FROM public.orders WHERE id = _order_id FOR UPDATE;
  IF _status IS NULL THEN
    RAISE EXCEPTION 'Pedido não encontrado.';
  END IF;
  IF _status <> 'pendente' THEN
    RAISE EXCEPTION 'Só pedidos pendentes podem ser alterados.';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.nfe_documents
    WHERE order_id = _order_id AND status IN ('autorizada', 'processando')
  ) THEN
    RAISE EXCEPTION 'Este pedido já tem nota fiscal emitida. Cancele a nota antes de alterar.';
  END IF;
  IF jsonb_typeof(_items) <> 'array' OR jsonb_array_length(_items) = 0 THEN
    RAISE EXCEPTION 'O pedido precisa de ao menos um item.';
  END IF;

  -- Ajusta o estoque pela diferença entre as quantidades antigas e novas.
  FOR r IN
    WITH old_q AS (
      SELECT product_id, sum(qty)::int AS q FROM public.order_items
      WHERE order_id = _order_id AND product_id IS NOT NULL GROUP BY product_id
    ),
    new_q AS (
      SELECT (i->>'product_id')::uuid AS product_id, sum((i->>'qty')::int)::int AS q
      FROM jsonb_array_elements(_items) i
      WHERE nullif(i->>'product_id', '') IS NOT NULL
      GROUP BY 1
    )
    SELECT coalesce(n.product_id, o.product_id) AS product_id,
           coalesce(n.q, 0) - coalesce(o.q, 0) AS delta
    FROM new_q n FULL OUTER JOIN old_q o ON o.product_id = n.product_id
  LOOP
    IF r.delta <> 0 THEN
      UPDATE public.products
      SET stock = greatest(0, stock - r.delta), updated_at = now()
      WHERE id = r.product_id;
    END IF;
  END LOOP;

  DELETE FROM public.order_items WHERE order_id = _order_id;
  INSERT INTO public.order_items (order_id, product_id, product_slug, product_name, unit_price, qty)
  SELECT _order_id,
         nullif(i->>'product_id', '')::uuid,
         i->>'product_slug',
         i->>'product_name',
         (i->>'unit_price')::numeric,
         (i->>'qty')::int
  FROM jsonb_array_elements(_items) i;

  SELECT round(sum(unit_price * qty), 2) INTO _subtotal FROM public.order_items WHERE order_id = _order_id;
  _total := round(_subtotal + coalesce(_shipping, 0) - coalesce(_discount, 0), 2);

  UPDATE public.orders
  SET subtotal = _subtotal,
      shipping = coalesce(_shipping, 0),
      discount = coalesce(_discount, 0),
      total = _total,
      updated_at = now()
  WHERE id = _order_id;

  RETURN jsonb_build_object('reference', _ref, 'subtotal', _subtotal, 'total', _total);
END;
$$;

REVOKE ALL ON FUNCTION public.replace_pending_order_items(uuid, jsonb, numeric, numeric) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.replace_pending_order_items(uuid, jsonb, numeric, numeric) TO service_role;