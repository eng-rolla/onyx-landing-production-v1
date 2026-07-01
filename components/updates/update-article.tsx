import Image from "next/image";
import Link from "next/link";
import { MDXRemote } from "next-mdx-remote/rsc";

import { UpdatesIndex } from "@/components/updates/updates-index";
import { UpdatesSearch } from "@/components/updates/updates-search";
import { UpdatesUpdatedAgo } from "@/components/updates/updates-updated-ago";
import type { UpdatePost } from "@/lib/update-types";

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));
}

// Intrinsic pixel sizes for images used in update posts. Add an entry when you
// reference a new image so it renders with explicit dimensions (no layout shift).
const UPDATE_IMAGE_DIMENSIONS: Record<string, { width: number; height: number }> = {
  "/landing/updates/onyx-waitlist-email.png": { width: 1134, height: 1194 },
};

const mdxComponents = {
  img: ({ src, alt }: { src?: string; alt?: string }) => {
    const dimensions = src ? UPDATE_IMAGE_DIMENSIONS[src] : undefined;

    if (!src || !dimensions) {
      // eslint-disable-next-line @next/next/no-img-element
      return <img src={src} alt={alt ?? ""} loading="lazy" />;
    }

    return (
      <Image
        src={src}
        alt={alt ?? ""}
        width={dimensions.width}
        height={dimensions.height}
        sizes="(max-width: 820px) 100vw, 920px"
      />
    );
  },
};

export function UpdateArticle({
  update,
  updates,
}: {
  update: UpdatePost;
  updates: UpdatePost[];
}) {
  return (
    <div className="updates-page update-post-page">
      <div className="update-post-layout">
        <header className="updates-reader-header">
          <Link className="updates-reader-header__logo" href="/" aria-label="Onyx home">
            <Image
              src="/logo/onyx-logo-horizontal-black-transparent.png"
              alt="Onyx"
              width={666}
              height={375}
              priority
            />
          </Link>
          <h1>Updates</h1>
          <p className="updates-reader-header__subtitle">
            Latest updates and notes on Onyx
          </p>
          <UpdatesUpdatedAgo updatedAt={updates[0]?.updatedAt ?? update.updatedAt} />
          <UpdatesSearch updates={updates} />
        </header>

        <article className="update-post">
          <header className="update-post__header">
            <h1>{update.title}</h1>
            <time dateTime={update.date}>{formatDate(update.date)}</time>
          </header>

          <div className="update-prose">
            <MDXRemote source={update.content} components={mdxComponents} />
          </div>
        </article>

        <UpdatesIndex updates={updates} currentSlug={update.slug} />
      </div>
    </div>
  );
}
