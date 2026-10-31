import { cn } from "@rydex/shared/utils";
import { BOOKING_STATUS_LABELS } from "@rydex/shared/constants";

const styles: Record<string, string> = {
  pending: "bg-warning/10 text-warning border-warning/15",
  accepted: "bg-blue-50 text-blue-700 border-blue-100",
  arrived: "bg-violet-50 text-violet-700 border-violet-100",
  started: "bg-ink text-white border-ink",
  completed: "bg-success/10 text-success border-success/15",
  rejected: "bg-danger/10 text-danger border-danger/15",
  cancelled: "bg-ink/5 text-fg-muted border-line",
};

export default function StatusBadge({
  status,
  className,
  dot = true,
}: {
  status: string;
  className?: string;
  dot?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider",
        styles[status] || styles.pending,
        className,
      )}
    >
      {dot && (
        <span
          aria-hidden="true"
          className="h-1.5 w-1.5 rounded-full bg-current"
        />
      )}
      {BOOKING_STATUS_LABELS[status] || status}
    </span>
  );
}
