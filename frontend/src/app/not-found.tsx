import Link from "next/link";
import { Compass, Home, Search } from "lucide-react";
import Logo from "@/components/logo";

export default function NotFound() {
  return (
    <div className="grid min-h-dvh place-items-center bg-surface-muted px-5">
      <div className="w-full max-w-md rounded-[32px] border border-line bg-white p-8 text-center sm:p-10">
        <div className="flex justify-center"><Logo dark={false} /></div>
        <div className="mx-auto mt-8 grid h-14 w-14 place-items-center rounded-2xl bg-lime">
          <Compass className="h-6 w-6" />
        </div>
        <p className="eyebrow mt-5">Error 404</p>
        <h1 className="font-display mt-2 text-3xl font-extrabold tracking-tight">Wrong turn.</h1>
        <p className="mt-2 text-sm leading-relaxed text-fg-muted">
          This page doesn&apos;t exist or has moved. Let&apos;s get you back on the road.
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <Link href="/" className="btn-dark flex-1"><Home className="h-4 w-4" /> Home</Link>
          <Link href="/book" className="btn-outline flex-1"><Search className="h-4 w-4" /> Book a ride</Link>
        </div>
      </div>
    </div>
  );
}
