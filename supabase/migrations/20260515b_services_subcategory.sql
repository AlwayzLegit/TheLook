-- Subcategory groups services within a category. Used today by the
-- homepage Haircuts gallery to split Women's vs Men's into two
-- hero+grid sub-sections under one "Haircuts" header. Nullable:
-- services without a subcategory render in their category's default
-- group (the no-split path that every non-Haircuts section still
-- uses).
alter table public.services
  add column if not exists subcategory text;

-- Seed the existing haircut services so the home page picks up the
-- split immediately on deploy. Idempotent: only sets values that are
-- still null. Salon owner can flip these via /admin/services later.
--
-- Three subcategories the homepage groups today:
--   Unisex   — services that work for any gender (renders ABOVE the
--              gendered sub-sections so the broad services lead).
--   Women's  — typically long-hair / styled-hair services.
--   Men's    — short-hair / clipper / beard work.

update public.services
   set subcategory = 'Unisex'
 where category = 'Haircuts'
   and subcategory is null
   and name in ('Custom Scissor Cut', 'Professional Hair Wash (Add-On)');

update public.services
   set subcategory = 'Women''s'
 where category = 'Haircuts'
   and subcategory is null
   and (
     name ilike 'Precision Wash%'
     or name ilike 'Bangs Only%'
   );

update public.services
   set subcategory = 'Men''s'
 where category = 'Haircuts'
   and subcategory is null
   and (
     name ilike 'Classic Men''s%'
     or name ilike 'Faded Cut%'
     or name ilike 'Beard Trim%'
     or name ilike 'Basic Hairline%'
   );
