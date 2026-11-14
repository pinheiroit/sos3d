CREATE TABLE public.conta_azul_oauth_states (
  state_hash text PRIMARY KEY,
  user_id uuid NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
REVOKE ALL ON public.conta_azul_oauth_states FROM anon, authenticated;
GRANT ALL ON public.conta_azul_oauth_states TO service_role;
ALTER TABLE public.conta_azul_oauth_states ENABLE ROW LEVEL SECURITY;
CREATE INDEX conta_azul_oauth_states_user_idx ON public.conta_azul_oauth_states (user_id);