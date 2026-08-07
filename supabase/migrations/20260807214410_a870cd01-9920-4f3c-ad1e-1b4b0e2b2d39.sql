CREATE TABLE public.site_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.site_settings TO anon;
GRANT SELECT ON public.site_settings TO authenticated;
GRANT ALL ON public.site_settings TO service_role;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone reads site settings" ON public.site_settings FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admins manage site settings" ON public.site_settings FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER site_settings_updated_at BEFORE UPDATE ON public.site_settings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.partner_brands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  logo_url text,
  website_url text,
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.partner_brands TO anon;
GRANT SELECT ON public.partner_brands TO authenticated;
GRANT ALL ON public.partner_brands TO service_role;
ALTER TABLE public.partner_brands ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone reads active partner brands" ON public.partner_brands FOR SELECT TO anon USING (active);
CREATE POLICY "authenticated reads partner brands" ON public.partner_brands FOR SELECT TO authenticated USING (active OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "admins manage partner brands" ON public.partner_brands FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER partner_brands_updated_at BEFORE UPDATE ON public.partner_brands FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.partner_brands (name, sort_order) VALUES
  ('Bambu Lab', 1), ('Snapmaker', 2), ('Masterprint', 3), ('Voolt 3D', 4);

INSERT INTO public.site_settings (key, value) VALUES ('footer', '{
  "tagline": "Da ideia à peça pronta. Equipamentos de manufatura aditiva, soluções a laser, materiais e suporte técnico para empresas, escolas, profissionais e makers.",
  "phone": "(68) 9 9948-4082",
  "email": "contato@sos3d.com.br",
  "address": "Impressoras a pronta entrega em Rio Branco/AC",
  "legal": "Marcas de terceiros exibidas conforme os guias oficiais de cada fornecedor.",
  "copyright": "SOS.3D — Tecnologia em manufatura aditiva, laser e design.",
  "columns": [
    {"title": "Produtos", "links": [
      {"to": "/impressoras", "label": "Impressoras 3D"},
      {"to": "/filamentos", "label": "Filamentos e insumos"},
      {"to": "/loja", "label": "Peças e acessórios"},
      {"to": "/loja", "label": "Ver loja completa"}]},
    {"title": "Serviços", "links": [
      {"to": "/impressao-3d", "label": "Impressão sob demanda"},
      {"to": "/impressao-3d", "label": "Projetos e engenharia"},
      {"to": "/suporte", "label": "Implantação e treinamento"},
      {"to": "/suporte", "label": "Manutenção"}]},
    {"title": "Institucional", "links": [
      {"to": "/empresa", "label": "Quem somos"},
      {"to": "/makers", "label": "Área Maker"},
      {"to": "/suporte", "label": "Central de suporte"},
      {"to": "/contato", "label": "Contato"}]}
  ]
}'::jsonb);