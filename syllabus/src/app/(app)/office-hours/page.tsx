"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { LoadingScreen, SectionTitle, Doodle } from "@/components/ui";
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

export default function OfficeHoursInbox() {
  const [roster, setRoster] = useState<RosterItem[] | null>(null);
  const [gate, setGate] = useState<"not_verified" | null>(null);

  useEffect(() => {
    apiGet("/api/matches")
      .then((d) => setRoster(d.roster))
      .catch((e) => (e.data?.code === "not_verified" ? setGate("not_verified") : setRoster([])));
  }, []);

  if (gate === "not_verified")
    return <VerifyCta className="mt-10" title="Verify to unlock Office Hours" />;
  if (!roster) return <LoadingScreen label="Opening Office Hours…" />;

  return (
    <div className="mx-auto max-w-2xl">
      <SectionTitle
        eyebrow="the professor will see you now"
        title={<>Office <span className="hl">Hours</span></>}
        blurb="Chat with your connections in real time."
      />

      {roster.length === 0 ? (
        <div className="card taped ruled mt-6 p-10 pt-12 text-center">
          <Doodle name="scribble" className="mx-auto h-10 w-28 text-crimson-600" />
          <h3 className="font-display mt-3 text-xl uppercase">No conversations yet</h3>
          <p className="font-hand mt-1 text-2xl text-ink-light">connect with someone first…</p>
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
                  className="h-14 w-14 flex-shrink-0 -rotate-2 rounded-xl border-2 border-ink object-cover"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-display text-sm uppercase">{r.profile.name}</p>
                    <span className="flex-shrink-0 text-xs font-bold text-ink-faint">
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
                      <span className="font-hand text-xl text-crimson-600">say hi!</span>
                    )}
                  </p>
                </div>
              </Link>
            ))}
          </div>

          {/* ============ AD SLOT (office hours) ============ */}
          <div className="mt-6">
            <AdSlot slot="5566778899" format="auto" className="mx-auto max-w-2xl" />
          </div>
        </>
      )}
    </div>
  );
}
