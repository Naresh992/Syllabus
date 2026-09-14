"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { LoadingScreen, Spinner } from "@/components/ui";
import ReportBlockMenu from "@/components/ReportBlockMenu";
import { apiGet, apiPost } from "@/lib/fetcher";
import { clockTime } from "@/lib/time";
import type { CardProfile } from "@/lib/serialize";

type Msg = { id: string; content: string; sentAt: string; fromMe: boolean };

export default function ThreadPage({ params }: { params: { matchId: string } }) {
  const { matchId } = params;
  const router = useRouter();
  const [other, setOther] = useState<CardProfile | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [blocked, setBlocked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  async function loadThread(initial = false) {
    try {
      const d = await apiGet(`/api/messages/${matchId}`);
      setOther(d.other);
      setBlocked(d.blocked);
      setMessages((prev) => {
        // avoid clobbering if nothing changed (keeps input smooth)
        if (prev.length === d.messages.length && prev[prev.length - 1]?.id === d.messages[d.messages.length - 1]?.id) {
          return prev;
        }
        return d.messages;
      });
    } catch (e: any) {
      if (initial) setError(e.data?.code === "not_verified" ? "not_verified" : e.message);
    } finally {
      if (initial) setLoading(false);
    }
  }

  useEffect(() => {
    loadThread(true);
    const t = setInterval(() => loadThread(false), 2500); // lightweight "real-time"
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const content = input.trim();
    if (!content || sending) return;
    setSending(true);
    setInput("");
    const optimistic: Msg = {
      id: `tmp-${Date.now()}`,
      content,
      sentAt: new Date().toISOString(),
      fromMe: true,
    };
    setMessages((m) => [...m, optimistic]);
    try {
      const { message } = await apiPost(`/api/messages/${matchId}`, { content });
      setMessages((m) => m.map((x) => (x.id === optimistic.id ? message : x)));
    } catch (err: any) {
      setMessages((m) => m.filter((x) => x.id !== optimistic.id));
      setInput(content);
      setError(err.message);
      setTimeout(() => setError(null), 2500);
    } finally {
      setSending(false);
    }
  }

  if (loading) return <LoadingScreen label="Opening the conversation…" />;
  if (error === "not_verified") {
    return (
      <div className="py-6 text-center text-ink-light">Only verified students can message.</div>
    );
  }
  if (!other) {
    return (
      <div className="mx-auto max-w-md py-10 text-center">
        <p className="text-ink-light">This conversation isn&apos;t available.</p>
        <Link href="/office-hours" className="btn-ghost mt-4">Back to Office Hours</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto flex h-[calc(100vh-9.5rem)] max-w-2xl flex-col md:h-[calc(100vh-7rem)]">
      {/* header */}
      <div className="flex items-center gap-3 border-b border-ink/10 pb-3">
        <Link href="/office-hours" className="grid h-9 w-9 place-items-center rounded-full hover:bg-paper-200" aria-label="Back">
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="m15 18-6-6 6-6" />
          </svg>
        </Link>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={other.photos[0] ?? `/api/avatar/${other.id}`} alt={other.name} className="h-10 w-10 -rotate-3 rounded-xl border-2 border-ink object-cover" />
        <div className="flex-1">
          <p className="font-display text-base uppercase leading-none">{other.name}</p>
          <p className="text-[11px] font-bold uppercase tracking-wide text-ink-faint">{other.major}{other.campus ? ` · ${other.campus}` : ""}</p>
        </div>
        <ReportBlockMenu
          targetId={other.id}
          targetName={other.name}
          context={`chat:${matchId}`}
          onBlocked={() => router.push("/office-hours")}
        />
      </div>

      {/* messages */}
      <div ref={scrollRef} className="scroll-thin ruled flex-1 space-y-2 overflow-y-auto py-4">
        {messages.length === 0 && (
          <p className="py-10 text-center text-sm text-ink-faint">
            You connected with {other.name}. Break the ice!
          </p>
        )}
        {messages.map((m) => (
          <div key={m.id} className={clsx("flex", m.fromMe ? "justify-end" : "justify-start")}>
            <div
              className={clsx(
                "max-w-[78%] rounded-2xl border-2 border-ink px-4 py-2 text-sm",
                m.fromMe
                  ? "rounded-br-sm bg-crimson-600 text-paper-50 shadow-sticker-sm"
                  : "rounded-bl-sm bg-paper-50 text-ink shadow-sticker-sm"
              )}
            >
              <p className="whitespace-pre-wrap break-words">{m.content}</p>
              <p className={clsx("mt-1 text-[10px]", m.fromMe ? "text-paper-100/80" : "text-ink-faint")}>
                {clockTime(m.sentAt)}
              </p>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* composer */}
      {blocked ? (
        <div className="border-t border-ink/10 py-4 text-center text-sm text-ink-faint">
          Messaging is unavailable. You can manage blocks in Settings.
        </div>
      ) : (
        <form onSubmit={send} className="flex items-center gap-2 border-t border-ink/10 pt-3">
          <input
            className="input flex-1"
            placeholder={`Message ${other.name}…`}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            maxLength={2000}
          />
          <button type="submit" className="btn-primary !px-4" disabled={sending || !input.trim()}>
            {sending ? <Spinner className="h-4 w-4" /> : "Send"}
          </button>
        </form>
      )}
      {error && error !== "not_verified" && (
        <p className="pt-2 text-center text-xs text-redpen">{error}</p>
      )}
    </div>
  );
}
