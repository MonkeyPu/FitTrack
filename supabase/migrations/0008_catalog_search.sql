-- Phase 8: smarter catalog search.
--  * the subcategory is searchable too ("Yogures naturales", "Aceite de oliva"), so a word the product name doesn't use can still find it
--    (the broader category isn't searched: "Aceite, vinagre y sal" would put every oil in a search for salt)
--  * search_catalog() takes groups of alternatives, so English words can match their Spanish names
--    (the app builds the groups; see lib/catalog.ts and lib/catalog-terms.ts)
--  * products whose name matches are listed before products that only match through their subcategory
-- Needs 0007_catalog.sql first. Safe to run more than once.

alter table public.catalog_products add column if not exists name_search text not null default '';

create or replace function public.catalog_set_search() returns trigger
language plpgsql set search_path = '' as $fn$
declare
  fold constant text[] := array['áàäâãéèëêíìïîóòöôõúùüûñç', 'aaaaaeeeeiiiiooooouuuunc'];
begin
  -- ' word word ' : lower case, no accents or punctuation, a space before and after every word
  new.name_search := ' ' || btrim(regexp_replace(translate(lower(coalesce(new.name, '') || ' ' || coalesce(new.brand, '')),
    fold[1], fold[2]), '[^a-z0-9]+', ' ', 'g')) || ' ';
  new.search_text := ' ' || btrim(regexp_replace(translate(lower(coalesce(new.name, '') || ' ' || coalesce(new.brand, '') || ' '
    || coalesce(new.subcategory, '')), fold[1], fold[2]), '[^a-z0-9]+', ' ', 'g')) || ' ';
  new.updated_at := now();
  return new;
end $fn$;
revoke execute on function public.catalog_set_search() from public, anon, authenticated;

-- rebuild the search columns of the products already loaded
update public.catalog_products set name = name;

-- True when every group has at least one alternative in the text.
-- Groups are 'alt|alt|alt'. 'word' matches the start of a word, 'word$' matches the whole word.
create or replace function public.catalog_matches(hay text, p_groups text[]) returns boolean
language sql immutable set search_path = '' as $fn$
  select not exists (
    select 1 from unnest(p_groups) as grp
    where not exists (
      select 1 from unnest(string_to_array(grp, '|')) as a
      where a <> '' and case when a like '%$' then hay like '% ' || left(a, -1) || ' %' else hay like '% ' || a || '%' end));
$fn$;

create or replace function public.search_catalog(p_store text, p_groups text[]) returns setof public.catalog_products
language sql stable set search_path = '' as $fn$
  select p.* from public.catalog_products p
  where p.store = p_store
    and cardinality(p_groups) between 1 and 8
    and public.catalog_matches(p.search_text, p_groups)
  order by public.catalog_matches(p.name_search, p_groups) desc,                                     -- name matches first
           public.catalog_matches(substring(p.name_search from '^ [^ ]+ '), p_groups[1:1]) desc,    -- then names that start with the first word
           length(p.name), p.name
  limit 80;
$fn$;

revoke execute on function public.catalog_matches(text, text[]) from public, anon;
revoke execute on function public.search_catalog(text, text[]) from public, anon;
grant execute on function public.catalog_matches(text, text[]) to authenticated;
grant execute on function public.search_catalog(text, text[]) to authenticated;
