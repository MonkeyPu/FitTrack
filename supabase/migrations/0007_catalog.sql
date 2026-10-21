-- Phase 7: supermarket catalog stored in our own database (replaces the Open Food Facts lookup).
-- Products are loaded by scripts/import_catalog.py with the service key. Signed-in users can only read.
-- One row per store and store product id, so more stores can be added later without changes here.

create table public.catalog_products (
  id uuid primary key default gen_random_uuid(),
  store text not null,                 -- e.g. 'mercadona'; must match STORES in lib/catalog.ts
  product_id text not null,            -- the store's own product id
  ean text,                            -- barcode, when known
  name text not null,
  brand text,
  category text,
  subcategory text,
  packaging text,
  price numeric(10, 2),
  pack_size numeric,                   -- pack size as the store writes it (5 for "5 l")
  pack_unit text,                      -- l, kg, ud...
  unit text not null default 'g' check (unit in ('g', 'ml')),  -- what the nutrition values are "per 100" of
  pack_amount numeric,                 -- whole pack in g or ml, when it can be worked out
  kcal numeric, protein numeric, carbs numeric, sugar numeric, fat numeric,
  sat_fat numeric, fiber numeric, salt numeric,                -- all per 100 g or 100 ml
  image_url text,
  product_url text,
  search_text text not null default '',  -- filled by the trigger below: lower case, no accents, words start after a space
  updated_at timestamptz not null default now(),
  unique (store, product_id)
);
create index catalog_products_ean_idx on public.catalog_products (ean);

create or replace function public.catalog_set_search() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.search_text := ' ' || regexp_replace(
    translate(lower(coalesce(new.name, '') || ' ' || coalesce(new.brand, '')),
      'áàäâãéèëêíìïîóòöôõúùüûñç', 'aaaaaeeeeiiiiooooouuuunc'),
    '[^a-z0-9]+', ' ', 'g');
  new.updated_at := now();
  return new;
end $$;
revoke execute on function public.catalog_set_search() from public, anon, authenticated;
create trigger catalog_set_search before insert or update on public.catalog_products
  for each row execute function public.catalog_set_search();

alter table public.catalog_products enable row level security;
create policy "catalog readable by signed-in users" on public.catalog_products
  for select to authenticated using (true);
revoke all on public.catalog_products from anon, authenticated;
grant select on public.catalog_products to authenticated;
