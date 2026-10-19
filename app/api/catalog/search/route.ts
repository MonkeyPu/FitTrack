import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/supabase/auth";
import { getSiteUrl } from "@/lib/site";
import { OFF_FIELDS, STORES, matchesWords, parseOffProduct, plainWords, type CatalogProduct } from "@/lib/catalog";

/**
 * Product search for the supermarket catalog. Text search uses the Open Food Facts search service
 * (search.openfoodfacts.org); the old search address is only a backup. Barcodes use the product API.
 * It runs on the server so the app can identify itself, cache answers and limit how often it asks.
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

async function get(url: URL, ua: string) {
  return fetch(url, { headers: { "User-Agent": ua, Accept: "application/json" }, signal: AbortSignal.timeout(8000), next: { revalidate: 60 * 60 * 24 } });
}

export async function GET(req: NextRequest) {
  const user = await getAuthUser(await createClient());
  if (!user) return json({ error: "Not signed in" }, 401);

  const sp = req.nextUrl.searchParams;
  const q = (sp.get("q") ?? "").trim().slice(0, 80);
  const barcode = /^\d{8,14}$/.test(q);
  const words = plainWords(q);
  if (!barcode && words.length < 3) return json({ products: [], source: "none", debug: { note: "too short" } });
  if (tooMany(user.id)) return json({ error: "You're searching quickly. Wait a few seconds and try again." }, 429);

  const ua = `FitTrack/1.0 (${process.env.OFF_CONTACT_EMAIL || (await getSiteUrl())})`;
  const debug: Record<string, unknown> = {};
  let raw: Raw[] = [];
  let source = "";

  try {
    if (barcode) {
      source = "barcode";
      const url = new URL(`https://world.openfoodfacts.org/api/v2/product/${q}.json`);
      url.searchParams.set("fields", OFF_FIELDS + ",selected_images,images,image_front_small_url,countries_tags,stores_tags");
      const res = await get(url, ua);
      debug.status = res.status;
      if (res.status === 429 || res.status === 503) return json({ error: "The catalog is busy right now. Try again in a minute.", debug }, 503);
      const data = res.ok ? ((await res.json()) as Raw) : {};
      raw = data.product ? [data.product as Raw] : [];
    } else {
      // 1) the search service
      for (let i = 0; i < VARIANTS.length && raw.length === 0; i++) {
        const v = (preferred + i) % VARIANTS.length;
        const url = new URL("https://search.openfoodfacts.org/search");
        url.searchParams.set("q", words);
        url.searchParams.set("page_size", "50");
        if (VARIANTS[v]) url.searchParams.set("fields", VARIANTS[v]!);
        const res = await get(url, ua);
        debug.searchStatus = res.status;
        if (res.status === 429 || res.status === 503) { debug.busy = true; break; }
        if (!res.ok) continue; // unknown field list: try the next one
        const data = (await res.json().catch(() => ({}))) as Raw;
        if (Array.isArray(data.hits)) {
          raw = data.hits as Raw[];
          source = "search";
          preferred = v;
          debug.variant = v;
          break;
        }
      }
      // 2) backup: the old search address (may be down)
      if (!source && !debug.busy) {
        const url = new URL("https://world.openfoodfacts.org/cgi/search.pl");
        const p = url.searchParams;
        p.set("action", "process"); p.set("json", "1"); p.set("search_terms", words); p.set("search_simple", "1");
        p.set("page_size", "30"); p.set("sort_by", "unique_scans_n"); p.set("fields", OFF_FIELDS + ",image_front_small_url,stores_tags,countries_tags");
        const res = await get(url, ua);
        debug.legacyStatus = res.status;
        if (res.ok) {
          const data = (await res.json().catch(() => ({}))) as Raw;
          if (Array.isArray(data.products)) { raw = data.products as Raw[]; source = "legacy"; }
        }
      }
      if (!source) return json({ error: "The catalog is busy or unavailable right now. Try again in a minute.", debug }, 503);
    }
  } catch {
    return json({ error: "The catalog didn't respond. Try again in a moment.", debug }, 504);
  }

  debug.source = source;
  debug.rawHits = raw.length;
  if (raw[0]) {
    debug.firstKeys = Object.keys(raw[0]).slice(0, 25);
    const n = raw[0].nutriments;
    debug.nutrimentsShape = Array.isArray(n) ? "array" : n && typeof n === "object" ? Object.keys(n as Raw).slice(0, 8) : typeof n;
  }

  const seen = new Set<string>();
  const products: CatalogProduct[] = [];
  for (const r of raw) {
    const p = parseOffProduct(r);
    if (!p || seen.has(p.code)) continue;
    // The search service also matches categories and other languages, so keep names that show the words.
    if (!barcode && !matchesWords(words, p.name, p.brand)) continue;
    seen.add(p.code);
    products.push(p);
    if (products.length >= 30) break;
  }
  debug.shown = products.length;
  return json({ products, source, debug });
}
