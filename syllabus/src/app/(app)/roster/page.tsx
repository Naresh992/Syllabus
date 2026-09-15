"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { LoadingScreen, IntentBadge, SectionTitle, Doodle } from "@/components/ui";
import VerifyCta from "@/components/VerifyCta";
import AdSlot from "@/components/AdSlot";
import { apiGet } from "@/lib/fetcher";
import { timeAgo } from "@/lib/time";
import type { CardProfile } from "@/lib/serialize";

type RosterItem = {
  matchId: string;
  matchedAt: string;
  profile: CardProfile;
  lastMessage: { content: string; sentAt: string; fromMe: boolean } | null;
};

export default function RosterPage() {
  const [roster, setRoster] = useState<RosterItem[] | null>(null);
  const [gate, setGate] = useState<"not_verified" | null>(null);

  useEffect(() => {
    apiGet("/api/matches")
      .then((d) => setRoster(d.roster))
      .catch((e) => {
        if (e.data?.code === "not_verified") setGate("not_verified");
        else setRoster([]);
      });
  }, []);

  if (gate === "not_verified")
    return <VerifyCta className="mt-10" title="Verify to see your Roster" />;
  if (!roster) return <LoadingScreen label="Loading your roster…" />;

  return (
    <div className="mx-auto max-w-2xl">
      <SectionTitle
        eyebrow="mutual adds only"
        title={<>My <span className="hl">Roster</span></>}
        blurb="Everyone you're mutually enrolled with."
      />

      {roster.length === 0 ? (
        <div className="card taped ruled mt-6 p-10 pt-12 text-center">
          <Doodle name="heart" className="mx-auto h-12 w-12 text-crimson-600" />
          <h3 className="font-display mt-3 text-xl uppercase">Your roster is empty</h3>
          <p className="font-hand mt-1 text-2xl text-ink-light">go add some classmates…</p>
          <Link href="/syllabus" className="btn-primary mt-4">Open The Syllabus →</Link>
        </div>
      ) : (
        <>
          <div className="mt-5 space-y-2">
            {roster.map((r) => (
              <Link
                key={r.matchId}
                href={`/office-hours/${r.matchId}`}
                className="card flex items-center gap-3 p-3 transition hover:-translate-y-0.5 hover:rotate-[0.3deg]"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={r.profile.photos[0] ?? `/api/avatar/${r.profile.id}`}
                  alt={r.profile.name}
                  className="h-16 w-16 flex-shrink-0 -rotate-2 rounded-xl border-2 border-ink object-cover"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-display text-base uppercase">
                      {r.profile.name}, {r.profile.age}
                    </p>
                    <span className="badge bg-paper-200 !text-[10px] text-ink-faint">
                      {timeAgo(r.lastMessage?.sentAt ?? r.matchedAt)}
                    </span>
                  </div>
                  <p className="truncate text-sm font-medium text-ink-light">
                    {r.lastMessage ? (
                      <>
                        {r.lastMessage.fromMe && <span className="text-ink-faint">You: </span>}
                        {r.lastMessage.content}
                      </>
                    ) : (
                      <span className="font-hand text-xl text-crimson-600">new connection — say hi!</span>
                    )}
                  </p>
                  <div className="mt-1">
                    <IntentBadge intent={r.profile.intent} className="text-[10px]" />
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {/* ============ AD SLOT (roster) ============ */}
          <div className="mt-6">
            <AdSlot slot="3344556677" format="auto" className="mx-auto max-w-2xl" />
          </div>
        </>
      )}
    </div>
  );
}
