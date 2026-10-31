import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, BadgeCheck, ShieldCheck, Sparkles } from "lucide-react";
import { auth } from "@rydex/backend/auth";
import PublicShell from "@/components/public-shell";
import AuthForm from "@/components/auth-form";

export const metadata = {
  title: "Sign in",
  description: "Sign in to your RYDEX account to book rides or manage your fleet.",
};

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  return (
    <PublicShell footer={false}>
      <div className="mx-auto grid min-h-[calc(100dvh-9rem)] max-w-7xl items-stretch gap-4 px-4 pb-10 sm:px-6 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="relative hidden overflow-hidden rounded-[32px] bg-ink lg:block">
          <Image
            src="/vehicles/car.jpg"
            alt="RYDEX premium ride"
            fill
            priority
            sizes="50vw"
            className="object-cover opacity-55"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/40 to-ink/10" />
          <div className="absolute inset-x-0 top-0 flex items-center justify-between p-8">
            <span className="rounded-full border border-white/15 bg-surface/5 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-fg-inverse-muted backdrop-blur">
              Member access
            </span>
            <span className="flex items-center gap-1.5 text-[10px] text-fg-inverse-muted">
              <ShieldCheck className="h-3.5 w-3.5 text-lime" /> Secure sign-in
            </span>
          </div>
          <div className="absolute inset-x-0 bottom-0 p-8">
            <p className="font-display text-[clamp(2.4rem,4vw,4rem)] font-extrabold leading-[0.94] tracking-[-0.05em] text-white">
              Your city.
              <br />
              Your ride<span className="text-lime">.</span>
            </p>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-fg-inverse-muted">
              Book bikes, cars, autos, loading vehicles and trucks from verified
              local partners — all from one account.
            </p>
            <div className="mt-7 flex flex-wrap gap-x-6 gap-y-2 text-[10px] text-fg-inverse-subtle">
              <span className="flex items-center gap-1.5"><BadgeCheck className="h-3 w-3 text-lime" /> Verified partners</span>
              <span className="flex items-center gap-1.5"><Sparkles className="h-3 w-3 text-lime" /> Transparent fares</span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center rounded-[32px] border border-line bg-white px-5 py-12 sm:px-10">
          <div className="w-full max-w-[390px]">
            <Link href="/" className="mb-7 inline-flex items-center gap-1.5 text-[11px] font-semibold text-fg-muted hover:text-ink">
              <ArrowLeft className="h-3.5 w-3.5" /> Back to home
            </Link>
            <AuthForm initialMode="login" />
          </div>
        </div>
      </div>
    </PublicShell>
  );
}
