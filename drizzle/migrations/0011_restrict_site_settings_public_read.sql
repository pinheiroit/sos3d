DROP POLICY IF EXISTS "anyone reads site settings" ON public.site_settings;
CREATE POLICY "anyone reads public site settings" ON public.site_settings
  FOR SELECT TO anon, authenticated
  USING (key IN ('footer', 'pricing'));
CREATE POLICY "admins read all site settings" ON public.site_settings
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));