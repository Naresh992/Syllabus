"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Logo from "@/components/Logo";
import { Spinner, Toggle, Chip, Doodle } from "@/components/ui";
import PendingNotice from "@/components/PendingNotice";
import { apiGet, apiPost } from "@/lib/fetcher";
import {
  INTENTS,
  MAJORS,
  CLASS_YEARS,
  PROMPT_QUESTIONS,
  MIN_PHOTOS,
  MAX_PHOTOS,
  MIN_AGE,
  calcAge,
} from "@/lib/constants";

type Stage =
  | "loading"
  | "account"
  | "id"
  | "selfie"
  | "dob"
  | "profile"
  | "prerequisites"
  | "pending";

async function fileToDataUrl(file: File, max = 800, quality = 0.72): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = reject;
    i.src = dataUrl;
  });
  let { width, height } = img;
  if (Math.max(width, height) > max) {
    const s = max / Math.max(width, height);
    width = Math.round(width * s);
    height = Math.round(height * s);
  }
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas.getContext("2d")!.drawImage(img, 0, 0, width, height);
  return canvas.toDataURL("image/jpeg", quality);
}

const NEW_STEPS = ["account", "id", "selfie", "dob", "profile", "prerequisites"];

export default function EnrollPage() {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>("loading");
  const [mode, setMode] = useState<"new" | "finish" | "resubmit">("new");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // account
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  // docs
  const [idPhoto, setIdPhoto] = useState<string | null>(null);
  const [selfie, setSelfie] = useState<string | null>(null);
  // dob
  const [dob, setDob] = useState("");
  // profile
  const [photos, setPhotos] = useState<string[]>([]);
  const [bio, setBio] = useState("");
  const [major, setMajor] = useState("");
  const [classYear, setClassYear] = useState("");
  const [prompts, setPrompts] = useState<{ q: string; a: string }[]>([
    { q: PROMPT_QUESTIONS[0], a: "" },
    { q: PROMPT_QUESTIONS[1], a: "" },
    { q: PROMPT_QUESTIONS[4], a: "" },
  ]);
  // prerequisites
  const [intent, setIntent] = useState<string>("");
  const [hookupOptIn, setHookupOptIn] = useState(false);
  const [ageMin, setAgeMin] = useState(18);
  const [ageMax, setAgeMax] = useState(24);
  const [sameCampusOnly, setSameCampusOnly] = useState(true);

  useEffect(() => {
    apiGet("/api/auth/me")
      .then(({ user }) => {
        if (user.hasProfile) {
          router.replace("/syllabus");
          return;
        }
        if (user.verificationStatus === "approved") {
          setMode("finish");
          setStage("profile");
        } else if (user.verificationStatus === "rejected") {
          setMode("resubmit");
          setStage("id");
        } else {
          setStage("pending"); // pending w/ docs already submitted
        }
      })
      .catch(() => setStage("account")); // not logged in → full flow
  }, [router]);

  const dobAge = dob ? calcAge(dob) : null;
  const stepIndex = NEW_STEPS.indexOf(stage);

  function submitAccount(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (name.trim().length < 1) return setError("Enter your name.");
    if (!email.toLowerCase().endsWith(".edu")) return setError("Use your college .edu email.");
    if (password.length < 8) return setError("Password must be at least 8 characters.");
    setStage("id");
  }

  async function onPickId(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setIdPhoto(await fileToDataUrl(f));
  }
  async function onPickSelfie(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setSelfie(await fileToDataUrl(f, 640));
  }

  async function afterSelfie() {
    setError(null);
    if (!selfie) return setError("Add a selfie to continue.");
    if (mode === "resubmit") {
      setBusy(true);
      try {
        await apiPost("/api/verification", { idPhotoUrl: idPhoto, selfieUrl: selfie });
        setStage("pending");
      } catch (err: any) {
        setError(err.message);
      } finally {
        setBusy(false);
      }
    } else {
      setStage("dob");
    }
  }

  async function submitDob() {
    setError(null);
    if (!dob) return setError("Enter your date of birth.");
    if (dobAge == null || dobAge < MIN_AGE) {
      return setError(`You must be at least ${MIN_AGE} to join Syllabus.`);
    }
    // Create account + attach verification docs.
    setBusy(true);
    try {
      await apiPost("/api/auth/signup", { name, email, password, dob });
      await apiPost("/api/verification", { idPhotoUrl: idPhoto, selfieUrl: selfie });
      router.refresh();
      setStage("profile");
    } catch (err: any) {
      setError(err.message);
      // Domain / duplicate errors relate to the account step.
      if (/email|campus|\.edu|exists/i.test(err.message)) setStage("account");
    } finally {
      setBusy(false);
    }
  }

  async function addPhotos(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    const room = MAX_PHOTOS - photos.length;
    const next: string[] = [];
    for (const f of files.slice(0, room)) next.push(await fileToDataUrl(f));
    setPhotos((p) => [...p, ...next]);
    e.target.value = "";
  }

  function submitProfile() {
    setError(null);
    if (photos.length < MIN_PHOTOS) return setError(`Add at least ${MIN_PHOTOS} photos.`);
    if (!major) return setError("Pick your major.");
    if (!classYear) return setError("Pick your class year.");
    if (prompts.some((p) => !p.a.trim())) return setError("Answer all 3 prompts.");
    setStage("prerequisites");
  }

  async function submitAll() {
    setError(null);
    if (!intent) return setError("Pick a prerequisite (your intent).");
    setBusy(true);
    try {
      await apiPost("/api/profile", {
        bio,
        photos,
        major,
        classYear,
        intent,
        hookupOptIn,
        prompts,
        ageMin,
        ageMax,
        sameCampusOnly,
      });
      const { user } = await apiGet("/api/auth/me");
      router.refresh();
      if (user.verificationStatus === "approved") {
        router.push("/syllabus");
      } else {
        setStage("pending");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-notebook">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-5 py-5">
        <Logo href="/" size="md" />
        <Link href="/login" className="text-sm font-semibold text-ink-light hover:text-crimson-600">
          Sign in
        </Link>
      </header>

      <main className="mx-auto max-w-2xl px-5 pb-16">
        {/* Progress */}
        {mode !== "resubmit" && stage !== "loading" && stage !== "pending" && (
          <div className="mb-6 flex items-center gap-1.5">
            {NEW_STEPS.map((s, i) => (
              <div
                key={s}
                className={`h-3.5 flex-1 rounded-md border-2 border-ink transition-all ${
                  i <= stepIndex ? "bg-crimson-600" : "bg-paper-50"
                } ${i === stepIndex ? "-rotate-1" : ""}`}
              />
            ))}
          </div>
        )}

        {stage === "loading" && (
          <div className="flex justify-center py-20">
            <Spinner className="h-7 w-7 text-crimson-600" />
          </div>
        )}

        {stage === "account" && (
          <StepCard
            title="Create your account"
            subtitle="Sign up with your college email. We'll auto-detect your campus."
          >
            <form onSubmit={submitAccount} className="space-y-4">
              <div>
                <label className="label">Full name</label>
                <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Alex Rivera" required />
              </div>
              <div>
                <label className="label">College email (.edu)</label>
                <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@verrill.edu" required />
                <p className="mt-1 text-xs text-ink-faint">Launch campuses: verrill.edu · lakeside.edu · northwood.edu</p>
              </div>
              <div>
                <label className="label">Password</label>
                <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" required />
              </div>
              <ErrorLine error={error} />
              <button className="btn-primary w-full" type="submit">Continue</button>
            </form>
          </StepCard>
        )}

        {stage === "id" && (
          <StepCard title="Upload your student ID" subtitle="We use this to confirm you're a real, enrolled student. Stored privately — never shown on your profile.">
            <Uploader label="College ID photo" preview={idPhoto} onPick={onPickId} emoji="🪪" />
            <div className="mt-5 flex gap-2">
              {mode !== "resubmit" && (
                <button className="btn-ghost flex-1" onClick={() => setStage("account")}>Back</button>
              )}
              <button className="btn-primary flex-1" onClick={() => (idPhoto ? setStage("selfie") : setError("Add your ID photo."))}>
                Continue
              </button>
            </div>
            <ErrorLine error={error} />
          </StepCard>
        )}

        {stage === "selfie" && (
          <StepCard title="Take a live selfie" subtitle="We match your selfie to your ID. (Basic check for MVP — production would use a KYC vendor.)">
            <Uploader label="Selfie" preview={selfie} onPick={onPickSelfie} emoji="🤳" capture />
            <div className="mt-5 flex gap-2">
              <button className="btn-ghost flex-1" onClick={() => setStage("id")}>Back</button>
              <button className="btn-primary flex-1" onClick={afterSelfie} disabled={busy}>
                {busy ? <Spinner className="h-4 w-4" /> : "Continue"}
              </button>
            </div>
            <ErrorLine error={error} />
          </StepCard>
        )}

        {stage === "dob" && (
          <StepCard title="Your date of birth" subtitle="Syllabus is strictly 18+. Under-18 sign-ups are blocked.">
            <input className="input" type="date" value={dob} onChange={(e) => setDob(e.target.value)} max={new Date().toISOString().slice(0, 10)} />
            {dobAge != null && (
              <p className={`mt-2 text-sm ${dobAge < MIN_AGE ? "text-redpen" : "text-forest-700"}`}>
                {dobAge < MIN_AGE ? `You must be at least ${MIN_AGE}.` : `You're ${dobAge}. `}
              </p>
            )}
            <div className="mt-5 flex gap-2">
              <button className="btn-ghost flex-1" onClick={() => setStage("selfie")}>Back</button>
              <button className="btn-primary flex-1" onClick={submitDob} disabled={busy || dobAge == null || dobAge < MIN_AGE}>
                {busy ? <Spinner className="h-4 w-4" /> : "Create account"}
              </button>
            </div>
            <ErrorLine error={error} />
          </StepCard>
        )}

        {stage === "profile" && (
          <StepCard title="Build your profile" subtitle="This is your 'Enroll' page — what classmates see on The Syllabus.">
            <div className="space-y-5">
              <div>
                <label className="label">Photos ({photos.length}/{MAX_PHOTOS}) · min {MIN_PHOTOS}</label>
                <div className="grid grid-cols-3 gap-2">
                  {photos.map((p, i) => (
                    <div key={i} className="relative aspect-[3/4] overflow-hidden rounded-xl border border-ink/10">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={p} alt="" className="h-full w-full object-cover" />
                      <button
                        onClick={() => setPhotos((ph) => ph.filter((_, idx) => idx !== i))}
                        className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-ink/70 text-xs text-paper-50"
                        aria-label="Remove photo"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  {photos.length < MAX_PHOTOS && (
                    <label className="grid aspect-[3/4] cursor-pointer place-items-center rounded-xl border-2 border-dashed border-ink/20 text-3xl text-ink-faint hover:border-crimson-500 hover:text-crimson-500">
                      +
                      <input type="file" accept="image/*" multiple className="hidden" onChange={addPhotos} />
                    </label>
                  )}
                </div>
              </div>

              <div>
                <label className="label">Bio</label>
                <textarea className="input min-h-[80px]" maxLength={600} value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Two sentences that make you sound like a catch (or at least fun in a group project)." />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Major</label>
                  <select className="input" value={major} onChange={(e) => setMajor(e.target.value)}>
                    <option value="">Select…</option>
                    {MAJORS.map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Class year</label>
                  <select className="input" value={classYear} onChange={(e) => setClassYear(e.target.value)}>
                    <option value="">Select…</option>
                    {CLASS_YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
              </div>

              <div className="space-y-3">
                <label className="label">Prompts (answer all 3)</label>
                {prompts.map((p, i) => (
                  <div key={i} className="rounded-xl border border-ink/10 p-3">
                    <select
                      className="mb-2 w-full bg-transparent text-sm font-semibold text-crimson-700 focus:outline-none"
                      value={p.q}
                      onChange={(e) =>
                        setPrompts((pr) => pr.map((x, idx) => (idx === i ? { ...x, q: e.target.value } : x)))
                      }
                    >
                      {PROMPT_QUESTIONS.map((q) => <option key={q} value={q}>{q}</option>)}
                    </select>
                    <textarea
                      className="input min-h-[52px]"
                      maxLength={300}
                      placeholder="Your answer…"
                      value={p.a}
                      onChange={(e) =>
                        setPrompts((pr) => pr.map((x, idx) => (idx === i ? { ...x, a: e.target.value } : x)))
                      }
                    />
                  </div>
                ))}
              </div>

              <ErrorLine error={error} />
              <div className="flex gap-2">
                {mode === "new" && (
                  <button className="btn-ghost" onClick={() => setStage("dob")}>Back</button>
                )}
                <button className="btn-primary flex-1" onClick={submitProfile}>Next: Prerequisites</button>
              </div>
            </div>
          </StepCard>
        )}

        {stage === "prerequisites" && (
          <StepCard title="Set your Prerequisites" subtitle="What are you looking for? Pick one — this helps us match you.">
            <div className="space-y-5">
              <div className="flex flex-wrap gap-2">
                {INTENTS.map((it) => (
                  <Chip key={it} active={intent === it} onClick={() => setIntent(it)}>
                    {it}
                  </Chip>
                ))}
              </div>

              <label className="flex items-center justify-between rounded-xl border border-ink/10 p-3">
                <span>
                  <span className="font-semibold">Open to Hookup Culture</span>
                  <span className="block text-xs text-ink-faint">Off by default. Opt in to see & be seen for casual connections.</span>
                </span>
                <Toggle checked={hookupOptIn} onChange={setHookupOptIn} />
              </label>

              <div className="rounded-xl border border-ink/10 p-4">
                <p className="mb-3 text-sm font-semibold">Discovery preferences</p>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-ink-light">Age</span>
                  <input type="number" min={18} max={100} className="input w-20" value={ageMin} onChange={(e) => setAgeMin(+e.target.value || 18)} />
                  <span className="text-ink-faint">to</span>
                  <input type="number" min={18} max={100} className="input w-20" value={ageMax} onChange={(e) => setAgeMax(+e.target.value || 24)} />
                </div>
                <label className="mt-3 flex items-center justify-between">
                  <span className="text-sm">Show me my campus only</span>
                  <Toggle checked={sameCampusOnly} onChange={setSameCampusOnly} />
                </label>
                <p className="mt-1 text-xs text-ink-faint">Inter-college browsing unlocks with Enrolled+.</p>
              </div>

              <ErrorLine error={error} />
              <div className="flex gap-2">
                <button className="btn-ghost" onClick={() => setStage("profile")}>Back</button>
                <button className="btn-primary flex-1" onClick={submitAll} disabled={busy}>
                  {busy ? <Spinner className="h-4 w-4" /> : "Finish enrolling"}
                </button>
              </div>
            </div>
          </StepCard>
        )}

        {stage === "pending" && (
          <div className="pt-4">
            <PendingNotice status="pending" />
          </div>
        )}
      </main>
    </div>
  );
}

function StepCard({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="card taped p-6 pt-9 sm:p-8 sm:pt-10 animate-card-in">
      <h1 className="font-display text-2xl uppercase leading-tight text-ink sm:text-3xl">{title}</h1>
      <p className="mb-6 mt-1.5 font-medium text-ink-light">{subtitle}</p>
      {children}
    </div>
  );
}

function ErrorLine({ error }: { error: string | null }) {
  if (!error) return null;
  return <p className="rounded-xl border-2 border-ink bg-redpen/10 px-3 py-2 text-sm font-bold text-redpen">{error}</p>;
}

function Uploader({
  label,
  preview,
  onPick,
  emoji,
  capture,
}: {
  label: string;
  preview: string | null;
  onPick: (e: React.ChangeEvent<HTMLInputElement>) => void;
  emoji: string;
  capture?: boolean;
}) {
  return (
    <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-ink/40 bg-paper p-6 text-center transition hover:rotate-[0.5deg] hover:border-ink hover:bg-marker-soft">
      {preview ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={preview} alt={label} className="max-h-56 rounded-xl border-2 border-ink object-contain" />
      ) : (
        <>
          <span className="grid h-14 w-14 place-items-center rounded-2xl border-2 border-ink bg-marker font-display text-2xl shadow-sticker-sm">{emoji}</span>
          <span className="font-display text-sm uppercase">{label}</span>
          <span className="font-hand text-xl text-ink-faint">tap to upload ↓</span>
        </>
      )}
      <input
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onPick}
        {...(capture ? { capture: "user" as any } : {})}
      />
    </label>
  );
}


