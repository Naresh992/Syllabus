"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Logo from "@/components/Logo";
import { Spinner, Doodle } from "@/components/ui";
import { apiPost } from "@/lib/fetcher";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const { user } = await apiPost("/api/auth/login", { email, password });
      if (user.isAdmin) router.push("/admin");
      else if (user.verificationStatus === "approved" && !user.hasProfile) router.push("/enroll");
      else router.push("/syllabus");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Could not sign in.");
      setBusy(false);
    }
  }

  function fill(e: string, p: string) {
    setEmail(e);
    setPassword(p);
  }

  return (
    <div className="flex min-h-screen flex-col bg-notebook">
      <header className="mx-auto w-full max-w-6xl px-5 py-4">
        <Logo href="/" size="md" />
      </header>

      <main className="flex flex-1 items-center justify-center px-5 py-8">
        <div className="w-full max-w-md">
          <div className="card taped p-7 pt-9">
            <p className="font-hand -rotate-1 text-2xl text-redpen">back to class!</p>
            <h1 className="font-display text-3xl uppercase leading-none">Welcome back</h1>
            <p className="mt-1.5 font-medium text-ink-light">Sign in to your Syllabus account.</p>

            <form onSubmit={submit} className="mt-6 space-y-4">
              <div>
                <label className="label" htmlFor="email">College email</label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  className="input"
                  placeholder="you@verrill.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="label" htmlFor="password">Password</label>
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  className="input"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              {error && (
                <p className="rounded-xl border-2 border-ink bg-redpen/10 px-3 py-2 text-sm font-bold text-redpen">{error}</p>
              )}

              <button type="submit" className="btn-primary w-full !py-3" disabled={busy}>
                {busy ? <Spinner className="h-4 w-4" /> : "Sign in →"}
              </button>
            </form>

            <p className="mt-5 text-center text-sm font-medium text-ink-light">
              New here?{" "}
              <Link href="/enroll" className="hl font-bold text-ink">
                Enroll now
              </Link>
            </p>
          </div>

          {/* Demo helpers */}
          <div className="mt-5 -rotate-1 rounded-2xl border-2 border-dashed border-ink/40 bg-paper-50/70 p-4">
            <p className="font-hand mb-2 text-2xl text-ink-light">psst — demo shortcuts ↓</p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => fill("alex@verrill.edu", "password123")}
                className="btn-ghost !py-1.5 !text-xs"
              >
                Demo student
              </button>
              <button
                type="button"
                onClick={() => fill("admin@syllabus.app", "admin123")}
                className="btn-ghost !py-1.5 !text-xs"
              >
                Admin
              </button>
            </div>
            <Doodle name="arrow" className="mt-1 h-8 w-20 text-ink-faint" />
          </div>
        </div>
      </main>
    </div>
  );
}
