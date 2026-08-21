CREATE TABLE public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.categories TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.categories TO authenticated;
GRANT ALL ON public.categories TO service_role;

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon reads active categories" ON public.categories
  FOR SELECT TO anon USING (active);

CREATE POLICY "authenticated reads categories" ON public.categories
  FOR SELECT TO authenticated USING (active OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "admins manage categories" ON public.categories
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER categories_updated_at BEFORE UPDATE ON public.categories
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.categories (slug, name, description, sort_order) VALUES
  ('impressoras', 'Impressoras 3D', 'Equipamentos FDM e resina para produção e prototipagem', 1),
  ('filamentos', 'Filamentos e insumos', 'PLA, PETG, ABS, resinas e materiais técnicos', 2),
  ('acessorios', 'Peças e acessórios', 'Bicos, hotends, correias, kits de manutenção e upgrades', 3);