"use client";

import Script from "next/script";

interface AdsterraSlotProps {
  adKey?: string;
  className?: string;
}

export default function AdsterraSlot({ adKey, className }: AdsterraSlotProps) {
  if (!adKey) return null;

  return (
    <div className={className} aria-label="Advertisement">
      <Script id={`adsterra-options-${adKey}`} strategy="afterInteractive">
        {`window.atOptions = {
  key: ${JSON.stringify(adKey)},
  format: "iframe",
  height: 90,
  width: 728,
  params: {}
};`}
      </Script>
      <Script
        id={`adsterra-invoke-${adKey}`}
        src={`https://www.highrevenueformat.com/${encodeURIComponent(adKey)}/invoke.js`}
        strategy="afterInteractive"
      />
    </div>
  );
}
