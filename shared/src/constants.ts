import type { VehicleCategory } from "@rydex/shared/types";

export const VEHICLE_CATEGORIES: {
  value: VehicleCategory;
  label: string;
  description: string;
  seats: number;
  image: string;
}[] = [
  { value: "bike", label: "Bike", description: "Quick, affordable city rides", seats: 2, image: "/vehicles/bike.jpg" },
  { value: "car", label: "Car", description: "Comfortable rides for any trip", seats: 4, image: "/vehicles/car.jpg" },
  { value: "auto", label: "Auto", description: "Zip through traffic with ease", seats: 3, image: "/vehicles/auto.jpg" },
  { value: "loading", label: "Loading", description: "Move goods with extra space", seats: 2, image: "/vehicles/loading.jpg" },
  { value: "truck", label: "Truck", description: "Heavy-duty transport, on demand", seats: 2, image: "/vehicles/truck.jpg" },
];

export const CATEGORY_MAP = Object.fromEntries(
  VEHICLE_CATEGORIES.map((c) => [c.value, c]),
) as Record<VehicleCategory, (typeof VEHICLE_CATEGORIES)[number]>;

export const BOOKING_STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  accepted: "Accepted",
  rejected: "Rejected",
  cancelled: "Cancelled",
  arrived: "Partner arrived",
  started: "In progress",
  completed: "Completed",
};

export const ONBOARDING_STEPS = [
  { id: "vehicle", label: "Vehicle", description: "Tell us what you drive" },
  { id: "documents", label: "Documents", description: "Upload your paperwork" },
  { id: "bank", label: "Bank", description: "Set up payouts" },
  { id: "kyc", label: "Video KYC", description: "Verify your identity" },
  { id: "pricing", label: "Pricing", description: "Set your rates" },
  { id: "review", label: "Final review", description: "Submit for approval" },
] as const;

export type OnboardingStepId = (typeof ONBOARDING_STEPS)[number]["id"];

export const FARE_CONFIG = {
  platformRate: 0.1,
  partnerRate: 0.9,
  currency: "INR",
};

export const DEFAULT_MAP_CENTER: [number, number] = [
  Number(process.env.NEXT_PUBLIC_DEFAULT_LAT || 12.9716),
  Number(process.env.NEXT_PUBLIC_DEFAULT_LNG || 77.5946),
];

export const SUPPORT_EMAIL = "support@rydex.app";
export const SUPPORT_PHONE = "+91 80 4718 2200";
export const PLATFORM_COMPANY = "RYDEX Mobility Pvt. Ltd.";
