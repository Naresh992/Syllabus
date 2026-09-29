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
  college: string | null;
  city: string | null;
  country: string | null;
  age: number;
  status: string;
  idPhotoUrl: string;
  selfieUrl: string;
  faceMatchScore: number | null;
  createdAt: string;
};

type EarnCompletion = {
  id: string;
  status: string;
  proofUrl: string | null;
  completedAt: string;
  user: { name: string; email: string };
  task: { title: string; category: string; payoutAmount: number };
};

type EarnPayout = {
  id: string;
  amount: number;
  upiId: string;
  status: string;
  createdAt: string;
  user: { name: string; email: string };
};

export default function AdminPage() {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [counts, setCounts] = useState({ pending: 0, approved: 0, rejected: 0 });
  const [filter, setFilter] = useState<"pending" | "all">("pending");
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [mainTab, setMainTab] = useState<"verify" | "earn">("verify");
  const [earnQueue, setEarnQueue] = useState<"completions" | "payouts">("completions");
  const [earnCompletions, setEarnCompletions] = useState<EarnCompletion[]>([]);
  const [earnPayouts, setEarnPayouts] = useState<EarnPayout[]>([]);
  const [earnLoading, setEarnLoading] = useState(false);
  const [earnBusy, setEarnBusy] = useState<string | null>(null);

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

  const loadEarn = useCallback(async () => {
    setEarnLoading(true);
    try {
      const data = await apiGet(`/api/admin/earn?queue=${earnQueue}`);
      if (earnQueue === "payouts") setEarnPayouts(data.payouts ?? []);
      else setEarnCompletions(data.completions ?? []);
    } finally {
      setEarnLoading(false);
    }
  }, [earnQueue]);

  useEffect(() => {
    if (mainTab === "earn") loadEarn();
  }, [mainTab, loadEarn]);

  async function reviewEarn(id: string, kind: "completion" | "payout", action: "approve" | "reject") {
    setEarnBusy(id);
    try {
      await apiPost(`/api/admin/earn/${id}`, { kind, action });
      await loadEarn();
    } finally {
      setEarnBusy(null);
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

      <div className="mb-4 inline-flex rounded-full border-2 border-ink bg-paper-50 p-1">
        {(["verify", "earn"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setMainTab(t)}
            className={`rounded-full px-4 py-1.5 font-display text-sm uppercase ${
              mainTab === t ? "bg-ink text-marker" : "text-ink-light"
            }`}
          >
            {t === "verify" ? "Verifications" : "Earn review"}
          </button>
        ))}
      </div>

      {mainTab === "verify" ? (
      <>
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
                  <p className="text-xs font-bold uppercase text-ink-faint">
                    {d.campus ?? "—"}{d.domain ? ` · ${d.domain}` : ""}
                    {[d.city, d.country].filter(Boolean).length > 0 ? ` · ${[d.city, d.country].filter(Boolean).join(", ")}` : ""}
                  </p>
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
      </>
      ) : (
      <>
      <div className="mb-4 inline-flex rounded-full border border-ink/10 bg-paper-50 p-1">
        {(["completions", "payouts"] as const).map((q) => (
          <button
            key={q}
            onClick={() => setEarnQueue(q)}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold capitalize ${
              earnQueue === q ? "bg-crimson-600 text-paper-50" : "text-ink-light"
            }`}
          >
            {q}
          </button>
        ))}
      </div>

      {earnLoading ? (
        <LoadingScreen label="Loading Earn queues…" />
      ) : earnQueue === "completions" ? (
        earnCompletions.length === 0 ? (
          <div className="card taped p-10 pt-12 text-center">
            <p className="font-display uppercase">All reviewed</p>
            <p className="font-hand text-2xl text-ink-light">no pending task submissions.</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {earnCompletions.map((c) => (
              <div key={c.id} className="card p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-display text-base uppercase">{c.task.title}</p>
                    <p className="text-sm font-medium text-ink-light">{c.user.name} · {c.user.email}</p>
                    <p className="text-xs font-bold uppercase text-ink-faint">
                      {c.task.category} · +₹{c.task.payoutAmount}
                    </p>
                  </div>
                  <StatusPill status={c.status} />
                </div>
                {c.proofUrl && (
                  <a href={c.proofUrl} target="_blank" rel="noreferrer" className="mt-2 block truncate text-xs font-bold text-crimson-600 underline">
                    Proof → {c.proofUrl}
                  </a>
                )}
                <div className="mt-3 flex gap-2">
                  <button className="btn-danger flex-1" onClick={() => reviewEarn(c.id, "completion", "reject")} disabled={earnBusy === c.id}>
                    Reject
                  </button>
                  <button className="btn-forest flex-1" onClick={() => reviewEarn(c.id, "completion", "approve")} disabled={earnBusy === c.id}>
                    {earnBusy === c.id ? <Spinner className="h-4 w-4" /> : `Approve +₹${c.task.payoutAmount}`}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : earnPayouts.length === 0 ? (
        <div className="card taped p-10 pt-12 text-center">
          <p className="font-display uppercase">All paid out</p>
          <p className="font-hand text-2xl text-ink-light">no pending withdrawals.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {earnPayouts.map((p) => (
            <div key={p.id} className="card p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-display text-base uppercase">₹{p.amount} → {p.upiId}</p>
                  <p className="text-sm font-medium text-ink-light">{p.user.name} · {p.user.email}</p>
                </div>
                <StatusPill status={p.status} />
              </div>
              <div className="mt-3 flex gap-2">
                <button className="btn-danger flex-1" onClick={() => reviewEarn(p.id, "payout", "reject")} disabled={earnBusy === p.id}>
                  Reject + refund
                </button>
                <button className="btn-forest flex-1" onClick={() => reviewEarn(p.id, "payout", "approve")} disabled={earnBusy === p.id}>
                  {earnBusy === p.id ? <Spinner className="h-4 w-4" /> : "Mark paid"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      </>
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
