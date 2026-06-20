# Onyx Landing Production

This is the standalone production landing page app. It contains only the Next.js landing page, landing CSS, landing components, email API routes, the landing runtime `.mjs`, and the public image assets used by the page.

## Run Locally

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Email Setup

The contact form and Join Waitlist form post to local Next.js API routes:

- `POST /api/contact`
- `POST /api/waitlist`
- `POST /api/newsletter`

Set these environment variables in production:

- `RESEND_API_KEY`: Resend API key used to deliver emails.
- `CONTACT_TO_EMAIL`: inbox that receives contact and waitlist submissions.
- `EMAIL_FROM`: verified sender, for example `Onyx Landing <no-reply@your-domain.com>`.
- `WAITLIST_STORAGE_PATH`: optional persistent JSON file path for waitlist duplicate prevention. The app stores SHA-256 email hashes, not raw emails. If this is not set, the app uses the host temp directory, which may reset on serverless platforms.

Optional anti-bot verification for the contact form:

- `NEXT_PUBLIC_TURNSTILE_SITE_KEY`
- `TURNSTILE_SECRET_KEY`
