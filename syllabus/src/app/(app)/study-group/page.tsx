"use client";
import { useEffect, useState } from "react";
import { LoadingScreen, Pill, SectionTitle } from "@/components/ui";
import PendingNotice from "@/components/PendingNotice";
import { apiGet, apiPost } from "@/lib/fetcher";
import { eventDate } from "@/lib/time";

type EventItem = {
  id: string;
  title: string;
  description: string;
  date: string;
  location: string;
  campus: string;
  sameCampus: boolean;
  attendeeCount: number;
  attending: boolean;
  attendees: { name: string; photo: string | null }[];
};

export default function StudyGroupPage() {
  const [events, setEvents] = useState<EventItem[] | null>(null);
  const [gate, setGate] = useState<"not_verified" | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    apiGet("/api/events")
      .then((d) => setEvents(d.events))
      .catch((e) => (e.data?.code === "not_verified" ? setGate("not_verified") : setEvents([])));
  }, []);

  async function toggleRsvp(id: string) {
    setBusy(id);
    try {
      const { attending, count } = await apiPost(`/api/events/${id}/rsvp`);
      setEvents((evs) =>
        evs!.map((e) => (e.id === id ? { ...e, attending, attendeeCount: count } : e))
      );
    } finally {
      setBusy(null);
    }
  }

  if (gate === "not_verified") return <PendingNotice status="pending" />;
  if (!events) return <LoadingScreen label="Finding your Study Group…" />;

  return (
    <div className="mx-auto max-w-3xl">
      <SectionTitle
        eyebrow="touch grass, together"
        title={<>Study <span className="hl">Group</span></>}
        blurb="Campus mixers & events — RSVP to meet verified students IRL."
      />

      <div className="mt-6 space-y-4">
        {events.map((e) => (
          <div key={e.id} className="card overflow-hidden">
            <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start">
              <div className="flex-1">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <Pill tone={e.sameCampus ? "crimson" : "muted"}>{e.campus}</Pill>
                  {e.sameCampus && <span className="text-xs font-semibold text-forest-700">Your campus</span>}
                </div>
                <h3 className="font-display text-xl uppercase leading-tight">{e.title}</h3>
                <p className="mt-1 text-sm font-medium text-ink-light">{e.description}</p>
                <div className="mt-3 space-y-1 text-sm font-bold text-ink">
                  <p><span className="badge bg-marker !text-[10px]">when</span> {eventDate(e.date)}</p>
                  <p><span className="badge bg-paper-200 !text-[10px]">where</span> {e.location}</p>
                </div>

                {/* attendees */}
                <div className="mt-3 flex items-center gap-3">
                  <div className="flex -space-x-2">
                    {e.attendees.slice(0, 6).map((a, i) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={i}
                        src={a.photo ?? `/api/avatar/${encodeURIComponent(a.name)}?label=${encodeURIComponent(a.name)}`}
                        alt={a.name}
                        title={a.name}
                        className="h-8 w-8 rounded-full border-2 border-ink object-cover"
                      />
                    ))}
                  </div>
                  <span className="text-sm text-ink-light">
                    {e.attendeeCount} verified {e.attendeeCount === 1 ? "student" : "students"} going
                  </span>
                </div>
              </div>

              <button
                onClick={() => toggleRsvp(e.id)}
                disabled={busy === e.id}
                className={e.attending ? "btn-ghost sm:w-32" : "btn-primary sm:w-32"}
              >
                {e.attending ? "✓ Going" : "RSVP"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
