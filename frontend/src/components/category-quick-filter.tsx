"use client";

import { useRouter } from "next/navigation";
import CategoryTabs from "@/components/category-tabs";

export default function CategoryQuickFilter({ className }: { className?: string }) {
  const router = useRouter();
  return (
    <CategoryTabs
      value=""
      includeAll
      className={className}
      onChange={(value) => router.push(value === "all" ? "/fleet" : `/book?category=${value}`)}
    />
  );
}
