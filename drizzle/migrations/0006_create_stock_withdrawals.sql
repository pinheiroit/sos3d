CREATE TABLE public.stock_withdrawals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  product_slug text NOT NULL DEFAULT '',
  product_name text NOT NULL DEFAULT '',
  kind text NOT NULL CHECK (kind IN ('consumo', 'avaria')),
  quantity integer NOT NULL CHECK (quantity > 0),
  reason text NOT NULL CHECK (length(btrim(reason)) >= 3),
  previous_stock integer NOT NULL,
  resulting_stock integer NOT NULL,
  created_by uuid,
  created_by_name text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX stock_withdrawals_created_at_idx ON public.stock_withdrawals (created_at DESC);
CREATE INDEX stock_withdrawals_product_idx ON public.stock_withdrawals (product_id);

GRANT ALL ON public.stock_withdrawals TO service_role;
ALTER TABLE public.stock_withdrawals ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.register_stock_withdrawal(
  _product_id uuid,
  _kind text,
  _quantity integer,
  _reason text,
  _actor uuid,
  _actor_name text
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _p record;
  _id uuid;
BEGIN
  IF _kind NOT IN ('consumo', 'avaria') THEN
    RAISE EXCEPTION 'Tipo de baixa inválido.';
  END IF;
  IF _quantity IS NULL OR _quantity <= 0 THEN
    RAISE EXCEPTION 'Informe uma quantidade maior que zero.';
  END IF;
  IF _reason IS NULL OR length(btrim(_reason)) < 3 THEN
    RAISE EXCEPTION 'Informe o motivo / destino da baixa.';
  END IF;

  SELECT id, slug, name, stock INTO _p FROM public.products WHERE id = _product_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Produto não encontrado.';
  END IF;
  IF _quantity > _p.stock THEN
    RAISE EXCEPTION 'Quantidade maior que o estoque atual (% un).', _p.stock;
  END IF;

  UPDATE public.products SET stock = _p.stock - _quantity, updated_at = now() WHERE id = _p.id;

  INSERT INTO public.stock_withdrawals
    (product_id, product_slug, product_name, kind, quantity, reason, previous_stock, resulting_stock, created_by, created_by_name)
  VALUES
    (_p.id, _p.slug, _p.name, _kind, _quantity, btrim(_reason), _p.stock, _p.stock - _quantity, _actor, coalesce(_actor_name, ''))
  RETURNING id INTO _id;

  RETURN _id;
END;
$$;

REVOKE ALL ON FUNCTION public.register_stock_withdrawal(uuid, text, integer, text, uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.register_stock_withdrawal(uuid, text, integer, text, uuid, text) TO service_role;