import { cn } from "@rydex/shared/utils";

export interface ChartDatum {
  label: string;
  value: number;
  hint?: string;
}

export function MiniBarChart({
  data,
  format = (value) => String(value),
  tone = "dark",
  className,
}: {
  data: ChartDatum[];
  format?: (value: number) => string;
  tone?: "dark" | "lime";
  className?: string;
}) {
  const max = Math.max(1, ...data.map((item) => item.value));
  return (
    <div className={cn("flex h-40 items-end gap-2 sm:gap-3", className)}>
      {data.map((item, index) => {
        const height = item.value > 0 ? Math.max(5, Math.round((item.value / max) * 100)) : 2;
        return (
          <div key={`${item.label}-${index}`} className="group flex min-w-0 flex-1 flex-col items-center justify-end gap-2">
            <span className="whitespace-nowrap text-[10px] font-semibold text-fg-subtle">
              {item.value > 0 ? format(item.value) : ""}
            </span>
            <div className="flex h-[112px] w-full items-end justify-center">
              <div
                className={cn(
                  "w-full max-w-9 rounded-t-lg transition group-hover:opacity-80",
                  tone === "lime" ? "bg-lime" : "bg-ink",
                  item.value === 0 && "bg-ink/10",
                )}
                style={{ height: `${height}%` }}
                title={`${item.label}: ${format(item.value)}${item.hint ? ` · ${item.hint}` : ""}`}
              />
            </div>
            <span className="w-full truncate text-center text-[10px] font-medium text-fg-muted">{item.label}</span>
          </div>
        );
      })}
    </div>
  );
}

export function ProgressRow({
  label,
  value,
  max,
  format,
  tone = "dark",
}: {
  label: string;
  value: number;
  max: number;
  format: (value: number) => string;
  tone?: "dark" | "lime" | "success";
}) {
  const percent = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div>
      <div className="flex items-center justify-between gap-3 text-[11px]">
        <span className="text-fg-muted capitalize">{label}</span>
        <span className="font-semibold">{format(value)}</span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-muted">
        <div
          className={cn(
            "h-full rounded-full",
            tone === "lime" ? "bg-lime" : tone === "success" ? "bg-success" : "bg-ink",
          )}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
