"use client";

import { useState } from "react";

/**
 * Zero-backend contact form: composes a mailto with the message prefilled.
 * Swap to a form service (Formspree/Resend) later by replacing `submit`.
 */
export function ContactForm({ email }: { email: string }) {
  const [name, setName] = useState("");
  const [topic, setTopic] = useState("Classing error report");
  const [message, setMessage] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const subject = encodeURIComponent(`[Autocross Quick Guide] ${topic}`);
    const body = encodeURIComponent(
      `${message}\n\n— ${name || "Anonymous"}\n(If reporting a classing error, please paste your result's share URL above.)`,
    );
    window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
  }

  const field =
    "w-full rounded-lg border border-asphalt-600 bg-asphalt-800 px-3 py-2.5 text-sm text-chalk placeholder:text-asphalt-500 focus:border-cone-500 focus:outline-none";

  return (
    <form onSubmit={submit} className="mt-6 space-y-4">
      <label className="block text-sm text-chalk-dim">
        Name (optional)
        <input value={name} onChange={(e) => setName(e.target.value)} className={`mt-1 ${field}`} placeholder="Your name" />
      </label>
      <label className="block text-sm text-chalk-dim">
        Topic
        <select value={topic} onChange={(e) => setTopic(e.target.value)} className={`mt-1 ${field}`}>
          <option>Classing error report</option>
          <option>Missing car</option>
          <option>Question</option>
          <option>Something else</option>
        </select>
      </label>
      <label className="block text-sm text-chalk-dim">
        Message
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          required
          rows={6}
          className={`mt-1 ${field}`}
          placeholder="If it's about a specific result, paste the share URL from the classifier — it captures your exact build."
        />
      </label>
      <button
        type="submit"
        className="rounded-lg bg-cone-500 px-5 py-2.5 font-bold text-asphalt-950 transition hover:bg-cone-400"
      >
        Send via your email app
      </button>
    </form>
  );
}
