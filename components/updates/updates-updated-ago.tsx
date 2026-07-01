"use client";

import { useEffect, useState } from "react";

function relativeFrom(iso: string) {
  const then = new Date(iso).getTime();
  const minutes = Math.max(0, Math.floor((Date.now() - then) / 60_000));

  if (minutes < 1) return "Updated just now";
  if (minutes < 60) return `Updated ${minutes} minute${minutes === 1 ? "" : "s"} ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Updated ${hours} hour${hours === 1 ? "" : "s"} ago`;

  const days = Math.floor(hours / 24);
  return `Updated ${days} day${days === 1 ? "" : "s"} ago`;
}

export function UpdatesUpdatedAgo({ updatedAt }: { updatedAt: string }) {
  const [label, setLabel] = useState("");

  useEffect(() => {
    const update = () => setLabel(relativeFrom(updatedAt));
    update();
    const id = setInterval(update, 60_000);
    return () => clearInterval(id);
  }, [updatedAt]);

  return (
    <p className="updates-reader-header__updated" suppressHydrationWarning>
      {label}
    </p>
  );
}
