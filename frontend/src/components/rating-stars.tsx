"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { cn } from "@rydex/shared/utils";

export default function RatingStars({
  value,
  onChange,
  size = "md",
  className,
}: {
  value: number;
  onChange?: (value: number) => void;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const [hover, setHover] = useState(0);
  const starSize =
    size === "lg" ? "h-6 w-6" : size === "sm" ? "h-3.5 w-3.5" : "h-5 w-5";
  const activeValue = hover || value;

  if (!onChange) {
    return (
      <div
        className={cn("flex items-center gap-1", className)}
        role="img"
        aria-label={`${value} out of 5 stars`}
      >
        {Array.from({ length: 5 }).map((_, index) => (
          <Star
            key={index}
            className={cn(
              starSize,
              index < value
                ? "fill-ink text-ink"
                : "fill-transparent text-fg-subtle",
            )}
            aria-hidden="true"
          />
        ))}
      </div>
    );
  }

  return (
    <div
      role="group"
      aria-label="Rate this ride"
      className={cn("flex items-center", className)}
    >
      {Array.from({ length: 5 }).map((_, index) => {
        const star = index + 1;
        const active = star <= activeValue;

        return (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            onMouseEnter={() => setHover(star)}
            onMouseLeave={() => setHover(0)}
            aria-label={`${star} star${star > 1 ? "s" : ""}`}
            aria-pressed={value === star}
            className="grid min-h-11 min-w-11 place-items-center rounded-full transition hover:bg-surface-muted active:scale-95"
          >
            <Star
              className={cn(
                starSize,
                active ? "fill-ink text-ink" : "fill-transparent text-fg-subtle",
              )}
              aria-hidden="true"
            />
          </button>
        );
      })}
    </div>
  );
}
