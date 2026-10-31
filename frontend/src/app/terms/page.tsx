import Link from "next/link";
import PublicShell from "@/components/public-shell";
import { PLATFORM_COMPANY, SUPPORT_EMAIL } from "@rydex/shared/constants";

export const metadata = { title: "Terms of service" };

const sections = [
  {
    title: "1. The RYDEX platform",
    body: [
      "RYDEX is a technology marketplace that connects riders with independent vehicle owners and operators (“partners”). RYDEX is not a transport carrier, does not own the vehicles listed, and does not employ the partners. The contract for transportation is between you and the partner.",
      "By creating an account, booking a vehicle, or listing a vehicle, you agree to these terms and to any policies linked from them.",
    ],
  },
  {
    title: "2. Accounts and eligibility",
    body: [
      "You must provide accurate information, be at least 18 years old, and keep your login credentials secure. You are responsible for activity under your account.",
      "Partners must complete identity, document and video verification before their vehicles go live. RYDEX may reject, suspend or remove any account or listing that fails verification or breaches these terms.",
    ],
  },
  {
    title: "3. Bookings and fares",
    body: [
      "A booking is a request until the partner accepts it. Fares are calculated from the vehicle's published base fare, per-kilometre and hourly rates, the estimated route distance and duration, and any minimum fare. The full estimate is shown before you confirm.",
      "The final amount may differ if the route, waiting time or trip details change. Cash fares are paid directly to the partner after the ride. Online payments are collected by RYDEX through Razorpay and settled to the partner after deducting the platform fee.",
    ],
  },
  {
    title: "4. Cancellations, rejections and refunds",
    body: [
      "Riders may cancel a booking before the ride starts. Partners may decline a request. If an online payment has already been captured, an eligible cancellation or rejection is refunded to the original payment method, subject to payment-provider processing times.",
      "Repeated late cancellations or misuse may lead to account restrictions.",
    ],
  },
  {
    title: "5. OTP and ride safety",
    body: [
      "Pickup and drop OTPs are provided to protect both riders and partners. Share the pickup OTP only when your partner has arrived at the pickup point, and the drop OTP only at the destination. Never share an OTP in advance.",
      "Follow local traffic and safety laws. Wear helmets where required. Report safety concerns immediately through the ride page or support channels.",
    ],
  },
  {
    title: "6. Partner obligations",
    body: [
      "Partners must hold valid licences, registration, insurance and permits, keep vehicle details and availability accurate, honour accepted bookings, and maintain their vehicle in a roadworthy condition.",
      "Partners keep 90% of the fare for completed rides; RYDEX retains a 10% platform fee. Payout details are encrypted and used only to settle earnings.",
    ],
  },
  {
    title: "7. Prohibited conduct",
    body: [
      "Do not misuse the platform, impersonate another person, upload unlawful content, attempt to circumvent payments, harass other users, or book vehicles for illegal purposes. We may suspend accounts and cooperate with authorities where required.",
    ],
  },
  {
    title: "8. Liability and availability",
    body: [
      "The platform is provided on an as-is basis. To the maximum extent permitted by law, RYDEX is not liable for indirect or consequential losses, or for the acts or omissions of independent partners. Nothing in these terms excludes liability that cannot be excluded by law.",
      "Maps, routing and live location depend on third-party providers and device GPS and may be delayed or unavailable.",
    ],
  },
  {
    title: "9. Changes and governing law",
    body: [
      "We may update these terms from time to time and will publish the revised version on this page. Continued use after an update constitutes acceptance.",
      `These terms are governed by the laws of India. Questions can be sent to ${SUPPORT_EMAIL}.`,
    ],
  },
];

export default function TermsPage() {
  return (
    <PublicShell>
      <div className="mx-auto max-w-4xl px-5 pb-20 sm:px-8">
        <p className="eyebrow">Legal</p>
        <h1 className="font-display mt-3 text-4xl font-extrabold tracking-[-0.04em] sm:text-6xl">Terms of service</h1>
        <p className="mt-3 text-sm text-fg-muted">
          Last updated 26 October 2026 · {PLATFORM_COMPANY}
        </p>

        <div className="mt-10 rounded-3xl border border-line bg-white p-6 sm:p-10">
          <p className="text-sm leading-relaxed text-fg-muted">
            These terms explain the rules for using RYDEX as a rider or partner. Please read them
            before booking or listing a vehicle. If anything is unclear, contact us before you continue.
          </p>

          <div className="mt-8 space-y-8">
            {sections.map((section) => (
              <section key={section.title}>
                <h2 className="font-display text-lg font-bold tracking-tight">{section.title}</h2>
                <div className="mt-2 space-y-2.5">
                  {section.body.map((paragraph) => (
                    <p key={paragraph.slice(0, 40)} className="text-sm leading-relaxed text-fg-muted">{paragraph}</p>
                  ))}
                </div>
              </section>
            ))}
          </div>

          <div className="mt-10 flex flex-col items-start justify-between gap-4 rounded-2xl bg-surface-muted p-5 sm:flex-row sm:items-center">
            <div>
              <p className="text-sm font-semibold">Questions about these terms?</p>
              <p className="mt-0.5 text-xs text-fg-muted">We&apos;re happy to clarify.</p>
            </div>
            <div className="flex gap-2">
              <Link href="/privacy" className="btn-outline !py-2.5">Privacy policy</Link>
              <Link href="/contact" className="btn-dark !py-2.5">Contact us</Link>
            </div>
          </div>
        </div>
      </div>
    </PublicShell>
  );
}
