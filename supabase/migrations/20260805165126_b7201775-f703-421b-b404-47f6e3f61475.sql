CREATE TABLE public.site_images (
  key text PRIMARY KEY,
  url text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.site_images TO anon;
GRANT SELECT ON public.site_images TO authenticated;
GRANT ALL ON public.site_images TO service_role;
ALTER TABLE public.site_images ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone reads site images" ON public.site_images FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admins manage site images" ON public.site_images FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER site_images_updated_at BEFORE UPDATE ON public.site_images
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE POLICY "admins read site-images objects" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'site-images' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins upload site-images objects" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'site-images' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins update site-images objects" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'site-images' AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (bucket_id = 'site-images' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins delete site-images objects" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'site-images' AND public.has_role(auth.uid(), 'admin'));