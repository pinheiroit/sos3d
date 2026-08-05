GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_active_member(uuid) TO authenticated;

DROP POLICY "public reads active products" ON public.products;
CREATE POLICY "anon reads active products" ON public.products
  FOR SELECT TO anon USING (active);
CREATE POLICY "authenticated reads products" ON public.products
  FOR SELECT TO authenticated USING (active OR public.has_role(auth.uid(), 'admin'));