CREATE TABLE public.nfe_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  environment text NOT NULL DEFAULT 'homologacao',
  status text NOT NULL DEFAULT 'pendente',
  numero integer,
  serie integer,
  chave text,
  protocolo text,
  recipient_name text NOT NULL DEFAULT '',
  recipient_document text NOT NULL DEFAULT '',
  total numeric NOT NULL DEFAULT 0,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  response jsonb NOT NULL DEFAULT '{}'::jsonb,
  xml_url text,
  danfe_url text,
  error_message text,
  cancel_reason text,
  cancel_protocol text,
  cancelled_at timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX nfe_documents_chave_key ON public.nfe_documents (chave) WHERE chave IS NOT NULL;
CREATE INDEX nfe_documents_created_at_idx ON public.nfe_documents (created_at DESC);

GRANT SELECT ON public.nfe_documents TO authenticated;
GRANT ALL ON public.nfe_documents TO service_role;

ALTER TABLE public.nfe_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view nfe documents"
ON public.nfe_documents FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE TRIGGER nfe_documents_updated_at
BEFORE UPDATE ON public.nfe_documents
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();