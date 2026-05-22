import type { Metadata } from "next";
import "./globals.css";
import DebugBoot from "./_debug-boot";

export const metadata: Metadata = {
  title: "Game Night",
  description: "Game prototype — v1",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#0a0a0f] text-white antialiased">
        <DebugBoot />
        {children}
      </body>
    </html>
  );
}
