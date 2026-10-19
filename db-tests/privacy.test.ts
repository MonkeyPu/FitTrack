/**
 * Runs the real migrations in an in-memory Postgres (PGlite) with a minimal stand-in for
 * Supabase's auth/storage schemas, then checks isolation, friendship rules and privacy toggles.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { beforeAll, describe, expect, it } from "vitest";

const sql = (f: string) => readFileSync(join(__dirname, "../supabase/migrations", f), "utf8");
const U = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const [A, B, C] = [U(1), U(2), U(3)];
const DAY = "2026-10-14";

let db: PGlite;

async function as<T>(uid: string | null, role: "authenticated" | "anon", fn: () => Promise<T>): Promise<T> {
  await db.exec(`select set_config('request.jwt.claim.sub', '${uid ?? ""}', false); set role ${role};`);
  try { return await fn(); } finally { await db.exec("reset role;"); }
}
const q = async (text: string, params: unknown[] = []) => (await db.query(text, params)).rows as Record<string, any>[];
const asUser = <T>(uid: string, fn: () => Promise<T>) => as(uid, "authenticated", fn);

beforeAll(async () => {
  db = new PGlite();
  await db.exec(`
    create role anon nologin; create role authenticated nologin;
    create schema auth; create table auth.users (id uuid primary key);
    create function auth.uid() returns uuid language sql stable
      as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    create schema storage;
    create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
    create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text);
    alter table storage.objects enable row level security;
    create function storage.foldername(name text) returns text[] language sql as $$ select string_to_array(name, '/') $$;
    grant usage on schema public, auth, storage to anon, authenticated;
    -- Supabase grants these by default; the migrations then lock functions down.
    alter default privileges in schema public grant all on tables to anon, authenticated;
    alter default privileges in schema public grant all on functions to anon, authenticated;
  `);
  for (const f of ["0001_schema.sql", "0002_rls.sql", "0003_friends.sql", "0004_nutrients_and_friend_permissions.sql"]) await db.exec(sql(f));

  // Fixtures (inserted as superuser). Users A, B, C plus 20 extras for rate limiting.
  for (let i = 1; i <= 30; i++) {
    await db.exec(`insert into auth.users (id) values ('${U(i)}');
      insert into public.profiles (id, username, display_name, onboarded, maintenance_calories, max_food_calories, net_calorie_target, protein_goal, goal_description, goal_target_date)
      values ('${U(i)}', 'user${i}', 'User ${i}', true, 2600, 2000, 1700, 120, 'Secret goal ${i}', '2026-12-31');`);
  }
  await db.exec(`
    insert into public.food_logs (user_id, food_name_snapshot, servings, calories_per_serving, protein_per_serving, notes, log_date)
      values ('${B}', 'Rice', 2, 400, 10, 'private note', '${DAY}');
    insert into public.meal_logs (user_id, meal_name_snapshot, servings, calories_per_serving, protein_per_serving, log_date)
      values ('${B}', 'Lunch', 1, 500, 30, '${DAY}');
    insert into public.activity_logs (user_id, activity_name, duration_minutes, calories_burned, log_date)
      values ('${B}', 'Run', 30, 250, '${DAY}');
    insert into public.food_logs (user_id, food_name_snapshot, servings, calories_per_serving, log_date)
      values ('${A}', 'A private food', 1, 100, '${DAY}');
  `);
}, 120_000);

describe("account isolation (RLS)", () => {
  it("users only see their own rows", async () => {
    await asUser(A, async () => {
      expect(await q("select * from public.food_logs")).toHaveLength(1);
      expect(await q("select * from public.profiles")).toHaveLength(1);
      expect(await q("select * from public.activity_logs")).toHaveLength(0);
    });
  });
  it("users cannot write rows for someone else", async () => {
    await asUser(A, async () => {
      await expect(q(`insert into public.food_logs (user_id, food_name_snapshot, servings, calories_per_serving, log_date) values ('${B}', 'x', 1, 1, '${DAY}')`)).rejects.toThrow();
      const upd = await q(`update public.profiles set display_name = 'hacked' where id = '${B}' returning id`);
      expect(upd).toHaveLength(0);
    });
  });
  it("anon users see nothing and cannot call friend functions", async () => {
    await as(null, "anon", async () => {
      expect(await q("select * from public.food_logs")).toHaveLength(0);
      await expect(q(`select * from public.friend_cards('${DAY}')`)).rejects.toThrow();
    });
  });
});

describe("friendship rules", () => {
  it("cannot friend yourself or send duplicates in either direction", async () => {
    await asUser(A, async () => {
      await expect(q(`insert into public.friendships (requester_id, recipient_id) values ('${A}', '${A}')`)).rejects.toThrow();
    });
  });

  it("only the recipient can accept; outsiders see nothing", async () => {
    await asUser(A, async () => {
      await q(`insert into public.friendships (requester_id, recipient_id) values ('${A}', '${B}')`);
      // requester cannot self-accept
      expect(await q(`update public.friendships set status = 'accepted' where requester_id = '${A}' returning id`)).toHaveLength(0);
      // cannot create it as already accepted
      await expect(q(`insert into public.friendships (requester_id, recipient_id, status) values ('${A}', '${C}', 'accepted')`)).rejects.toThrow();
    });
    await asUser(B, async () => {
      // duplicate in reverse direction is rejected
      await expect(q(`insert into public.friendships (requester_id, recipient_id) values ('${B}', '${A}')`)).rejects.toThrow();
    });
    await asUser(C, async () => {
      expect(await q("select * from public.friendships")).toHaveLength(0);
      expect(await q("select * from public.my_friendships()")).toHaveLength(0);
      expect(await q(`update public.friendships set status = 'accepted' returning id`)).toHaveLength(0);
    });
    await asUser(B, async () => {
      // parties cannot be rewritten
      await expect(q(`update public.friendships set requester_id = '${C}' where recipient_id = '${B}'`)).rejects.toThrow();
      expect(await q(`select * from public.friend_cards('${DAY}')`)).toHaveLength(0); // not accepted yet
      const ok = await q(`update public.friendships set status = 'accepted' where recipient_id = '${B}' returning id`);
      expect(ok).toHaveLength(1);
    });
  });
});

describe("friend data respects privacy toggles", () => {
  const setPrivacy = (flags: Record<string, boolean>) =>
    asUser(B, () => q(`update public.profiles set privacy_settings = $1::jsonb where id = '${B}'`, [JSON.stringify(flags)]));
  const cardAsA = () => asUser(A, async () => (await q(`select * from public.friend_cards('${DAY}')`))[0]);

  it("shows nothing numeric when nothing is shared", async () => {
    const c = await cardAsA();
    expect(c.friend_id).toBe(B);
    expect(c.food_calories).toBeNull();
    expect(c.protein).toBeNull();
    expect(c.exercise_calories).toBeNull();
    expect(c.max_food_calories).toBeNull();
    expect(c.goal_description).toBeNull();
  });

  it("never exposes maintenance calories, email or notes", async () => {
    await setPrivacy({ share_summary: true, share_exercise: true, share_history: true, share_goal: true });
    const c = await cardAsA();
    expect(Object.keys(c)).not.toContain("maintenance_calories");
    expect(Object.keys(c)).not.toContain("email");
    expect(JSON.stringify(c)).not.toContain("private note");
  });

  it("summary toggle exposes food, protein and targets only", async () => {
    await setPrivacy({ share_summary: true, share_exercise: false, share_history: false, share_goal: false });
    const c = await cardAsA();
    expect(Number(c.food_calories)).toBe(1300); // 2 x 400 + 500
    expect(Number(c.protein)).toBe(50);
    expect(c.max_food_calories).toBe(2000);
    expect(c.exercise_calories).toBeNull();
    expect(c.goal_description).toBeNull();
  });

  it("exercise and goal toggles are independent", async () => {
    await setPrivacy({ share_summary: false, share_exercise: true, share_history: false, share_goal: true });
    const c = await cardAsA();
    expect(c.food_calories).toBeNull();
    expect(Number(c.exercise_calories)).toBe(250);
    expect(c.goal_description).toBe("Secret goal 2");
  });

  it("history requires the history toggle and respects the exercise toggle", async () => {
    const hist = () => asUser(A, () => q(`select * from public.friend_history('${B}', '2026-10-01', '2026-10-31')`));
    await setPrivacy({ share_summary: true, share_exercise: true, share_history: false, share_goal: false });
    expect(await hist()).toHaveLength(0);
    await setPrivacy({ share_summary: false, share_exercise: false, share_history: true, share_goal: false });
    let rows = await hist();
    expect(rows).toHaveLength(1);
    expect(Number(rows[0].food_calories)).toBe(1300);
    expect(rows[0].exercise_calories).toBeNull();
    await setPrivacy({ share_summary: false, share_exercise: true, share_history: true, share_goal: false });
    rows = await hist();
    expect(Number(rows[0].exercise_calories)).toBe(250);
  });

  it("strangers get nothing even when everything is shared", async () => {
    await setPrivacy({ share_summary: true, share_exercise: true, share_history: true, share_goal: true });
    await asUser(C, async () => {
      expect(await q(`select * from public.friend_cards('${DAY}')`)).toHaveLength(0);
      expect(await q(`select * from public.friend_history('${B}', '2026-10-01', '2026-10-31')`)).toHaveLength(0);
    });
  });

  it("removing the friendship removes access immediately", async () => {
    await asUser(B, () => q(`delete from public.friendships where recipient_id = '${B}'`));
    await asUser(A, async () => {
      expect(await q(`select * from public.friend_cards('${DAY}')`)).toHaveLength(0);
      expect(await q(`select * from public.friend_history('${B}', '2026-10-01', '2026-10-31')`)).toHaveLength(0);
    });
  });
});

describe("search and abuse protection", () => {
  it("search returns only public fields, excludes self, and needs 2+ characters", async () => {
    await asUser(A, async () => {
      expect(await q("select * from public.search_profiles('u')")).toHaveLength(0);
      const rows = await q("select * from public.search_profiles('user2')");
      expect(rows.length).toBeGreaterThan(0);
      expect(Object.keys(rows[0]).sort()).toEqual(["avatar_url", "display_name", "id", "username"]);
      expect(rows.find((r) => r.id === A)).toBeUndefined();
    });
  });

  it("rate-limits friend requests, even if requests are deleted and re-sent", async () => {
    await asUser(C, async () => {
      for (let i = 4; i < 19; i++) await q(`insert into public.friendships (requester_id, recipient_id) values ('${C}', '${U(i)}')`);
      await q(`delete from public.friendships where requester_id = '${C}'`);
      await expect(q(`insert into public.friendships (requester_id, recipient_id) values ('${C}', '${U(20)}')`)).rejects.toThrow(/Too many/);
    });
  });
});

describe("nutrients", () => {
  it("generates totals from servings x per-serving values", async () => {
    await db.exec(`insert into public.food_logs (user_id, food_name_snapshot, servings, calories_per_serving, carbs_per_serving, sugar_per_serving, fat_per_serving, log_date)
      values ('${U(24)}', 'Oats', 2, 150, 30, 5, 3, '${DAY}');
      insert into public.meal_logs (user_id, meal_name_snapshot, servings, calories_per_serving, carbs_per_serving, notes, log_date)
      values ('${U(24)}', 'Combo', 2, 100, 10, 'combo note', '${DAY}');`);
    const f = (await q(`select * from public.food_logs where user_id = '${U(24)}'`))[0];
    expect(Number(f.total_carbs)).toBe(60);
    expect(Number(f.total_sugar)).toBe(10);
    expect(Number(f.total_fat)).toBe(6);
    const m = (await q(`select * from public.meal_logs where user_id = '${U(24)}'`))[0];
    expect(Number(m.total_carbs)).toBe(20);
  });
  it("rejects negative or absurd nutrient values", async () => {
    await asUser(U(24), async () => {
      await expect(q(`insert into public.foods (user_id, name, calories_per_serving, sugar_per_serving) values ('${U(24)}', 'x', 1, -5)`)).rejects.toThrow();
      await expect(q(`insert into public.foods (user_id, name, calories_per_serving, carbs_per_serving) values ('${U(24)}', 'x', 1, 5000)`)).rejects.toThrow();
    });
  });
});

describe("per-friend sharing", () => {
  const [OWNER, F1, F2, F3, STRANGER] = [U(25), U(26), U(27), U(28), U(29)];
  const befriend = (a: string, b: string) => db.exec(`insert into public.friendships (requester_id, recipient_id, status) values ('${a}', '${b}', 'accepted')`);
  const card = (viewer: string) => asUser(viewer, async () => (await q(`select * from public.friend_cards('${DAY}')`))[0]);

  beforeAll(async () => {
    for (const f of [F1, F2, F3]) await befriend(OWNER, f);
    await db.exec(`insert into public.food_logs (user_id, food_name_snapshot, servings, calories_per_serving, carbs_per_serving, log_date)
      values ('${OWNER}', 'Pasta', 1, 700, 90, '${DAY}');
      insert into public.activity_logs (user_id, activity_name, duration_minutes, calories_burned, log_date) values ('${OWNER}', 'Run', 30, 300, '${DAY}');`);
  });

  it("defaults apply when no per-friend row exists", async () => {
    expect((await card(F1)).food_calories).toBeNull();
    await db.exec(`update public.profiles set privacy_settings = '{"share_summary":true,"share_exercise":false,"share_history":false,"share_goal":false}' where id = '${OWNER}'`);
    const c = await card(F1);
    expect(Number(c.food_calories)).toBe(700);
    expect(Number(c.carbs)).toBe(90);
    expect(c.exercise_calories).toBeNull();
  });

  it("an override can hide data from one friend while others keep the default", async () => {
    await asUser(OWNER, () => q(`insert into public.friend_permissions (owner_id, friend_id, share_summary, share_exercise, share_history, share_goal) values ('${OWNER}', '${F2}', false, false, false, false)`));
    expect((await card(F2)).food_calories).toBeNull();
    expect(Number((await card(F1)).food_calories)).toBe(700);
    expect(Number((await card(F3)).food_calories)).toBe(700);
  });

  it("an override can share more with one friend than the default", async () => {
    await asUser(OWNER, () => q(`insert into public.friend_permissions (owner_id, friend_id, share_summary, share_exercise, share_history, share_goal) values ('${OWNER}', '${F3}', true, true, true, false)`));
    expect(Number((await card(F3)).exercise_calories)).toBe(300);
    expect((await card(F1)).exercise_calories).toBeNull();
    const hist = await asUser(F3, () => q(`select * from public.friend_history('${OWNER}', '2026-10-01', '2026-10-31')`));
    expect(hist).toHaveLength(1);
    expect(await asUser(F1, () => q(`select * from public.friend_history('${OWNER}', '2026-10-01', '2026-10-31')`))).toHaveLength(0);
  });

  it("friends cannot read or write the owner's sharing settings", async () => {
    await asUser(F3, async () => {
      expect(await q("select * from public.friend_permissions")).toHaveLength(0);
      expect(await q(`update public.friend_permissions set share_goal = true where owner_id = '${OWNER}' returning owner_id`)).toHaveLength(0);
    });
  });

  it("settings can only be created for accepted friends", async () => {
    await asUser(OWNER, async () => {
      await expect(q(`insert into public.friend_permissions (owner_id, friend_id, share_summary, share_exercise, share_history, share_goal) values ('${OWNER}', '${STRANGER}', true, true, true, true)`)).rejects.toThrow();
    });
  });

  it("ending the friendship removes the per-friend settings", async () => {
    await asUser(OWNER, () => q(`delete from public.friendships where requester_id = '${OWNER}' and recipient_id = '${F3}'`));
    await db.exec("reset role;");
    expect(await q(`select * from public.friend_permissions where owner_id = '${OWNER}' and friend_id = '${F3}'`)).toHaveLength(0);
    expect(await q(`select * from public.friend_permissions where owner_id = '${OWNER}' and friend_id = '${F2}'`)).toHaveLength(1);
  });
});
