"use client";

import Link from "next/link";
import { useState } from "react";

import type { UpdateSummary } from "@/lib/update-types";

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));
}

export function UpdatesIndex({
  updates,
  currentSlug,
}: {
  updates: UpdateSummary[];
  currentSlug: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <aside
      className={`updates-on-page${open ? " is-open" : ""}`}
      aria-label="Update index"
    >
      <div className="updates-on-page__inner">
        <h2>Update index</h2>
        <button
          type="button"
          className="updates-on-page__toggle"
          aria-expanded={open}
          aria-controls="updates-index-nav"
          onClick={() => setOpen((value) => !value)}
        >
          <span>Update index</span>
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>
        <nav id="updates-index-nav" aria-label="Published updates">
          {updates.map((update) => (
            <Link
              className={`updates-on-page__link${update.slug === currentSlug ? " is-active" : ""}`}
              href={`/updates/${update.slug}`}
              key={update.slug}
              aria-current={update.slug === currentSlug ? "page" : undefined}
            >
              <time dateTime={update.date}>{formatDate(update.date)}</time>
              <span>{update.title}</span>
            </Link>
          ))}
        </nav>
      </div>
    </aside>
  );
}
