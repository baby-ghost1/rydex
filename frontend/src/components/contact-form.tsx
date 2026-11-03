"use client";

import { useState } from "react";
import { CheckCircle2, Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/client-api";

const subjects = [
  "Booking help",
  "Payment or refund",
  "Partner onboarding",
  "Report a safety issue",
  "Partnerships",
  "Something else",
];

export default function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState(subjects[0]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api("/api/contact", {
        method: "POST",
        json: { name, email, subject, message },
      });
      setSent(true);
      toast.success("Message sent - our team will get back to you");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send your message.");
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="rounded-3xl border border-line bg-white p-8 text-center sm:p-10">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-success/10">
          <CheckCircle2 className="h-6 w-6 text-success" />
        </div>
        <h2 className="font-display mt-5 text-2xl font-extrabold tracking-tight">Message received</h2>
        <p className="mt-2 text-sm leading-relaxed text-fg-muted">
          Thanks, {name.split(" ")[0]}. Our support team typically replies within one business day.
          For urgent ride issues, include your booking number in a follow-up.
        </p>
        <button
          type="button"
          onClick={() => {
            setSent(false);
            setMessage("");
            setSubject(subjects[0]);
          }}
          className="btn-outline mt-6"
        >
          Send another message
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="rounded-3xl border border-line bg-white p-6 sm:p-8">
      <h2 className="font-display text-2xl font-extrabold tracking-tight">Send us a message</h2>
      <p className="mt-1.5 text-xs text-fg-muted">Tell us what you need and we&apos;ll route it to the right team.</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="contact-name">Full name</label>
          <input
            id="contact-name"
            required
            minLength={2}
            maxLength={60}
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="input"
            placeholder="Your name"
            autoComplete="name"
          />
        </div>
        <div>
          <label className="label" htmlFor="contact-email">Email address</label>
          <input
            id="contact-email"
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="input"
            placeholder="you@example.com"
            autoComplete="email"
          />
        </div>
      </div>

      <div className="mt-4">
        <label className="label" htmlFor="contact-subject">What can we help with?</label>
        <select
          id="contact-subject"
          value={subject}
          onChange={(event) => setSubject(event.target.value)}
          className="input"
        >
          {subjects.map((option) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
      </div>

      <div className="mt-4">
        <label className="label" htmlFor="contact-message">Message</label>
        <textarea
          id="contact-message"
          required
          minLength={10}
          maxLength={2000}
          rows={6}
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          className="input resize-none"
          placeholder="Share as much detail as you can - booking number, dates, what happened…"
        />
        <p className="mt-1.5 text-right text-[10px] text-fg-subtle">{message.length}/2000</p>
      </div>

      {error && <p className="mt-2 rounded-xl border border-danger/15 bg-danger/5 px-3 py-2 text-xs text-danger">{error}</p>}

      <button type="submit" disabled={loading} className="btn-dark mt-5 w-full py-3.5">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        Send message
      </button>
      <p className="mt-3 text-center text-[10px] text-fg-subtle">
        By submitting, you agree to our privacy policy. We never share your details.
      </p>
    </form>
  );
}
