import Link from "next/link";
import Logo from "@/components/Logo";
import { TIERS, TIER_ORDER } from "@/lib/tiers";
import { TAGLINE } from "@/lib/constants";
import { Seal, Marquee, TickerItem, Doodle } from "@/components/ui";

function SampleCard({
  seed,
  name,
  age,
  major,
  intent,
  rotate,
  className,
  floatDelay,
}: {
  seed: string;
  name: string;
  age: number;
  major: string;
  intent: string;
  rotate: string;
  className?: string;
  floatDelay?: string;
}) {
  return (
    <div
      className={`absolute w-48 animate-floaty overflow-hidden rounded-2xl border-2 border-ink bg-paper-50 shadow-sticker ${rotate} ${className ?? ""}`}
      style={floatDelay ? { animationDelay: floatDelay } : undefined}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/api/avatar/${seed}?label=${encodeURIComponent(name)}`}
        alt={name}
        className="h-52 w-full border-b-2 border-ink object-cover"
      />
      <div className="space-y-1.5 p-3">
        <p className="font-display text-base uppercase leading-none">
          {name} <span className="text-crimson-600">{age}</span>
        </p>
        <p className="text-xs font-bold uppercase tracking-wide text-ink-light">{major}</p>
        <span className="badge bg-ink text-marker">{intent}</span>
      </div>
    </div>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen overflow-x-clip bg-notebook">
      {/* Header */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
        <Logo href="/" size="md" />
        <div className="flex items-center gap-2">
          <Link href="/login" className="btn-ghost !py-2">
            Sign in
          </Link>
          <Link href="/enroll" className="btn-primary rotate-1 !py-2">
            Enroll →
          </Link>
        </div>
      </header>

      {/* ============ HERO ============ */}
      <section className="relative mx-auto grid max-w-6xl items-center gap-10 px-5 pb-14 pt-6 md:grid-cols-[1.1fr_0.9fr] md:pt-10">
        <div className="relative z-10">
          <p className="font-hand -rotate-2 text-3xl text-redpen">
            ★ the dating app for real students ★
          </p>
          <h1 className="font-display mt-3 text-[13vw] uppercase leading-[0.92] tracking-tight sm:text-6xl md:text-7xl lg:text-[5.2rem]">
            Add someone to your <span className="hl">syllabus</span>
            <span className="text-crimson-600">.</span>
          </h1>
          <p className="mt-5 max-w-md text-lg font-medium text-ink-light">
            {TAGLINE} Syllabus is exclusively for <b className="text-ink">verified, 18+ college
            students</b>. Real classmates. No bots. No randos. No weirdos from three area codes away.
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Link href="/enroll" className="btn-primary -rotate-1 px-8 py-3.5 !text-base">
              Enroll now — it&apos;s free
            </Link>
            <Link href="#how" className="btn-ghost rotate-1 px-8 py-3.5 !text-base">
              How it works
            </Link>
          </div>
          <Doodle name="arrow-curly" className="ml-40 mt-2 hidden h-14 w-14 -scale-x-100 text-redpen sm:block" />
        </div>

        {/* Sticker collage */}
        <div className="relative mx-auto hidden h-[440px] w-full max-w-sm md:block">
          <SampleCard seed="diego-santos-1" name="Diego" age={22} major="Mech. Eng." intent="Open to anything" rotate="-rotate-6" className="left-0 top-12" />
          <SampleCard seed="jade-wong-1" name="Jade" age={21} major="Fine Arts" intent="New friends" rotate="rotate-3" className="right-0 top-2" floatDelay="1.2s" />
          <SampleCard seed="priya-nair-1" name="Priya" age={22} major="Neuroscience" intent="Casual dating" rotate="-rotate-1" className="left-1/2 top-40 -translate-x-1/2" floatDelay="2.4s" />
          <div className="absolute -left-4 top-2 animate-floaty">
            <Seal size={104} spin={false} className="-rotate-12">
              100%<br />verified
            </Seal>
          </div>
          <div className="absolute -right-2 bottom-6 animate-floaty" style={{ animationDelay: "0.8s" }}>
            <Seal size={92} color="bg-marker text-ink" className="rotate-12">
              18+<br />only
            </Seal>
          </div>
          <Doodle name="heart" className="absolute bottom-16 left-6 h-12 w-12 text-crimson-600" />
          <Doodle name="sparkle" className="absolute right-8 top-48 h-10 w-10 text-ink" />
        </div>

        {/* Mobile seals */}
        <div className="flex gap-4 md:hidden">
          <Seal size={84}>100%<br />verified</Seal>
          <Seal size={84} color="bg-marker text-ink">18+<br />only</Seal>
          <p className="font-hand self-center text-2xl text-ink-light">real students,<br />zero catfish →</p>
        </div>
      </section>

      {/* ============ TICKER ============ */}
      <Marquee dark>
        <TickerItem>Add</TickerItem>
        <TickerItem>Drop</TickerItem>
        <TickerItem>Match</TickerItem>
        <TickerItem>Office hours</TickerItem>
        <TickerItem>Study group</TickerItem>
        <TickerItem>Repeat</TickerItem>
      </Marquee>

      {/* ============ HOW IT WORKS ============ */}
      <section id="how" className="mx-auto max-w-6xl scroll-mt-20 px-5 py-16">
        <p className="font-hand text-center text-3xl text-redpen">ok so how does class work?</p>
        <h2 className="font-display mx-auto max-w-2xl text-center text-4xl uppercase leading-none sm:text-5xl">
          Verification first. <span className="hl">Thirst second.</span>
        </h2>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { n: "01", t: "Enroll", d: "Sign up with your .edu email. Upload your student ID + a live selfie.", r: "-rotate-2", c: "bg-marker" },
            { n: "02", t: "Get verified", d: "We confirm you're a real 18+ student before you can browse a single profile.", r: "rotate-1", c: "bg-crimson-600" },
            { n: "03", t: "Hit the Syllabus", d: "Swipe right to ADD, left to DROP. Set your Prerequisites, raise hands.", r: "-rotate-1", c: "bg-forest-600" },
            { n: "04", t: "Office Hours", d: "Match into your Roster and start chatting. Slide in respectfully.", r: "rotate-2", c: "bg-ink" },
          ].map((s) => (
            <div key={s.n} className={`card taped p-6 pt-8 transition-transform hover:rotate-0 hover:scale-[1.03] ${s.r}`}>
              <div className={`inline-block rounded-lg border-2 border-ink px-2 py-0.5 font-display text-sm text-paper-50 ${s.c}`}>
                STEP {s.n}
              </div>
              <h3 className="font-display mt-3 text-2xl uppercase leading-none">{s.t}</h3>
              <p className="mt-2 text-sm font-medium text-ink-light">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ============ FEATURES BENTO ============ */}
      <section className="border-y-2 border-ink bg-paper-50/70">
        <div className="mx-auto max-w-6xl px-5 py-16">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="font-hand text-3xl text-redpen">the full course catalog</p>
              <h2 className="font-display text-4xl uppercase leading-none sm:text-5xl">
                Everything&apos;s on<br />the <span className="text-stroke">syllabus</span>
              </h2>
            </div>
            <Doodle name="scribble" className="h-12 w-32 text-crimson-600" />
          </div>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {[
              { t: "The Syllabus", d: "Your daily card stack. ADD or DROP classmates who match your vibe.", icon: "syllabus", big: true },
              { t: "My Roster", d: "Every mutual match in one tidy class list.", icon: "roster" },
              { t: "Office Hours", d: "Real-time chat with your matches.", icon: "chat" },
              { t: "Study Group", d: "Campus mixers with RSVP lists of verified students. Touch grass, together.", icon: "calendar" },
              { t: "Raise Hand", d: "Super-like someone to jump the queue and get noticed.", icon: "hand" },
              { t: "Class Roster", d: "See exactly who already added you. No more guessing.", icon: "roster" },
            ].map((f, i) => (
              <div
                key={f.t}
                className={`card group p-6 transition-transform hover:-translate-y-1 hover:rotate-0 ${
                  i % 3 === 0 ? "-rotate-1" : i % 3 === 1 ? "rotate-1" : "-rotate-1"
                } ${f.big ? "md:col-span-1 bg-ink text-paper-50" : ""}`}
              >
                <div className={`font-display text-4xl ${f.big ? "text-marker" : "text-crimson-600"} transition-transform group-hover:scale-110 group-hover:-rotate-6`}>
                  {f.icon === "syllabus" && "▤"}
                  {f.icon === "roster" && "♥"}
                  {f.icon === "chat" && "◭"}
                  {f.icon === "calendar" && "▦"}
                  {f.icon === "hand" && "✋"}
                </div>
                <h3 className="font-display mt-3 text-xl uppercase">{f.t}</h3>
                <p className={`mt-1 text-sm font-medium ${f.big ? "text-paper-50/70" : "text-ink-light"}`}>{f.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ TRUST (dark) ============ */}
      <section className="border-b-2 border-ink bg-ink text-paper-50">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 py-16 md:grid-cols-2">
          <div>
            <p className="font-hand text-3xl text-marker">no catfish. ever.</p>
            <h2 className="font-display text-4xl uppercase leading-[0.95] sm:text-5xl">
              Trust is the <span className="text-marker">whole point</span>
            </h2>
            <p className="mt-4 max-w-md font-medium text-paper-50/70">
              Dating apps are full of bots and liars. Syllabus isn&apos;t. Every single profile is a
              verified, 18+ college student — reviewed <i>before</i> they can ever swipe.
            </p>
            <Link href="/enroll" className="btn-marker mt-6 -rotate-1">
              Get verified →
            </Link>
          </div>
          <ul className="grid content-center gap-4 sm:grid-cols-2">
            {[
              ["ID + selfie check", "Manual review of a college ID and live selfie."],
              ["Strict 18+ gate", "Under-18 sign-ups are hard-blocked. Full stop."],
              ["No exact location", "Campus / city level only. Never your GPS."],
              ["Report + block", "On every profile and every chat."],
            ].map(([t, d], i) => (
              <li
                key={t}
                className={`rounded-2xl border-2 border-paper-50/90 bg-paper-50/5 p-4 ${i % 2 === 0 ? "rotate-1" : "-rotate-1"}`}
              >
                <p className="font-display text-sm uppercase text-marker">✓ {t}</p>
                <p className="mt-1 text-sm text-paper-50/70">{d}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ============ PRICING ============ */}
      <section className="mx-auto max-w-6xl px-5 py-16">
        <p className="font-hand text-center text-3xl text-redpen">pick your course load</p>
        <h2 className="font-display text-center text-4xl uppercase sm:text-5xl">
          Free to audit.<br />Cheap to <span className="hl">ace.</span>
        </h2>
        <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {TIER_ORDER.map((id, i) => {
            const t = TIERS[id];
            const featured = id === "enrolled";
            return (
              <div
                key={id}
                className={`card flex flex-col p-6 transition-transform hover:rotate-0 hover:scale-[1.03] ${
                  featured ? "rotate-1 bg-ink text-paper-50" : i % 2 === 0 ? "-rotate-1" : "rotate-1"
                }`}
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-xl uppercase">{t.name}</h3>
                  {featured && <span className="badge bg-marker text-ink">★ Popular</span>}
                </div>
                <p className={`mt-1 text-sm font-medium ${featured ? "text-paper-50/70" : "text-ink-light"}`}>{t.blurb}</p>
                <p className="font-display mt-4 text-4xl">
                  {t.priceInr === 0 ? "FREE" : <>₹{t.priceInr}<span className="text-base">/mo</span></>}
                </p>
                <ul className={`mt-4 flex-1 space-y-2 text-sm font-medium ${featured ? "text-paper-50/80" : "text-ink-light"}`}>
                  {t.perks.map((p) => (
                    <li key={p} className="flex gap-2">
                      <span className={featured ? "text-marker" : "text-forest-600"}>✓</span>
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
                <Link href="/enroll" className={featured ? "btn-marker mt-5 w-full" : "btn-primary mt-5 w-full"}>
                  {t.priceInr === 0 ? "Start free" : `Get ${t.name}`}
                </Link>
              </div>
            );
          })}
        </div>
      </section>

      <Marquee>
        <TickerItem>Verified students only</TickerItem>
        <TickerItem>Strictly 18+</TickerItem>
        <TickerItem>No catfish</TickerItem>
        <TickerItem>Add someone today</TickerItem>
      </Marquee>

      {/* ============ FINAL CTA ============ */}
      <section className="mx-auto max-w-6xl px-5 py-20 text-center">
        <Doodle name="sparkle" className="mx-auto h-12 w-12 text-crimson-600" />
        <h2 className="font-display mx-auto mt-4 max-w-3xl text-5xl uppercase leading-[0.92] sm:text-7xl">
          Your seat is <span className="hl-red">saved.</span>
        </h2>
        <p className="font-hand mx-auto mt-3 max-w-md text-3xl text-ink-light">
          class starts whenever you enroll…
        </p>
        <Link href="/enroll" className="btn-primary mx-auto mt-7 -rotate-1 px-10 py-4 !text-lg">
          Enroll in Syllabus →
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t-2 border-ink bg-paper-50">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-5 py-8 sm:flex-row">
          <Logo href="/" size="sm" />
          <p className="font-hand text-2xl text-ink-faint">add someone to your syllabus.</p>
          <div className="flex gap-4 font-display text-xs uppercase">
            <Link href="/login" className="hover:text-crimson-600">Sign in</Link>
            <Link href="/enroll" className="hover:text-crimson-600">Enroll</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
