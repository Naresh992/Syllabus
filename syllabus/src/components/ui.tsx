"use client";
import clsx from "clsx";

export function Spinner({ className }: { className?: string }) {
  return (
    <svg className={clsx("animate-spin", className)} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="4" />
      <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

export function LoadingScreen({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3">
      <div className="animate-wiggle font-display text-4xl">✎</div>
      <p className="font-hand text-2xl text-ink-light">{label}</p>
    </div>
  );
}

const INTENT_STYLES: Record<string, string> = {
  "New Friends": "bg-forest-600 text-paper-50",
  "Study Buddy First": "bg-sky-500 text-paper-50",
  "Open to Anything": "bg-paper-200 text-ink",
};

export function IntentBadge({ intent, className }: { intent: string; className?: string }) {
  return (
    <span
      className={clsx(
        "badge shadow-sticker-sm",
        INTENT_STYLES[intent] ?? "bg-paper-200 text-ink",
        className
      )}
    >
      {intent}
    </span>
  );
}

export function ValedictorianBadge() {
  return (
    <span className="badge bg-marker text-ink shadow-sticker-sm" title="Valedictorian — Extra Credit member">
      ★ Valedictorian
    </span>
  );
}

export function Pill({
  children,
  tone = "default",
  className,
}: {
  children: React.ReactNode;
  tone?: "default" | "crimson" | "forest" | "muted" | "marker";
  className?: string;
}) {
  const tones = {
    default: "bg-paper-50 text-ink",
    crimson: "bg-crimson-600 text-paper-50",
    forest: "bg-forest-600 text-paper-50",
    muted: "bg-paper-200 text-ink-light",
    marker: "bg-marker text-ink",
  };
  return <span className={clsx("badge", tones[tone], className)}>{children}</span>;
}

export function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={clsx(
        "relative h-7 w-12 flex-shrink-0 rounded-full border-2 border-ink transition disabled:opacity-40",
        checked ? "bg-crimson-600" : "bg-paper-200"
      )}
    >
      <span
        className={clsx(
          "absolute top-[1px] h-5 w-5 rounded-full border-2 border-ink bg-paper-50 transition-all",
          checked ? "left-[22px]" : "left-[1px]"
        )}
      />
    </button>
  );
}

export function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        "rounded-xl border-2 border-ink px-3.5 py-1.5 text-sm font-bold transition-all",
        active
          ? "bg-ink text-marker shadow-sticker-sm -rotate-1"
          : "bg-paper-50 text-ink hover:-rotate-1 hover:bg-marker-soft"
      )}
    >
      {children}
    </button>
  );
}

/* Starburst seal — "100% VERIFIED", "18+ ONLY", etc. */
export function Seal({
  children,
  color = "bg-crimson-600 text-paper-50",
  size = 92,
  spin = false,
  className,
}: {
  children: React.ReactNode;
  color?: string;
  size?: number;
  spin?: boolean;
  className?: string;
}) {
  // Literal fill classes so Tailwind generates them.
  const FILLS: Record<string, string> = {
    "bg-crimson-600": "fill-crimson-600",
    "bg-marker": "fill-marker",
    "bg-forest-600": "fill-forest-600",
    "bg-ink": "fill-ink",
    "bg-paper-50": "fill-paper-50",
  };
  const bg = color.split(" ")[0];
  const points: string[] = [];
  const spikes = 14;
  for (let i = 0; i < spikes * 2; i++) {
    const r = i % 2 === 0 ? 50 : 40;
    const a = (Math.PI * i) / spikes - Math.PI / 2;
    points.push(`${50 + r * Math.cos(a)},${50 + r * Math.sin(a)}`);
  }
  return (
    <div
      className={clsx("relative grid place-items-center", spin && "animate-spin-slow", className)}
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full drop-shadow-[2px_2px_0_rgba(34,26,20,1)]">
        <polygon points={points.join(" ")} className="fill-ink" transform="translate(1.5,1.5)" />
        <polygon points={points.join(" ")} className={FILLS[bg] ?? "fill-crimson-600"} />
      </svg>
      <div
        className={clsx(
          "relative z-10 text-center font-display uppercase leading-[1.05]",
          color.split(" ").slice(1).join(" ")
        )}
        style={{ fontSize: size / 6.4 }}
      >
        {children}
      </div>
    </div>
  );
}

/* Loud page header: handwritten eyebrow + giant display title */
export function SectionTitle({
  eyebrow,
  title,
  blurb,
  align = "left",
}: {
  eyebrow: string;
  title: React.ReactNode;
  blurb?: string;
  align?: "left" | "center";
}) {
  return (
    <div className={clsx("mb-5", align === "center" && "text-center")}>
      <p className="font-hand text-2xl text-redpen -rotate-1">{eyebrow}</p>
      <h1 className="font-display text-3xl leading-[1.02] tracking-tight text-ink sm:text-4xl">
        {title}
      </h1>
      {blurb && <p className="mt-1.5 max-w-lg text-ink-light">{blurb}</p>}
    </div>
  );
}

/* Infinite ticker band */
export function Marquee({
  children,
  fast,
  dark,
  className,
}: {
  children: React.ReactNode;
  fast?: boolean;
  dark?: boolean;
  className?: string;
}) {
  const row = (
    <div className="flex shrink-0 items-center">
      {children}
    </div>
  );
  return (
    <div
      className={clsx(
        "overflow-hidden border-y-2 border-ink py-2.5",
        dark ? "bg-ink text-marker" : "bg-marker text-ink",
        className
      )}
    >
      <div className={clsx("flex w-max gap-0 whitespace-nowrap", fast ? "animate-marquee-fast" : "animate-marquee")}>
        {row}
        {row}
      </div>
    </div>
  );
}

export function TickerItem({ children }: { children: React.ReactNode }) {
  return (
    <span className="mx-5 font-display text-sm uppercase tracking-widest">
      {children} <span className="ml-10">✦</span>
    </span>
  );
}

/* Hand-drawn doodles (arrows, hearts, scribbles, stars) */
export function Doodle({
  name,
  className,
}: {
  name: "arrow" | "arrow-curly" | "heart" | "scribble" | "star" | "sparkle";
  className?: string;
}) {
  const paths: Record<string, React.ReactNode> = {
    arrow: (
      <path d="M6 84 C 40 80, 70 60, 96 30 M96 30 l-16 4 M96 30 l-3 16" strokeWidth="5" strokeLinecap="round" fill="none" />
    ),
    "arrow-curly": (
      <path d="M10 20 C 50 10, 90 25, 80 60 C 75 78, 55 82, 48 68 M48 68 l-10 2 M48 68 l2 10" strokeWidth="5" strokeLinecap="round" fill="none" />
    ),
    heart: (
      <path d="M60 105 C 30 75, 8 55, 8 35 C 8 20, 20 12, 32 12 C 44 12, 54 22, 60 32 C 66 22, 76 12, 88 12 C 100 12, 112 20, 112 35 C 112 55, 90 75, 60 105 Z" strokeWidth="6" fill="none" strokeLinejoin="round" />
    ),
    scribble: (
      <path d="M8 60 C 30 20, 50 100, 72 55 C 85 30, 95 70, 116 50" strokeWidth="6" strokeLinecap="round" fill="none" />
    ),
    star: (
      <path d="M60 8 L72 44 L110 44 L79 66 L90 102 L60 80 L30 102 L41 66 L10 44 L48 44 Z" strokeWidth="5" strokeLinejoin="round" fill="none" />
    ),
    sparkle: (
      <path d="M60 5 C 63 40, 70 55, 115 60 C 70 65, 63 80, 60 115 C 57 80, 50 65, 5 60 C 50 55, 57 40, 60 5 Z" strokeWidth="4" strokeLinejoin="round" fill="none" />
    ),
  };
  return (
    <svg viewBox="0 0 120 120" className={className} stroke="currentColor" aria-hidden>
      {paths[name]}
    </svg>
  );
}
