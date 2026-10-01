import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Archivo_Black, Space_Grotesk, Caveat } from "next/font/google";
import "./globals.css";

const display = Archivo_Black({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-display",
});

const grotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-grotesk",
});

const hand = Caveat({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-hand",
});

export const metadata: Metadata = {
  title: "Resyllabus — Add someone to your syllabus",
  description:
    "Resyllabus is a verified-only platform connecting college students and nearby campuses. Find study partners, friends, or dates — everyone is ID-verified so no fake profiles or randoms.",
};

export const viewport: Viewport = {
  themeColor: "#b81f2d",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${display.variable} ${grotesk.variable} ${hand.variable}`}>
        <Script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-6117481903078719"
          crossOrigin="anonymous"
          strategy="beforeInteractive"
        />
        <Script
          async
          data-cfasync="false"
          src="https://pl31583232.profitableratecpmnetwork.com/aeeb1039dc99d6817abc5f57552ddefd/invoke.js"
          strategy="afterInteractive"
        />
        {children}
        <div id="container-aeeb1039dc99d6817abc5f57552ddefd" />
      </body>
    </html>
  );
}
