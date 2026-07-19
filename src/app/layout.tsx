import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Sidebar from "@/components/Sidebar";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MentorOS — AI Learning OS",
  description: "Next-generation AI-powered Learning Operating System to automatically organize roadmaps, focus timers, projects, and job applications.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full dark antialiased`}
    >
      <body className="min-h-full bg-slate-950 text-slate-100 flex flex-row overflow-hidden">
        {/* Dynamic ambient background blobs */}
        <div className="fixed -z-10 top-0 left-0 right-0 bottom-0 overflow-hidden pointer-events-none opacity-40">
          <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-cyan-500/20 rounded-full blur-[100px] animate-blob-1" />
          <div className="absolute bottom-1/4 right-1/4 w-[450px] h-[450px] bg-purple-500/20 rounded-full blur-[120px] animate-blob-2" />
        </div>

        {/* Sidebar */}
        <Sidebar />

        {/* Main Content Area */}
        <main className="flex-1 h-screen overflow-y-auto relative flex flex-col bg-slate-950/20">
          {children}
        </main>
      </body>
    </html>
  );
}
