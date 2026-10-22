import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/supabase/auth";
import { getSiteUrl } from "@/lib/site";
import { barcodeVariants } from "@/lib/barcode";
import { OFF_FIELDS, matchesGroups, parseOffProduct, plainWords, searchGroups, spanishWords, type CatalogProduct } from "@/lib/catalog";

/**
 * Open Food Facts search for the supermarket catalog. Text search uses the Open Food Facts search service
 * (search.openfoodfacts.org); the old search address is only a backup. Barcodes use the product API.
 * It runs on the server so the app can identify itself, cache answers and limit how often it asks.
 * Mercadona products are left out: they come from our own Mercadona catalog.
 */

const recent = new Map<string, number[]>();
function tooMany(userId: string) {
  const now = Date.now();
  const list = (recent.get(userId) ?? []).filter((t) => now - t < 60_000);
  if (list.length >= 40) { recent.set(userId, list); return true; }
  list.push(now);
  recent.set(userId, list);
  return false;
}

const BASE = "code,product_name,brands,nutriments,quantity,obsolete";
// Field names the search service doesn't know make it refuse the request, so fall back step by step.
const VARIANTS: (string | null)[] = [
  `${BASE},selected_images,images,stores,stores_tags,countries_tags,image_front_small_url,image_small_url,image_url`,
  `${BASE},selected_images,images`,
  null, // no field list: everything the record has
  BASE,
];
let preferred = 0; // remembered per server instance once a variant works

const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
type Raw = Record<string, unknown>;
type Found = { raw: Raw[]; busy: boolean; ok: boolean };

async function get(url: URL, ua: string) {
  return fetch(url, { headers: { "User-Agent": ua, Accept: "application/json" }, signal: AbortSignal.timeout(8000), next: { revalidate: 60 * 60 * 24 } });
}

/** One text search: the search service first, then the old address as a backup. */
async function searchText(words: string, ua: string): Promise<Found> {
  for (let i = 0; i < VARIANTS.length; i++) {
    const v = (preferred + i) % VARIANTS.length;
    const url = new URL("https://search.openfoodfacts.org/search");
    url.searchParams.set("q", words);
    url.searchParams.set("page_size", "50");
    if (VARIANTS[v]) url.searchParams.set("fields", VARIANTS[v]!);
    const res = await get(url, ua);
    if (res.status === 429 || res.status === 503) return { raw: [], busy: true, ok: false };
    if (!res.ok) continue; // unknown field list: try the next one
    const data = (await res.json().catch(() => ({}))) as Raw;
    if (Array.isArray(data.hits)) { preferred = v; return { raw: data.hits as Raw[], busy: false, ok: true }; }
  }
  const url = new URL("https://world.openfoodfacts.org/cgi/search.pl");
  const p = url.searchParams;
  p.set("action", "process"); p.set("json", "1"); p.set("search_terms", words); p.set("search_simple", "1");
  p.set("page_size", "30"); p.set("sort_by", "unique_scans_n"); p.set("fields", OFF_FIELDS + ",image_front_small_url,stores_tags,countries_tags");
  const res = await get(url, ua);
  if (res.ok) {
    const data = (await res.json().catch(() => ({}))) as Raw;
    if (Array.isArray(data.products)) return { raw: data.products as Raw[], busy: false, ok: true };
  }
  return { raw: [], busy: res.status === 429 || res.status === 503, ok: false };
}

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const user = await getAuthUser(supabase);
  if (!user) return json({ error: "Not signed in" }, 401);

  const q = (req.nextUrl.searchParams.get("q") ?? "").trim().slice(0, 80);
  const barcode = /^\d{8,14}$/.test(q);
  const words = plainWords(q);
  if (!barcode && words.length < 3) return json({ products: [] });
  if (tooMany(user.id)) return json({ error: "You're searching quickly. Wait a few seconds and try again." }, 429);

  const ua = `FitTrack/1.0 (${process.env.OFF_CONTACT_EMAIL || (await getSiteUrl())})`;
  let raw: Raw[] = [];
  try {
    if (barcode) {
      // Open Food Facts writes UPC-A numbers as EAN-13 with a leading 0.
      const code = q.length === 12 ? `0${q}` : q;
      const url = new URL(`https://world.openfoodfacts.org/api/v2/product/${code}.json`);
      url.searchParams.set("fields", OFF_FIELDS + ",selected_images,images,image_front_small_url,countries_tags,stores_tags");
      const res = await get(url, ua);
      if (res.status === 429 || res.status === 503) return json({ error: "Open Food Facts is busy right now. Try again in a minute." }, 503);
      const data = res.ok ? ((await res.json()) as Raw) : {};
      raw = data.product ? [data.product as Raw] : [];
    } else {
      // Typed words, and also their Spanish names, so "chicken" finds products named "pollo".
      const spanish = spanishWords(q);
      const asked = [words, ...(plainWords(spanish) && plainWords(spanish) !== words ? [plainWords(spanish)] : [])];
      const found = await Promise.all(asked.map((w) => searchText(w, ua)));
      if (found.every((f) => !f.ok)) return json({ error: found.some((f) => f.busy) ? "Open Food Facts is busy right now. Try again in a minute." : "Open Food Facts is unavailable right now. Try again in a minute." }, 503);
      raw = found.flatMap((f) => f.raw);
    }
  } catch {
    return json({ error: "Open Food Facts didn't respond. Try again in a moment." }, 504);
  }

  const groups = searchGroups(q);
  const seen = new Set<string>();
  let products: CatalogProduct[] = [];
  for (const r of raw) {
    const p = parseOffProduct(r);
    if (!p || seen.has(p.code)) continue;
    // The search service also matches categories and other languages, so keep names that show the words.
    if (!barcode && !matchesGroups(groups, p.name, p.brand)) continue;
    seen.add(p.code);
    products.push(p);
    if (products.length >= 40) break;
  }

  // Leave out products that are already in our Mercadona catalog (same barcode).
  if (products.length > 0) {
    const eans = [...new Set(products.flatMap((p) => barcodeVariants(p.code)))];
    const { data } = await supabase.from("catalog_products").select("ean").eq("store", "mercadona").in("ean", eans);
    const ours = new Set((data ?? []).map((r) => String(r.ean)));
    if (ours.size > 0) products = products.filter((p) => !barcodeVariants(p.code).some((v) => ours.has(v)));
  }
  return json({ products: products.slice(0, 30) });
}
