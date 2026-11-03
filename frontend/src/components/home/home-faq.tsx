"use client";

import { useState } from "react";
import { Minus, Plus } from "lucide-react";

const faqs = [
  {
    q: "How does RYDEX work?",
    a: "Search your route, choose from verified bikes, cars, autos, loading vehicles or trucks, and send a booking request. Your local partner accepts, you pay by cash or online, and track the ride live until drop-off.",
  },
  {
    q: "Are the vehicles and partners verified?",
    a: "Yes. Every partner completes a vehicle, document and video KYC review before going live. Our admin team checks driving licences, RC, insurance and payout details, and can reject or suspend any listing that fails standards.",
  },
  {
    q: "How is the fare calculated?",
    a: "Each partner sets a base fare, per-kilometre rate, hourly rate and minimum fare. RYDEX calculates the route distance and duration, then shows the complete fare before you book. There are no hidden platform surprises.",
  },
  {
    q: "Can I cancel or change a booking?",
    a: "You can cancel a request or accepted ride before it starts from your booking page. Online payments are refunded to the original payment method when a partner rejects or you cancel in time.",
  },
  {
    q: "What is the pickup and drop OTP?",
    a: "For your safety, a 4-digit pickup OTP appears on your ride page after a partner accepts, and a drop OTP appears once the ride starts. Share the pickup code only when your partner arrives, and the drop code only after reaching your destination.",
  },
  {
    q: "How do partners get paid?",
    a: "Partners keep 90% of every completed ride. The 10% platform fee covers payments, support and operations. Cash is collected directly; online earnings appear in the partner earnings dashboard.",
  },
];

export default function HomeFaq() {
  const [open, setOpen] = useState(0);

  return (
    <section
      id="faq"
      className="scroll-mt-24 border-t border-line bg-surface px-5 py-20 sm:px-8 sm:py-24"
    >
      <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[0.8fr_1.2fr]">
        <div>
          <p className="eyebrow">Good to know</p>
          <h2 className="type-h2 mt-3">
            Questions,
            <br />
            answered.
          </h2>
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-fg-muted">
            Everything about booking, safety, payments and becoming a RYDEX partner.
          </p>
          <a href="mailto:support@rydex.app" className="btn-outline mt-7">
            Talk to support
          </a>
        </div>

        <div className="divide-y divide-line border-t border-line">
          {faqs.map((faq, index) => {
            const isOpen = open === index;
            const triggerId = `faq-trigger-${index}`;
            const panelId = `faq-panel-${index}`;

            return (
              <div key={faq.q}>
                <h3>
                  <button
                    id={triggerId}
                    type="button"
                    onClick={() => setOpen(isOpen ? -1 : index)}
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    className="flex min-h-11 w-full items-start justify-between gap-6 py-5 text-left"
                  >
                    <span className="font-display text-[15px] font-semibold text-fg">
                      {faq.q}
                    </span>
                    <span
                      className={
                        isOpen
                          ? "mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full border border-ink bg-ink text-white"
                          : "mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full border border-line-strong text-fg-muted"
                      }
                      aria-hidden="true"
                    >
                      {isOpen ? (
                        <Minus className="h-3.5 w-3.5" />
                      ) : (
                        <Plus className="h-3.5 w-3.5" />
                      )}
                    </span>
                  </button>
                </h3>
                <div
                  id={panelId}
                  role="region"
                  aria-labelledby={triggerId}
                  hidden={!isOpen}
                  className="pb-5"
                >
                  <p className="pr-10 text-sm leading-relaxed text-fg-muted">
                    {faq.a}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
