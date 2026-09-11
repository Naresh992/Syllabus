"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import clsx from "clsx";
import Logo from "./Logo";
import { apiPost } from "@/lib/fetcher";
import { getTier } from "@/lib/tiers";

type ShellUser = {
  name: string;
  tier: string;
  isAdmin: boolean;
  verificationStatus: string;
};

function Icon({ name, className }: { name: string; className?: string }) {
  const paths: Record<string, React.ReactNode> = {
    syllabus: <path d="M4 5.5C4 4.7 4.7 4 5.5 4H11v15H5.5A1.5 1.5 0 0 1 4 17.5v-12ZM13 4h5.5c.8 0 1.5.7 1.5 1.5v12a1.5 1.5 0 0 1-1.5 1.5H13V4Z" />,
    roster: <path d="M12 21s-7-4.3-9.3-8.5C1 9.4 2.6 6 6 6c2 0 3.2 1.2 4 2.3C10.8 7.2 12 6 14 6c3.4 0 5 3.4 3.3 6.5C19 16.7 12 21 12 21Z" />,
    chat: <path d="M4 5h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H9l-5 4V6a1 1 0 0 1 1-1Z" />,
    calendar: <path d="M7 2v3M17 2v3M3.5 8h17M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" />,
    shield: <path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3Zm-1.2 12.5 5-5-1.4-1.4-3.6 3.6-1.6-1.6L7.8 12l3 3.5Z" />,
    settings: <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm8-3.5a8 8 0 0 0-.2-1.7l2-1.6-2-3.4-2.4 1a8 8 0 0 0-3-1.7L14 0h-4l-.4 2.6a8 8 0 0 0-3 1.7l-2.4-1-2 3.4 2 1.6A8 8 0 0 0 4 12c0 .6 0 1.1.2 1.7l-2 1.6 2 3.4 2.4-1a8 8 0 0 0 3 1.7L10 24h4l.4-2.6a8 8 0 0 0 3-1.7l2.4 1 2-3.4-2-1.6c.1-.6.2-1.1.2-1.7Z" />,
    logout: <path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 17l-5-5 5-5M4 12h11" />,
  };
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" stroke="none" aria-hidden>
      {paths[name]}
    </svg>
  );
}

export default function AppShell({
  user,
  children,
}: {
  user: ShellUser;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  const tier = getTier(user.tier);

  const nav = user.isAdmin
    ? [
        { href: "/admin", label: "Verify", icon: "shield" },
        { href: "/study-group", label: "Study Group", icon: "calendar" },
      ]
    : [
        { href: "/syllabus", label: "The Syllabus", icon: "syllabus" },
        { href: "/roster", label: "My Roster", icon: "roster" },
        { href: "/office-hours", label: "Office Hours", icon: "chat" },
        { href: "/study-group", label: "Study Group", icon: "calendar" },
      ];

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  async function logout() {
    setLoggingOut(true);
    await apiPost("/api/auth/logout").catch(() => null);
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-notebook">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b-2 border-ink bg-paper/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-2.5">
          <Logo href={user.isAdmin ? "/admin" : "/syllabus"} size="sm" />

          {/* Desktop nav */}
          <nav className="hidden items-center gap-2 md:flex">
            {nav.map((n, i) => (
              <Link
                key={n.href}
                href={n.href}
                className={clsx(
                  "flex items-center gap-1.5 rounded-xl border-2 px-3 py-1.5 font-display text-xs uppercase tracking-wide transition-all",
                  i % 2 === 0 ? "-rotate-1" : "rotate-1",
                  isActive(n.href)
                    ? "border-ink bg-ink text-marker shadow-sticker-sm"
                    : "border-transparent text-ink-light hover:rotate-0 hover:border-ink hover:bg-marker-soft"
                )}
              >
                <Icon name={n.icon} className="h-4 w-4" />
                {n.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            {!user.isAdmin && (
              <Link
                href="/pricing"
                className={clsx(
                  "badge shadow-sticker-sm -rotate-1 transition hover:rotate-1",
                  tier.id === "audit"
                    ? "bg-marker text-ink"
                    : "bg-ink text-marker"
                )}
                title="Manage plan"
              >
                {tier.id === "extra_credit" ? "★ " : ""}
                {tier.name}
              </Link>
            )}
            <Link
              href="/settings"
              className={clsx(
                "grid h-9 w-9 place-items-center rounded-xl border-2 transition",
                isActive("/settings")
                  ? "border-ink bg-ink text-marker"
                  : "border-transparent text-ink-light hover:border-ink hover:bg-marker-soft"
              )}
              title="Settings"
              aria-label="Settings"
            >
              <Icon name="settings" className="h-5 w-5" />
            </Link>
            <button
              onClick={logout}
              disabled={loggingOut}
              className="grid h-9 w-9 place-items-center rounded-xl border-2 border-transparent text-ink-light transition hover:border-ink hover:bg-redpen/10 hover:text-redpen"
              title="Sign out"
              aria-label="Sign out"
            >
              <Icon name="logout" className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto w-full max-w-5xl px-4 pb-28 pt-6 md:pb-10">{children}</main>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t-2 border-ink bg-paper/95 backdrop-blur md:hidden">
        <div className="mx-auto flex max-w-5xl items-stretch justify-around px-2 pb-[env(safe-area-inset-bottom)]">
          {nav.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={clsx(
                "relative flex flex-1 flex-col items-center gap-0.5 py-2.5 font-display text-[10px] uppercase tracking-wide transition",
                isActive(n.href) ? "text-ink" : "text-ink-faint"
              )}
            >
              <span
                className={clsx(
                  "grid h-9 w-12 place-items-center rounded-xl border-2 transition",
                  isActive(n.href)
                    ? "border-ink bg-marker shadow-sticker-sm -rotate-3"
                    : "border-transparent"
                )}
              >
                <Icon name={n.icon} className="h-5 w-5" />
              </span>
              {n.label}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
