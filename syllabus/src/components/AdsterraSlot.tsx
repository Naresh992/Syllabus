"use client";

import { useEffect, useRef } from "react";

declare global {
  interface Window {
    atOptions?: {
      key: string;
      format: string;
      height: number;
      width: number;
      params: Record<string, string>;
    };
  }
}

interface AdsterraSlotProps {
  adKey?: string;
  className?: string;
}

export default function AdsterraSlot({ adKey, className }: AdsterraSlotProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !adKey) return;

    window.atOptions = {
      key: adKey,
      format: "iframe",
      height: 90,
      width: 728,
      params: {},
    };

    const invoke = document.createElement("script");
    invoke.async = true;
    invoke.src = `https://pl31583232.profitableratecpmnetwork.com/${encodeURIComponent(adKey)}/invoke.js`;

    container.appendChild(invoke);

    return () => {
      invoke.remove();
    };
  }, [adKey]);

  if (!adKey) return null;

  return (
    <div ref={containerRef} className={className} aria-label="Advertisement" />
  );
}
