import Link from "next/link";
import clsx from "clsx";

export default function Logo({
  size = "md",
  href = "/",
  className,
}: {
  size?: "sm" | "md" | "lg";
  href?: string | null;
  className?: string;
}) {
  const text = size === "lg" ? "text-2xl" : size === "sm" ? "text-base" : "text-lg";

  const inner = (
    <span className={clsx("inline-flex -rotate-2 items-center gap-0", className)}>
      <span
        className={clsx(
          "rounded-lg border-2 border-ink bg-ink px-2.5 py-1 font-display uppercase tracking-tight text-paper-50 shadow-sticker-sm",
          text
        )}
      >
        Syllabus<span className="text-marker">.</span>
      </span>
      {size !== "sm" && (
        <span className="ml-1.5 hidden rotate-2 rounded-md border-2 border-ink bg-marker px-1.5 py-0.5 font-display text-[10px] uppercase text-ink sm:inline-block">
          verified only
        </span>
      )}
    </span>
  );

  if (href) {
    return (
      <Link href={href} className="inline-flex transition-transform hover:rotate-1 hover:scale-105">
        {inner}
      </Link>
    );
  }
  return inner;
}
