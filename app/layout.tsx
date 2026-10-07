import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { AudioProvider } from "@/lib/audio-context";
import { StickyPlayer } from "@/components/studio/StickyPlayer";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Acoustic — AI Audio Studio for Creators",
  description:
    "Generate copyright-free music, SFX, and edit audio — all in one place. Built for YouTubers, TikTok creators, and podcasters.",
  openGraph: {
    title: "Acoustic — AI Audio Studio for Creators",
    description:
      "Stop juggling 5 tools. Generate studio-quality audio in seconds.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-black" style={{ fontFamily: "Inter, sans-serif" }}>
        <AudioProvider>
          {children}
          <StickyPlayer />
        </AudioProvider>
        <Toaster theme="dark" position="bottom-right" />
      </body>
    </html>
  );
}
