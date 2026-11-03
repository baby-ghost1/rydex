import mongoose, { Schema, model, models } from "mongoose";
import type { BookingStatus, PaymentMethod, PaymentStatus, VehicleCategory } from "@rydex/shared/types";

export interface IBookingMessage {
  _id?: mongoose.Types.ObjectId;
  sender: mongoose.Types.ObjectId;
  text: string;
  createdAt: Date;
}

export interface IBookingDecline {
  partner: mongoose.Types.ObjectId;
  reason?: string;
  createdAt: Date;
}

export interface IBooking {
  _id: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  partner: mongoose.Types.ObjectId | null;
  vehicle: mongoose.Types.ObjectId | null;
  category: VehicleCategory;
  pickup: { address: string; lat: number; lng: number };
  drop: { address: string; lat: number; lng: number };
  scheduled: boolean;
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
  pickupOtpHash?: string;
  dropOtpHash?: string;
  pickupOtpCode?: string;
  dropOtpCode?: string;
  otpVerified: { pickup: boolean; drop: boolean };
  rideStartedAt?: Date;
  completedAt?: Date;
  cancelledAt?: Date;
  rating?: number;
  review?: string;
  rejectionReason?: string;
  declines: IBookingDecline[];
  notifiedPartners: mongoose.Types.ObjectId[];
  notes?: string;
  messages: IBookingMessage[];
  partnerLocation?: { lat: number; lng: number; updatedAt: Date };
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const LocationSchema = new Schema(
  {
    address: { type: String, required: true },
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
  },
  { _id: false },
);

const FareSchema = new Schema(
  {
    base: { type: Number, default: 0 },
    distance: { type: Number, default: 0 },
    time: { type: Number, default: 0 },
    total: { type: Number, required: true },
    partnerEarning: { type: Number, default: 0 },
    platformFee: { type: Number, default: 0 },
  },
  { _id: false },
);

const MessageSchema = new Schema<IBookingMessage>(
  {
    sender: { type: Schema.Types.ObjectId, ref: "User", required: true },
    text: { type: String, required: true, maxlength: 1000 },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true },
);

const DeclineSchema = new Schema<IBookingDecline>(
  {
    partner: { type: Schema.Types.ObjectId, ref: "User", required: true },
    reason: { type: String, maxlength: 300 },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const BookingSchema = new Schema<IBooking>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    partner: { type: Schema.Types.ObjectId, ref: "User", default: null, index: true },
    vehicle: { type: Schema.Types.ObjectId, ref: "Vehicle", default: null },
    category: {
      type: String,
      enum: ["bike", "car", "auto", "loading", "truck"],
      required: true,
    },
    pickup: { type: LocationSchema, required: true },
    drop: { type: LocationSchema, required: true },
    scheduled: { type: Boolean, default: false },
    date: { type: String, required: true },
    time: { type: String, required: true },
    distanceKm: { type: Number, required: true },
    durationMin: { type: Number, required: true },
    fare: { type: FareSchema, required: true },
    paymentMethod: { type: String, enum: ["cash", "online"], required: true },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "refunded", "failed"],
      default: "pending",
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected", "cancelled", "arrived", "started", "completed"],
      default: "pending",
      index: true,
    },
    pickupOtpHash: { type: String, select: false },
    dropOtpHash: { type: String, select: false },
    pickupOtpCode: { type: String, select: false },
    dropOtpCode: { type: String, select: false },
    otpVerified: {
      pickup: { type: Boolean, default: false },
      drop: { type: Boolean, default: false },
    },
    rideStartedAt: Date,
    completedAt: Date,
    cancelledAt: Date,
    rating: { type: Number, min: 1, max: 5 },
    review: { type: String, maxlength: 500 },
    rejectionReason: String,
    declines: { type: [DeclineSchema], default: [] },
    notifiedPartners: { type: [Schema.Types.ObjectId], ref: "User", default: [] },
    notes: { type: String, maxlength: 300 },
    messages: { type: [MessageSchema], default: [] },
    partnerLocation: {
      lat: Number,
      lng: Number,
      updatedAt: Date,
    },
    razorpayOrderId: String,
    razorpayPaymentId: String,
  },
  { timestamps: true },
);

BookingSchema.index({ user: 1, createdAt: -1 });
BookingSchema.index({ partner: 1, status: 1, createdAt: -1 });
BookingSchema.index({ status: 1, category: 1, partner: 1, createdAt: -1 });

export const Booking = models.Booking || model<IBooking>("Booking", BookingSchema);
