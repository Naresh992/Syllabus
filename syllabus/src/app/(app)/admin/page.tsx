"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { LoadingScreen, Spinner, Pill, SectionTitle, Doodle } from "@/components/ui";
import { apiGet, apiPost } from "@/lib/fetcher";

type Doc = {
  id: string;
  userId: string;
  name: string;
  email: string;
  campus: string | null;
  domain: string | null;
  age: number;
  status: string;
  idPhotoUrl: string;
  selfieUrl: string;
  faceMatchScore: number | null;
  createdAt: string;
};

export default function AdminPage() {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [counts, setCounts] = useState({ pending: 0, approved: 0, rejected: 0 });
  const [filter, setFilter] = useState<"pending" | "all">("pending");
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiGet(`/api/admin/verifications?status=${filter}`);
      setDocs(data.docs);
      setCounts(data.counts);
      setForbidden(false);
    } catch (e: any) {
      if (e.status === 403 || e.status === 401) setForbidden(true);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  async function review(id: string, action: "approve" | "reject") {
    setBusyId(id);
    try {
      await apiPost(`/api/admin/verifications/${id}`, { action });
      await load();
    } finally {
      setBusyId(null);
    }
  }

  if (forbidden) {
    return (
      <div className="mx-auto max-w-lg pt-10 text-center">
        <div className="card taped p-8 pt-10">
          <div className="mx-auto grid h-14 w-14 -rotate-6 place-items-center rounded-2xl border-2 border-ink bg-ink font-display text-xl text-marker">!</div>
          <h1 className="font-display mt-3 text-2xl uppercase">Admins only</h1>
          <p className="mt-2 font-medium text-ink-light">This is the verification dashboard for staff.</p>
          <Link href="/syllabus" className="btn-primary mt-5">Back to The Syllabus</Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <SectionTitle
          eyebrow="grade the applicants"
          title={<>Verification <span className="hl">desk</span></>}
          blurb="Approve or reject student ID submissions."
        />
        <div className="flex items-center gap-2">
          <Pill tone="crimson">{counts.pending} pending</Pill>
          <Pill tone="forest">{counts.approved} approved</Pill>
          <Pill tone="muted">{counts.rejected} rejected</Pill>
        </div>
      </div>

      <div className="mb-4 inline-flex rounded-full border border-ink/10 bg-paper-50 p-1">
        {(["pending", "all"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold capitalize ${
              filter === f ? "bg-crimson-600 text-paper-50" : "text-ink-light"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {loading ? (
        <LoadingScreen label="Loading submissions…" />
      ) : docs.length === 0 ? (
        <div className="card taped p-10 pt-12 text-center">
          <Doodle name="scribble" className="mx-auto h-10 w-28 text-forest-600" />
          <p className="font-display mt-2 uppercase">Inbox zero</p>
          <p className="font-hand text-2xl text-ink-light">no {filter === "pending" ? "pending" : ""} submissions. touch grass.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {docs.map((d) => (
            <div key={d.id} className="card p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-display text-base uppercase">{d.name}, {d.age}</p>
                  <p className="text-sm font-medium text-ink-light">{d.email}</p>
                  <p className="text-xs font-bold uppercase text-ink-faint">{d.campus} · {d.domain}</p>
                </div>
                <StatusPill status={d.status} />
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2">
                <DocImage label="College ID" src={d.idPhotoUrl} />
                <DocImage label="Selfie" src={d.selfieUrl} />
              </div>

              <div className="mt-3 flex items-center justify-between">
                <span className="text-xs text-ink-faint">
                  Face match (placeholder):{" "}
                  <span className="font-semibold text-ink">
                    {d.faceMatchScore != null ? `${Math.round(d.faceMatchScore * 100)}%` : "—"}
                  </span>
                </span>
              </div>

              {d.status === "pending" && (
                <div className="mt-3 flex gap-2">
                  <button className="btn-danger flex-1" onClick={() => review(d.id, "reject")} disabled={busyId === d.id}>
                    Reject
                  </button>
                  <button className="btn-forest flex-1" onClick={() => review(d.id, "approve")} disabled={busyId === d.id}>
                    {busyId === d.id ? <Spinner className="h-4 w-4" /> : "Approve"}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: "bg-marker text-ink",
    approved: "bg-forest-600 text-paper-50",
    rejected: "bg-redpen text-paper-50",
  };
  return <span className={`badge shadow-sticker-sm ${map[status] ?? "bg-paper-200 text-ink"}`}>{status}</span>;
}

function DocImage({ label, src }: { label: string; src: string }) {
  return (
    <div>
      <p className="mb-1 text-xs font-semibold text-ink-light">{label}</p>
      <div className="aspect-[4/3] overflow-hidden rounded-xl border-2 border-ink bg-paper-200">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={label} className="h-full w-full object-cover" />
      </div>
    </div>
  );
}
