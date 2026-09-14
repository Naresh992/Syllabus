"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { LoadingScreen, Spinner, Toggle, Chip, SectionTitle } from "@/components/ui";
import { apiGet, apiPost } from "@/lib/fetcher";
import { fileToDataUrl } from "@/lib/image-client";
import {
  INTENTS,
  MAJORS,
  CLASS_YEARS,
  PROMPT_QUESTIONS,
  MIN_PHOTOS,
  MAX_PHOTOS,
} from "@/lib/constants";

type Me = {
  name: string;
  email: string;
  campusName: string | null;
  city: string | null;
  country: string | null;
  verificationStatus: string;
  tier: string;
};
type TierInfo = { name: string; perks: string[]; interCollege: boolean; incognito: boolean };

export default function SettingsPage() {
  const [me, setMe] = useState<Me | null>(null);
  const [tierInfo, setTierInfo] = useState<TierInfo | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [hasProfile, setHasProfile] = useState(true);
  const [blocks, setBlocks] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [meRes, profRes, blockRes] = await Promise.all([
          apiGet("/api/auth/me"),
          apiGet("/api/profile"),
          apiGet("/api/block").catch(() => ({ blocks: [] })),
        ]);
        setMe(meRes.user);
        setTierInfo(meRes.tierInfo);
        setBlocks(blockRes.blocks ?? []);
        if (profRes.profile) {
          setProfile({
            ...profRes.profile,
            prompts:
              profRes.profile.prompts?.length === 3
                ? profRes.profile.prompts
                : [
                    { q: PROMPT_QUESTIONS[0], a: "" },
                    { q: PROMPT_QUESTIONS[1], a: "" },
                    { q: PROMPT_QUESTIONS[4], a: "" },
                  ],
          });
        } else {
          setHasProfile(false);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  function set<K extends string>(key: K, value: any) {
    setProfile((p: any) => ({ ...p, [key]: value }));
  }

  async function addPhotos(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    const room = MAX_PHOTOS - profile.photos.length;
    const next: string[] = [];
    for (const f of files.slice(0, room)) next.push(await fileToDataUrl(f));
    set("photos", [...profile.photos, ...next]);
    e.target.value = "";
  }

  function toggleIntentFilter(it: string) {
    const cur: string[] = profile.intentFilter ?? [];
    set("intentFilter", cur.includes(it) ? cur.filter((x) => x !== it) : [...cur, it]);
  }

  async function save() {
    setError(null);
    if (profile.photos.length < MIN_PHOTOS) return setError(`Add at least ${MIN_PHOTOS} photos.`);
    if (!profile.major || !profile.classYear) return setError("Major and class year are required.");
    if (profile.prompts.some((p: any) => !p.a.trim())) return setError("Answer all 3 prompts.");
    setSaving(true);
    try {
      await apiPost("/api/profile", {
        bio: profile.bio,
        photos: profile.photos,
        major: profile.major,
        classYear: profile.classYear,
        intent: profile.intent,
        hookupOptIn: profile.hookupOptIn,
        prompts: profile.prompts,
        ageMin: profile.ageMin,
        ageMax: profile.ageMax,
        sameCampusOnly: profile.sameCampusOnly,
        intentFilter: profile.intentFilter ?? [],
        sameCampusVisibility: profile.sameCampusVisibility,
        incognito: profile.incognito,
      });
      setSavedAt(Date.now());
      setTimeout(() => setSavedAt(null), 2500);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function unblock(id: string) {
    await apiPost("/api/block", { targetId: id, action: "unblock" });
    setBlocks((b) => b.filter((x) => x.id !== id));
  }

  if (loading || !me) return <LoadingScreen label="Loading settings…" />;

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <SectionTitle eyebrow="tweak your file" title={<>Set<span className="hl">tings</span></>} />

      {/* Account */}
      <section className="card p-5">
        <h2 className="font-display text-lg uppercase">Account</h2>
        <div className="mt-3 grid grid-cols-2 gap-y-2 text-sm">
          <span className="text-ink-faint">Name</span><span className="text-right font-medium">{me.name}</span>
          <span className="text-ink-faint">Email</span><span className="text-right font-medium">{me.email}</span>
          <span className="text-ink-faint">College</span><span className="text-right font-medium">{me.campusName ?? "—"}</span>
          <span className="text-ink-faint">Location</span><span className="text-right font-medium">{[me.city, me.country].filter(Boolean).join(", ") || "—"}</span>
          <span className="text-ink-faint">Status</span>
          <span className="text-right">
            <StatusBadge status={me.verificationStatus} />
          </span>
        </div>
      </section>

      {/* Subscription */}
      <section className="card p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg uppercase">Subscription</h2>
          <span className="badge bg-crimson-50 text-crimson-700">{tierInfo?.name}</span>
        </div>
        <ul className="mt-3 space-y-1 text-sm text-ink-light">
          {tierInfo?.perks.map((p) => (
            <li key={p} className="flex gap-2"><span className="text-forest-600">✓</span>{p}</li>
          ))}
        </ul>
        <Link href="/pricing" className="btn-primary mt-4">Manage plan</Link>
      </section>

      {/* Security */}
      <section className="card p-5">
        <h2 className="font-display text-lg uppercase">Security</h2>
        <PasswordForm />
      </section>

      {!hasProfile ? (
        <section className="card ruled p-6 text-center">
          <p className="text-ink-light">You haven&apos;t built your profile yet.</p>
          <Link href="/enroll" className="btn-primary mt-3">Complete your profile</Link>
        </section>
      ) : (
        <>
          {/* Profile editor */}
          <section className="card p-5">
            <h2 className="font-display text-lg uppercase">Edit profile</h2>

            <label className="label mt-4">Photos ({profile.photos.length}/{MAX_PHOTOS})</label>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {profile.photos.map((p: string, i: number) => (
                <div key={i} className="relative aspect-[3/4] overflow-hidden rounded-xl border border-ink/10">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p} alt="" className="h-full w-full object-cover" />
                  <button
                    onClick={() => set("photos", profile.photos.filter((_: string, idx: number) => idx !== i))}
                    className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-ink/70 text-xs text-paper-50"
                  >
                    ✕
                  </button>
                </div>
              ))}
              {profile.photos.length < MAX_PHOTOS && (
                <label className="grid aspect-[3/4] cursor-pointer place-items-center rounded-xl border-2 border-dashed border-ink/20 text-2xl text-ink-faint hover:border-crimson-500">
                  +
                  <input type="file" accept="image/*" multiple className="hidden" onChange={addPhotos} />
                </label>
              )}
            </div>

            <label className="label mt-4">Bio</label>
            <textarea className="input min-h-[70px]" maxLength={600} value={profile.bio} onChange={(e) => set("bio", e.target.value)} />

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div>
                <label className="label">Major</label>
                <select className="input" value={profile.major} onChange={(e) => set("major", e.target.value)}>
                  <option value="">Select…</option>
                  {MAJORS.map((m) => <option key={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Class year</label>
                <select className="input" value={profile.classYear} onChange={(e) => set("classYear", e.target.value)}>
                  <option value="">Select…</option>
                  {CLASS_YEARS.map((y) => <option key={y}>{y}</option>)}
                </select>
              </div>
            </div>

            <label className="label mt-4">Prerequisites (intent)</label>
            <div className="flex flex-wrap gap-2">
              {INTENTS.map((it) => (
                <Chip key={it} active={profile.intent === it} onClick={() => set("intent", it)}>{it}</Chip>
              ))}
            </div>

            <label className="mt-4 flex items-center justify-between rounded-xl border border-ink/10 p-3">
              <span className="text-sm font-semibold">Open to casual connections</span>
              <Toggle checked={!!profile.hookupOptIn} onChange={(v) => set("hookupOptIn", v)} />
            </label>

            <label className="label mt-4">Prompts</label>
            <div className="space-y-3">
              {profile.prompts.map((p: any, i: number) => (
                <div key={i} className="rounded-xl border border-ink/10 p-3">
                  <select
                    className="mb-2 w-full bg-transparent text-sm font-semibold text-crimson-700 focus:outline-none"
                    value={p.q}
                    onChange={(e) => set("prompts", profile.prompts.map((x: any, idx: number) => idx === i ? { ...x, q: e.target.value } : x))}
                  >
                    {PROMPT_QUESTIONS.map((q) => <option key={q} value={q}>{q}</option>)}
                  </select>
                  <textarea
                    className="input min-h-[48px]"
                    maxLength={300}
                    value={p.a}
                    onChange={(e) => set("prompts", profile.prompts.map((x: any, idx: number) => idx === i ? { ...x, a: e.target.value } : x))}
                  />
                </div>
              ))}
            </div>
          </section>

          {/* Discovery preferences */}
          <section className="card p-5">
            <h2 className="font-display text-lg uppercase">Discovery preferences</h2>
            <div className="mt-3 flex items-center gap-3">
              <span className="text-sm text-ink-light">Age</span>
              <input type="number" min={18} max={100} className="input w-20" value={profile.ageMin} onChange={(e) => set("ageMin", +e.target.value || 18)} />
              <span className="text-ink-faint">to</span>
              <input type="number" min={18} max={100} className="input w-20" value={profile.ageMax} onChange={(e) => set("ageMax", +e.target.value || 40)} />
            </div>

            <label className="mt-4 flex items-center justify-between">
              <span className="text-sm">
                Show me my campus only
                {!tierInfo?.interCollege && <span className="block text-xs text-ink-faint">Inter-college browsing needs Enrolled+</span>}
              </span>
              <Toggle
                checked={!tierInfo?.interCollege ? true : !!profile.sameCampusOnly}
                disabled={!tierInfo?.interCollege}
                onChange={(v) => set("sameCampusOnly", v)}
              />
            </label>

            <label className="label mt-4">Only show these intents (optional)</label>
            <div className="flex flex-wrap gap-2">
              {INTENTS.map((it) => (
                <Chip key={it} active={(profile.intentFilter ?? []).includes(it)} onClick={() => toggleIntentFilter(it)}>{it}</Chip>
              ))}
            </div>
          </section>

          {/* Privacy */}
          <section className="card p-5">
            <h2 className="font-display text-lg uppercase">Privacy</h2>
            <label className="mt-3 flex items-center justify-between">
              <span className="text-sm">Only students at my campus can see me</span>
              <Toggle checked={!!profile.sameCampusVisibility} onChange={(v) => set("sameCampusVisibility", v)} />
            </label>
            <label className="mt-3 flex items-center justify-between">
              <span className="text-sm">
                Incognito — hide me from discovery
                {!tierInfo?.incognito && <span className="block text-xs text-ink-faint">&quot;Independent Study&quot; is an Extra Credit perk</span>}
              </span>
              <Toggle checked={!!profile.incognito} disabled={!tierInfo?.incognito} onChange={(v) => set("incognito", v)} />
            </label>
          </section>

          {/* Save */}
          {error && <p className="rounded-lg bg-redpen/10 px-3 py-2 text-sm text-redpen">{error}</p>}
          <div className="sticky bottom-24 z-10 flex items-center gap-3 md:bottom-4">
            <button className="btn-primary flex-1 shadow-card" onClick={save} disabled={saving}>
              {saving ? <Spinner className="h-4 w-4" /> : "Save changes"}
            </button>
            {savedAt && <span className="text-sm font-semibold text-forest-700">✓ Saved</span>}
          </div>
        </>
      )}

      {/* Blocked users */}
      <section className="card p-5">
        <h2 className="font-display text-lg uppercase">Blocked students</h2>
        {blocks.length === 0 ? (
          <p className="mt-2 text-sm text-ink-light">You haven&apos;t blocked anyone.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {blocks.map((b) => (
              <li key={b.id} className="flex items-center justify-between rounded-lg border border-ink/10 px-3 py-2">
                <span className="text-sm font-medium">{b.name}</span>
                <button className="btn-ghost text-xs" onClick={() => unblock(b.id)}>Unblock</button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: "bg-amber-100 text-amber-800",
    approved: "bg-forest-600/15 text-forest-700",
    rejected: "bg-redpen/10 text-redpen",
  };
  return <span className={`badge ${map[status] ?? "bg-paper-200"}`}>{status}</span>;
}

function PasswordForm() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (next !== confirm) return setMsg({ ok: false, text: "New passwords don't match." });
    setBusy(true);
    try {
      await apiPost("/api/auth/password", { current, next });
      setMsg({ ok: true, text: "Password updated." });
      setCurrent("");
      setNext("");
      setConfirm("");
    } catch (err: any) {
      setMsg({ ok: false, text: err.message || "Could not update password." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-3 space-y-3">
      <div>
        <label className="label">Current password</label>
        <input type="password" className="input" value={current} onChange={(e) => setCurrent(e.target.value)} required />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="label">New password</label>
          <input type="password" className="input" value={next} onChange={(e) => setNext(e.target.value)} required />
        </div>
        <div>
          <label className="label">Confirm new</label>
          <input type="password" className="input" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
        </div>
      </div>
      {msg && (
        <p className={`rounded-xl border-2 border-ink px-3 py-2 text-sm font-bold ${msg.ok ? "bg-forest-600/10 text-forest-700" : "bg-redpen/10 text-redpen"}`}>
          {msg.text}
        </p>
      )}
      <button type="submit" className="btn-ghost" disabled={busy}>
        {busy ? <Spinner className="h-4 w-4" /> : "Change password"}
      </button>
    </form>
  );
}
