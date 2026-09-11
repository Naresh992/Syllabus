"use client";
import { useEffect } from "react";
import clsx from "clsx";

export default function Modal({
  open,
  onClose,
  children,
  title,
  className,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  className?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center p-0 sm:items-center sm:p-4">
      <div
        className="absolute inset-0 bg-ink/60 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        className={clsx(
          "taped relative w-full max-w-md rounded-t-3xl border-2 border-ink bg-paper-50 p-5 pt-7 shadow-sticker-lg animate-pop sm:rounded-3xl",
          className
        )}
      >
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-lg border-2 border-ink bg-paper-200 font-display text-sm transition hover:rotate-90 hover:bg-marker"
        >
          ✕
        </button>
        {title && <h2 className="font-display mb-3 pr-8 text-lg uppercase leading-tight">{title}</h2>}
        {children}
      </div>
    </div>
  );
}
