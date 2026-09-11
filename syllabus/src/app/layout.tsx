import type { Metadata, Viewport } from "next";
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
  title: "Syllabus — Add someone to your syllabus",
  description:
    "Syllabus is the dating app exclusively for verified college students. Enroll, browse The Syllabus, build your Roster, and slide into Office Hours.",
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
        {children}
      </body>
    </html>
  );
}
