import type { Metadata } from "next";
import { ContactForm } from "@/components/ContactForm";
import { CONTACT_EMAIL, SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Report a classing error, request a missing car, or ask a question about the Autocross Quick Guide.",
  alternates: { canonical: `${SITE_URL}/contact` },
};

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-3xl font-extrabold tracking-tight">Contact</h1>
      <p className="mt-2 leading-relaxed text-chalk-dim">
        Found a classing error? That&apos;s exactly what we want to hear about — every fix makes
        the dataset better. Include your result&apos;s share URL (the &quot;Copy share link&quot;
        button) and the rule you&apos;re relying on, and we&apos;ll verify it against the 2026
        rulebook.
      </p>
      <ContactForm email={CONTACT_EMAIL} />
      <p className="mt-8 text-xs text-chalk-dim">
        Classing rule questions are ultimately the Solo Events Board&apos;s to answer — formal
        requests go through{" "}
        <a href="https://letters.scca.com/" className="text-cone-400 underline" rel="noopener">
          letters.scca.com
        </a>
        .
      </p>
    </div>
  );
}
