CREATE TABLE public.cart_sessions (
  id uuid PRIMARY KEY,
  user_id uuid,
  customer_name text NOT NULL DEFAULT '',
  customer_email text NOT NULL DEFAULT '',
  customer_phone text NOT NULL DEFAULT '',
  entry_page text NOT NULL DEFAULT '',
  referrer text NOT NULL DEFAULT '',
  utm_source text NOT NULL DEFAULT '',
  utm_medium text NOT NULL DEFAULT '',
  utm_campaign text NOT NULL DEFAULT '',
  last_page text NOT NULL DEFAULT '',
  device text NOT NULL DEFAULT '',
  reached_checkout boolean NOT NULL DEFAULT false,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  item_count integer NOT NULL DEFAULT 0,
  subtotal numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'aberto' CHECK (status IN ('aberto', 'convertido')),
  order_reference text,
  converted_at timestamptz,
  contacted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX cart_sessions_updated_idx ON public.cart_sessions (updated_at DESC);
CREATE INDEX cart_sessions_status_idx ON public.cart_sessions (status);

GRANT ALL ON public.cart_sessions TO service_role;
ALTER TABLE public.cart_sessions ENABLE ROW LEVEL SECURITY;