CREATE TABLE public.membership_printer_models (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  printer_model_id uuid not null references public.printer_models(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, printer_model_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.membership_printer_models TO authenticated;
GRANT ALL ON public.membership_printer_models TO service_role;

ALTER TABLE public.membership_printer_models ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins manage member printer models" ON public.membership_printer_models
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "members read own printer models" ON public.membership_printer_models
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

INSERT INTO public.membership_printer_models (user_id, printer_model_id)
SELECT user_id, printer_model_id FROM public.memberships
WHERE printer_model_id IS NOT NULL
ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION public.member_has_printer_model(_user_id uuid, _model_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT exists (
    SELECT 1 FROM public.membership_printer_models mpm
    WHERE mpm.user_id = _user_id AND mpm.printer_model_id = _model_id
  );
$$;

REVOKE EXECUTE ON FUNCTION public.member_has_printer_model(uuid, uuid) FROM anon;

DROP POLICY IF EXISTS "members read courses" ON public.courses;
CREATE POLICY "members read courses" ON public.courses
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR (published AND public.is_active_member(auth.uid()) AND printer_model_id IS NOT NULL
        AND public.member_has_printer_model(auth.uid(), printer_model_id))
  );

DROP POLICY IF EXISTS "members read lessons" ON public.lessons;
CREATE POLICY "members read lessons" ON public.lessons
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR (public.is_active_member(auth.uid()) AND EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = lessons.course_id AND c.published AND c.printer_model_id IS NOT NULL
        AND public.member_has_printer_model(auth.uid(), c.printer_model_id)
    ))
  );