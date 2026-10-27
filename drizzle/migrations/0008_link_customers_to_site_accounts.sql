ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS user_id uuid;
CREATE UNIQUE INDEX IF NOT EXISTS customers_user_id_key ON public.customers (user_id) WHERE user_id IS NOT NULL;

-- Vincula fichas de televendas já existentes às contas do site com o mesmo e-mail
UPDATE public.customers c
SET user_id = p.id
FROM public.profiles p
WHERE c.user_id IS NULL
  AND coalesce(c.email, '') <> ''
  AND lower(trim(c.email)) = lower(trim(p.email))
  AND NOT EXISTS (SELECT 1 FROM public.customers c2 WHERE c2.user_id = p.id)
  AND c.id = (
    SELECT c3.id FROM public.customers c3
    WHERE lower(trim(c3.email)) = lower(trim(p.email))
    ORDER BY c3.updated_at DESC LIMIT 1
  );