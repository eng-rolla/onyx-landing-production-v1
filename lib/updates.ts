import "server-only";

import { execFile } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import { cache } from "react";
import matter from "gray-matter";

const execFileAsync = promisify(execFile);

import {
  UPDATE_CATEGORIES,
  type UpdateCategory,
  type UpdatePost,
  type UpdateSummary,
} from "@/lib/update-types";

const updatesDirectory = path.join(process.cwd(), "content", "updates");
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function isUpdateCategory(value: unknown): value is UpdateCategory {
  return UPDATE_CATEGORIES.includes(value as UpdateCategory);
}

function requireString(
  value: unknown,
  field: keyof UpdateSummary,
  fileName: string,
): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Invalid or missing \"${field}\" in ${fileName}`);
  }

  return value.trim();
}

async function getModifiedAt(filePath: string): Promise<string> {
  try {
    const { stdout } = await execFileAsync(
      "git",
      ["log", "-1", "--format=%cI", "--", filePath],
      { cwd: process.cwd() },
    );
    const iso = stdout.trim();
    if (iso) return iso;
  } catch {
    // git unavailable or file not committed — fall back to filesystem mtime
  }

  const stats = await fs.stat(filePath);
  return stats.mtime.toISOString();
}

async function readUpdate(fileName: string): Promise<UpdatePost> {
  const filePath = path.join(updatesDirectory, fileName);
  const rawFile = await fs.readFile(filePath, "utf8");
  const { data, content } = matter(rawFile);

  const title = requireString(data.title, "title", fileName);
  const date = requireString(data.date, "date", fileName);
  const description = requireString(data.description, "description", fileName);
  const slug = requireString(data.slug, "slug", fileName);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(`${date}T00:00:00Z`))) {
    throw new Error(`Invalid \"date\" in ${fileName}; expected YYYY-MM-DD`);
  }

  if (!isUpdateCategory(data.category)) {
    throw new Error(
      `Invalid \"category\" in ${fileName}; expected ${UPDATE_CATEGORIES.join(", ")}`,
    );
  }

  if (!slugPattern.test(slug)) {
    throw new Error(`Invalid \"slug\" in ${fileName}; use lowercase kebab-case`);
  }

  const updatedAt = await getModifiedAt(filePath);

  return {
    title,
    date,
    category: data.category,
    description,
    slug,
    content: content.trim(),
    updatedAt,
  };
}

export const getAllUpdates = cache(async (): Promise<UpdatePost[]> => {
  const entries = await fs.readdir(updatesDirectory, { withFileTypes: true });
  const fileNames = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".mdx"))
    .map((entry) => entry.name);
  const updates = await Promise.all(fileNames.map(readUpdate));

  const duplicateSlugs = updates
    .map((update) => update.slug)
    .filter((slug, index, slugs) => slugs.indexOf(slug) !== index);

  if (duplicateSlugs.length > 0) {
    throw new Error(`Duplicate update slug: ${duplicateSlugs[0]}`);
  }

  return updates.sort((left, right) => right.date.localeCompare(left.date));
});

export const getUpdateBySlug = cache(async (slug: string): Promise<UpdatePost | undefined> => {
  const updates = await getAllUpdates();
  return updates.find((update) => update.slug === slug);
});
