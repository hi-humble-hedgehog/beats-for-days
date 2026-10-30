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
import { DebugPanelGate } from "@/components/debug/DebugPanelGate";
import { AppChrome } from "@/components/layout/AppChrome";
import { API_ROUTES } from "@/lib/constants";
import { getServerEnv } from "@/lib/env";
import { PALETTE } from "@/lib/design-tokens";

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${interTight.variable} h-full bg-background text-foreground antialiased`}
      style={{ backgroundColor: PALETTE.sleeve, color: PALETTE.vinyl }}
    >
      <head>
        <style
          dangerouslySetInnerHTML={{
            __html: `html,body{background-color:${PALETTE.sleeve};color:${PALETTE.vinyl};}`,
          }}
        />
        <link
          rel="preload"
          href={API_ROUTES.BEATS_NEXT}
          as="fetch"
          crossOrigin="anonymous"
        />
      </head>
      <body className="flex min-h-full flex-col font-sans">
        <AudioPlayerProvider>
          <AppChrome>{children}</AppChrome>
          {/* Off unless DEBUG_PANEL=true; then it still needs ?debug=1. */}
          {getServerEnv().DEBUG_PANEL ? (
            <Suspense fallback={null}>
              <DebugPanelGate />
            </Suspense>
          ) : null}
        </AudioPlayerProvider>
      </body>
    </html>
  );
}
