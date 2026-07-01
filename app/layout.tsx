import { Inter, Share_Tech_Mono } from "next/font/google";
import type { ReactNode } from "react";

import "./globals.css";
import "./landing.css";
import { siteMetadata } from "./seo-metadata";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-inter",
  display: "swap",
});

const shareTechMono = Share_Tech_Mono({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-share-tech-mono",
  display: "swap",
});

export const metadata = siteMetadata;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${shareTechMono.variable}`}>{children}</body>
    </html>
  );
}
