"use client";

import Link from "next/link";
import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import type { UpdateSummary } from "@/lib/update-types";

export function UpdatesSearch({ updates }: { updates: UpdateSummary[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");

  const matches = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) return [];

    return updates
      .filter((update) =>
        `${update.title} ${update.description}`.toLowerCase().includes(normalizedQuery),
      )
      .slice(0, 6);
  }, [query, updates]);

  const openFirstMatch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (matches[0]) router.push(`/updates/${matches[0].slug}`);
  };

  return (
    <form className="updates-search" role="search" onSubmit={openFirstMatch}>
      <label>
        <span className="sr-only">Search updates</span>
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m21 21-4.35-4.35" />
        </svg>
        <input
          type="search"
          placeholder="Search updates..."
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          autoComplete="off"
        />
      </label>

      {query.trim() ? (
        <div className="updates-search__results" aria-label="Search results">
          {matches.length > 0 ? (
            matches.map((update) => (
              <Link href={`/updates/${update.slug}`} key={update.slug}>
                <span>{update.title}</span>
                <small>{update.date}</small>
              </Link>
            ))
          ) : (
            <p>No matching updates.</p>
          )}
        </div>
      ) : null}
    </form>
  );
}
