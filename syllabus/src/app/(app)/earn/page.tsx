"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { LoadingScreen, Spinner, SectionTitle, Pill, Doodle } from "@/components/ui";
import { apiGet, apiPost } from "@/lib/fetcher";

type TaskItem = {
  id: string;
  category: string;
  title: string;
  description: string;
  payoutAmount: number;
  requiresReview: boolean;
  locked: boolean;
  tierRequired: string | null;
  completion: { status: string; creditedAmount: number } | null;
};

type HistoryItem = {
  kind: string;
  title: string;
  amount: number;
  status: string;
  at: string;
};

type EarnStatus = {
  wallet: { balance: number; lifetimeEarned: number; lifetimePaidOut: number };
  ads: { watchedToday: number; dailyCap: number; cooldownRemaining: number; payoutPerAd: number };
  tasks: TaskItem[];
  referral: { code: string; usesCount: number; rewardedCount: number; payoutPerReferral: number };
  payout: { minCredits: number; monthlyCap: number; usedThisMonth: number };
  history: HistoryItem[];
};

function mmss(total: number): string {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

const CATEGORY_LABEL: Record<string, string> = {
  watch: "Watch & Earn",
  refer: "Refer & Earn",
  content: "Content Task",
  engagement: "Engagement",
  feedback: "Feedback",
  social: "Social Share",
};

export default function EarnPage() {
  const [data, setData] = useState<EarnStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [watching, setWatching] = useState(0); // mock ad countdown seconds
  const [busy, setBusy] = useState<string | null>(null);
  const [proofs, setProofs] = useState<Record<string, string>>({});
  const [payoutAmount, setPayoutAmount] = useState("");
  const [upiId, setUpiId] = useState("");
  const [friendCode, setFriendCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    try {
      const d = await apiGet("/api/earn/status");
      setData(d);
      setCooldown(d.ads.cooldownRemaining ?? 0);
      setError(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Cooldown ticker
  useEffect(() => {
    if (cooldown <= 0) return;
    timer.current = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [cooldown > 0]); // eslint-disable-line react-hooks/exhaustive-deps

  async function watchAd() {
    if (watching > 0 || cooldown > 0 || busy) return;
    // Mock rewarded-ad playback (production: AdMob SDK + server callback).
    setWatching(3);
    for (let s = 3; s >= 1; s--) {
      setWatching(s);
      await new Promise((r) => setTimeout(r, 1000));
    }
    setWatching(0);
    setBusy("ad");
    try {
      const res = await apiPost("/api/earn/ad", {});
      setNotice(`+${res.credited} credit added to your wallet.`);
      await load();
    } catch (e: any) {
      if (e.data?.code === "cooldown") setCooldown(e.data.retryAfter ?? 120);
      setNotice(e.message);
    } finally {
      setBusy(null);
    }
  }

  async function submitTask(task: TaskItem) {
    setBusy(task.id);
    setNotice(null);
    try {
      const res = await apiPost("/api/earn/tasks", {
        taskId: task.id,
        proofUrl: proofs[task.id] ?? "",
      });
      setNotice(res.credited > 0 ? `+${res.credited} credits added.` : res.note ?? "Submitted for review.");
      await load();
    } catch (e: any) {
      setNotice(e.message);
    } finally {
      setBusy(null);
    }
  }

  async function requestPayout(e: React.FormEvent) {
    e.preventDefault();
    setBusy("payout");
    setNotice(null);
    try {
      await apiPost("/api/earn/payout", { amount: Number(payoutAmount), upiId });
      setNotice("Withdrawal requested — UPI transfer after approval.");
      setPayoutAmount("");
      await load();
    } catch (e: any) {
      setNotice(e.message);
    } finally {
      setBusy(null);
    }
  }

  async function applyCode(e: React.FormEvent) {
    e.preventDefault();
    setBusy("referral");
    setNotice(null);
    try {
      const res = await apiPost("/api/earn/referral", { code: friendCode });
      setNotice(res.note ?? "Code applied.");
      setFriendCode("");
      await load();
    } catch (e: any) {
      setNotice(e.message);
    } finally {
      setBusy(null);
    }
  }

  async function copyCode() {
    if (!data) return;
    try {
      await navigator.clipboard.writeText(data.referral.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setNotice("Copy failed — long-press the code to copy it.");
    }
  }

  if (loading) return <LoadingScreen label="Opening the Earn tab…" />;
  if (error || !data) {
    return (
      <div className="mx-auto max-w-md py-10 text-center">
        <p className="text-ink-light">{error ?? "Couldn't load Earn."}</p>
        <button onClick={() => { setLoading(true); load(); }} className="btn-ghost mt-4">Retry</button>
      </div>
    );
  }

  const thresholdPct = Math.min(100, Math.round((data.wallet.balance / data.payout.minCredits) * 100));
  const monthLeft = data.payout.monthlyCap - data.payout.usedThisMonth;
  const adsLeft = Math.max(0, data.ads.dailyCap - data.ads.watchedToday);

  return (
    <div className="mx-auto max-w-2xl">
      <SectionTitle
        eyebrow="bonus layer, not the headline"
        title={<>Earn <span className="hl">rewards</span></>}
        blurb="Connect + Learn first — Earn is the bonus layer for being an active student."
      />

      {notice && (
        <div className="mb-4 -rotate-1 rounded-2xl border-2 border-ink bg-marker p-3 text-sm font-bold shadow-sticker-sm">
          {notice}
        </div>
      )}

      {/* Wallet */}
      <div className="card taped p-5 pt-7">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="font-hand text-2xl text-redpen -rotate-1">wallet balance</p>
            <p className="font-display text-5xl leading-none">
              {data.wallet.balance}
              <span className="ml-2 align-middle text-lg text-ink-light">credits ≈ ₹{data.wallet.balance}</span>
            </p>
          </div>
          <div className="text-right text-xs font-bold text-ink-faint">
            <p>Lifetime earned: ₹{data.wallet.lifetimeEarned}</p>
            <p>Paid out: ₹{data.wallet.lifetimePaidOut}</p>
          </div>
        </div>
        <div className="mt-4">
          <div className="flex justify-between text-xs font-bold text-ink-light">
            <span>Withdrawal unlocks at ₹{data.payout.minCredits}</span>
            <span>{thresholdPct}%</span>
          </div>
          <div className="mt-1 h-3.5 overflow-hidden rounded-md border-2 border-ink bg-paper-50">
            <div className="h-full bg-forest-600 transition-all" style={{ width: `${thresholdPct}%` }} />
          </div>
          <p className="mt-1 text-xs text-ink-faint">Monthly payout room left: ₹{monthLeft} of ₹{data.payout.monthlyCap}</p>
        </div>
      </div>

      {/* Watch & Earn */}
      <div className="card mt-4 rotate-1 p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <Pill tone="marker">Watch & Earn</Pill>
            <h3 className="font-display mt-2 text-xl uppercase leading-none">Rewarded ad reels</h3>
            <p className="mt-1 text-sm font-medium text-ink-light">
              +{data.ads.payoutPerAd} credit per ad · {adsLeft} of {data.ads.dailyCap} left today
            </p>
          </div>
          <Doodle name="sparkle" className="h-10 w-10 shrink-0 text-crimson-600" />
        </div>
        <button
          onClick={watchAd}
          disabled={watching > 0 || cooldown > 0 || adsLeft <= 0 || !!busy}
          className="btn-primary mt-4 w-full"
        >
          {watching > 0 ? (
            <>Playing ad… {watching}s</>
          ) : cooldown > 0 ? (
            <>Next ad in {mmss(cooldown)}</>
          ) : adsLeft <= 0 ? (
            "Come back tomorrow"
          ) : busy === "ad" ? (
            <Spinner className="h-4 w-4" />
          ) : (
            "▶ Watch & Earn +1"
          )}
        </button>
        <p className="mt-2 text-center text-xs text-ink-faint">
          Prototype uses a mock ad — production verifies via AdMob server-side callback.
        </p>
      </div>

      {/* Refer & Earn */}
      <div className="card mt-4 -rotate-1 p-5">
        <Pill tone="forest">Refer & Earn · ₹{data.referral.payoutPerReferral}/friend</Pill>
        <h3 className="font-display mt-2 text-xl uppercase leading-none">Your code</h3>
        <div className="mt-3 flex items-center gap-2">
          <code className="flex-1 rounded-xl border-2 border-dashed border-ink/40 bg-paper px-4 py-2.5 text-center font-display text-2xl tracking-[0.3em]">
            {data.referral.code}
          </code>
          <button onClick={copyCode} className="btn-ghost shrink-0">
            {copied ? "Copied ✓" : "Copy"}
          </button>
        </div>
        <p className="mt-2 text-xs font-medium text-ink-light">
          {data.referral.usesCount} applied · {data.referral.rewardedCount} verified & paid. You earn when your friend gets ID-verified.
        </p>
        <form onSubmit={applyCode} className="mt-3 flex gap-2">
          <input
            className="input flex-1 uppercase"
            placeholder="Have a friend's code?"
            value={friendCode}
            onChange={(e) => setFriendCode(e.target.value)}
            maxLength={16}
          />
          <button type="submit" className="btn-primary shrink-0" disabled={busy === "referral" || !friendCode.trim()}>
            {busy === "referral" ? <Spinner className="h-4 w-4" /> : "Apply"}
          </button>
        </form>
      </div>

      {/* Tasks */}
      <h3 className="font-display mt-6 text-lg uppercase">Today&apos;s tasks</h3>
      <div className="mt-2 space-y-3">
        {data.tasks
          .filter((t) => t.category !== "refer" && t.category !== "watch")
          .map((t, i) => (
            <div key={t.id} className={`card p-4 ${i % 2 === 0 ? "-rotate-[0.4deg]" : "rotate-[0.4deg]"}`}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <Pill tone={t.locked ? "muted" : "default"}>{CATEGORY_LABEL[t.category] ?? t.category}</Pill>
                  <p className="font-display mt-1.5 text-base uppercase leading-tight">{t.title}</p>
                  <p className="mt-0.5 text-sm font-medium text-ink-light">{t.description}</p>
                </div>
                <span className="badge shrink-0 bg-marker text-ink shadow-sticker-sm">+₹{t.payoutAmount}</span>
              </div>
              {t.locked ? (
                <p className="mt-2 text-xs font-bold text-ink-faint">
                  Unlocks at {t.tierRequired} tier — see Pricing.
                </p>
              ) : t.completion ? (
                <p className="mt-2 text-xs font-bold">
                  Status:{" "}
                  <span className={t.completion.status === "approved" ? "text-forest-700" : t.completion.status === "pending" ? "text-ink-light" : "text-redpen"}>
                    {t.completion.status}
                    {t.completion.creditedAmount > 0 ? ` · +₹${t.completion.creditedAmount}` : ""}
                  </span>
                </p>
              ) : (
                <div className="mt-2 flex gap-2">
                  {t.requiresReview && (
                    <input
                      className="input flex-1"
                      placeholder="Proof link (post/screenshot URL)"
                      value={proofs[t.id] ?? ""}
                      onChange={(e) => setProofs((p) => ({ ...p, [t.id]: e.target.value }))}
                    />
                  )}
                  <button
                    onClick={() => submitTask(t)}
                    disabled={busy === t.id}
                    className="btn-primary shrink-0 !py-2 !text-xs"
                  >
                    {busy === t.id ? <Spinner className="h-4 w-4" /> : t.requiresReview ? "Submit" : `Complete +₹${t.payoutAmount}`}
                  </button>
                </div>
              )}
            </div>
          ))}
      </div>

      {/* Payout */}
      <div className="card mt-4 p-5">
        <Pill tone="crimson">UPI withdrawal</Pill>
        <h3 className="font-display mt-2 text-xl uppercase leading-none">Cash out</h3>
        <p className="mt-1 text-sm font-medium text-ink-light">
          Min ₹{data.payout.minCredits} · monthly cap ₹{data.payout.monthlyCap} · balance ₹{data.wallet.balance}
        </p>
        <form onSubmit={requestPayout} className="mt-3 space-y-2">
          <div className="flex gap-2">
            <input
              className="input w-28"
              type="number"
              min={data.payout.minCredits}
              max={data.wallet.balance}
              placeholder="Amount"
              value={payoutAmount}
              onChange={(e) => setPayoutAmount(e.target.value)}
              required
            />
            <input
              className="input flex-1"
              placeholder="UPI ID (name@bank)"
              value={upiId}
              onChange={(e) => setUpiId(e.target.value)}
              required
            />
          </div>
          <button
            type="submit"
            className="btn-primary w-full"
            disabled={busy === "payout" || data.wallet.balance < data.payout.minCredits}
          >
            {busy === "payout" ? <Spinner className="h-4 w-4" /> : "Request withdrawal"}
          </button>
        </form>
      </div>

      {/* History */}
      <h3 className="font-display mt-6 text-lg uppercase">Earning history</h3>
      {data.history.length === 0 ? (
        <p className="mt-2 text-sm font-medium text-ink-light">Nothing yet — watch your first ad above.</p>
      ) : (
        <div className="mt-2 space-y-2">
          {data.history.map((h, i) => (
            <div key={i} className="card flex items-center justify-between gap-3 p-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-bold">{h.title}</p>
                <p className="text-xs text-ink-faint">
                  {new Date(h.at).toLocaleDateString(undefined, { month: "short", day: "numeric" })} · {h.status}
                </p>
              </div>
              <span className={`font-display shrink-0 text-base ${h.amount >= 0 ? "text-forest-700" : "text-ink"}`}>
                {h.amount >= 0 ? `+₹${h.amount}` : `−₹${Math.abs(h.amount)}`}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
