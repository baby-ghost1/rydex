export type UserRole = "user" | "partner" | "admin";
export type PartnerStatus = "none" | "draft" | "pending" | "approved" | "rejected";
export type VehicleCategory = "bike" | "car" | "auto" | "loading" | "truck";
export type BookingStatus =
  | "pending"
  | "accepted"
  | "rejected"
  | "cancelled"
  | "arrived"
  | "started"
  | "completed";
export type PaymentMethod = "cash" | "online";
export type PaymentStatus = "pending" | "paid" | "refunded" | "failed";

export interface VehicleDTO {
  _id: string;
  owner: string | { _id: string; name: string; partnerProfile?: { businessName?: string } };
  category: VehicleCategory;
  name: string;
  brand: string;
  model: string;
  year: number;
  registrationNumber: string;
  image: string;
  images?: string[];
  description?: string;
  pricePerKm: number;
  baseFare: number;
  pricePerHour?: number;
  minimumFare?: number;
  seats: number;
  transmission?: "manual" | "automatic";
  fuel?: "petrol" | "diesel" | "electric" | "cng";
  location?: { address: string; lat: number; lng: number };
  available: boolean;
  approved: boolean;
  rating: number;
  totalTrips: number;
  createdAt: string;
}

export interface RideOptionDTO {
  category: VehicleCategory;
  count: number;
  etaMin: number;
  nearestKm: number;
  fare: {
    base: number;
    distance: number;
    time: number;
    total: number;
    partnerEarning: number;
    platformFee: number;
  };
}

export interface BookingDTO {
  _id: string;
  bookingCode?: string;
  user: { _id: string; name: string; email: string; phone?: string; image?: string } | string;
  partner:
    | { _id: string; name: string; email: string; phone?: string; image?: string }
    | string
    | null;
  vehicle: VehicleDTO | string | null;
  category: VehicleCategory;
  pickup: { address: string; lat: number; lng: number };
  drop: { address: string; lat: number; lng: number };
  scheduled?: boolean;
  date: string;
  time: string;
  distanceKm: number;
  durationMin: number;
  fare: {
    base: number;
    distance: number;
    time: number;
    total: number;
    partnerEarning: number;
    platformFee: number;
  };
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  status: BookingStatus;
  pickupOtp?: string;
  dropOtp?: string;
  declines?: Array<{ partner: string; reason?: string; createdAt: string }>;
  otpVerified: { pickup: boolean; drop: boolean };
  rideStartedAt?: string;
  completedAt?: string;
  cancelledAt?: string;
  rating?: number;
  review?: string;
  rejectionReason?: string;
  messages: Array<{ _id: string; sender: string; text: string; createdAt: string }>;
  partnerLocation?: { lat: number; lng: number; updatedAt: string };
  createdAt: string;
  updatedAt: string;
}

export interface PartnerProfile {
  businessName?: string;
  ownerName?: string;
  vehicleDraft?: {
    category?: VehicleCategory;
    name?: string;
    brand?: string;
    model?: string;
    year?: number;
    registrationNumber?: string;
    image?: string;
    seats?: number;
    transmission?: string;
    fuel?: string;
    description?: string;
  };
  documents?: {
    drivingLicense?: string;
    vehicleRc?: string;
    insurance?: string;
    permit?: string;
  };
  bank?: {
    accountHolder?: string;
    accountNumber?: string;
    accountNumberLast4?: string;
    ifsc?: string;
    bankName?: string;
    upiId?: string;
  };
  kyc?: {
    roomId?: string;
    videoUrl?: string;
    status?: "not_started" | "pending" | "approved" | "rejected";
    note?: string;
    submittedAt?: string;
    reviewedAt?: string;
  };
  pricing?: {
    perKm?: number;
    baseFare?: number;
    perHour?: number;
    minimumFare?: number;
    waitingCharge?: number;
  };
  preferences?: {
    acceptRadiusKm?: number;
  };
  currentLocation?: {
    lat: number;
    lng: number;
    updatedAt: string;
    isOnline: boolean;
  };
  submittedAt?: string;
  reviewedAt?: string;
  rejectionReason?: string;
}

export interface SessionUser {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  phone?: string | null;
  role: UserRole;
  partnerStatus: PartnerStatus;
  emailVerified?: string | null;
}

export interface AppConfig {
  googleEnabled: boolean;
  razorpayEnabled: boolean;
  zegoEnabled: boolean;
  emailEnabled: boolean;
  cloudinaryEnabled: boolean;
  demoMode: boolean;
}
