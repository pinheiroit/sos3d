CREATE TABLE public.supplier_product_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_document text NOT NULL,
  supplier_name text NOT NULL DEFAULT '',
  supplier_code text NOT NULL,
  ean text,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (supplier_document, supplier_code)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.supplier_product_links TO authenticated;
GRANT ALL ON public.supplier_product_links TO service_role;
ALTER TABLE public.supplier_product_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins manage supplier product links" ON public.supplier_product_links
FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE INDEX supplier_product_links_ean_idx ON public.supplier_product_links (ean) WHERE ean IS NOT NULL;

CREATE TABLE public.stock_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  access_key text NOT NULL UNIQUE,
  invoice_number text NOT NULL,
  invoice_series text NOT NULL DEFAULT '',
  issued_at timestamptz,
  supplier_document text NOT NULL,
  supplier_name text NOT NULL,
  total_amount numeric NOT NULL DEFAULT 0,
  item_count integer NOT NULL DEFAULT 0,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.stock_entries TO authenticated;
GRANT ALL ON public.stock_entries TO service_role;
ALTER TABLE public.stock_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins read stock entries" ON public.stock_entries
FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "admins insert stock entries" ON public.stock_entries
FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE TABLE public.stock_entry_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id uuid NOT NULL REFERENCES public.stock_entries(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  supplier_code text NOT NULL,
  ean text,
  description text NOT NULL,
  quantity numeric NOT NULL,
  unit_cost numeric NOT NULL DEFAULT 0,
  total_cost numeric NOT NULL DEFAULT 0,
  previous_stock integer,
  resulting_stock integer,
  action text NOT NULL CHECK (action IN ('linked', 'created', 'ignored')),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.stock_entry_items TO authenticated;
GRANT ALL ON public.stock_entry_items TO service_role;
ALTER TABLE public.stock_entry_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins read stock entry items" ON public.stock_entry_items
FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "admins insert stock entry items" ON public.stock_entry_items
FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE INDEX stock_entry_items_entry_idx ON public.stock_entry_items (entry_id);

CREATE TRIGGER supplier_product_links_updated_at
BEFORE UPDATE ON public.supplier_product_links
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.process_nfe_stock_entry(_invoice jsonb, _items jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_entry_id uuid;
  v_item jsonb;
  v_product_id uuid;
  v_previous integer;
  v_quantity integer;
  v_action text;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Acesso restrito a administradores.';
  END IF;
  IF COALESCE(_invoice->>'accessKey', '') = '' THEN RAISE EXCEPTION 'Chave da NF-e inválida.'; END IF;
  IF jsonb_typeof(_items) <> 'array' OR jsonb_array_length(_items) = 0 THEN RAISE EXCEPTION 'Nenhum item informado.'; END IF;

  INSERT INTO public.stock_entries (
    access_key, invoice_number, invoice_series, issued_at, supplier_document,
    supplier_name, total_amount, item_count, created_by
  ) VALUES (
    _invoice->>'accessKey', _invoice->>'number', COALESCE(_invoice->>'series', ''),
    NULLIF(_invoice->>'issuedAt', '')::timestamptz, _invoice->>'supplierDocument',
    _invoice->>'supplierName', COALESCE((_invoice->>'totalAmount')::numeric, 0),
    jsonb_array_length(_items), auth.uid()
  ) RETURNING id INTO v_entry_id;

  FOR v_item IN SELECT value FROM jsonb_array_elements(_items)
  LOOP
    v_action := v_item->>'action';
    IF v_action NOT IN ('linked', 'created', 'ignored') THEN RAISE EXCEPTION 'Ação de item inválida.'; END IF;
    v_product_id := NULL;
    v_previous := NULL;
    v_quantity := GREATEST(0, round(COALESCE((v_item->>'quantity')::numeric, 0))::integer);

    IF v_action = 'linked' THEN
      v_product_id := (v_item->>'productId')::uuid;
      SELECT stock INTO v_previous FROM public.products WHERE id = v_product_id FOR UPDATE;
      IF NOT FOUND THEN RAISE EXCEPTION 'Produto vinculado não encontrado.'; END IF;
    ELSIF v_action = 'created' THEN
      INSERT INTO public.products (
        slug, name, brand, category, subcategory, subtitle, description,
        price, stock, active, image_key, use_cases, specs, installments
      ) VALUES (
        v_item->'newProduct'->>'slug', v_item->'newProduct'->>'name',
        COALESCE(NULLIF(v_item->'newProduct'->>'brand', ''), 'SOS.3D'),
        v_item->'newProduct'->>'category', COALESCE(v_item->'newProduct'->>'subcategory', ''),
        '', COALESCE(v_item->>'description', ''),
        COALESCE((v_item->'newProduct'->>'price')::numeric, 0), 0, true,
        'printer-1', ARRAY[]::text[], '[]'::jsonb, '[]'::jsonb
      ) RETURNING id, stock INTO v_product_id, v_previous;
    END IF;

    IF v_product_id IS NOT NULL THEN
      UPDATE public.products SET stock = stock + v_quantity, updated_at = now() WHERE id = v_product_id;
      INSERT INTO public.supplier_product_links (
        supplier_document, supplier_name, supplier_code, ean, product_id
      ) VALUES (
        _invoice->>'supplierDocument', _invoice->>'supplierName', v_item->>'supplierCode',
        NULLIF(v_item->>'ean', ''), v_product_id
      ) ON CONFLICT (supplier_document, supplier_code) DO UPDATE SET
        supplier_name = EXCLUDED.supplier_name,
        ean = COALESCE(EXCLUDED.ean, supplier_product_links.ean),
        product_id = EXCLUDED.product_id,
        updated_at = now();
    END IF;

    INSERT INTO public.stock_entry_items (
      entry_id, product_id, supplier_code, ean, description, quantity,
      unit_cost, total_cost, previous_stock, resulting_stock, action
    ) VALUES (
      v_entry_id, v_product_id, v_item->>'supplierCode', NULLIF(v_item->>'ean', ''),
      v_item->>'description', COALESCE((v_item->>'quantity')::numeric, 0),
      COALESCE((v_item->>'unitCost')::numeric, 0), COALESCE((v_item->>'totalCost')::numeric, 0),
      v_previous, CASE WHEN v_previous IS NULL THEN NULL ELSE v_previous + v_quantity END, v_action
    );
  END LOOP;

  RETURN v_entry_id;
EXCEPTION WHEN unique_violation THEN
  RAISE EXCEPTION 'Esta NF-e já foi processada.';
END;
$$;
REVOKE ALL ON FUNCTION public.process_nfe_stock_entry(jsonb, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.process_nfe_stock_entry(jsonb, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_nfe_stock_entry(jsonb, jsonb) TO service_role;