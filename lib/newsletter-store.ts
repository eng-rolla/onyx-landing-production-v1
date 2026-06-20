import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

type NewsletterStore = {
  emails: string[];
};

const DEFAULT_STORE_PATH = join("/tmp", "onyx-newsletter-email-hashes.json");

let inMemoryHashes: Set<string> | null = null;

function hashEmail(email: string) {
  return createHash("sha256").update(email.trim().toLowerCase()).digest("hex");
}

function getStorePath() {
  return process.env.NEWSLETTER_STORAGE_PATH || DEFAULT_STORE_PATH;
}

async function readHashes() {
  if (inMemoryHashes) return inMemoryHashes;

  try {
    const payload = JSON.parse(await readFile(/*turbopackIgnore: true*/ getStorePath(), "utf8")) as Partial<NewsletterStore>;
    inMemoryHashes = new Set(Array.isArray(payload.emails) ? payload.emails.filter((item) => typeof item === "string") : []);
  } catch {
    inMemoryHashes = new Set();
  }

  return inMemoryHashes;
}

async function writeHashes(hashes: Set<string>) {
  const storePath = getStorePath();
  try {
    await mkdir(/*turbopackIgnore: true*/ dirname(storePath), { recursive: true });
    await writeFile(/*turbopackIgnore: true*/ storePath, JSON.stringify({ emails: Array.from(hashes).sort() }, null, 2), {
      encoding: "utf8",
      mode: 0o600,
    });
  } catch {
    // Some serverless hosts expose a read-only project directory. In that case
    // the in-memory set still blocks duplicate submissions for this runtime.
  }
}

export async function hasNewsletterEmail(email: string) {
  const hashes = await readHashes();
  return hashes.has(hashEmail(email));
}

export async function addNewsletterEmail(email: string) {
  const hashes = await readHashes();
  const hash = hashEmail(email);

  if (hashes.has(hash)) {
    return false;
  }

  hashes.add(hash);
  await writeHashes(hashes);
  return true;
}
