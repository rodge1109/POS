-- Fix the image column length for products and combos to support Base64 strings
ALTER TABLE public.products ALTER COLUMN image TYPE TEXT;
ALTER TABLE public.combos ALTER COLUMN image TYPE TEXT;
