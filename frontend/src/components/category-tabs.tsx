"use client";

import { CarFront } from "lucide-react";
import { VEHICLE_CATEGORIES } from "@rydex/shared/constants";
import { CATEGORY_ICONS } from "@/lib/category-icons";
import { cn } from "@rydex/shared/utils";

export { CATEGORY_ICONS };

export default function CategoryTabs({
  value,
  onChange,
  includeAll = false,
  variant = "light",
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  includeAll?: boolean;
  variant?: "light" | "dark";
  className?: string;
}) {
  const all = includeAll
    ? [{ value: "all", label: "All vehicles", icon: CarFront }]
    : [];
  const items = [
    ...all,
    ...VEHICLE_CATEGORIES.map((category) => ({
      value: category.value,
      label: category.label,
      icon: CATEGORY_ICONS[category.value],
    })),
  ];

  return (
    <div
      role="group"
      aria-label="Vehicle category"
      className={cn(
        "no-scrollbar flex min-w-0 flex-wrap gap-2 sm:flex-nowrap sm:overflow-x-auto",
        className,
      )}
    >
      {items.map((item) => {
        const Icon = item.icon;
        const active = value === item.value;

        return (
          <button
            key={item.value}
            type="button"
            onClick={() => onChange(item.value)}
            aria-pressed={active}
            className={cn(
              "inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border px-4 py-2.5 text-xs font-semibold transition active:scale-[0.98]",
              variant === "dark"
                ? active
                  ? "border-lime bg-lime text-ink"
                  : "border-white/20 text-fg-inverse-muted hover:border-white/40 hover:bg-white/10 hover:text-fg-inverse"
                : active
                  ? "border-ink bg-ink text-white shadow-sm"
                  : "border-line-strong bg-surface text-fg-muted hover:border-fg-subtle hover:bg-surface-muted hover:text-fg",
            )}
          >
            <Icon className="h-3.5 w-3.5" aria-hidden="true" />
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
