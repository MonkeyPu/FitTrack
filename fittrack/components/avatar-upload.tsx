"use client";
import { useState } from "react";
import { Camera } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const initials = (s: string) => s.trim().slice(0, 2).toUpperCase() || "?";

export function AvatarUpload({ userId, initialUrl, name, onUrl }: { userId: string; initialUrl?: string | null; name: string; onUrl?: (url: string) => void }) {
  const [url, setUrl] = useState(initialUrl ?? "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const update = (u: string) => { setUrl(u); onUrl?.(u); };

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setErr("");
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) return setErr("Use a JPG, PNG or WebP image.");
    if (file.size > 2 * 1024 * 1024) return setErr("Image must be under 2 MB.");
    setBusy(true);
    const supabase = createClient();
    const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const path = `${userId}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("avatars").upload(path, file, { contentType: file.type });
    setBusy(false);
    if (error) return setErr("Couldn't upload that image. Try again.");
    update(supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl);
  }

  return (
    <div className="flex items-center gap-4">
      {!onUrl && <input type="hidden" name="avatar_url" value={url} />}
      <label className="relative flex h-20 w-20 cursor-pointer items-center justify-center overflow-hidden rounded-full border border-line bg-card2 text-xl font-semibold text-muted">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {url ? <img src={url} alt="Profile picture" className="h-full w-full object-cover" /> : initials(name)}
        <span className="absolute inset-x-0 bottom-0 flex h-6 items-center justify-center bg-black/50 text-white"><Camera className="h-3.5 w-3.5" /></span>
        <input type="file" accept="image/jpeg,image/png,image/webp" onChange={onFile} className="sr-only" />
      </label>
      <div className="text-sm text-muted">
        <p>{busy ? "Uploading…" : "Profile picture (optional)"}</p>
        {url && !busy && <button type="button" onClick={() => update("")} className="text-accent">Remove</button>}
        {err && <p className="text-danger">{err}</p>}
      </div>
    </div>
  );
}
