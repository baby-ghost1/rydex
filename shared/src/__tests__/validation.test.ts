import { describe, expect, it } from "vitest";
import {
  bookingSchema,
  contactSchema,
  onboardingBankSchema,
  onboardingPricingSchema,
  ratingSchema,
  registerSchema,
  updateBookingStatusSchema,
  vehicleSchema,
} from "@rydex/shared/validation";

describe("registration validation", () => {
  it("normalizes email casing and trims names", () => {
    const parsed = registerSchema.parse({
      name: "  Asha Rao  ",
      email: "  ASHA@Example.com ",
      password: "ride1234",
      phone: "9876543210",
    });

    expect(parsed.name).toBe("Asha Rao");
    expect(parsed.email).toBe("asha@example.com");
  });

  it("requires a letter, a number and eight characters in the password", () => {
    const base = { name: "Asha Rao", email: "asha@example.com", phone: "9876543210" };
    expect(registerSchema.safeParse({ ...base, password: "short1" }).success).toBe(false);
    expect(registerSchema.safeParse({ ...base, password: "onlyletters" }).success).toBe(false);
    expect(registerSchema.safeParse({ ...base, password: "12345678" }).success).toBe(false);
    expect(registerSchema.safeParse({ ...base, password: "ride1234" }).success).toBe(true);
  });

  it("rejects invalid Indian mobile numbers and emails", () => {
    const base = { name: "Asha Rao", password: "ride1234" };
    expect(registerSchema.safeParse({ ...base, email: "not-an-email", phone: "9876543210" }).success).toBe(false);
    expect(registerSchema.safeParse({ ...base, email: "asha@example.com", phone: "12345" }).success).toBe(false);
    expect(registerSchema.safeParse({ ...base, email: "asha@example.com", phone: "5876543210" }).success).toBe(false);
  });
});

describe("vehicle validation", () => {
  const valid = {
    category: "car",
    name: "City Sedan",
    brand: "Honda",
    model: "City",
    year: "2022",
    registrationNumber: "ka01ab1234",
    image: "/vehicles/car.jpg",
    seats: "4",
    pricePerKm: "14",
    baseFare: "50",
  };

  it("coerces numbers and uppercases the registration number", () => {
    const parsed = vehicleSchema.parse(valid);
    expect(parsed.year).toBe(2022);
    expect(parsed.seats).toBe(4);
    expect(parsed.pricePerKm).toBe(14);
    expect(parsed.registrationNumber).toBe("KA01AB1234");
  });

  it("rejects a future model year and unsafe prices", () => {
    expect(vehicleSchema.safeParse({ ...valid, year: new Date().getFullYear() + 3 }).success).toBe(false);
    expect(vehicleSchema.safeParse({ ...valid, pricePerKm: "0" }).success).toBe(false);
    expect(vehicleSchema.safeParse({ ...valid, seats: "0" }).success).toBe(false);
  });
});

describe("booking validation", () => {
  const valid = {
    vehicleId: "507f1f77bcf86cd799439011",
    pickup: { address: "Indiranagar, Bengaluru", lat: "12.9716", lng: "77.6412" },
    drop: { address: "Koramangala, Bengaluru", lat: "12.9352", lng: "77.6245" },
    date: "2026-11-01",
    time: "10:30",
    distanceKm: "5.4",
    durationMin: "22",
    paymentMethod: "cash",
  };

  it("accepts a complete cash booking and coerces coordinates", () => {
    const parsed = bookingSchema.parse(valid);
    expect(parsed.pickup.lat).toBe(12.9716);
    expect(parsed.distanceKm).toBe(5.4);
  });

  it("rejects invalid dates, times and coordinates", () => {
    expect(bookingSchema.safeParse({ ...valid, date: "01-11-2026" }).success).toBe(false);
    expect(bookingSchema.safeParse({ ...valid, time: "9am" }).success).toBe(false);
    expect(bookingSchema.safeParse({ ...valid, pickup: { ...valid.pickup, lat: "91" } }).success).toBe(false);
    expect(bookingSchema.safeParse({ ...valid, distanceKm: "0" }).success).toBe(false);
  });
});

describe("partner onboarding validation", () => {
  it("normalizes a valid IFSC code", () => {
    const parsed = onboardingBankSchema.parse({
      step: "bank",
      accountHolder: "Asha Rao",
      accountNumber: "123456789012",
      ifsc: "hdfc0001234",
      bankName: "HDFC Bank",
      upiId: "",
    });

    expect(parsed.ifsc).toBe("HDFC0001234");
  });

  it("rejects malformed account numbers and IFSC codes", () => {
    const base = {
      step: "bank",
      accountHolder: "Asha Rao",
      accountNumber: "123456789012",
      ifsc: "HDFC0001234",
      bankName: "HDFC Bank",
    };

    expect(onboardingBankSchema.safeParse({ ...base, accountNumber: "12" }).success).toBe(false);
    expect(onboardingBankSchema.safeParse({ ...base, ifsc: "HDFC1001234" }).success).toBe(false);
  });

  it("requires positive partner pricing", () => {
    const base = { step: "pricing", perKm: 12, baseFare: 40, perHour: 0, minimumFare: 0, waitingCharge: 0 };
    expect(onboardingPricingSchema.safeParse(base).success).toBe(true);
    expect(onboardingPricingSchema.safeParse({ ...base, perKm: 0 }).success).toBe(false);
  });
});

describe("review, rating and contact validation", () => {
  it("accepts only known booking statuses", () => {
    expect(updateBookingStatusSchema.safeParse({ status: "arrived" }).success).toBe(true);
    expect(updateBookingStatusSchema.safeParse({ status: "teleported" }).success).toBe(false);
  });

  it("coerces ratings and trims reviews", () => {
    const parsed = ratingSchema.parse({ rating: "5", review: "  Smooth ride  " });
    expect(parsed.rating).toBe(5);
    expect(parsed.review).toBe("Smooth ride");
    expect(ratingSchema.safeParse({ rating: 0 }).success).toBe(false);
    expect(ratingSchema.safeParse({ rating: 6 }).success).toBe(false);
  });

  it("rejects contact messages that are too short", () => {
    const base = { name: "Asha", email: "asha@example.com", subject: "Refund question" };
    expect(contactSchema.safeParse({ ...base, message: "Help" }).success).toBe(false);
    expect(contactSchema.safeParse({ ...base, message: "My refund has not arrived yet." }).success).toBe(true);
  });
});
