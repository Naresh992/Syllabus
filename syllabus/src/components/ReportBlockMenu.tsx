"use client";
import { useState } from "react";
import Modal from "./Modal";
import { Spinner } from "./ui";
import { apiPost } from "@/lib/fetcher";
import { REPORT_REASONS } from "@/lib/constants";

export default function ReportBlockMenu({
  targetId,
  targetName,
  context,
  onBlocked,
  className,
}: {
  targetId: string;
  targetName: string;
  context?: string;
  onBlocked?: () => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"menu" | "report" | "block">("menu");
  const [reason, setReason] = useState<string>(REPORT_REASONS[0]);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  function reset() {
    setOpen(false);
    setTimeout(() => {
      setMode("menu");
      setDone(null);
      setReason(REPORT_REASONS[0]);
    }, 150);
  }

  async function submitReport() {
    setBusy(true);
    try {
      await apiPost("/api/report", { targetId, reason, context });
      setDone("Report filed. Our team will review it.");
    } catch (e: any) {
      setDone(e.message || "Could not submit report.");
    } finally {
      setBusy(false);
    }
  }

  async function submitBlock() {
    setBusy(true);
    try {
      await apiPost("/api/block", { targetId, action: "block" });
      reset();
      onBlocked?.();
    } catch (e: any) {
      setDone(e.message || "Could not block.");
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Safety options for ${targetName}`}
        className={
          className ??
          "grid h-9 w-9 place-items-center rounded-xl border-2 border-ink bg-paper-50 font-display text-ink shadow-sticker-sm transition hover:bg-marker"
        }
      >
        •••
      </button>

      <Modal open={open} onClose={reset} title="Safety">
        {done ? (
          <div className="space-y-4">
            <p className="text-ink-light">{done}</p>
            <button className="btn-primary w-full" onClick={reset}>
              Done
            </button>
          </div>
        ) : mode === "menu" ? (
          <div className="space-y-2">
            <p className="mb-2 text-sm text-ink-light">
              Keep Resyllabus safe. Report or block{" "}
              <span className="font-bold text-ink">{targetName}</span>.
            </p>
            <button className="btn-ghost w-full justify-start" onClick={() => setMode("report")}>
              <span className="grid h-6 w-6 place-items-center rounded-md border-2 border-ink bg-marker font-display text-xs">!</span>
              Report {targetName}
            </button>
            <button className="btn-danger w-full justify-start" onClick={() => setMode("block")}>
              <span className="grid h-6 w-6 place-items-center rounded-md border-2 border-ink bg-redpen font-display text-xs text-paper-50">✕</span>
              Block {targetName}
            </button>
          </div>
        ) : mode === "report" ? (
          <div className="space-y-3">
            <p className="text-sm text-ink-light">Why are you reporting {targetName}?</p>
            <div className="space-y-2">
              {REPORT_REASONS.map((r) => (
                <label key={r} className="flex cursor-pointer items-center gap-3 rounded-xl border-2 border-ink/15 bg-paper p-3 transition hover:border-ink hover:bg-marker-soft has-[:checked]:border-ink has-[:checked]:bg-marker-soft">
                  <input
                    type="radio"
                    name="reason"
                    checked={reason === r}
                    onChange={() => setReason(r)}
                    className="h-4 w-4 accent-crimson-600"
                  />
                  <span className="text-sm font-medium">{r}</span>
                </label>
              ))}
            </div>
            <div className="flex gap-2 pt-1">
              <button className="btn-ghost flex-1" onClick={() => setMode("menu")} disabled={busy}>
                Back
              </button>
              <button className="btn-primary flex-1" onClick={submitReport} disabled={busy}>
                {busy ? <Spinner className="h-4 w-4" /> : "Submit report"}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-ink-light">
              Blocking removes {targetName} from your Roster and stops all messages between you.
              This can be undone in Settings.
            </p>
            <div className="flex gap-2">
              <button className="btn-ghost flex-1" onClick={() => setMode("menu")} disabled={busy}>
                Back
              </button>
              <button className="btn-danger flex-1" onClick={submitBlock} disabled={busy}>
                {busy ? <Spinner className="h-4 w-4" /> : `Block ${targetName}`}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
