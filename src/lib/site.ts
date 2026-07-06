/**
 * Site-wide constants. Set NEXT_PUBLIC_SITE_URL (and optionally
 * NEXT_PUBLIC_CONTACT_EMAIL) in Vercel once the domain is purchased —
 * canonical URLs, sitemap, and OpenGraph all key off it.
 */
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://whatclassami.com";

export const SITE_NAME = "WhatClassAmI";

/**
 * Public repo — powers the "report an error" prefilled-issue link. The link
 * only works for the community once the repo is public (Milestone 2). Override
 * with NEXT_PUBLIC_REPO_URL if the repo moves.
 */
export const REPO_URL =
  process.env.NEXT_PUBLIC_REPO_URL ?? "https://github.com/keebarber/whatclassami";

export const SITE_TAGLINE = "Autocross Classing Guide";

export const CONTACT_EMAIL =
  process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "keenan.c.barber@gmail.com";

export const SITE_DESCRIPTION =
  "Find your SCCA Solo autocross class — and see exactly which modification bumped you. Deterministic results with 2026 rulebook citations. Unofficial tool.";
