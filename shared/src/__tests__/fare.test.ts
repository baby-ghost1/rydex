import { describe, expect, it } from "vitest";
import { calculateFare, estimateDistanceKm, estimateDuration } from "@rydex/shared/fare";
import { FARE_CONFIG } from "@rydex/shared/constants";

describe("calculateFare", () => {
  it("combines base, distance and hourly time charges", () => {
    const fare = calculateFare({
      distanceKm: 10,
      durationMin: 30,
      baseFare: 50,
      pricePerKm: 12,
      pricePerHour: 60,
    });

    expect(fare.base).toBe(50);
    expect(fare.distance).toBe(120);
    expect(fare.time).toBe(30);
    expect(fare.total).toBe(200);
    expect(fare.platformFee).toBe(20);
    expect(fare.partnerEarning).toBe(180);
  });

  it("keeps exactly a 10% platform fee and 90% partner share", () => {
    expect(FARE_CONFIG.platformRate).toBe(0.1);
    expect(FARE_CONFIG.partnerRate).toBe(0.9);

    const fare = calculateFare({
      distanceKm: 7,
      durationMin: 18,
      baseFare: 35,
      pricePerKm: 9,
    });

    expect(fare.platformFee + fare.partnerEarning).toBe(fare.total);
    expect(fare.platformFee).toBe(Math.round(fare.total * 0.1));
  });

  it("applies the minimum fare when the calculated total is lower", () => {
    const fare = calculateFare({
      distanceKm: 1,
      durationMin: 5,
      baseFare: 10,
      pricePerKm: 5,
      minimumFare: 100,
    });

    expect(fare.total).toBe(100);
    expect(fare.partnerEarning).toBe(90);
  });

  it("clamps negative and non-numeric input to zero", () => {
    const fare = calculateFare({
      distanceKm: -5,
      durationMin: Number.NaN,
      baseFare: -20,
      pricePerKm: -3,
      pricePerHour: -100,
      minimumFare: -50,
    });

    expect(fare).toEqual({
      base: 0,
      distance: 0,
      time: 0,
      total: 0,
      partnerEarning: 0,
      platformFee: 0,
    });
  });

  it("rounds distance and time charges to whole rupees", () => {
    const fare = calculateFare({
      distanceKm: 2.4,
      durationMin: 7,
      baseFare: 0,
      pricePerKm: 11.5,
      pricePerHour: 55,
    });

    expect(fare.distance).toBe(28);
    expect(fare.time).toBe(6);
    expect(fare.total).toBe(34);
  });
});

describe("estimateDuration", () => {
  it("never promises less than six minutes", () => {
    expect(estimateDuration(0)).toBe(6);
    expect(estimateDuration(0.1)).toBe(6);
  });

  it("grows with distance", () => {
    expect(estimateDuration(5)).toBeLessThan(estimateDuration(15));
    expect(estimateDuration(10)).toBe(31);
  });
});

describe("estimateDistanceKm", () => {
  it("is symmetric and returns a plausible road distance", () => {
    const a = { lat: 12.9716, lng: 77.5946 };
    const b = { lat: 12.9352, lng: 77.6245 };
    const forward = estimateDistanceKm(a, b);
    const reverse = estimateDistanceKm(b, a);

    expect(forward).toBe(reverse);
    expect(forward).toBeGreaterThan(3);
    expect(forward).toBeLessThan(20);
  });

  it("returns zero for identical points", () => {
    const point = { lat: 12.9716, lng: 77.5946 };
    expect(estimateDistanceKm(point, point)).toBe(0);
  });
});
