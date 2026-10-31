import { Clock3, Headphones, Mail, MapPin, MessageSquare, Phone } from "lucide-react";
import PublicShell from "@/components/public-shell";
import ContactForm from "@/components/contact-form";
import { SUPPORT_EMAIL, SUPPORT_PHONE } from "@rydex/shared/constants";

export const metadata = {
  title: "Contact",
  description: "Get in touch with RYDEX rider or partner support.",
};

export default function ContactPage() {
  return (
    <PublicShell>
      <div className="mx-auto max-w-7xl px-5 pb-20 sm:px-8">
        <div className="max-w-2xl">
          <p className="eyebrow">We&apos;re here to help</p>
          <h1 className="font-display mt-3 text-4xl font-extrabold tracking-[-0.04em] sm:text-6xl">
            Talk to a human.
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-fg-muted">
            Questions about a ride, a refund, partner onboarding or safety? Our support
            team is available around the clock for riders and partners.
          </p>
        </div>

        <div className="mt-10 grid gap-5 lg:grid-cols-[0.85fr_1.15fr]">
          <div className="space-y-3">
            <div className="rounded-3xl bg-ink p-6 text-white">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-fg-inverse-subtle">24/7 support</p>
              <p className="font-display mt-2 text-2xl font-extrabold tracking-tight">Need help right now?</p>
              <p className="mt-2 text-xs leading-relaxed text-fg-inverse-muted">
                For active rides, open the booking page and use the call or chat controls to reach your partner instantly.
              </p>
              <div className="mt-5 space-y-3 text-xs text-fg-inverse-muted">
                <a href={`mailto:${SUPPORT_EMAIL}`} className="flex items-center gap-2.5 hover:text-white">
                  <Mail className="h-4 w-4 text-lime" /> {SUPPORT_EMAIL}
                </a>
                <a href={`tel:${SUPPORT_PHONE.replace(/\s/g, "")}`} className="flex items-center gap-2.5 hover:text-white">
                  <Phone className="h-4 w-4 text-lime" /> {SUPPORT_PHONE}
                </a>
                <p className="flex items-start gap-2.5">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-lime" /> Bengaluru, Karnataka, India
                </p>
              </div>
            </div>

            <div className="rounded-3xl border border-line bg-white p-6">
              <div className="flex items-center gap-2 text-sm font-bold"><Headphones className="h-4 w-4" /> Rider support</div>
              <p className="mt-2 text-xs leading-relaxed text-fg-muted">
                Booking changes, cancellations, OTPs, payments and refund questions.
              </p>
            </div>
            <div className="rounded-3xl border border-line bg-white p-6">
              <div className="flex items-center gap-2 text-sm font-bold"><MessageSquare className="h-4 w-4" /> Partner support</div>
              <p className="mt-2 text-xs leading-relaxed text-fg-muted">
                Onboarding reviews, KYC, fleet management, payouts and platform policies.
              </p>
            </div>
            <div className="rounded-3xl border border-line bg-white p-6">
              <div className="flex items-center gap-2 text-sm font-bold"><Clock3 className="h-4 w-4" /> Response times</div>
              <p className="mt-2 text-xs leading-relaxed text-fg-muted">
                Email: within 1 business day. Safety reports: prioritised immediately. Active-ride chat: live.
              </p>
            </div>
          </div>

          <ContactForm />
        </div>
      </div>
    </PublicShell>
  );
}
