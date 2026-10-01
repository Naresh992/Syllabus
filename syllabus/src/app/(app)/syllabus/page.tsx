"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import clsx from "clsx";
import ProfileCard from "@/components/ProfileCard";
import Modal from "@/components/Modal";
import PendingNotice from "@/components/PendingNotice";
import VerifyCta from "@/components/VerifyCta";
import { LoadingScreen, Spinner, IntentBadge, SectionTitle, Seal, Doodle } from "@/components/ui";
import { apiGet, apiPost } from "@/lib/fetcher";
import type { CardProfile } from "@/lib/serialize";

type Status = {
  tier: string;
  swipeLimit: number | null;
  swipesUsed: number;
  swipesRemaining: number | null;
  superLimit: number;
  superRemaining: number;
};

export default function SyllabusPage() {
  const router = useRouter();
  const [deck, setDeck] = useState<CardProfile[]>([]);
  const [status, setStatus] = useState<Status | null>(null);
  const [loading, setLoading] = useState(true);
  const [verificationRequired, setVerificationRequired] = useState(false);
  const [gate, setGate] = useState<"not_verified" | "no_profile" | null>(null);
  const [verifyOpen, setVerifyOpen] = useState(false);

  const [dx, setDx] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [leaving, setLeaving] = useState<"add" | "drop" | null>(null);
  const startX = useRef(0);
  const busy = useRef(false);

  const [match, setMatch] = useState<{ matchId: string; profile: CardProfile } | null>(null);
  const [paywall, setPaywall] = useState<string | null>(null);

  const [rosterOpen, setRosterOpen] = useState(false);
  const [roster, setRoster] = useState<{ entitled: boolean; count: number; cards: CardProfile[] } | null>(null);
  const [rosterGate, setRosterGate] = useState<"not_verified" | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiGet("/api/discovery");
      setDeck(data.cards);
      setStatus(data.status);
      setVerificationRequired(!!data.verificationRequired);
      setGate(null);
    } catch (e: any) {
      if (e.data?.code === "not_verified") setGate("not_verified");
      else if (e.data?.code === "no_profile") setGate("no_profile");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const top = deck[0];

  const doSwipe = useCallback(
    async (direction: "add" | "drop" | "raise_hand") => {
      if (!top || busy.current) return;

      // Unverified browse mode: surface gate instead of swiping.
      if (verificationRequired) {
        setVerifyOpen(true);
        return;
      }

      if (direction === "raise_hand" && status && status.superRemaining <= 0) {
        setPaywall(
          status.superLimit === 0
            ? "Raise Hand is a paid feature. Upgrade to Enrolled to send super likes."
            : "You're out of Raise Hands this week."
        );
        return;
      }
      if (
        direction !== "raise_hand" &&
        status &&
        status.swipeLimit != null &&
        status.swipesRemaining != null &&
        status.swipesRemaining <= 0
      ) {
        setPaywall(`You've used all ${status.swipeLimit} swipes today. Upgrade for unlimited.`);
        return;
      }

      busy.current = true;
      const target = top;
      setLeaving(direction === "raise_hand" ? "add" : direction);

      setTimeout(() => {
        setDeck((d) => d.slice(1));
        setDx(0);
        setLeaving(null);
      }, 260);

      try {
        const res = await apiPost("/api/swipe", { targetId: target.id, direction });
        if (res.status) setStatus(res.status);
        if (res.matched && res.match) setMatch(res.match);
      } catch (e: any) {
        if (e.status === 402) {
          setPaywall(e.message);
          setDeck((d) => [target, ...d]);
        }
      } finally {
        busy.current = false;
      }
    },
    [top, status, verificationRequired]
  );

  function onDown(e: React.PointerEvent) {
    if (leaving) return;
    setDragging(true);
    startX.current = e.clientX;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  }
  function onMove(e: React.PointerEvent) {
    if (!dragging) return;
    setDx(e.clientX - startX.current);
  }
  function onUp() {
    if (!dragging) return;
    setDragging(false);
    if (dx > 120) doSwipe("add");
    else if (dx < -120) doSwipe("drop");
    else setDx(0);
  }

  async function openRoster() {
    setRosterOpen(true);
    setRoster(null);
    setRosterGate(null);
    try {
      setRoster(await apiGet("/api/likes"));
    } catch (e: any) {
      if (e.data?.code === "not_verified") setRosterGate("not_verified");
      else setRoster({ entitled: false, count: 0, cards: [] });
    }
  }

  if (loading) return <LoadingScreen label="shuffling the syllabus…" />;
  if (gate === "not_verified") return <VerifyCta title="Verify to browse the Syllabus" />;
  if (gate === "no_profile") return <PendingNotice variant="profile" />;

  const rotate = dx / 18;

  return (
    <div className="mx-auto max-w-md">
      <div className="mb-1 flex items-start justify-between gap-2">
        <SectionTitle eyebrow="swipe responsibly" title={<>The <span className="hl">Syllabus</span></>} />
        <button onClick={openRoster} className="btn-ghost mt-1 shrink-0 -rotate-1 !py-2 !text-xs">
          Class Roster
        </button>
      </div>

      {verificationRequired && (
        <div className="mb-4 -rotate-1 rounded-2xl border-2 border-ink bg-marker p-3 shadow-sticker-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-display text-xs uppercase leading-tight">You&apos;re browsing blurred previews 👋</p>
              <p className="text-xs font-medium text-ink/70">Get ID-verified (2h) to unblur profiles, add, drop &amp; message.</p>
            </div>
            <Link href="/enroll?m=verify" className="btn-primary !py-1.5 !text-xs whitespace-nowrap">
              Verify now
            </Link>
          </div>
        </div>
      )}

      {status && (
        <div className="mb-4 flex gap-2">
          <span className="badge bg-paper-50 text-ink shadow-sticker-sm">
            {status.swipeLimit == null ? "∞ swipes" : `${status.swipesRemaining} swipes today`}
          </span>
          <span className="badge bg-forest-600 text-paper-50 shadow-sticker-sm">
            ✋ {status.superLimit >= 999 ? "∞" : status.superRemaining} hands
          </span>
        </div>
      )}

      {/* Deck */}
      <div className="relative mx-auto h-[64vh] max-h-[580px] w-full">
        {deck.length === 0 ? (
          <EmptyDeck onRefresh={load} tier={status?.tier ?? "audit"} />
        ) : (
          <>
            {deck[1] && (
              <div className="absolute inset-0 rotate-2 scale-[0.96] opacity-60">
                <ProfileCard profile={deck[1]} showSafety={false} />
              </div>
            )}
            <div
              className={clsx(
                "absolute inset-0 touch-pan-y",
                leaving === "add" && "animate-toss-right",
                leaving === "drop" && "animate-toss-left"
              )}
              style={
                !leaving
                  ? { transform: `translateX(${dx}px) rotate(${rotate}deg)`, transition: dragging ? "none" : "transform 0.25s" }
                  : undefined
              }
              onPointerDown={onDown}
              onPointerMove={onMove}
              onPointerUp={onUp}
              onPointerCancel={onUp}
            >
              {dx > 40 && (
                <div className="absolute left-5 top-10 z-10 -rotate-[16deg] rounded-xl border-4 border-ink bg-forest-600 px-3 py-1 font-display text-2xl uppercase text-paper-50 shadow-sticker">
                  Add
                </div>
              )}
              {dx < -40 && (
                <div className="absolute right-5 top-10 z-10 rotate-[16deg] rounded-xl border-4 border-ink bg-redpen px-3 py-1 font-display text-2xl uppercase text-paper-50 shadow-sticker">
                  Drop
                </div>
              )}
              <ProfileCard profile={top!} onBlocked={() => setDeck((d) => d.slice(1))} />
            </div>
          </>
        )}
      </div>

      {/* Action buttons */}
      {deck.length > 0 && (
        <div className="mt-6 flex items-center justify-center gap-4">
          <button
            onClick={() => doSwipe("drop")}
            aria-label="Drop"
            className="grid h-16 w-16 place-items-center rounded-2xl border-2 border-ink bg-paper-50 font-display text-2xl text-redpen shadow-sticker transition hover:-rotate-6 hover:bg-redpen hover:text-paper-50 active:translate-x-[3px] active:translate-y-[3px] active:shadow-none"
          >
            ✕
          </button>
          <button
            onClick={() => doSwipe("raise_hand")}
            aria-label="Raise Hand"
            className="grid h-14 w-14 -translate-y-2 place-items-center rounded-2xl border-2 border-ink bg-forest-600 font-display text-xl text-paper-50 shadow-sticker transition hover:rotate-6 active:translate-x-[3px] active:translate-y-[3px] active:shadow-none"
          >
            ✋
          </button>
          <button
            onClick={() => doSwipe("add")}
            aria-label="Add"
            className="grid h-20 w-20 place-items-center rounded-2xl border-2 border-ink bg-crimson-600 font-display text-3xl text-paper-50 shadow-sticker transition hover:rotate-6 hover:bg-crimson-500 active:translate-x-[3px] active:translate-y-[3px] active:shadow-none"
          >
            ♥
          </button>
        </div>
      )}
      <p className="font-hand mt-3 text-center text-xl text-ink-faint">drag the card, or smash the buttons</p>

      {/* Match modal */}
      <Modal open={!!match} onClose={() => setMatch(null)}>
        {match && (
          <div className="text-center">
            <div className="mx-auto w-fit animate-pop">
              <Seal size={86} color="bg-marker text-ink">A+<br />match</Seal>
            </div>
            <h2 className="font-display mt-3 text-4xl uppercase leading-none">
              It&apos;s a <span className="text-crimson-600">match!</span>
            </h2>
            <p className="font-hand mt-1 text-2xl text-ink-light">you&apos;re on each other&apos;s syllabus</p>
            <div className="my-5 flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={match.profile.photos[0] ?? `/api/avatar/${match.profile.id}`}
                alt={match.profile.name}
                className="h-28 w-28 -rotate-3 rounded-2xl border-2 border-ink object-cover shadow-sticker"
              />
            </div>
            <p className="font-medium text-ink-light">
              You and <span className="hl font-bold text-ink">{match.profile.name}</span> added each other.
            </p>
            <div className="mt-5 flex gap-2">
              <button className="btn-ghost flex-1" onClick={() => setMatch(null)}>
                Keep swiping
              </button>
              <button
                className="btn-primary flex-1"
                onClick={() => router.push(`/office-hours/${match.matchId}`)}
              >
                Office Hours →
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Paywall modal */}
      <Modal open={!!paywall} onClose={() => setPaywall(null)} title="Whoa, keener">
        <p className="font-medium text-ink-light">{paywall}</p>
        <div className="mt-5 flex gap-2">
          <button className="btn-ghost flex-1" onClick={() => setPaywall(null)}>
            Not now
          </button>
          <Link href="/pricing" className="btn-marker flex-1">
            See plans
          </Link>
        </div>
      </Modal>

      {/* Verify gate (unverified browse mode) */}
      <Modal open={verifyOpen} onClose={() => setVerifyOpen(false)}>
        <VerifyCta
          plain
          title="Verify to connect"
          body="You're on blurred previews right now. Upload your college ID + a selfie to unblur profiles, add & drop, and start conversations."
          cta="Get verified (2h) →"
        />
      </Modal>

      {/* Class Roster modal */}
      <Modal open={rosterOpen} onClose={() => setRosterOpen(false)} title="Class Roster">
        {rosterGate === "not_verified" ? (
          <VerifyCta plain title="Verify to see your Class Roster" cta="Get verified →" />
        ) : !roster ? (
          <div className="flex justify-center py-6">
            <Spinner className="h-6 w-6 text-crimson-600" />
          </div>
        ) : !roster.entitled ? (
          <div className="text-center">
            <div className="mx-auto w-fit -rotate-6">
              <Seal size={96} color="bg-ink text-marker">{roster.count}<br />secret<br />admirers</Seal>
            </div>
            <p className="mt-3 font-medium text-ink-light">
              <span className="hl font-bold text-ink">{roster.count} students</span> already added you.
            </p>
            <p className="font-hand mt-1 text-2xl text-ink-faint">wanna see who? go enrolled ↓</p>
            <Link href="/pricing" className="btn-marker mt-4 w-full">
              Unlock Class Roster
            </Link>
          </div>
        ) : roster.cards.length === 0 ? (
          <p className="py-4 text-center font-medium text-ink-light">No one yet — get swiping!</p>
        ) : (
          <div className="grid max-h-[60vh] grid-cols-2 gap-3 overflow-y-auto">
            {roster.cards.map((c, i) => (
              <div key={c.id} className={`overflow-hidden rounded-xl border-2 border-ink bg-paper ${i % 2 === 0 ? "-rotate-1" : "rotate-1"}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={c.photos[0] ?? `/api/avatar/${c.id}`} alt={c.name} className="h-32 w-full border-b-2 border-ink object-cover" />
                <div className="p-2">
                  <p className="font-display text-xs uppercase">{c.name}, {c.age}</p>
                  <p className="text-[11px] font-bold uppercase text-ink-faint">{c.major}</p>
                  <div className="mt-1"><IntentBadge intent={c.intent} className="!text-[9px]" /></div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}

function EmptyDeck({ onRefresh, tier }: { onRefresh: () => void; tier: string }) {
  return (
    <div className="card taped ruled flex h-full flex-col items-center justify-center p-8 pt-10 text-center">
      <Doodle name="scribble" className="h-10 w-28 text-crimson-600" />
      <h3 className="font-display mt-3 text-2xl uppercase">All caught up</h3>
      <p className="font-hand mt-1 max-w-xs text-2xl leading-tight text-ink-light">
        no more classmates to grade right now…
      </p>
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        <button onClick={onRefresh} className="btn-ghost">Refresh</button>
        <Link href="/settings" className="btn-ghost">Preferences</Link>
        {tier === "audit" && <Link href="/pricing" className="btn-marker">Go inter-college</Link>}
      </div>
    </div>
  );
}
