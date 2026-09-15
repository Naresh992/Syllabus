"use client";
import Script from "next/script";
import { useEffect, useRef } from "react";

interface AdSlotProps {
  slot: string;
  format?: "auto" | "rectangle" | "horizontal" | "vertical";
  style?: React.CSSProperties;
  className?: string;
}

export default function AdSlot({ slot, format = "auto", style, className }: AdSlotProps) {
  const insRef = useRef<HTMLModElement>(null);

  useEffect(() => {
    if (typeof window !== "undefined" && (window as any).adsbygoogle) {
      try {
        (window as any).adsbygoogle.push({});
      } catch (e) {
        console.debug("AdSense push error:", e);
      }
    }
  }, []);

  return (
    <ins
      ref={insRef}
      className={`adsbygoogle ${className ?? ""}`}
      style={{
        display: "block",
        ...(format === "auto" ? {} : format === "rectangle" ? { width: "300px", height: "250px" } : format === "horizontal" ? { width: "728px", height: "90px" } : { width: "160px", height: "600px" }),
        ...style,
      }}
      data-ad-client="ca-pub-6117481903078719"
      data-ad-slot={slot}
      data-ad-format={format}
      data-full-width-responsive="true"
    />
  );
}