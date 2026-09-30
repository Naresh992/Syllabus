"use client";

import { useEffect, useRef } from "react";

interface AdsterraSlotProps {
  adKey?: string;
  className?: string;
}

export default function AdsterraSlot({ adKey, className }: AdsterraSlotProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !adKey) return;

    const options = document.createElement("script");
    options.text = `window.atOptions = {
  key: ${JSON.stringify(adKey)},
  format: "iframe",
  height: 90,
  width: 728,
  params: {}
};`;

    const invoke = document.createElement("script");
    invoke.async = true;
    invoke.src = `https://www.highrevenueformat.com/${encodeURIComponent(adKey)}/invoke.js`;

    container.append(options, invoke);

    return () => {
      options.remove();
      invoke.remove();
    };
  }, [adKey]);

  if (!adKey) return null;

  return (
    <div ref={containerRef} className={className} aria-label="Advertisement" />
  );
}
