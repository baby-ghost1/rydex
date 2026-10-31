import Image from "next/image";
import Link from "next/link";
import { cn } from "@rydex/shared/utils";

export default function Logo({
  dark = true,
  className,
  compact = false,
}: {
  dark?: boolean;
  className?: string;
  compact?: boolean;
}) {
  if (dark) {
    return (
      <Link href="/" aria-label="RYDEX home" className={cn("inline-flex items-center", className)}>
        <Image
          src="/logo.jpg"
          alt="RYDEX"
          width={compact ? 80 : 116}
          height={compact ? 42 : 61}
          priority
          className="h-8 w-auto object-contain mix-blend-screen sm:h-9"
        />
      </Link>
    );
  }

  return (
    <Link
      href="/"
      aria-label="RYDEX home"
      className={cn(
        "font-display inline-flex items-baseline gap-1 text-xl font-extrabold tracking-[0.16em] text-ink",
        className,
      )}
    >
      RYDEX
      <span className="mb-1 inline-block h-1.5 w-1.5 rounded-full bg-ink" />
    </Link>
  );
}
