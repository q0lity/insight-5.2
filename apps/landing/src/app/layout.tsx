import type { Metadata } from "next";
import { Figtree, Merriweather } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";

const figtree = Figtree({
  subsets: ["latin"],
  variable: "--font-figtree",
  display: "swap",
});

const merriweather = Merriweather({
  weight: ["300", "400", "700", "900"],
  subsets: ["latin"],
  variable: "--font-merriweather",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Insight | Connect the Dots",
  description: "Capture chaotic thoughts instantly and get AI-synthesized briefs.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${figtree.variable} ${merriweather.variable}`}>
      <body className="animated-bg min-h-screen">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}