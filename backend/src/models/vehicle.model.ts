import mongoose, { Schema, model, models } from "mongoose";
import type { VehicleCategory } from "@rydex/shared/types";

export interface IVehicle {
  _id: mongoose.Types.ObjectId;
  owner: mongoose.Types.ObjectId;
  category: VehicleCategory;
  name: string;
  brand: string;
  model: string;
  year: number;
  registrationNumber: string;
  image: string;
  images: string[];
  description?: string;
  pricePerKm: number;
  baseFare: number;
  pricePerHour: number;
  minimumFare: number;
  seats: number;
  transmission?: "manual" | "automatic";
  fuel?: "petrol" | "diesel" | "electric" | "cng";
  location?: { address: string; lat: number; lng: number };
  available: boolean;
  approved: boolean;
  rating: number;
  totalTrips: number;
  createdAt: Date;
  updatedAt: Date;
}

const VehicleSchema = new Schema<IVehicle>(
  {
    owner: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    category: {
      type: String,
      enum: ["bike", "car", "auto", "loading", "truck"],
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    brand: { type: String, required: true, trim: true },
    model: { type: String, required: true, trim: true },
    year: { type: Number, required: true },
    registrationNumber: { type: String, required: true, uppercase: true, trim: true, unique: true },
    image: { type: String, required: true },
    images: { type: [String], default: [] },
    description: { type: String, maxlength: 400 },
    pricePerKm: { type: Number, required: true, min: 0 },
    baseFare: { type: Number, required: true, min: 0, default: 0 },
    pricePerHour: { type: Number, default: 0, min: 0 },
    minimumFare: { type: Number, default: 0, min: 0 },
    seats: { type: Number, default: 2 },
    transmission: { type: String, enum: ["manual", "automatic"] },
    fuel: { type: String, enum: ["petrol", "diesel", "electric", "cng"] },
    location: {
      address: String,
      lat: Number,
      lng: Number,
    },
    available: { type: Boolean, default: true, index: true },
    approved: { type: Boolean, default: false, index: true },
    rating: { type: Number, default: 0, min: 0, max: 5 },
    totalTrips: { type: Number, default: 0 },
  },
  { timestamps: true },
);

VehicleSchema.index({ category: 1, available: 1, approved: 1, createdAt: -1 });
VehicleSchema.index({ name: "text", brand: "text", model: "text", description: "text" });

export const Vehicle = models.Vehicle || model<IVehicle>("Vehicle", VehicleSchema);
