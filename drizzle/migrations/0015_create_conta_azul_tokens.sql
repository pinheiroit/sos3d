CREATE TABLE public.conta_azul_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  access_token text NOT NULL,
  refresh_token text NOT NULL,
  expires_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
REVOKE ALL ON TABLE public.conta_azul_tokens FROM anon, authenticated;
GRANT ALL ON TABLE public.conta_azul_tokens TO service_role;
ALTER TABLE public.conta_azul_tokens ENABLE ROW LEVEL SECURITY;
CREATE UNIQUE INDEX conta_azul_tokens_single_account ON public.conta_azul_tokens ((true));
COMMENT ON TABLE public.conta_azul_tokens IS 'Private OAuth credentials for the workspace-owned Conta Azul account; server-only after administrator verification.';