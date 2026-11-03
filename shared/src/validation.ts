import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(60),
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Za-z]/, "Include at least one letter")
    .regex(/\d/, "Include at least one number"),
  phone: z
    .string()
    .trim()
    .regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile number"),
});

export const verifyEmailSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  otp: z.string().trim().length(6, "Enter the 6-digit code"),
});

export const vehicleSchema = z.object({
  category: z.enum(["bike", "car", "auto", "loading", "truck"]),
  name: z.string().trim().min(2).max(80),
  brand: z.string().trim().min(1).max(40),
  model: z.string().trim().min(1).max(40),
  year: z.coerce.number().int().min(2000).max(new Date().getFullYear() + 1),
  registrationNumber: z
    .string()
    .trim()
    .toUpperCase()
    .min(6, "Enter a valid registration number")
    .max(16),
  image: z.string().trim().min(1, "Add a vehicle photo"),
  description: z.string().trim().max(400).optional().default(""),
  seats: z.coerce.number().int().min(1).max(20),
  transmission: z.enum(["manual", "automatic"]).optional(),
  fuel: z.enum(["petrol", "diesel", "electric", "cng"]).optional(),
  pricePerKm: z.coerce.number().min(1).max(500),
  baseFare: z.coerce.number().min(0).max(5000),
  pricePerHour: z.coerce.number().min(0).max(5000).optional(),
  minimumFare: z.coerce.number().min(0).max(10000).optional(),
  available: z.boolean().optional(),
});

export const bookingSchema = z
  .object({
    vehicleId: z.string().min(1).optional(),
    category: z.enum(["bike", "car", "auto", "loading", "truck"]).optional(),
    pickup: z.object({
      address: z.string().trim().min(3, "Add a pickup address").max(300),
      lat: z.coerce.number().min(-90).max(90),
      lng: z.coerce.number().min(-180).max(180),
    }),
    drop: z.object({
      address: z.string().trim().min(3, "Add a drop address").max(300),
      lat: z.coerce.number().min(-90).max(90),
      lng: z.coerce.number().min(-180).max(180),
    }),
    scheduled: z.boolean().optional(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a valid date").optional(),
    time: z.string().regex(/^\d{2}:\d{2}$/, "Choose a valid time").optional(),
    distanceKm: z.coerce.number().min(0.1).max(2000).optional(),
    durationMin: z.coerce.number().min(1).max(5000).optional(),
    paymentMethod: z.enum(["cash", "online"]),
    notes: z.string().max(300).optional(),
  })
  .refine((value) => Boolean(value.vehicleId) !== Boolean(value.category), {
    message: "Choose a ride type to continue.",
    path: ["category"],
  })
  .refine((value) => !value.scheduled || (Boolean(value.date) && Boolean(value.time)), {
    message: "Choose a date and time for your scheduled ride.",
    path: ["date"],
  });

export const onboardingVehicleSchema = z.object({
  step: z.literal("vehicle"),
  businessName: z.string().trim().min(2).max(80),
  ownerName: z.string().trim().min(2).max(80),
  category: z.enum(["bike", "car", "auto", "loading", "truck"]),
  name: z.string().trim().min(2).max(80),
  brand: z.string().trim().min(1).max(40),
  model: z.string().trim().min(1).max(40),
  year: z.coerce.number().int().min(2000).max(new Date().getFullYear() + 1),
  registrationNumber: z.string().trim().toUpperCase().min(6).max(16),
  seats: z.coerce.number().int().min(1).max(20),
  transmission: z.enum(["manual", "automatic"]).optional(),
  fuel: z.enum(["petrol", "diesel", "electric", "cng"]).optional(),
  image: z.string().trim().min(1, "Upload a vehicle photo"),
  description: z.string().trim().max(400).optional().default(""),
});

export const onboardingDocumentsSchema = z.object({
  step: z.literal("documents"),
  drivingLicense: z.string().trim().min(1, "Upload the driving licence"),
  vehicleRc: z.string().trim().min(1, "Upload the vehicle RC"),
  insurance: z.string().trim().min(1, "Upload the insurance document"),
  permit: z.string().trim().optional().or(z.literal("")),
});

export const onboardingBankSchema = z.object({
  step: z.literal("bank"),
  accountHolder: z.string().trim().min(2).max(80),
  accountNumber: z.string().trim().regex(/^\d{9,18}$/, "Enter a valid account number"),
  ifsc: z.string().trim().toUpperCase().regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, "Enter a valid IFSC code"),
  bankName: z.string().trim().min(2).max(80),
  upiId: z.string().trim().max(80).optional().or(z.literal("")),
});

export const onboardingPricingSchema = z.object({
  step: z.literal("pricing"),
  perKm: z.coerce.number().min(1).max(500),
  baseFare: z.coerce.number().min(0).max(5000),
  perHour: z.coerce.number().min(0).max(5000),
  minimumFare: z.coerce.number().min(0).max(10000),
  waitingCharge: z.coerce.number().min(0).max(1000),
});

export const onboardingKycSchema = z.object({
  step: z.literal("kyc"),
  videoUrl: z.string().trim().optional().or(z.literal("")),
  roomId: z.string().trim().max(80).optional().or(z.literal("")),
});

export const updateBookingStatusSchema = z.object({
  status: z.enum(["accepted", "rejected", "arrived", "started", "completed", "cancelled"]),
  reason: z.string().trim().max(300).optional(),
  otp: z.string().trim().max(8).optional(),
});

export const ratingSchema = z.object({
  rating: z.coerce.number().min(1).max(5),
  review: z.string().trim().max(500).optional().default(""),
});

export const contactSchema = z.object({
  name: z.string().trim().min(2).max(60),
  email: z.string().trim().toLowerCase().email(),
  subject: z.string().trim().min(3).max(120),
  message: z.string().trim().min(10).max(2000),
});
