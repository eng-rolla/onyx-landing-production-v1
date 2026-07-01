import type { Metadata } from "next";

import { SITE_URL } from "@/lib/site-url";

const title = "Onyx";
const description =
  "Onyx helps users prepare for quantum-era cybersecurity risks through awareness, assessment, and defense-in-depth mitigation";

export const siteMetadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title,
  description,
  applicationName: "Onyx",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: "/",
    siteName: "Onyx",
    title,
    description,
  },
  twitter: {
    card: "summary",
    title,
    description,
  },
};
