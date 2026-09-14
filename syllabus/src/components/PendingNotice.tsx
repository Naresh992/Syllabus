import Link from "next/link";

export default function PendingNotice({
  status,
  variant = "verification",
}: {
  status?: string;
  variant?: "verification" | "profile";
}) {
  if (variant === "profile") {
    return (
      <div className="mx-auto max-w-lg">
        <div className="card taped ruled p-8 pt-10 text-center">
          <div className="mx-auto mb-4 grid h-14 w-14 rotate-3 place-items-center rounded-2xl border-2 border-ink bg-forest-600 font-display text-2xl text-paper-50">
            ✎
          </div>
          <h1 className="font-display text-2xl uppercase">Finish enrolling</h1>
          <p className="mx-auto mt-2 max-w-sm text-ink-light">
            You&apos;re verified! Build your profile to start browsing The Syllabus.
          </p>
          <Link href="/enroll" className="btn-primary mt-5">
            Complete my profile →
          </Link>
        </div>
      </div>
    );
  }

  const rejected = status === "rejected";
  return (
    <div className="mx-auto max-w-lg">
      <div className="card taped ruled p-8 pt-10 text-center">
        <div
          className={`mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full border-2 border-ink font-display text-3xl shadow-sticker-sm ${
            rejected ? "-rotate-6 bg-redpen text-paper-50" : "rotate-6 bg-marker text-ink animate-wiggle"
          }`}
        >
          {rejected ? "✕" : "◷"}
        </div>
        <p className="font-hand text-2xl text-redpen -rotate-1">
          {rejected ? "needs a rewrite…" : "hold tight…"}
        </p>
        <h1 className="font-display text-2xl uppercase leading-tight">
          {rejected ? "Verification declined" : "Enrollment under review"}
        </h1>
        <p className="mx-auto mt-2 max-w-sm text-ink-light">
          {rejected ? (
            <>
              We couldn&apos;t verify your student status from the documents provided. Re-submit a
              clearer college ID and selfie.
            </>
          ) : (
            <>
              We&apos;re confirming you&apos;re a real, enrolled student. Only verified students can
              browse and connect with verified students — that keeps Resyllabus trusted.
            </>
          )}
        </p>

        <div className="mt-5 flex flex-wrap justify-center gap-2">
          {rejected && (
            <Link href="/enroll" className="btn-primary">
              Re-submit documents
            </Link>
          )}
          <Link href="/settings" className="btn-ghost">
            Go to Settings
          </Link>
        </div>

        <p className="mx-auto mt-4 max-w-sm font-hand text-lg text-ink-faint">Verified within 2 hours — we&apos;ll notify you by email.</p>
        <p className="mx-auto mt-3 max-w-sm text-xs text-ink-faint">Questions? <a href="mailto:resyllabus1@gmail.com" className="underline hover:text-crimson-600">resyllabus1@gmail.com</a> · <a href="/privacy" className="underline hover:text-crimson-600">Privacy</a> · <a href="/contact" className="underline hover:text-crimson-600">Contact</a></p>
      </div>
    </div>
  );
}
