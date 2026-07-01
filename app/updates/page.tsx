import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { UpdateArticle } from "@/components/updates/update-article";
import { getAllUpdates } from "@/lib/updates";

export async function generateMetadata(): Promise<Metadata> {
  const [latestUpdate] = await getAllUpdates();

  if (!latestUpdate) {
    return { title: "Updates | Onyx" };
  }

  return {
    title: `${latestUpdate.title} | Onyx Updates`,
    description: latestUpdate.description,
    alternates: { canonical: "/updates" },
  };
}

export default async function UpdatesPage() {
  const updates = await getAllUpdates();
  const latestUpdate = updates[0];

  if (!latestUpdate) notFound();

  return <UpdateArticle update={latestUpdate} updates={updates} />;
}
