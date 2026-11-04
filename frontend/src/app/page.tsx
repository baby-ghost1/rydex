import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Banknote,
  CalendarCheck,
  CarFront,
  Headphones,
  LocateFixed,
  MapPinned,
  ShieldCheck,
  Star,
} from "lucide-react";
import PublicShell from "@/components/public-shell";
import SiteNav from "@/components/site-nav";
import CategoryQuickFilter from "@/components/category-quick-filter";
import { CATEGORY_ICONS } from "@/lib/category-icons";
import { VEHICLE_CATEGORIES } from "@rydex/shared/constants";

export const metadata = {
  title: "RYDEX - Book Any Vehicle",
  description:
    "Book verified bikes, cars, autos, loading vehicles and trucks on demand. Transparent fares, live tracking and 24/7 support.",
};

const steps = [
  {
    icon: MapPinned,
    title: "Set your route",
    text: "Tell us where you're going and when. We find vehicles near you.",
  },
  {
    icon: CalendarCheck,
    title: "Book in seconds",
    text: "Pick a vehicle, confirm the transparent fare and send your request.",
  },
  {
    icon: LocateFixed,
    title: "Track live",
    text: "Follow your partner on the map and chat or call from the ride page.",
  },
  {
    icon: Star,
    title: "Ride & rate",
    text: "Share your OTP, reach your destination and rate the experience.",
  },
];

export default function HomePage() {
  return (
    <PublicShell padded={false} footer>
      <section className="surface-inverse relative min-h-[860px] overflow-hidden px-4 pb-14 pt-4 text-fg sm:min-h-[900px] sm:px-6 sm:pt-6">
        <Image
          src="/heroImage.jpg"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover object-center opacity-45"
        />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0.1)_0%,rgba(11,11,11,0.72)_58%,#0b0b0b_100%)]" />
        <div className="absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-ink to-transparent" />

        <div className="relative mx-auto max-w-6xl">
          <div className="-mx-4 sm:-mx-6">
            <SiteNav dark />
          </div>

          <div className="mx-auto max-w-4xl text-center">
            {/* <div className="animate-fade-up inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3.5 py-2 text-xs font-medium uppercase tracking-[0.16em] text-fg-muted backdrop-blur">
              <span className="h-1.5 w-1.5 rounded-full bg-lime" aria-hidden="true" />
              One platform · every ride
            </div> */}

            <h1 className="type-display animate-fade-up mt-18">
              Book Any
              <br />
              Vehicle<span className="text-lime">.</span>
            </h1>

            <p className="type-body animate-fade-up mx-auto mt-6 max-w-xl text-fg-muted">
              From quick bike hops to full truck moves - book verified local
              partners with transparent pricing, live tracking and real support.
            </p>

            <div className="animate-fade-up mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link href="/book" className="btn-light px-7">
                Book a ride
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link
                href="/dashboard/partner/onboarding"
                className="btn border border-white/25 bg-white/10 px-7 text-fg backdrop-blur hover:bg-white/15"
              >
                Become a partner
                <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-fg-subtle">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-lime" aria-hidden="true" />
                Verified partners
              </span>
              <span className="flex items-center gap-1.5">
                <Banknote className="h-3.5 w-3.5 text-lime" aria-hidden="true" />
                Transparent fares
              </span>
              <span className="flex items-center gap-1.5">
                <Headphones className="h-3.5 w-3.5 text-lime" aria-hidden="true" />
                24/7 support
              </span>
            </div>
          </div>

          {/* <div id="search" className="mx-auto mt-12 max-w-5xl scroll-mt-32 sm:mt-16">
            <div className="mb-3 flex items-center justify-between px-2 text-xs font-semibold uppercase tracking-[0.16em] text-fg-subtle">
              <span>Where to?</span>
              <span className="hidden items-center gap-1.5 sm:flex">
                <BadgeCheck className="h-3.5 w-3.5 text-lime" aria-hidden="true" />
                Instant partner matching
              </span>
            </div>
            <SearchWidget />
          </div> */}
        </div>

        <div className="relative mx-auto mt-30 flex max-w-6xl flex-wrap items-center justify-center gap-x-10 gap-y-5 border-t border-line pt-8 sm:justify-between">
          {[
            ["4.9/5", "Average rider rating"],
            ["12k+", "Trips completed"],
            ["5 types", "Bikes to trucks"],
            ["90%", "Partner earnings"],
          ].map(([value, label]) => (
            <div key={label} className="text-center sm:text-left">
              <p className="font-display text-2xl font-extrabold tracking-tight text-fg">
                {value}
              </p>
              <p className="mt-0.5 text-xs uppercase tracking-wider text-fg-subtle">
                {label}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-surface-muted px-5 py-20 text-fg sm:px-8 sm:py-24">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="eyebrow">Pick your ride</p>
              <h2 className="type-h2 mt-3">Vehicle categories</h2>
            </div>
            <p className="max-w-sm text-sm leading-relaxed text-fg-muted">
              Every category, one place. Choose the right vehicle for the job -
              not the other way around.
            </p>
          </div>

          <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
            <Link
              href="/fleet"
              className="group relative flex min-h-52 flex-col justify-between overflow-hidden rounded-3xl bg-lime p-5 text-ink transition hover:-translate-y-1 hover:brightness-95 active:translate-y-0 lg:col-span-2 lg:min-h-64"
            >
              <div className="flex items-center justify-between">
                <CarFront className="h-6 w-6" aria-hidden="true" />
                <ArrowUpRight
                  className="h-4 w-4 text-ink transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                  aria-hidden="true"
                />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-ink-soft">
                  All categories
                </p>
                <p className="font-display mt-1 text-2xl font-bold">All vehicles</p>
                <p className="mt-1 text-sm text-ink-soft">
                  Explore the complete fleet
                </p>
              </div>
              <div
                className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/30 blur-2xl"
                aria-hidden="true"
              />
            </Link>

            {VEHICLE_CATEGORIES.map((category, index) => {
              const Icon = CATEGORY_ICONS[category.value];
              return (
                <Link
                  key={category.value}
                  href={`/book?category=${category.value}`}
                  className="group relative flex min-h-52 flex-col justify-between overflow-hidden rounded-3xl border border-line bg-surface p-5 text-fg transition hover:-translate-y-1 hover:border-line-strong hover:shadow-xl active:translate-y-0 lg:min-h-64"
                >
                  <div className="flex items-center justify-between">
                    <span className="grid h-10 w-10 place-items-center rounded-full bg-surface-muted text-fg">
                      <Icon className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <span className="text-xs font-semibold text-fg-subtle">
                      0{index + 1}
                    </span>
                  </div>
                  <div className="absolute inset-x-0 bottom-18 mx-auto h-28 w-40 transition duration-500 group-hover:scale-110 motion-reduce:transform-none">
                    <Image
                      src={category.image}
                      alt=""
                      fill
                      sizes="200px"
                      className="object-cover object-center"
                    />
                  </div>
                  <div className="relative">
                    <p className="font-display text-lg font-bold text-fg">
                      {category.label}
                    </p>
                    <p className="mt-0.5 line-clamp-1 text-xs text-fg-muted">
                      {category.description}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-fg-subtle">
              Quick filter
            </span>
            <CategoryQuickFilter className="flex-1" />
          </div>
        </div>
      </section>

      <section
        id="how-it-works"
        className="surface-inverse section-y scroll-mt-24 px-5 text-fg sm:px-8"
      >
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
            <div>
              <p className="eyebrow">Simple by design</p>
              <h2 className="type-h2 mt-3">
                From tap
                <br />
                to drop-off.
              </h2>
            </div>
            <p className="max-w-lg text-sm leading-relaxed text-fg-muted lg:ml-auto">
              RYDEX connects you directly with local vehicle owners. No phone
              calls, no haggling - just a clear route, a fair fare and a partner
              ready to drive.
            </p>
          </div>

          <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((step, index) => {
              const Icon = step.icon;
              return (
                <div
                  key={step.title}
                  className="rounded-3xl border border-line bg-white/5 p-6 transition hover:border-line-strong hover:bg-white/10"
                >
                  <div className="flex items-center justify-between">
                    <span className="grid h-10 w-10 place-items-center rounded-full bg-lime text-ink">
                      <Icon className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <span
                      className="font-display text-3xl font-extrabold text-fg-subtle"
                      aria-hidden="true"
                    >
                      0{index + 1}
                    </span>
                  </div>
                  <h3 className="font-display mt-8 text-lg font-bold text-fg">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-fg-muted">
                    {step.text}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section id="pricing" className="scroll-mt-24 bg-surface px-5 py-20 text-fg sm:px-8 sm:py-24">
        <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-2">
          <div className="relative overflow-hidden rounded-[32px] bg-surface-muted p-2">
            <div className="relative aspect-[4/3] overflow-hidden rounded-[26px]">
              <Image
                src="/vehicles/car.jpg"
                alt="RYDEX partner vehicle"
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent" />
              <div className="surface-inverse absolute inset-x-5 bottom-5 rounded-2xl border border-line bg-surface-muted/85 p-4 text-fg backdrop-blur-xl">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-fg-subtle">
                      Partner earnings
                    </p>
                    <p className="font-display mt-1 text-2xl font-extrabold text-fg">
                      ₹1,13,400
                    </p>
                  </div>
                  <span className="rounded-full bg-lime px-2.5 py-1 text-xs font-bold text-ink">
                    +18.2%
                  </span>
                </div>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/20">
                  <div className="h-full w-[90%] rounded-full bg-lime" />
                </div>
                <p className="mt-2 text-xs text-fg-subtle">
                  You keep 90% of every completed ride
                </p>
              </div>
            </div>
          </div>

          <div className="lg:pl-8">
            <p className="eyebrow">For vehicle owners</p>
            <h2 className="type-h2 mt-3">
              Your vehicle.
              <br />
              Your income.
            </h2>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-fg-muted">
              List one vehicle or build a fleet. Set your own rates, accept
              requests that suit you and get paid securely - with 90% of every
              fare staying with you.
            </p>

            <div className="mt-8 space-y-4">
              {[
                ["Set your own price", "Choose base, per-km, hourly and minimum fares."],
                ["You're in control", "Accept or decline requests; pause a vehicle anytime."],
                ["Secure payouts", "Bank details encrypted; earnings tracked in real time."],
              ].map(([title, text], index) => (
                <div key={title} className="flex gap-4">
                  <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full border border-line-strong text-xs font-bold text-fg">
                    {index + 1}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-fg">{title}</p>
                    <p className="mt-0.5 text-sm text-fg-muted">{text}</p>
                  </div>
                </div>
              ))}
            </div>

            <Link href="/dashboard/partner/onboarding" className="btn-dark mt-9 px-7">
              Start earning
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>
    </PublicShell>
  );
}
