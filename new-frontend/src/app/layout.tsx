import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DeerFlow AI - Lightweight Workspace",
  description: "High-performance, clean AI chat studio",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased selection:bg-primary/20">{children}</body>
    </html>
  );
}
