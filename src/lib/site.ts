/**
 * Site-wide constants. Set NEXT_PUBLIC_SITE_URL (and optionally
 * NEXT_PUBLIC_CONTACT_EMAIL) in Vercel once the domain is purchased —
 * canonical URLs, sitemap, and OpenGraph all key off it.
 */
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://whatclassami.com";

export const SITE_NAME = "WhatClassAmI";

export const SITE_TAGLINE = "Autocross Classing Guide";

export const CONTACT_EMAIL =
  process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "keenan.c.barber@gmail.com";

export const SITE_DESCRIPTION =
  "Find your SCCA Solo autocross class — and see exactly which modification bumped you. Deterministic results with 2026 rulebook citations. Unofficial tool.";
