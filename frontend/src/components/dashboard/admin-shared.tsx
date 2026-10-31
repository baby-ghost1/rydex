import Link from "next/link";
import { ArrowUpRight, ShieldCheck } from "lucide-react";
import { cn } from "@rydex/shared/utils";

const styles: Record<string, string> = {
  none: "bg-surface-muted text-fg-muted border-line",
  draft: "bg-ink/5 text-fg-muted border-line",
  pending: "bg-warning/10 text-warning border-warning/15",
  approved: "bg-success/10 text-success border-success/15",
  rejected: "bg-danger/10 text-danger border-danger/15",
};

const labels: Record<string, string> = {
  none: "Not started",
  draft: "Draft",
  pending: "In review",
  approved: "Approved",
  rejected: "Changes requested",
};

export function VendorStatusBadge({
  status,
  dot = true,
  className,
}: {
  status?: string;
  dot?: boolean;
  className?: string;
}) {
  const key = status || "none";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider",
        styles[key] || styles.none,
        className,
      )}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {labels[key] || key}
    </span>
  );
}

export function VendorAvatar({
  name,
  image,
  size = "md",
}: {
  name?: string | null;
  image?: string | null;
  size?: "sm" | "md" | "lg";
}) {
  const text = (name || "RYDEX")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
  return (
    <span
      className={cn(
        "grid shrink-0 place-items-center overflow-hidden rounded-full bg-ink font-bold text-white",
        size === "sm" ? "h-9 w-9 text-[10px]" : size === "lg" ? "h-16 w-16 text-lg" : "h-11 w-11 text-xs",
      )}
    >
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={image} alt="" className="h-full w-full object-cover" />
      ) : (
        text
      )}
    </span>
  );
}

export function ReviewQueueBanner({ pending }: { pending: number }) {
  if (!pending) return null;
  return (
    <div className="flex flex-col justify-between gap-3 rounded-2xl border border-warning/20 bg-warning/5 px-4 py-3.5 sm:flex-row sm:items-center">
      <div className="flex items-start gap-2.5">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
        <div>
          <p className="text-xs font-bold text-warning">
            {pending} partner application{pending === 1 ? "" : "s"} awaiting review
          </p>
          <p className="mt-0.5 text-[10px] leading-relaxed text-fg-muted">
            Verify documents and video KYC before approving a vendor.
          </p>
        </div>
      </div>
      <Link href="/dashboard/admin/vendors?status=pending" className="btn-dark shrink-0 !px-3.5 !py-2 text-[11px]">
        Review queue <ArrowUpRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}
