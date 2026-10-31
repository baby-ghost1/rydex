import mongoose, { Schema, model, models } from "mongoose";
import type { PartnerProfile, PartnerStatus, UserRole } from "@rydex/shared/types";

export interface IUser {
  _id: mongoose.Types.ObjectId;
  name: string;
  email: string;
  passwordHash?: string;
  phone?: string;
  image?: string;
  emailVerified?: Date | null;
  role: UserRole;
  partnerStatus: PartnerStatus;
  partnerProfile: PartnerProfile;
  emailOtpHash?: string;
  emailOtpExpires?: Date;
  resetOtpHash?: string;
  resetOtpExpires?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const PartnerProfileSchema = new Schema<PartnerProfile>(
  {
    businessName: String,
    ownerName: String,
    vehicleDraft: {
      category: { type: String, enum: ["bike", "car", "auto", "loading", "truck"] },
      name: String,
      brand: String,
      model: String,
      year: Number,
      registrationNumber: String,
      image: String,
      seats: Number,
      transmission: { type: String, enum: ["manual", "automatic"] },
      fuel: { type: String, enum: ["petrol", "diesel", "electric", "cng"] },
      description: String,
    },
    documents: {
      drivingLicense: String,
      vehicleRc: String,
      insurance: String,
      permit: String,
    },
    bank: {
      accountHolder: String,
      accountNumber: String,
      accountNumberLast4: String,
      ifsc: String,
      bankName: String,
      upiId: String,
    },
    kyc: {
      roomId: String,
      videoUrl: String,
      status: {
        type: String,
        enum: ["not_started", "pending", "approved", "rejected"],
        default: "not_started",
      },
      note: String,
      submittedAt: Date,
      reviewedAt: Date,
    },
    pricing: {
      perKm: Number,
      baseFare: Number,
      perHour: Number,
      minimumFare: Number,
      waitingCharge: Number,
    },
    submittedAt: Date,
    reviewedAt: Date,
    rejectionReason: String,
  },
  { _id: false },
);

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    passwordHash: { type: String, select: false },
    phone: { type: String, trim: true },
    image: String,
    emailVerified: { type: Date, default: null },
    role: { type: String, enum: ["user", "partner", "admin"], default: "user", index: true },
    partnerStatus: {
      type: String,
      enum: ["none", "draft", "pending", "approved", "rejected"],
      default: "none",
      index: true,
    },
    partnerProfile: { type: PartnerProfileSchema, default: () => ({}) },
    emailOtpHash: { type: String, select: false },
    emailOtpExpires: { type: Date, select: false },
    resetOtpHash: { type: String, select: false },
    resetOtpExpires: { type: Date, select: false },
  },
  { timestamps: true },
);

export const User = models.User || model<IUser>("User", UserSchema);
