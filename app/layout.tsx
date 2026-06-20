import type { Metadata } from "next";
import type { ReactNode } from "react";

import "./globals.css";

export const metadata: Metadata = {
  title: "Onyx",
  description:
    "Onyx prepares organizations for the quantum era through awareness, assessment, and defense-in-depth mitigation.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://esm.run" crossOrigin="" />
        <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="" />
        <link rel="preload" href="/landing/onyx-landing.mjs" as="script" />
        <link rel="modulepreload" href="https://esm.run/three@0.158.0" />
        <link rel="modulepreload" href="https://esm.run/simplex-noise@2.4.0" />
      </head>
      <body>{children}</body>
    </html>
  );
}
