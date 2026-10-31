import { describe, expect, it } from "vitest";
import {
  cn,
  formatDate,
  haversineKm,
  initials,
  inr,
  maskAccount,
  rupeesToPaise,
  serialize,
  truncate,
  validEmail,
} from "@rydex/shared/utils";

describe("formatting helpers", () => {
  it("formats rupees in Indian numbering", () => {
    expect(inr(0)).toBe("₹0");
    expect(inr(1234)).toContain("1,234");
    expect(inr(150000, true)).toBe("₹1.5L");
    expect(inr(2500000, true)).toBe("₹25L");
    expect(inr(Number.NaN)).toBe("₹0");
  });

  it("handles dates safely", () => {
    expect(formatDate(undefined)).toBe("—");
    expect(formatDate("not-a-date")).toBe("—");
    expect(formatDate("2026-10-26")).toContain("2026");
  });

  it("builds initials and truncates long text", () => {
    expect(initials("Asha Rao")).toBe("AR");
    expect(initials("Imran")).toBe("I");
    expect(initials()).toBe("R");
    expect(truncate("short", 10)).toBe("short");
    expect(truncate("a long sentence that needs cutting", 10)).toBe("a long se…");
  });

  it("joins only truthy class names", () => {
    expect(cn("base", false, null, undefined, "active")).toBe("base active");
  });

  it("validates email shape and masks account numbers", () => {
    expect(validEmail("asha@example.com")).toBe(true);
    expect(validEmail("asha@example")).toBe(false);
    expect(maskAccount("123456789012")).toBe("•••• 9012");
    expect(maskAccount()).toBe("—");
  });

  it("converts rupees to paise and serializes documents", () => {
    expect(rupeesToPaise(12.34)).toBe(1234);
    expect(rupeesToPaise(0.1)).toBe(10);
    expect(serialize({ ok: true, nested: { id: 1 } })).toEqual({ ok: true, nested: { id: 1 } });
  });
});

describe("distance helpers", () => {
  it("matches known short distances", () => {
    const distance = haversineKm({ lat: 12.9716, lng: 77.5946 }, { lat: 12.9352, lng: 77.6245 });
    expect(distance).toBeGreaterThan(3);
    expect(distance).toBeLessThan(6);
  });

  it("is symmetric", () => {
    const a = { lat: 12.9716, lng: 77.5946 };
    const b = { lat: 13.0358, lng: 77.597 };
    expect(haversineKm(a, b)).toBeCloseTo(haversineKm(b, a), 10);
  });
});
