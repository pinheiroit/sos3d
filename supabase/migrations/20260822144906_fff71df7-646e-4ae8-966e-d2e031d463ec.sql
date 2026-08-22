CREATE TABLE public.printer_models (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.printer_models TO authenticated;
GRANT ALL ON public.printer_models TO service_role;

ALTER TABLE public.printer_models ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins manage printer models" ON public.printer_models
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "authenticated reads printer models" ON public.printer_models
  FOR SELECT TO authenticated
  USING (active OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER set_printer_models_updated_at
  BEFORE UPDATE ON public.printer_models
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.courses
  ADD COLUMN printer_model_id uuid REFERENCES public.printer_models(id) ON DELETE SET NULL;

ALTER TABLE public.memberships
  ADD COLUMN printer_model_id uuid REFERENCES public.printer_models(id) ON DELETE SET NULL;

CREATE INDEX idx_courses_printer_model ON public.courses(printer_model_id);
CREATE INDEX idx_memberships_printer_model ON public.memberships(printer_model_id);

CREATE OR REPLACE FUNCTION public.member_printer_model(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT printer_model_id FROM public.memberships
  WHERE user_id = _user_id AND active
  LIMIT 1
$$;

REVOKE EXECUTE ON FUNCTION public.member_printer_model(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.member_printer_model(uuid) TO authenticated, service_role;

DROP POLICY IF EXISTS "members read courses" ON public.courses;
CREATE POLICY "members read courses" ON public.courses
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR (
      published
      AND public.is_active_member(auth.uid())
      AND printer_model_id IS NOT NULL
      AND printer_model_id = public.member_printer_model(auth.uid())
    )
  );

DROP POLICY IF EXISTS "members read lessons" ON public.lessons;
CREATE POLICY "members read lessons" ON public.lessons
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR (
      public.is_active_member(auth.uid())
      AND EXISTS (
        SELECT 1 FROM public.courses c
        WHERE c.id = lessons.course_id
          AND c.published
          AND c.printer_model_id IS NOT NULL
          AND c.printer_model_id = public.member_printer_model(auth.uid())
      )
    )
  );