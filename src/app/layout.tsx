import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { Inter_Tight } from "next/font/google";
import "./globals.css";

const interTight = Inter_Tight({
  variable: "--font-inter-tight",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Beats for Days — Infinite Instrumentals",
  description:
    "An infinite hip hop beat player. No names, no tracklist. Just numbered beats, pressed one after another.",
};

export const viewport: Viewport = {
  colorScheme: "light",
  themeColor: PALETTE.sleeve,
};

import { AudioPlayerProvider } from "@/components/audio/AudioPlayerContext";
import { PersistentPlayerBar } from "@/components/audio/PersistentPlayerBar";
import { DebugPanelGate } from "@/components/debug/DebugPanelGate";
import { HeaderNav } from "@/components/navigation/HeaderNav";
import { API_ROUTES } from "@/lib/constants";
import { getServerEnv } from "@/lib/env";
import { PALETTE } from "@/lib/design-tokens";

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${interTight.variable} h-full antialiased`}>
      <head>
        <link
          rel="preload"
          href={API_ROUTES.BEATS_NEXT}
          as="fetch"
          crossOrigin="anonymous"
        />
      </head>
      <body className="flex min-h-full flex-col pb-24 font-sans">
        <Suspense fallback={null}>
          <AudioPlayerProvider>
            <HeaderNav />
            {children}
            <PersistentPlayerBar />
            {/* Off unless DEBUG_PANEL=true; then it still needs ?debug=1. */}
            {getServerEnv().DEBUG_PANEL ? <DebugPanelGate /> : null}
          </AudioPlayerProvider>
        </Suspense>
      </body>
    </html>
  );
}
