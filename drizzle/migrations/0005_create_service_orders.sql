CREATE SEQUENCE IF NOT EXISTS public.service_request_seq START 1;
CREATE SEQUENCE IF NOT EXISTS public.service_order_seq START 1;

CREATE TABLE public.equipment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  brand text NOT NULL DEFAULT '',
  model text NOT NULL DEFAULT '',
  serial text NOT NULL,
  purchase_date date,
  order_reference text NOT NULL DEFAULT '',
  invoice_number text NOT NULL DEFAULT '',
  invoice_date date,
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX equipment_serial_uniq ON public.equipment (lower(serial));
CREATE INDEX equipment_owner_idx ON public.equipment (owner_id);

CREATE TABLE public.equipment_ownership (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id uuid NOT NULL REFERENCES public.equipment(id) ON DELETE CASCADE,
  previous_owner_id uuid,
  new_owner_id uuid,
  requested_by uuid,
  proof text NOT NULL DEFAULT '',
  notes text NOT NULL DEFAULT '',
  transferred_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.service_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  number integer NOT NULL DEFAULT nextval('public.service_request_seq') UNIQUE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  equipment_id uuid NOT NULL REFERENCES public.equipment(id),
  failure_type text NOT NULL DEFAULT 'outro',
  problem text NOT NULL,
  started_when text NOT NULL DEFAULT '',
  frequency text NOT NULL DEFAULT '',
  error_code text NOT NULL DEFAULT '',
  steps_tried text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'recebida',
  staff_message text NOT NULL DEFAULT '',
  service_order_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.service_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  number integer NOT NULL DEFAULT nextval('public.service_order_seq') UNIQUE,
  request_id uuid REFERENCES public.service_requests(id),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  equipment_id uuid NOT NULL REFERENCES public.equipment(id),
  status text NOT NULL DEFAULT 'recebido',
  warranty_status text NOT NULL DEFAULT 'fora',
  budget_status text NOT NULL DEFAULT 'nao_aplica',
  reported jsonb NOT NULL DEFAULT '{}'::jsonb,
  reception jsonb NOT NULL DEFAULT '{}'::jsonb,
  diagnosis jsonb NOT NULL DEFAULT '{}'::jsonb,
  warranty jsonb NOT NULL DEFAULT '{}'::jsonb,
  private_term jsonb,
  budget jsonb NOT NULL DEFAULT '{}'::jsonb,
  execution jsonb NOT NULL DEFAULT '{}'::jsonb,
  validation jsonb NOT NULL DEFAULT '{}'::jsonb,
  closing jsonb NOT NULL DEFAULT '{}'::jsonb,
  received_at timestamptz NOT NULL DEFAULT now(),
  due_at timestamptz,
  closed_at timestamptz,
  received_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.service_requests ADD CONSTRAINT service_requests_order_fk FOREIGN KEY (service_order_id) REFERENCES public.service_orders(id);
CREATE INDEX service_orders_equipment_idx ON public.service_orders (equipment_id);
CREATE INDEX service_orders_user_idx ON public.service_orders (user_id);

CREATE TABLE public.service_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid REFERENCES public.service_requests(id) ON DELETE CASCADE,
  order_id uuid REFERENCES public.service_orders(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'nota',
  description text NOT NULL,
  field text,
  old_value text,
  new_value text,
  visible_to_client boolean NOT NULL DEFAULT false,
  actor_id uuid,
  actor_name text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX service_events_order_idx ON public.service_events (order_id, created_at);
CREATE INDEX service_events_request_idx ON public.service_events (request_id, created_at);

CREATE TABLE public.service_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid,
  equipment_id uuid REFERENCES public.equipment(id) ON DELETE CASCADE,
  request_id uuid REFERENCES public.service_requests(id) ON DELETE CASCADE,
  order_id uuid REFERENCES public.service_orders(id) ON DELETE CASCADE,
  stage text NOT NULL DEFAULT 'pre_atendimento',
  category text NOT NULL DEFAULT 'outro',
  path text NOT NULL,
  name text NOT NULL,
  mime text NOT NULL DEFAULT '',
  size integer NOT NULL DEFAULT 0,
  visible_to_client boolean NOT NULL DEFAULT true,
  locked boolean NOT NULL DEFAULT false,
  uploaded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Acesso somente pelo servidor (funções verificam dono/atendimento).
GRANT ALL ON public.equipment, public.equipment_ownership, public.service_requests, public.service_orders, public.service_events, public.service_files TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.service_request_seq, public.service_order_seq TO service_role;
ALTER TABLE public.equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment_ownership ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_files ENABLE ROW LEVEL SECURITY;