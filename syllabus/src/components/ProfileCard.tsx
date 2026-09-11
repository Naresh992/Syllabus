"use client";
import { useState } from "react";
import clsx from "clsx";
import { IntentBadge, ValedictorianBadge } from "./ui";
import ReportBlockMenu from "./ReportBlockMenu";
import type { CardProfile } from "@/lib/serialize";

export default function ProfileCard({
  profile,
  onBlocked,
  showSafety = true,
}: {
  profile: CardProfile;
  onBlocked?: () => void;
  showSafety?: boolean;
}) {
  const [idx, setIdx] = useState(0);
  const [open, setOpen] = useState(false);
  const photos = profile.photos.length
    ? profile.photos
    : [`/api/avatar/${profile.id}?label=${encodeURIComponent(profile.name)}`];
  const clampedIdx = Math.min(idx, photos.length - 1);

  return (
    <div className="relative h-full w-full select-none overflow-hidden rounded-3xl border-2 border-ink bg-paper-50 shadow-sticker">
      {/* Photo */}
      <div className="relative h-full w-full">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photos[clampedIdx]}
          alt={profile.name}
          className="h-full w-full object-cover"
          draggable={false}
        />

        {/* progress tabs */}
        {photos.length > 1 && (
          <div className="absolute inset-x-3 top-3 flex gap-1.5">
            {photos.map((_, i) => (
              <div
                key={i}
                className={clsx(
                  "h-1.5 flex-1 rounded-full border border-ink/60",
                  i === clampedIdx ? "bg-marker" : "bg-paper-50/50"
                )}
              />
            ))}
          </div>
        )}

        {/* tap zones */}
        <button
          type="button"
          aria-label="Previous photo"
          className="absolute inset-y-0 left-0 w-1/3"
          onClick={() => setIdx((i) => Math.max(0, i - 1))}
        />
        <button
          type="button"
          aria-label="Next photo"
          className="absolute inset-y-0 right-0 w-1/3"
          onClick={() => setIdx((i) => Math.min(photos.length - 1, i + 1))}
        />

        {/* super-like ribbon */}
        {profile.superLikedYou && (
          <div className="absolute right-3 top-12 rotate-3 rounded-lg border-2 border-ink bg-forest-600 px-2.5 py-1 font-display text-[11px] uppercase text-paper-50 shadow-sticker-sm">
            Raised a hand for you
          </div>
        )}
        {!profile.superLikedYou && profile.likedYou && (
          <div className="absolute right-3 top-12 rotate-2 rounded-lg border-2 border-ink bg-crimson-600 px-2.5 py-1 font-display text-[11px] uppercase text-paper-50 shadow-sticker-sm">
            Already added you
          </div>
        )}

        {showSafety && (
          <div className="absolute right-3 top-3">
            <ReportBlockMenu
              targetId={profile.id}
              targetName={profile.name}
              context="profile"
              onBlocked={onBlocked}
            />
          </div>
        )}

        {/* Bottom info overlay */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink via-ink/50 to-transparent p-4 pt-16 text-paper-50">
          <div className="flex items-end justify-between gap-2">
            <div>
              <h3 className="font-display text-2xl uppercase leading-none">
                {profile.name} <span className="text-marker">{profile.age}</span>
              </h3>
              <p className="mt-1 text-xs font-bold uppercase tracking-wide opacity-90">
                {profile.major}
                {profile.campus ? ` · ${profile.campus}` : ""}
              </p>
              <p className="text-[11px] font-medium uppercase tracking-wide opacity-70">{profile.classYear}</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="pointer-events-auto grid h-10 w-10 shrink-0 place-items-center rounded-xl border-2 border-ink bg-marker text-ink shadow-sticker-sm transition hover:rotate-6"
              aria-label="Show more"
            >
              <svg viewBox="0 0 24 24" className={clsx("h-5 w-5 transition", open && "rotate-180")} fill="none" stroke="currentColor" strokeWidth="3">
                <path d="m6 15 6-6 6 6" />
              </svg>
            </button>
          </div>
          <div className="pointer-events-auto mt-2 flex flex-wrap gap-1.5">
            <IntentBadge intent={profile.intent} />
            {profile.hookupOptIn && profile.intent !== "Hookup Culture" && (
              <span className="badge bg-paper-50 text-redpen shadow-sticker-sm">Open to hookups</span>
            )}
            {profile.topBadge && <ValedictorianBadge />}
          </div>
        </div>
      </div>

      {/* Details sheet */}
      <div
        className={clsx(
          "scroll-thin absolute inset-x-0 bottom-0 max-h-[75%] overflow-y-auto rounded-t-3xl border-t-2 border-ink bg-paper-50 p-5 shadow-card transition-transform duration-300",
          open ? "translate-y-0" : "translate-y-full"
        )}
      >
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-display text-xl uppercase">
            {profile.name}, {profile.age}
          </h3>
          <button onClick={() => setOpen(false)} className="grid h-8 w-8 place-items-center rounded-lg border-2 border-ink bg-paper-200 font-display text-sm hover:bg-marker" aria-label="Close">
            ✕
          </button>
        </div>
        {profile.bio && <p className="mb-4 font-medium text-ink-light">{profile.bio}</p>}
        <div className="space-y-3">
          {profile.prompts.map((p, i) => (
            <div key={i} className={clsx("rounded-xl border-2 border-ink bg-paper p-3", i % 2 === 0 ? "-rotate-[0.5deg]" : "rotate-[0.5deg]")}>
              <p className="font-display text-[11px] uppercase tracking-wide text-crimson-600">{p.q}</p>
              <p className="font-academic mt-1 text-lg leading-snug text-ink">{p.a}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
