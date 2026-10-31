import { describe, expect, it } from "vitest";
import { parsePagination } from "@rydex/backend/lib/pagination";

describe("parsePagination", () => {
  it("uses safe defaults", () => {
    expect(parsePagination("http://localhost/api/bookings")).toEqual({
      page: 1,
      limit: 12,
      skip: 0,
    });
    expect(parsePagination("http://localhost/api/bookings", 20)).toEqual({
      page: 1,
      limit: 20,
      skip: 0,
    });
  });

  it("computes the skip offset", () => {
    expect(parsePagination("http://localhost/api/bookings?page=3&limit=10")).toEqual({
      page: 3,
      limit: 10,
      skip: 20,
    });
  });

  it("clamps negative pages and oversized limits", () => {
    expect(parsePagination("http://localhost/api/bookings?page=-4&limit=500")).toEqual({
      page: 1,
      limit: 50,
      skip: 0,
    });
  });

  it("treats invalid numbers as the default page", () => {
    expect(parsePagination("http://localhost/api/bookings?page=abc&limit=abc")).toEqual({
      page: 1,
      limit: 12,
      skip: 0,
    });
  });
});
