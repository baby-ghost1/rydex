import Link from "next/link";
import { Headphones, LockKeyhole, Mail, MapPin, Phone, ShieldCheck } from "lucide-react";
import Logo from "@/components/logo";
import { PLATFORM_COMPANY, SUPPORT_EMAIL, SUPPORT_PHONE } from "@rydex/shared/constants";

export default function SiteFooter() {
  return (
    <footer className="surface-inverse px-5 pb-8 pt-16 text-fg sm:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-12 border-b border-line pb-12 lg:grid-cols-[1.4fr_0.7fr_0.7fr_1fr]">
          <div>
            <Logo />
            <p className="mt-6 max-w-xs text-sm leading-relaxed text-fg-muted">
              India&apos;s multi-vendor vehicle marketplace. Bikes, cars, autos,
              loading vehicles and trucks — booked in seconds from verified local
              partners.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-semibold uppercase tracking-wider text-fg-subtle">
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-lime" aria-hidden="true" />
                Verified partners
              </span>
              <span className="inline-flex items-center gap-1.5">
                <LockKeyhole className="h-3.5 w-3.5 text-lime" aria-hidden="true" />
                Secure payments
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Headphones className="h-3.5 w-3.5 text-lime" aria-hidden="true" />
                24/7 support
              </span>
            </div>
          </div>

          <nav aria-label="Explore RYDEX">
            <p className="eyebrow">Explore</p>
            <div className="mt-4 space-y-1 text-sm text-fg-muted">
              <Link href="/fleet" className="flex min-h-11 items-center transition hover:text-fg">Our fleet</Link>
              <Link href="/book" className="flex min-h-11 items-center transition hover:text-fg">Book a ride</Link>
              <Link href="/bookings" className="flex min-h-11 items-center transition hover:text-fg">My bookings</Link>
              <Link href="/#how-it-works" className="flex min-h-11 items-center transition hover:text-fg">How it works</Link>
            </div>
          </nav>

          <nav aria-label="Partner links">
            <p className="eyebrow">Partners</p>
            <div className="mt-4 space-y-1 text-sm text-fg-muted">
              <Link href="/dashboard/partner/onboarding" className="flex min-h-11 items-center transition hover:text-fg">Become a partner</Link>
              <Link href="/dashboard/partner" className="flex min-h-11 items-center transition hover:text-fg">Partner dashboard</Link>
              <Link href="/#pricing" className="flex min-h-11 items-center transition hover:text-fg">Partner earnings</Link>
              <Link href="/contact" className="flex min-h-11 items-center transition hover:text-fg">Partner support</Link>
            </div>
          </nav>

          <div>
            <p className="eyebrow">Get in touch</p>
            <div className="mt-4 space-y-1 text-sm text-fg-muted">
              <a href={`mailto:${SUPPORT_EMAIL}`} className="flex min-h-11 items-center gap-2.5 transition hover:text-fg">
                <Mail className="h-4 w-4 shrink-0" aria-hidden="true" /> {SUPPORT_EMAIL}
              </a>
              <a href={`tel:${SUPPORT_PHONE.replace(/\s/g, "")}`} className="flex min-h-11 items-center gap-2.5 transition hover:text-fg">
                <Phone className="h-4 w-4 shrink-0" aria-hidden="true" /> {SUPPORT_PHONE}
              </a>
              <p className="flex min-h-11 items-start gap-2.5 pt-2">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                Bengaluru, Karnataka, India
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 pt-6 text-xs text-fg-subtle sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} {PLATFORM_COMPANY}. All rights reserved.</p>
          <div className="flex flex-wrap gap-5">
            <Link href="/terms" className="inline-flex min-h-11 items-center hover:text-fg">Terms</Link>
            <Link href="/privacy" className="inline-flex min-h-11 items-center hover:text-fg">Privacy</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
