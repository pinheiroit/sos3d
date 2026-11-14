CREATE TABLE public.conta_azul_links (
  kind text NOT NULL CHECK (kind IN ('customer','product')),
  local_key text NOT NULL,
  external_id text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (kind, local_key)
);
CREATE TABLE public.conta_azul_order_sync (
  order_id uuid PRIMARY KEY,
  status text NOT NULL CHECK (status IN ('enviando','enviado','erro')),
  external_id text,
  external_number bigint,
  situacao text,
  error text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
REVOKE ALL ON public.conta_azul_links, public.conta_azul_order_sync FROM anon, authenticated;
GRANT ALL ON public.conta_azul_links, public.conta_azul_order_sync TO service_role;
ALTER TABLE public.conta_azul_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conta_azul_order_sync ENABLE ROW LEVEL SECURITY;