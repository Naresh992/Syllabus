import Link from "next/link";

export default function VerifyCta({
  title = "Verify to unlock",
  body,
  cta = "Get verified →",
  plain,
  className,
}: {
  title?: string;
  body?: string;
  cta?: string;
  plain?: boolean;
  className?: string;
}) {
  return (
    <div className={`mx-auto max-w-lg text-center ${plain ? "" : "card taped ruled p-8 pt-10"} ${className ?? ""}`}>
      <div className="mx-auto mb-4 grid h-16 w-16 rotate-3 place-items-center rounded-2xl border-2 border-ink bg-forest-600 font-display text-3xl text-paper-50 shadow-sticker-sm">
        ✓
      </div>
      <p className="font-hand -rotate-1 text-2xl text-redpen">real students only…</p>
      <h1 className="font-display text-2xl uppercase leading-tight sm:text-3xl">{title}</h1>
      <p className="mx-auto mt-2 max-w-sm text-ink-light">
        {body ??
          "You're browsing blurred previews. Upload your college ID + a live selfie to unblur profiles and message your connections. Your ID is never shown to other users."}
      </p>

      <div className="mx-auto mt-5 max-w-xs space-y-1.5 rounded-xl border-2 border-forest-600/20 bg-forest-600/5 p-3 text-left text-xs font-semibold text-ink-light">
        <p>🔒 ID + selfie never shown to other users</p>
        <p>⚡ Verified within 2 hours</p>
        <p>🎓 Only real, enrolled 18+ students</p>
      </div>

      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <Link href="/enroll?m=verify" className="btn-primary">
          {cta}
        </Link>
        <Link href="/syllabus" className="btn-ghost">
          Keep browsing blurred
        </Link>
      </div>
      <p className="mt-4 text-xs text-ink-faint">
        Questions?{" "}
        <a href="mailto:resyllabus1@gmail.com" className="underline hover:text-crimson-600">
          resyllabus1@gmail.com
        </a>{" "}
        ·{" "}
        <Link href="/privacy" className="underline hover:text-crimson-600">
          Privacy
        </Link>
      </p>
    </div>
  );
}