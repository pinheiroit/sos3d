-- ROLES ------------------------------------------------------------------
CREATE TYPE public.app_role AS ENUM ('admin', 'member');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "users read own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- ADMIN ALLOWLIST ---------------------------------------------------------
CREATE TABLE public.admin_allowlist (
  email text PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.admin_allowlist TO authenticated;
GRANT ALL ON public.admin_allowlist TO service_role;
ALTER TABLE public.admin_allowlist ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins read allowlist" ON public.admin_allowlist
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- PROFILES ----------------------------------------------------------------
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  full_name text,
  phone text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read own profile" ON public.profiles
  FOR SELECT TO authenticated USING (id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, phone)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'phone')
  ON CONFLICT (id) DO NOTHING;

  IF NEW.email_confirmed_at IS NOT NULL
     AND EXISTS (SELECT 1 FROM public.admin_allowlist a WHERE lower(a.email) = lower(NEW.email)) THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.grant_admin_on_confirm()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.email_confirmed_at IS NOT NULL
     AND EXISTS (SELECT 1 FROM public.admin_allowlist a WHERE lower(a.email) = lower(NEW.email)) THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_confirmed
AFTER UPDATE OF email_confirmed_at ON auth.users FOR EACH ROW
WHEN (OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL)
EXECUTE FUNCTION public.grant_admin_on_confirm();

-- UPDATED AT --------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- PRODUCTS ----------------------------------------------------------------
CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  brand text NOT NULL DEFAULT 'SOS.3D',
  category text NOT NULL DEFAULT 'acessorios',
  subtitle text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  price numeric(12,2) NOT NULL DEFAULT 0,
  old_price numeric(12,2),
  image_key text NOT NULL DEFAULT 'printer-1',
  image_url text,
  badge text,
  stock integer NOT NULL DEFAULT 0,
  use_cases text[] NOT NULL DEFAULT '{}',
  specs jsonb NOT NULL DEFAULT '[]'::jsonb,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.products TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public reads active products" ON public.products
  FOR SELECT TO anon, authenticated USING (active OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins manage products" ON public.products
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER products_updated_at BEFORE UPDATE ON public.products
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ORDERS ------------------------------------------------------------------
CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference text NOT NULL UNIQUE DEFAULT ('SOS-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  customer_name text NOT NULL,
  customer_email text NOT NULL,
  customer_phone text,
  customer_document text,
  shipping_address jsonb NOT NULL DEFAULT '{}'::jsonb,
  payment_method text NOT NULL DEFAULT 'pix',
  subtotal numeric(12,2) NOT NULL DEFAULT 0,
  shipping numeric(12,2) NOT NULL DEFAULT 0,
  discount numeric(12,2) NOT NULL DEFAULT 0,
  total numeric(12,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'novo',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read own or admin orders" ON public.orders
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins update orders" ON public.orders
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER orders_updated_at BEFORE UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  product_slug text NOT NULL,
  product_name text NOT NULL,
  unit_price numeric(12,2) NOT NULL,
  qty integer NOT NULL CHECK (qty > 0),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX order_items_order_id_idx ON public.order_items(order_id);
GRANT SELECT ON public.order_items TO authenticated;
GRANT ALL ON public.order_items TO service_role;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read own or admin order items" ON public.order_items
  FOR SELECT TO authenticated USING (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.user_id = auth.uid())
  );

-- MEMBERSHIPS -------------------------------------------------------------
CREATE TABLE public.memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  active boolean NOT NULL DEFAULT true,
  printer_model text,
  notes text,
  granted_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.memberships TO authenticated;
GRANT ALL ON public.memberships TO service_role;
ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read own membership" ON public.memberships
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins manage memberships" ON public.memberships
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER memberships_updated_at BEFORE UPDATE ON public.memberships
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.is_active_member(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.memberships WHERE user_id = _user_id AND active)
$$;

-- COURSES -----------------------------------------------------------------
CREATE TABLE public.courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  level text NOT NULL DEFAULT 'Iniciante',
  cover_key text NOT NULL DEFAULT 'printer-1',
  published boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.courses TO authenticated;
GRANT ALL ON public.courses TO service_role;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read courses" ON public.courses
  FOR SELECT TO authenticated USING (
    (published AND public.is_active_member(auth.uid())) OR public.has_role(auth.uid(), 'admin')
  );
CREATE POLICY "admins manage courses" ON public.courses
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER courses_updated_at BEFORE UPDATE ON public.courses
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.lessons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  video_url text,
  resource_url text,
  duration_min integer NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX lessons_course_id_idx ON public.lessons(course_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lessons TO authenticated;
GRANT ALL ON public.lessons TO service_role;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read lessons" ON public.lessons
  FOR SELECT TO authenticated USING (
    public.has_role(auth.uid(), 'admin')
    OR (public.is_active_member(auth.uid())
        AND EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_id AND c.published))
  );
CREATE POLICY "admins manage lessons" ON public.lessons
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER lessons_updated_at BEFORE UPDATE ON public.lessons
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- SEED PRODUCTS -----------------------------------------------------------
INSERT INTO public.products (slug, name, brand, category, subtitle, description, price, old_price, image_key, badge, stock, use_cases, specs) VALUES
('bambu-lab-p1s-combo','Bambu Lab P1S Combo','Bambu Lab','impressoras','CoreXY fechada com sistema multicor de 4 filamentos.','Impressora CoreXY fechada, indicada para quem precisa de velocidade com repetibilidade. Câmara fechada permite trabalhar com ABS, ASA e materiais técnicos, e o sistema multicor amplia acabamento e apresentação de protótipos.',8990,9790,'printer-1','Mais vendida',6,ARRAY['Prototipagem','Pequenas séries','Escritório'],'[{"label":"Volume de construção","value":"256 × 256 × 256 mm"},{"label":"Velocidade máxima","value":"500 mm/s"},{"label":"Bico","value":"Hotend 300 °C, bico endurecido"},{"label":"Materiais","value":"PLA, PETG, ABS, ASA, TPU, PA-CF"},{"label":"Conectividade","value":"Wi-Fi, LAN e cartão microSD"}]'::jsonb),
('bambu-lab-a1-mini','Bambu Lab A1 mini','Bambu Lab','impressoras','Compacta, silenciosa e pronta para começar em minutos.','Modelo compacto e de operação simples, ideal para laboratórios de ensino, makers iniciantes e escritórios de design que precisam de validação rápida de forma.',3290,NULL,'printer-2','Entrada',12,ARRAY['Educação','Makers','Personalização'],'[{"label":"Volume de construção","value":"180 × 180 × 180 mm"},{"label":"Nivelamento","value":"Automático total"},{"label":"Materiais","value":"PLA, PETG, TPU"},{"label":"Ruído","value":"48 dB em modo silencioso"},{"label":"Consumo","value":"150 W médio"}]'::jsonb),
('snapmaker-artisan','Snapmaker Artisan 3 em 1','Snapmaker','impressoras','Impressão 3D, corte a laser e usinagem CNC na mesma base.','Plataforma modular que combina manufatura aditiva, laser e CNC. Indicada para laboratórios e empresas que precisam de mais de um processo sem multiplicar equipamentos e espaço.',24900,NULL,'printer-3','Multifuncional',3,ARRAY['Fab Lab','Engenharia','Comunicação visual'],'[{"label":"Volume de impressão","value":"400 × 400 × 400 mm"},{"label":"Laser","value":"Módulo 40 W com exaustão"},{"label":"CNC","value":"Spindle 200 W, 18.000 rpm"},{"label":"Extrusão","value":"Dupla, direct drive"},{"label":"Estrutura","value":"Perfis de alumínio com gabinete"}]'::jsonb),
('masterprint-industrial-x','Masterprint Industrial X','Masterprint','impressoras','Câmara aquecida para produção contínua de peças técnicas.','Equipamento de porte industrial para operação contínua, com câmara aquecida e monitoramento remoto. Projetado para gabaritos, dispositivos de linha e peças funcionais em materiais de engenharia.',68900,NULL,'printer-3',NULL,2,ARRAY['Indústria','Peças de reposição','Gabaritos'],'[{"label":"Volume de construção","value":"400 × 400 × 500 mm"},{"label":"Câmara","value":"Aquecida até 90 °C"},{"label":"Materiais","value":"PA, PC, ABS, ASA, PA-CF, PEI"},{"label":"Monitoramento","value":"Câmera interna e fila remota"},{"label":"Garantia","value":"12 meses com suporte técnico"}]'::jsonb),
('voolt-3d-pla-premium','Filamento PLA Premium 1 kg','Voolt 3D','filamentos','Acabamento uniforme e tolerância de ±0,02 mm.','PLA de alta consistência para quem precisa de repetibilidade em série. Baixo empenamento, boa aderência e cores estáveis entre lotes.',129,149,'filament-1','Top de linha',240,ARRAY['Protótipos','Educação','Peças decorativas'],'[{"label":"Diâmetro","value":"1,75 mm (±0,02 mm)"},{"label":"Peso líquido","value":"1 kg"},{"label":"Temperatura de bico","value":"195–215 °C"},{"label":"Mesa","value":"50–60 °C"},{"label":"Embalagem","value":"Selada a vácuo com sílica"}]'::jsonb),
('voolt-3d-petg','Filamento PETG 1 kg','Voolt 3D','filamentos','Resistência mecânica e química para peças funcionais.','PETG com boa resistência ao impacto e à umidade, indicado para suportes, organizadores e componentes expostos a variações de temperatura.',159,NULL,'filament-2',NULL,180,ARRAY['Peças funcionais','Suportes','Uso externo'],'[{"label":"Diâmetro","value":"1,75 mm (±0,03 mm)"},{"label":"Peso líquido","value":"1 kg"},{"label":"Temperatura de bico","value":"230–250 °C"},{"label":"Mesa","value":"70–85 °C"},{"label":"Secagem","value":"Recomendada antes do uso"}]'::jsonb),
('masterprint-nylon-cf','Nylon com fibra de carbono 1 kg','Masterprint','filamentos','Rigidez e estabilidade dimensional para engenharia.','Composto de poliamida reforçada com fibra de carbono, para peças que exigem rigidez, baixo desgaste e estabilidade dimensional. Requer bico endurecido.',429,NULL,'filament-3','Técnico',45,ARRAY['Gabaritos','Indústria','Manutenção'],'[{"label":"Diâmetro","value":"1,75 mm (±0,03 mm)"},{"label":"Peso líquido","value":"1 kg"},{"label":"Temperatura de bico","value":"260–290 °C"},{"label":"Bico","value":"Endurecido obrigatório"},{"label":"Secagem","value":"70 °C por 6 h antes do uso"}]'::jsonb),
('kit-bicos-endurecidos','Kit de bicos endurecidos 0,4 / 0,6 / 0,8','SOS.3D','acessorios','Para materiais abrasivos e trocas rápidas de perfil.','Conjunto de bicos em aço endurecido para trabalhar com compostos de fibra de carbono, vidro e madeira sem desgaste prematuro.',289,NULL,'printer-2',NULL,60,ARRAY['Manutenção','Materiais abrasivos'],'[{"label":"Diâmetros","value":"0,4 / 0,6 / 0,8 mm"},{"label":"Material","value":"Aço endurecido"},{"label":"Compatibilidade","value":"Hotends padrão MK e Bambu"},{"label":"Conteúdo","value":"3 bicos + chave"}]'::jsonb),
('secadora-filamento','Secadora de filamento dupla','SOS.3D','acessorios','Controle de umidade para PETG, nylon e TPU.','Mantém dois carretéis secos durante a impressão, evitando bolhas, falhas de extrusão e perda de acabamento em materiais higroscópicos.',899,NULL,'filament-3',NULL,25,ARRAY['Produção contínua','Materiais técnicos'],'[{"label":"Capacidade","value":"2 carretéis de 1 kg"},{"label":"Temperatura","value":"35–70 °C"},{"label":"Timer","value":"Até 48 h"},{"label":"Uso","value":"Pode imprimir com o material dentro"}]'::jsonb);

-- SEED COURSES ------------------------------------------------------------
INSERT INTO public.courses (slug, title, description, level, cover_key, sort_order) VALUES
('primeiros-passos','Primeiros passos com sua impressora 3D','Instalação, nivelamento, primeiro print e cuidados iniciais para tirar o máximo do equipamento.','Iniciante','printer-2',1),
('materiais-e-perfis','Materiais e perfis de impressão','PLA, PETG, ABS, ASA e compostos técnicos: temperaturas, secagem e quando usar cada material.','Intermediário','filament-1',2),
('manutencao-preventiva','Manutenção preventiva e diagnóstico','Rotina de manutenção, troca de bicos, calibração e solução dos defeitos mais comuns.','Avançado','printer-3',3);

INSERT INTO public.lessons (course_id, title, description, duration_min, sort_order)
SELECT c.id, l.title, l.description, l.duration, l.ord
FROM public.courses c
JOIN (VALUES
  ('primeiros-passos','Desembalando e instalando','Checklist de instalação, bancada, energia e ventilação.',12,1),
  ('primeiros-passos','Nivelamento e primeira impressão','Como garantir a primeira camada perfeita.',18,2),
  ('primeiros-passos','Slicer: perfis essenciais','Configurações que mais impactam qualidade e tempo.',22,3),
  ('materiais-e-perfis','Escolhendo o material certo','Comparativo prático entre PLA, PETG, ABS e ASA.',16,1),
  ('materiais-e-perfis','Secagem e armazenamento','Como evitar bolhas e falhas de extrusão.',14,2),
  ('manutencao-preventiva','Rotina semanal de manutenção','Limpeza, lubrificação e verificação de correias.',20,1),
  ('manutencao-preventiva','Diagnóstico de defeitos','Warping, stringing, under-extrusion e camadas deslocadas.',25,2)
) AS l(course_slug, title, description, duration, ord) ON l.course_slug = c.slug;