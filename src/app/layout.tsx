import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Autocross Quick Guide — What class is my car?",
    template: "%s | Autocross Quick Guide",
  },
  description:
    "Find your SCCA Solo autocross class — and see exactly which modification bumped you. Deterministic results with rulebook citations. Unofficial tool.",
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
              <span className="text-lg font-extrabold tracking-tight">
                Autocross <span className="text-cone-500">Quick Guide</span>
              </span>
            </Link>
            <nav className="flex items-center gap-5 text-sm font-semibold">
              <Link href="/classify" className="text-chalk-dim transition hover:text-chalk">
                Classify
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
            <p>Built for the paddock. Cones were harmed in the making of this data.</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
