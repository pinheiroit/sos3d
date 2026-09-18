-- 1. Vínculo N:N entre cursos e modelos de impressora
CREATE TABLE IF NOT EXISTS public.course_printer_models (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  printer_model_id uuid NOT NULL REFERENCES public.printer_models(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (course_id, printer_model_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.course_printer_models TO authenticated;
GRANT ALL ON public.course_printer_models TO service_role;

ALTER TABLE public.course_printer_models ENABLE ROW LEVEL SECURITY;

-- 2. Backfill a partir do vínculo único atual
INSERT INTO public.course_printer_models (course_id, printer_model_id)
SELECT id, printer_model_id FROM public.courses WHERE printer_model_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- 3. Origem do modelo no catálogo de produtos
ALTER TABLE public.printer_models
  ADD COLUMN IF NOT EXISTS product_id uuid REFERENCES public.products(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS printer_models_product_id_key
  ON public.printer_models(product_id) WHERE product_id IS NOT NULL;

-- 4. Helper de visibilidade do curso para membros
CREATE OR REPLACE FUNCTION public.member_can_view_course(_user_id uuid, _course_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.course_printer_models cpm
    WHERE cpm.course_id = _course_id
      AND public.member_has_printer_model(_user_id, cpm.printer_model_id)
  )
$$;

REVOKE EXECUTE ON FUNCTION public.member_can_view_course(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.member_can_view_course(uuid, uuid) TO authenticated, service_role;

-- 5. Políticas usando o novo vínculo
DROP POLICY IF EXISTS "members read courses" ON public.courses;
CREATE POLICY "members read courses" ON public.courses
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR (published AND public.is_active_member(auth.uid())
        AND public.member_can_view_course(auth.uid(), id))
  );

DROP POLICY IF EXISTS "members read lessons" ON public.lessons;
CREATE POLICY "members read lessons" ON public.lessons
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR (public.is_active_member(auth.uid()) AND EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = lessons.course_id AND c.published
        AND public.member_can_view_course(auth.uid(), c.id)
    ))
  );

CREATE POLICY "admins manage course printer models" ON public.course_printer_models
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "members read course printer models" ON public.course_printer_models
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.member_has_printer_model(auth.uid(), printer_model_id)
  );
