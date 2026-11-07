import type { Metadata } from "next";
import { Suspense } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import { BoardSync } from "@/components/realtime/board-sync";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Kanban Mini",
  description:
    "A real-time, login-free kanban Board built with Next.js and React.",
};

export default function RootLayout({ children, modal }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        {children}
        {modal}
        <Toaster position="bottom-right" />
        {/* Changes by other Guests appear live, on the Board and in Task detail. */}
        <Suspense>
          <BoardSync />
        </Suspense>
      </body>
    </html>
  );
}
