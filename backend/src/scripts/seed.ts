// Standalone script: load the repository .env before reading seed settings.
import "../lib/env";

import bcrypt from "bcryptjs";
import mongoose from "mongoose";

const ADMIN_EMAIL = (process.env.SEED_ADMIN_EMAIL || "admin@rydex.app").toLowerCase();
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || "Admin@12345";
const SAMPLE_DOC = "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf";

const partners = [
  {
    name: "Arjun Mehta",
    email: "partner@rydex.app",
    phone: "9880011223",
    password: "Partner@12345",
    businessName: "Velocity Rides",
    image: "/vehicles/car.jpg",
  },
  {
    name: "Neha Rao",
    email: "metro@rydex.app",
    phone: "9880044556",
    password: "Metro@12345",
    businessName: "MetroWheels",
    image: "/vehicles/bike.jpg",
  },
  {
    name: "Imran Khan",
    email: "cargo@rydex.app",
    phone: "9880077889",
    password: "Cargo@12345",
    businessName: "CargoLine Logistics",
    image: "/vehicles/truck.jpg",
  },
];

const vehicleSeed = [
  {
    partner: 0,
    category: "car" as const,
    name: "Toyota Fortuner",
    brand: "Toyota",
    model: "Fortuner 4x4",
    year: 2023,
    registrationNumber: "KA01RY4821",
    image: "/vehicles/car.jpg",
    description: "Spacious 7-seat SUV with a smooth highway ride - perfect for family trips and airport runs.",
    pricePerKm: 21,
    baseFare: 149,
    pricePerHour: 349,
    minimumFare: 299,
    seats: 7,
    transmission: "automatic" as const,
    fuel: "diesel" as const,
    rating: 4.9,
    totalTrips: 186,
    address: "Indiranagar, Bengaluru",
    lat: 12.9719,
    lng: 77.6412,
  },
  {
    partner: 0,
    category: "car" as const,
    name: "Hyundai Creta",
    brand: "Hyundai",
    model: "Creta SX",
    year: 2024,
    registrationNumber: "KA01RY9134",
    image: "/vehicles/car2.jpg",
    description: "A comfortable compact SUV with a panoramic sunroof and excellent city mileage.",
    pricePerKm: 17,
    baseFare: 119,
    pricePerHour: 279,
    minimumFare: 249,
    seats: 5,
    transmission: "automatic" as const,
    fuel: "petrol" as const,
    rating: 4.8,
    totalTrips: 92,
    address: "Koramangala, Bengaluru",
    lat: 12.9352,
    lng: 77.6245,
  },
  {
    partner: 1,
    category: "bike" as const,
    name: "Royal Enfield Classic 350",
    brand: "Royal Enfield",
    model: "Classic 350",
    year: 2023,
    registrationNumber: "KA02RY2276",
    image: "/vehicles/bike.jpg",
    description: "Iconic city cruiser with a thumping engine. Helmet included with every booking.",
    pricePerKm: 8,
    baseFare: 39,
    pricePerHour: 99,
    minimumFare: 79,
    seats: 2,
    transmission: "manual" as const,
    fuel: "petrol" as const,
    rating: 4.9,
    totalTrips: 314,
    address: "HSR Layout, Bengaluru",
    lat: 12.9116,
    lng: 77.6474,
  },
  {
    partner: 1,
    category: "bike" as const,
    name: "Ather 450X",
    brand: "Ather",
    model: "450X Gen 3",
    year: 2024,
    registrationNumber: "KA02RY7751",
    image: "/vehicles/bike2.jpg",
    description: "Silent electric scooter with 90 km range and fast charging support.",
    pricePerKm: 6,
    baseFare: 29,
    perHour: 0,
    pricePerHour: 79,
    minimumFare: 59,
    seats: 2,
    transmission: "automatic" as const,
    fuel: "electric" as const,
    rating: 4.7,
    totalTrips: 141,
    address: "Jayanagar, Bengaluru",
    lat: 12.9308,
    lng: 77.5838,
  },
  {
    partner: 1,
    category: "auto" as const,
    name: "Bajaj RE Auto",
    brand: "Bajaj",
    model: "RE Maxima",
    year: 2022,
    registrationNumber: "KA03RY5518",
    image: "/vehicles/auto.jpg",
    description: "Quick and nimble three-wheeler for short city hops and daily commutes.",
    pricePerKm: 11,
    baseFare: 35,
    pricePerHour: 149,
    minimumFare: 69,
    seats: 3,
    transmission: "manual" as const,
    fuel: "cng" as const,
    rating: 4.6,
    totalTrips: 402,
    address: "BTM Layout, Bengaluru",
    lat: 12.9166,
    lng: 77.6101,
  },
  {
    partner: 2,
    category: "loading" as const,
    name: "Tata Ace Gold",
    brand: "Tata",
    model: "Ace Gold",
    year: 2023,
    registrationNumber: "KA04RY8830",
    image: "/vehicles/loading.jpg",
    description: "Reliable mini truck for home shifting, furniture and small commercial loads.",
    pricePerKm: 15,
    baseFare: 199,
    pricePerHour: 249,
    minimumFare: 349,
    seats: 2,
    transmission: "manual" as const,
    fuel: "diesel" as const,
    rating: 4.8,
    totalTrips: 76,
    address: "Whitefield, Bengaluru",
    lat: 12.9698,
    lng: 77.7500,
  },
  {
    partner: 2,
    category: "truck" as const,
    name: "Ashok Leyland Dost",
    brand: "Ashok Leyland",
    model: "Dost Strong",
    year: 2022,
    registrationNumber: "KA04RY6692",
    image: "/vehicles/truck.jpg",
    description: "Heavy-duty haulage with a 1.5-tonne payload for larger moves and business logistics.",
    pricePerKm: 22,
    baseFare: 349,
    pricePerHour: 449,
    minimumFare: 699,
    seats: 2,
    transmission: "manual" as const,
    fuel: "diesel" as const,
    rating: 4.7,
    totalTrips: 54,
    address: "Electronic City, Bengaluru",
    lat: 12.8452,
    lng: 77.6602,
  },
  {
    partner: 0,
    category: "car" as const,
    name: "Maruti Suzuki Dzire",
    brand: "Maruti Suzuki",
    model: "Dzire ZXi",
    year: 2023,
    registrationNumber: "KA01RY3387",
    image: "/vehicles/car2.jpg",
    description: "Fuel-efficient sedan with generous boot space - ideal for everyday city travel.",
    pricePerKm: 14,
    baseFare: 99,
    pricePerHour: 229,
    minimumFare: 199,
    seats: 5,
    transmission: "manual" as const,
    fuel: "petrol" as const,
    rating: 4.6,
    totalTrips: 231,
    address: "MG Road, Bengaluru",
    lat: 12.9756,
    lng: 77.6068,
  },
];

async function main() {
  const { connectDB } = await import("../lib/db");
  const { User } = await import("../models/user.model");
  const { Vehicle } = await import("../models/vehicle.model");
  const { Booking } = await import("../models/booking.model");
  const { hashOtp } = await import("../lib/otp");
  const { encryptSensitive } = await import("../lib/crypto");

  console.log("Seeding RYDEX…");
  await connectDB();

  const adminHash = await bcrypt.hash(ADMIN_PASSWORD, 12);
  await User.findOneAndUpdate(
    { email: ADMIN_EMAIL },
    {
      name: "RYDEX Admin",
      email: ADMIN_EMAIL,
      passwordHash: adminHash,
      emailVerified: new Date(),
      role: "admin",
      partnerStatus: "none",
      phone: "9800000001",
    },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
  );

  const riderHash = await bcrypt.hash("Rider@12345", 12);
  const rider = await User.findOneAndUpdate(
    { email: "rider@rydex.app" },
    {
      name: "Aarav Sharma",
      email: "rider@rydex.app",
      passwordHash: riderHash,
      emailVerified: new Date(),
      role: "user",
      partnerStatus: "none",
      phone: "9876543210",
    },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
  );

  const partnerUsers = [];
  for (const p of partners) {
    const hash = await bcrypt.hash(p.password, 12);
    const user = await User.findOneAndUpdate(
      { email: p.email },
      {
        name: p.name,
        email: p.email,
        phone: p.phone,
        passwordHash: hash,
        emailVerified: new Date(),
        image: p.image,
        role: "partner",
        partnerStatus: "approved",
        partnerProfile: {
          businessName: p.businessName,
          ownerName: p.name,
          documents: {
            drivingLicense: SAMPLE_DOC,
            vehicleRc: SAMPLE_DOC,
            insurance: SAMPLE_DOC,
            permit: "",
          },
          bank: {
            accountHolder: p.name,
            accountNumber: encryptSensitive(`9150${Math.floor(100000 + Math.random() * 899999)}`),
            accountNumberLast4: String(Math.floor(1000 + Math.random() * 8999)),
            ifsc: "HDFC0001234",
            bankName: "HDFC Bank",
            upiId: `${p.email.split("@")[0]}@okhdfcbank`,
          },
          kyc: {
            status: "approved",
            videoUrl: "",
            submittedAt: new Date(),
            reviewedAt: new Date(),
            note: "Verified by RYDEX",
          },
          pricing: { perKm: 14, baseFare: 99, perHour: 229, minimumFare: 199, waitingCharge: 3 },
          submittedAt: new Date(),
          reviewedAt: new Date(),
          rejectionReason: "",
        },
      },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
    );
    partnerUsers.push(user);
  }

  await Vehicle.deleteMany({ owner: { $in: partnerUsers.map((u) => u._id) } });
  const vehicles = [];
  for (const v of vehicleSeed) {
    const owner = partnerUsers[v.partner];
    const vehicle = await Vehicle.create({
      owner: owner._id,
      category: v.category,
      name: v.name,
      brand: v.brand,
      model: v.model,
      year: v.year,
      registrationNumber: v.registrationNumber,
      image: v.image,
      images: [v.image],
      description: v.description,
      pricePerKm: v.pricePerKm,
      baseFare: v.baseFare,
      pricePerHour: v.pricePerHour,
      minimumFare: v.minimumFare,
      seats: v.seats,
      transmission: v.transmission,
      fuel: v.fuel,
      location: { address: v.address, lat: v.lat, lng: v.lng },
      available: true,
      approved: true,
      rating: v.rating,
      totalTrips: v.totalTrips,
    });
    vehicles.push(vehicle);
  }

  // Mirror each partner's primary listing into the application draft so the
  // admin review screens show the same vehicle and pricing the public sees.
  for (const partnerUser of partnerUsers) {
    const primary = vehicles.find(
      (vehicle) => String(vehicle.owner) === String(partnerUser._id),
    );
    if (!primary) continue;
    await User.updateOne(
      { _id: partnerUser._id },
      {
        $set: {
          "partnerProfile.vehicleDraft": {
            category: primary.category,
            name: primary.name,
            brand: primary.brand,
            model: primary.model,
            year: primary.year,
            registrationNumber: primary.registrationNumber,
            image: primary.image,
            seats: primary.seats,
            transmission: primary.transmission,
            fuel: primary.fuel,
            description: primary.description,
          },
          "partnerProfile.pricing": {
            perKm: primary.pricePerKm,
            baseFare: primary.baseFare,
            perHour: primary.pricePerHour,
            minimumFare: primary.minimumFare,
            waitingCharge: 3,
          },
        },
      },
    );
  }

  await Booking.deleteMany({ user: { $in: [rider._id] } });

  const completedVehicle = vehicles[0];
  const completedPartner = partnerUsers[0];
  await Booking.create({
    user: rider._id,
    partner: completedPartner._id,
    vehicle: completedVehicle._id,
    category: completedVehicle.category,
    pickup: {
      address: "Kempegowda International Airport, Bengaluru",
      lat: 13.1986,
      lng: 77.7066,
    },
    drop: { address: "Indiranagar 100ft Road, Bengaluru", lat: 12.9719, lng: 77.6412 },
    date: new Date(Date.now() - 3 * 86400000).toISOString().slice(0, 10),
    time: "18:30",
    distanceKm: 36.8,
    durationMin: 58,
    fare: {
      base: 149,
      distance: 773,
      time: 337,
      total: 1259,
      partnerEarning: 1133,
      platformFee: 126,
    },
    paymentMethod: "cash",
    paymentStatus: "paid",
    status: "completed",
    otpVerified: { pickup: true, drop: true },
    rideStartedAt: new Date(Date.now() - 3 * 86400000 + 3600000),
    completedAt: new Date(Date.now() - 3 * 86400000 + 7200000),
    rating: 5,
    review: "Spotless car and a very professional driver. Will book again.",
  });

  const pendingVehicle = vehicles[2];
  const pendingPartner = partnerUsers[1];
  await Booking.create({
    user: rider._id,
    partner: pendingPartner._id,
    vehicle: pendingVehicle._id,
    category: pendingVehicle.category,
    pickup: { address: "HSR Layout Sector 2, Bengaluru", lat: 12.9116, lng: 77.6474 },
    drop: { address: "Church Street, MG Road, Bengaluru", lat: 12.9756, lng: 77.6068 },
    date: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
    time: "09:30",
    distanceKm: 11.2,
    durationMin: 31,
    fare: {
      base: 39,
      distance: 90,
      time: 51,
      total: 180,
      partnerEarning: 162,
      platformFee: 18,
    },
    paymentMethod: "cash",
    paymentStatus: "pending",
    status: "pending",
    pickupOtpHash: hashOtp("1234"),
    dropOtpHash: hashOtp("4321"),
    notes: "I have one cabin bag.",
  });

  console.log("\nSeed complete.\n");
  console.log("Admin   :", ADMIN_EMAIL, "/", ADMIN_PASSWORD);
  console.log("Rider   : rider@rydex.app / Rider@12345");
  console.log("Partner : partner@rydex.app / Partner@12345");
  console.log("Partner : metro@rydex.app / Metro@12345");
  console.log("Partner : cargo@rydex.app / Cargo@12345");
  console.log("\nDemo pickup OTP for the pending bike booking: 1234");
  console.log("Demo drop OTP for the pending bike booking: 4321\n");

  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect();
  process.exit(1);
});
