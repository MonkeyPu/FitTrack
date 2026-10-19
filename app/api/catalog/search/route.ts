import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/supabase/auth";
import { getSiteUrl } from "@/lib/site";
import { OFF_FIELDS, STORES, parseOffProduct } from "@/lib/catalog";

/**
 * Searches Open Food Facts for supermarket products. It runs on the server so we can identify the
 * app the way Open Food Facts asks, keep their rate limits (10 searches/min) in mind, and cache results.
 */

const PAGE_SIZE = 20;
const recent = new Map<string, number[]>();

// Best-effort per-person limit (each server instance counts separately).
function tooMany(userId: string) {
  const now = Date.now();
  const list = (recent.get(userId) ?? []).filter((t) => now - t < 60_000);
  if (list.length >= 8) { recent.set(userId, list); return true; }
  list.push(now);
  recent.set(userId, list);
  return false;
}

const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "private, no-store" } });

export async function GET(req: NextRequest) {
  const user = await getAuthUser(await createClient());
  if (!user) return json({ error: "Not signed in" }, 401);

  const sp = req.nextUrl.searchParams;
  const q = (sp.get("q") ?? "").trim().replace(/\s+/g, " ").slice(0, 80);
  const store = STORES.find((s) => s.id === sp.get("store")) ?? STORES[0];
  const page = Math.min(Math.max(parseInt(sp.get("page") ?? "1", 10) || 1, 1), 20);
  const barcode = /^\d{8,14}$/.test(q);
  if (q.length < 2) return json({ error: "Type at least 2 characters." }, 400);
  if (tooMany(user.id)) return json({ error: "You're searching quickly. Wait a few seconds and try again." }, 429);

  const url = new URL(barcode ? `https://world.openfoodfacts.org/api/v2/product/${q}.json` : "https://world.openfoodfacts.org/cgi/search.pl");
  url.searchParams.set("fields", OFF_FIELDS);
  if (!barcode) {
    const p = url.searchParams;
    p.set("action", "process"); p.set("json", "1");
    p.set("search_terms", q); p.set("search_simple", "1");
    p.set("tagtype_0", store.kind === "country" ? "countries" : "stores");
    p.set("tag_contains_0", "contains"); p.set("tag_0", store.kind === "country" ? "spain" : store.id);
    p.set("sort_by", "unique_scans_n");
    p.set("page_size", String(PAGE_SIZE)); p.set("page", String(page));
  }

  const contact = process.env.OFF_CONTACT_EMAIL || (await getSiteUrl());
  let res: Response;
  try {
    res = await fetch(url, {
      headers: { "User-Agent": `FitTrack/1.0 (${contact})`, Accept: "application/json" },
      signal: AbortSignal.timeout(9000),
      next: { revalidate: 60 * 60 * 24 },
    });
  } catch {
    return json({ error: "The catalog didn't respond. Try again in a moment." }, 504);
  }
  if (res.status === 429 || res.status === 503) return json({ error: "The catalog is busy right now. Try again in a minute." }, 503);
  if (!res.ok && !(barcode && res.status === 404)) return json({ error: "The catalog is unavailable right now." }, 502);

  let data: Record<string, unknown>;
  try { data = await res.json(); } catch { return json({ error: "The catalog sent an unexpected answer." }, 502); }

  const raw = barcode ? (data.product ? [data.product as Record<string, unknown>] : []) : Array.isArray(data.products) ? (data.products as Record<string, unknown>[]) : [];
  const products = raw.map(parseOffProduct).filter((p): p is NonNullable<typeof p> => p !== null);
  const total = barcode ? products.length : Number(data.count) || products.length;
  return json({ products, page, hasMore: !barcode && page * PAGE_SIZE < total });
}
