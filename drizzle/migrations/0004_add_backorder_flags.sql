ALTER TABLE public.products ADD COLUMN IF NOT EXISTS backorder boolean NOT NULL DEFAULT false;
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS backorder boolean NOT NULL DEFAULT false;
ALTER TABLE public.subcategories ADD COLUMN IF NOT EXISTS backorder boolean NOT NULL DEFAULT false;