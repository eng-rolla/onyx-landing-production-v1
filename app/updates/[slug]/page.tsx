import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { UpdateArticle } from "@/components/updates/update-article";
import { getAllUpdates, getUpdateBySlug } from "@/lib/updates";

type UpdatePostPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  const updates = await getAllUpdates();
  return updates.map((update) => ({ slug: update.slug }));
}

export async function generateMetadata({ params }: UpdatePostPageProps): Promise<Metadata> {
  const { slug } = await params;
  const update = await getUpdateBySlug(slug);

  if (!update) return {};

  return {
    title: `${update.title} | Onyx Updates`,
    description: update.description,
    alternates: { canonical: `/updates/${update.slug}` },
    openGraph: {
      type: "article",
      title: update.title,
      description: update.description,
      url: `/updates/${update.slug}`,
      publishedTime: update.date,
    },
  };
}

export default async function UpdatePostPage({ params }: UpdatePostPageProps) {
  const { slug } = await params;
  const [update, updates] = await Promise.all([getUpdateBySlug(slug), getAllUpdates()]);

  if (!update) notFound();

  return <UpdateArticle update={update} updates={updates} />;
}
