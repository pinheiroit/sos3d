CREATE TABLE public.subcategories (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category_slug text NOT NULL,
  slug text NOT NULL,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (category_slug, slug)
);

GRANT SELECT ON public.subcategories TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.subcategories TO authenticated;
GRANT ALL ON public.subcategories TO service_role;

ALTER TABLE public.subcategories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon reads active subcategories" ON public.subcategories
  FOR SELECT TO anon USING (active);

CREATE POLICY "authenticated reads subcategories" ON public.subcategories
  FOR SELECT TO authenticated USING (active OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "admins manage subcategories" ON public.subcategories
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER set_subcategories_updated_at
  BEFORE UPDATE ON public.subcategories
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX subcategories_category_slug_idx ON public.subcategories (category_slug);

ALTER TABLE public.products ADD COLUMN IF NOT EXISTS subcategory text NOT NULL DEFAULT '';
CREATE INDEX IF NOT EXISTS products_subcategory_idx ON public.products (subcategory);