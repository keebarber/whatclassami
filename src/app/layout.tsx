import type { Metadata } from "next";
import Link from "next/link";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "WhatClassAmI — autocross classing guide (SCCA Solo)",
    template: `%s | ${SITE_NAME} · autocross classing`,
  },
  description: SITE_DESCRIPTION,
  keywords: [
    "autocross class",
    "SCCA Solo classing",
    "what class is my car",
    "street touring",
    "street prepared",
    "autocross classifier",
  ],
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: "WhatClassAmI — autocross classing guide (SCCA Solo)",
    description: SITE_DESCRIPTION,
    url: SITE_URL,
  },
  twitter: {
    card: "summary",
    title: "WhatClassAmI — autocross classing guide (SCCA Solo)",
    description: SITE_DESCRIPTION,
  },
  robots: { index: true, follow: true },
};

function ConeLogo() {
  return (
    <svg viewBox="0 0 24 24" className="h-7 w-7" aria-hidden="true">
      <path d="M12 2.5 17.5 19h-11L12 2.5Z" fill="var(--color-cone-500)" />
      <path d="M9.6 9.7h4.8l.9 2.7H8.7l.9-2.7Z" fill="var(--color-chalk)" />
      <rect x="4" y="19" width="16" height="2.4" rx="1" fill="var(--color-cone-600)" />
    </svg>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-asphalt-950 font-display text-chalk antialiased">
        <header className="border-b border-asphalt-700 bg-asphalt-900">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
            <Link href="/" className="flex items-center gap-2.5">
              <ConeLogo />
              <span className="flex flex-col leading-tight">
                <span className="text-lg font-extrabold tracking-tight">
                  What<span className="text-cone-500">Class</span>AmI
                </span>
                <span className="text-[10px] font-bold uppercase tracking-[0.28em] text-chalk-dim">
                  Autocross Classing Guide
                </span>
              </span>
            </Link>
            <nav className="flex items-center gap-4 text-sm font-semibold sm:gap-5">
              <Link href="/cars" className="text-chalk-dim transition hover:text-chalk">
                Cars
              </Link>
              <Link href="/faq" className="text-chalk-dim transition hover:text-chalk">
                FAQ
              </Link>
              <Link
                href="/classify"
                className="rounded-md bg-cone-500 px-3.5 py-1.5 font-bold text-asphalt-950 transition hover:bg-cone-400"
              >
                Class my car
              </Link>
            </nav>
          </div>
          <div className="checkered h-1.5" />
        </header>

        <main>{children}</main>

        <footer className="mt-16 border-t border-asphalt-700 bg-asphalt-900">
          <div className="mx-auto max-w-6xl space-y-2 px-4 py-6 text-xs text-chalk-dim">
            <p>
              Unofficial tool — not affiliated with or endorsed by the SCCA®. Always verify
              against the current{" "}
              <a
                href="https://www.scca.com/pages/solo-cars-and-rules"
                className="text-cone-400 underline"
                rel="noopener"
              >
                SCCA Solo Rules
              </a>
              . Classing questions can be submitted to the Solo Events Board.
            </p>
            <p>
              Built for the paddock. Cones were harmed in the making of this data.{" "}
              <Link href="/faq" className="text-cone-400 underline">
                FAQ
              </Link>{" "}
              ·{" "}
              <Link href="/glossary" className="text-cone-400 underline">
                Terms & definitions
              </Link>{" "}
              ·{" "}
              <Link href="/contact" className="text-cone-400 underline">
                Contact / report an error
              </Link>{" "}
              ·{" "}
              <Link href="/cars" className="text-cone-400 underline">
                Browse cars
              </Link>
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
