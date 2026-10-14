import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const TABLES = [
  "profiles", "target_changes", "foods", "meals", "meal_items",
  "food_logs", "meal_logs", "meal_log_items", "activity_logs",
] as const;

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  // RLS limits every query to the signed-in user's own rows.
  const results = await Promise.all(TABLES.map((t) => supabase.from(t).select("*")));
  if (results.some((r) => r.error)) return NextResponse.json({ error: "Export failed" }, { status: 500 });

  const body = {
    exported_at: new Date().toISOString(),
    email: user.email,
    ...Object.fromEntries(TABLES.map((t, i) => [t, results[i].data])),
  };
  return new NextResponse(JSON.stringify(body, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": 'attachment; filename="fittrack-export.json"',
      "Cache-Control": "no-store",
    },
  });
}
