import { NextResponse } from "next/server";
import { connectDB } from "@rydex/backend/lib/db";
import { User } from "@rydex/backend/models/user.model";
import { Vehicle } from "@rydex/backend/models/vehicle.model";
import { requireUser, handleApiError, jsonError } from "@rydex/backend/lib/auth-helpers";
import {
  onboardingBankSchema,
  onboardingDocumentsSchema,
  onboardingKycSchema,
  onboardingPricingSchema,
  onboardingVehicleSchema,
} from "@rydex/shared/validation";
import { encryptSensitive } from "@rydex/backend/lib/crypto";
import { sendBookingStatusEmail } from "@rydex/backend/lib/email";
import { emitSocketEvent, userRoom } from "@rydex/backend/lib/socket";
import type { PartnerProfile } from "@rydex/shared/types";

function sanitizeProfile(user: Awaited<ReturnType<typeof requireUser>>) {
  const profile = user.partnerProfile || {};
  return {
    businessName: profile.businessName || "",
    ownerName: profile.ownerName || "",
    vehicleDraft: profile.vehicleDraft || {},
    documents: profile.documents || {},
    bank: {
      accountHolder: profile.bank?.accountHolder || "",
      accountNumberLast4: profile.bank?.accountNumberLast4 || "",
      ifsc: profile.bank?.ifsc || "",
      bankName: profile.bank?.bankName || "",
      upiId: profile.bank?.upiId || "",
    },
    kyc: {
      status: profile.kyc?.status || "not_started",
      videoUrl: profile.kyc?.videoUrl || "",
      roomId: profile.kyc?.roomId || "",
      note: profile.kyc?.note || "",
      submittedAt: profile.kyc?.submittedAt || null,
    },
    pricing: profile.pricing || {},
    submittedAt: profile.submittedAt || null,
    reviewedAt: profile.reviewedAt || null,
    rejectionReason: profile.rejectionReason || "",
  };
}

function completion(profile: Partial<PartnerProfile> | null | undefined) {
  const vehicleComplete = Boolean(
    profile?.businessName &&
      profile?.ownerName &&
      profile?.vehicleDraft?.registrationNumber &&
      profile?.vehicleDraft?.image &&
      profile?.vehicleDraft?.category,
  );
  const documentsComplete = Boolean(
    profile?.documents?.drivingLicense &&
      profile?.documents?.vehicleRc &&
      profile?.documents?.insurance,
  );
  const bankComplete = Boolean(
    profile?.bank?.accountHolder && profile?.bank?.accountNumberLast4 && profile?.bank?.ifsc,
  );
  const kycComplete = ["pending", "approved"].includes(profile?.kyc?.status || "");
  const pricingComplete = Boolean(profile?.pricing?.perKm && profile?.pricing?.baseFare !== undefined);
  const all = vehicleComplete && documentsComplete && bankComplete && kycComplete && pricingComplete;
  return { vehicleComplete, documentsComplete, bankComplete, kycComplete, pricingComplete, all };
}

export async function GET() {
  try {
    const user = await requireUser();
    await connectDB();
    const vehicle = user.partnerProfile?.vehicleDraft?.registrationNumber
      ? await Vehicle.findOne({ owner: user._id }).lean()
      : null;
    return NextResponse.json({
      ok: true,
      profile: sanitizeProfile(user),
      completion: completion(user.partnerProfile),
      partnerStatus: user.partnerStatus,
      role: user.role,
      vehicle,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    if (user.role === "admin") return jsonError("Admins do not need partner onboarding.", 403);
    if (user.partnerStatus === "pending") {
      return jsonError("Your application is under review. You cannot edit it right now.", 409);
    }
    if (user.partnerStatus === "approved") {
      return jsonError("You are already an approved partner. Manage your fleet instead.", 409);
    }

    const body = await request.json();
    const step = body?.step;
    await connectDB();
    const profile = user.partnerProfile || {};
    let message = "";

    if (step === "vehicle") {
      const parsed = onboardingVehicleSchema.safeParse(body);
      if (!parsed.success) return jsonError(parsed.error.issues[0]?.message || "Check the vehicle details.", 422);
      const d = parsed.data;
      profile.businessName = d.businessName;
      profile.ownerName = d.ownerName;
      profile.vehicleDraft = {
        category: d.category,
        name: d.name,
        brand: d.brand,
        model: d.model,
        year: d.year,
        registrationNumber: d.registrationNumber,
        seats: d.seats,
        transmission: d.transmission,
        fuel: d.fuel,
        image: d.image,
        description: d.description,
      };
      message = "Vehicle details saved.";
    } else if (step === "documents") {
      const parsed = onboardingDocumentsSchema.safeParse(body);
      if (!parsed.success) return jsonError(parsed.error.issues[0]?.message || "Upload all required documents.", 422);
      profile.documents = {
        drivingLicense: parsed.data.drivingLicense,
        vehicleRc: parsed.data.vehicleRc,
        insurance: parsed.data.insurance,
        permit: parsed.data.permit || "",
      };
      message = "Documents uploaded.";
    } else if (step === "bank") {
      const parsed = onboardingBankSchema.safeParse(body);
      if (!parsed.success) return jsonError(parsed.error.issues[0]?.message || "Check your bank details.", 422);
      const d = parsed.data;
      profile.bank = {
        accountHolder: d.accountHolder,
        accountNumber: encryptSensitive(d.accountNumber),
        accountNumberLast4: d.accountNumber.slice(-4),
        ifsc: d.ifsc,
        bankName: d.bankName,
        upiId: d.upiId || "",
      };
      message = "Payout details saved securely.";
    } else if (step === "kyc") {
      const parsed = onboardingKycSchema.safeParse(body);
      if (!parsed.success) return jsonError("Complete the video verification step.", 422);
      if (!parsed.data.videoUrl && !parsed.data.roomId) {
        return jsonError("Complete a live KYC call or upload a verification video.", 422);
      }
      profile.kyc = {
        ...(profile.kyc || {}),
        videoUrl: parsed.data.videoUrl || "",
        roomId: parsed.data.roomId || "",
        status: "pending",
        submittedAt: new Date(),
        note: "",
      };
      message = "Video KYC submitted.";
    } else if (step === "pricing") {
      const parsed = onboardingPricingSchema.safeParse(body);
      if (!parsed.success) return jsonError(parsed.error.issues[0]?.message || "Check your pricing.", 422);
      const d = parsed.data;
      profile.pricing = {
        perKm: d.perKm,
        baseFare: d.baseFare,
        perHour: d.perHour,
        minimumFare: d.minimumFare,
        waitingCharge: d.waitingCharge,
      };
      message = "Pricing saved.";
    } else if (step === "review") {
      const done = completion(profile);
      if (!done.all) {
        return jsonError("Finish every onboarding step before submitting.", 422);
      }
      const draft = profile.vehicleDraft!;
      const duplicate = await Vehicle.findOne({
        registrationNumber: draft.registrationNumber,
        owner: { $ne: user._id },
      }).lean();
      if (duplicate) {
        return jsonError("That registration number is already listed by another partner.", 409);
      }
      const pricing = profile.pricing!;
      const vehicleData = {
        owner: user._id,
        category: draft.category,
        name: draft.name,
        brand: draft.brand,
        model: draft.model,
        year: draft.year,
        registrationNumber: draft.registrationNumber,
        image: draft.image,
        description: draft.description || "",
        seats: draft.seats,
        transmission: draft.transmission,
        fuel: draft.fuel,
        pricePerKm: pricing.perKm,
        baseFare: pricing.baseFare,
        pricePerHour: pricing.perHour || 0,
        minimumFare: pricing.minimumFare || 0,
        available: true,
        approved: false,
      };
      await Vehicle.findOneAndUpdate({ owner: user._id }, vehicleData, {
        upsert: true,
        returnDocument: "after",
        setDefaultsOnInsert: true,
      });
      profile.submittedAt = new Date();
      profile.rejectionReason = "";
      user.partnerStatus = "pending";
      user.role = "partner";
      message = "Application submitted for review.";
    } else {
      return jsonError("Unknown onboarding step.", 422);
    }

    if (user.partnerStatus === "none" || user.partnerStatus === "rejected") {
      user.partnerStatus = "draft";
    }
    if (user.role === "user") user.role = "partner";
    user.markModified("partnerProfile");
    await user.save();

    if (step === "review") {
      await sendBookingStatusEmail(
        user.email,
        user.name,
        "Partner application received",
        "We have received your partner application and documents. Our team will review it shortly — you will get an update by email.",
        { label: "View application", url: `${process.env.AUTH_URL || "http://localhost:3000"}/dashboard/partner/onboarding` },
      ).catch((emailError) => console.warn("[onboarding email]", emailError));

      const admins = await User.find({ role: "admin" }).select("_id").lean();
      for (const admin of admins) {
        emitSocketEvent(userRoom(String(admin._id)), "partner:application", {
          userId: String(user._id),
          name: user.name,
          businessName: profile.businessName,
          at: new Date().toISOString(),
        });
      }
    }

    return NextResponse.json({
      ok: true,
      message,
      profile: sanitizeProfile(user),
      completion: completion(profile),
      partnerStatus: user.partnerStatus,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
