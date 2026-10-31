import Link from "next/link";
import PublicShell from "@/components/public-shell";
import { PLATFORM_COMPANY, SUPPORT_EMAIL } from "@rydex/shared/constants";

export const metadata = { title: "Privacy policy" };

const sections = [
  {
    title: "What we collect",
    body: [
      "Account details: name, email address, mobile number, profile photo, password hash, role and partner status.",
      "Booking details: pickup and drop locations, route, date and time, vehicle, fare, payment method and payment status, ride status, chat messages, ratings and OTP verification status.",
      "Partner details: business and owner name, vehicle registration and documents, driving licence, insurance, permit, encrypted bank details, UPI ID and video KYC material.",
      "Technical data: IP address for abuse prevention, session cookies, device/browser information and, when a partner enables live location, GPS coordinates during active rides.",
    ],
  },
  {
    title: "How we use it",
    body: [
      "To create and secure accounts, verify email addresses, match riders with partners, calculate fares, enable live tracking and chat, process payments and refunds, review partner applications, provide support, prevent fraud and meet legal obligations.",
      "OTPs and transactional emails are delivered through our email provider. Payment processing is handled by Razorpay. Video KYC uses ZEGOCLOUD when configured. Uploads use Cloudinary, or local storage in development. Maps and routing use OpenStreetMap, CARTO, OSRM, Geoapify or Nominatim.",
    ],
  },
  {
    title: "What we share",
    body: [
      "Riders and partners see the limited details needed to complete a ride, such as name, vehicle, pickup and drop area, phone number and chat messages. Your full payment credentials are never stored by RYDEX.",
      "We share data with service providers only as needed to operate the platform, and with authorities where required by law. We do not sell personal data.",
    ],
  },
  {
    title: "Security",
    body: [
      "Passwords are hashed with bcrypt. Email, reset and ride OTPs are stored as one-way hashes. Partner bank account numbers are encrypted with AES-256-GCM. Socket connections use short-lived signed tokens. Access to rider and partner records is scoped by role.",
      "No system is completely secure. Report suspected unauthorised access to us immediately.",
    ],
  },
  {
    title: "Retention",
    body: [
      "We keep account and booking records while your account is active and as needed for tax, dispute, fraud-prevention and legal requirements. You may request deletion of your account; some records may be retained where the law requires it.",
    ],
  },
  {
    title: "Your choices",
    body: [
      "You can update your name, phone number and photo from your dashboard. You can control location permission in your browser or device settings; live location is only shared during active rides and only when a partner enables it.",
      "You may request access, correction or deletion of your personal data by contacting us. Marketing messages are not sent without consent.",
    ],
  },
  {
    title: "Cookies",
    body: [
      "RYDEX uses essential cookies for authentication and session security. Third-party services such as Google sign-in, Razorpay and map providers may set their own cookies when you interact with them.",
    ],
  },
  {
    title: "Contact",
    body: [
      `For privacy questions or data requests, contact ${SUPPORT_EMAIL}. We may need to verify your identity before acting on a request.`,
    ],
  },
];

export default function PrivacyPage() {
  return (
    <PublicShell>
      <div className="mx-auto max-w-4xl px-5 pb-20 sm:px-8">
        <p className="eyebrow">Legal</p>
        <h1 className="font-display mt-3 text-4xl font-extrabold tracking-[-0.04em] sm:text-6xl">Privacy policy</h1>
        <p className="mt-3 text-sm text-fg-muted">
          Last updated 26 October 2026 · {PLATFORM_COMPANY}
        </p>

        <div className="mt-10 rounded-3xl border border-line bg-white p-6 sm:p-10">
          <p className="text-sm leading-relaxed text-fg-muted">
            This policy explains what RYDEX collects, why we collect it, how we protect it and the
            choices you have. It applies to riders, partners and visitors.
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
              <p className="text-sm font-semibold">Need to access or delete your data?</p>
              <p className="mt-0.5 text-xs text-fg-muted">We&apos;ll guide you through the request.</p>
            </div>
            <div className="flex gap-2">
              <Link href="/terms" className="btn-outline !py-2.5">Terms of service</Link>
              <Link href="/contact" className="btn-dark !py-2.5">Contact us</Link>
            </div>
          </div>
        </div>
      </div>
    </PublicShell>
  );
}
