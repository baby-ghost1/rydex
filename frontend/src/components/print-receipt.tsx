// import { QRCodeSVG } from "qrcode.react";
// import { BadgeCheck, CircleDot, MapPin, Phone, Bike, CarFront, CarTaxiFront, Truck, Navigation } from "lucide-react";
// import { CATEGORY_MAP } from "@rydex/shared/constants";
// import { formatDate, initials, inr, resolveBookingCode } from "@rydex/shared/utils";
// import type { VehicleCategory } from "@rydex/shared/types";

// interface ReceiptVehicle {
//   name: string;
//   brand: string;
//   model: string;
//   registrationNumber: string;
//   category?: VehicleCategory;
// }

// interface ReceiptPartner {
//   name: string;
//   phone?: string;
//   partnerProfile?: { businessName?: string };
// }

// export interface ReceiptRide {
//   _id: string;
//   bookingCode?: string;
//   status: string;
//   category: VehicleCategory;
//   scheduled?: boolean;
//   date: string;
//   time: string;
//   createdAt: string;
//   completedAt?: string;
//   pickup: { address: string; lat: number; lng: number };
//   drop: { address: string; lat: number; lng: number };
//   distanceKm: number;
//   durationMin: number;
//   fare: {
//     base: number;
//     distance: number;
//     time: number;
//     total: number;
//     partnerEarning: number;
//     platformFee: number;
//   };
//   paymentMethod: "cash" | "online";
//   paymentStatus: "pending" | "paid" | "refunded" | "failed";
//   vehicle: ReceiptVehicle | null;
//   partner: ReceiptPartner | null;
//   otpVerified: { pickup: boolean; drop: boolean };
// }

// const ZIGZAG =
//   "M0 11 L5 1 L10 11 L15 1 L20 11 L25 1 L30 11 L35 1 L40 11 L45 1 L50 11 L55 1 L60 11 L65 1 L70 11 L75 1 L80 11 L85 1 L90 11 L95 1 L100 11 L105 1 L110 11 L115 1 L120 11 L125 1 L130 11 L135 1 L140 11 L145 1 L150 11 L155 1 L160 11 L165 1 L170 11 L175 1 L180 11 L185 1 L190 11 L195 1 L200 11 L205 1 L210 11 L215 1 L220 11 L225 1 L230 11 L235 1 L240 11 L245 1 L250 11 L255 1 L260 11 L265 1 L270 11 L275 1 L280 11 L285 1 L290 11 L295 1 L300 11 L305 1 L310 11 L315 1 L320 11";

// function Zigzag({ className = "" }: { className?: string }) {
//   return (
//     <svg
//       viewBox="0 0 320 12"
//       preserveAspectRatio="none"
//       aria-hidden="true"
//       className={`block h-3 w-full ${className}`}
//     >
//       <path
//         d={ZIGZAG}
//         fill="none"
//         stroke="#e7d6ac"
//         strokeWidth="1.8"
//         strokeLinecap="round"
//         strokeLinejoin="round"
//       />
//     </svg>
//   );
// }

// function Divider() {
//   return <Zigzag />;
// }

// /**
//  * Print-only receipt. Rendered hidden on screen; appears exclusively when the
//  * user prints the ride page. Keeps the printable output to a clean single page.
//  */
// export default function PrintReceipt({ ride, appUrl }: { ride: ReceiptRide; appUrl?: string }) {
//   const category = CATEGORY_MAP[ride.category];
//   const partnerName = ride.partner?.partnerProfile?.businessName || ride.partner?.name || "RYDEX partner";
//   const bookingCode = resolveBookingCode(ride);
//   const partnerInitials = ride.partner ? initials(partnerName) : "RY";
//   const vehicleIcon =
//     ride.category === "bike" ? Bike
//     : ride.category === "car" ? CarFront
//     : ride.category === "auto" ? CarTaxiFront
//     : Truck;
//   const VehicleIcon = vehicleIcon;
//   const rideWhen = ride.scheduled ? `${formatDate(ride.date)} at ${ride.time}` : `${formatDate(ride.createdAt)} · ${ride.time}`;


// // Dono time strings ko Date objects me convert karein
// const pickupTime = new Date(ride.pickup.time);
// const dropTime = new Date(ride.drop.time);

// // Difference milliseconds me nikal kar use hh:mm:ss me format karein
// const diffMs = Math.abs(dropTime - pickupTime);
// const hours = String(Math.floor(diffMs / (1000 * 60 * 60))).padStart(2, '0');
// const minutes = String(Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))).padStart(2, '0');
// const seconds = String(Math.floor((diffMs % (1000 * 60)) / 1000)).padStart(2, '0');

// const formattedDuration = `${hours}:${minutes}:${seconds}`;

//   return (
//     <div className="hidden print:block" aria-hidden="true">
//       <div
//         className="mx-auto max-w-[640px] bg-[#fdf9ec] px-8 py-10 text-ink"
//         style={{ fontFamily: "var(--font-inter), system-ui, sans-serif" }}
//       >
//         {/* Header */}
//         <div className="relative text-center">
//           <p className="mt-1 text-[25px] font-bold uppercase tracking-[0.34em] text-[#716032]">
//             RYDEX
//           </p>
//           <p className="mt-2 font-mono text-[14px] font-semibold tracking-tight">
//             Booking {bookingCode}
//           </p>
//         </div>

//         <div className="mt-4">
//           <Divider />
//         </div>

//         {/* Route */}
//         {/* <div className="mt-4 grid grid-cols-[1fr_auto_1fr] gap-2">
//           <div className="text-left">
//             <p className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[#8a7a4d]">
//               <Navigation className="h-3 w-3" /> Pickup
//             </p>
//             <p className="mt-1.5 text-[11px] font-semibold leading-snug">{ride.pickup.address}</p>
//             <p className="mt-1 font-mono text-[10px] text-[#6d6142]">{rideWhen}</p>
//           </div>
//           <div className="flex flex-col items-center justify-center gap-1 border-x border-dashed border-[#e7d6ac] px-2">
//             <Navigation className="h-3.5 w-3.5 rotate-45 text-[#b9a05a]" />
//             <p className="font-mono text-[11px] font-bold">{ride.distanceKm} km</p>
//             <p className="font-mono text-[10px] text-[#6d6142]">{ride.durationMin} min</p>
//           </div>
//           <div className="text-right">
//             <p className="flex items-center justify-end gap-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[#8a7a4d]">
//              <MapPin className="h-3 w-3" /> Drop
//             </p>
//             <p className="mt-1.5 text-[11px] font-semibold leading-snug">{ride.drop.address}</p>
//             <p className="mt-1 font-mono text-[10px] text-[#6d6142]">{rideWhen}</p>
//           </div>
//         </div> */}

//         <div className="mt-4 grid grid-cols-[1fr_auto_1fr] gap-2">
//   {/* Pickup Section */}
//   <div className="text-left">
//     <p className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[#8a7a4d]">
//       <Navigation className="h-3 w-3" /> Pickup
//     </p>
//     <p className="mt-1.5 text-[11px] font-semibold leading-snug">{ride.pickup.address}</p>
//     <p className="mt-1 font-mono text-[10px] text-[#6d6142]">{rideWhen}</p>
//   </div>

//   {/* Middle Section (Calculated Time Difference) */}
//   <div className="flex flex-col items-center justify-center gap-1 border-x border-dashed border-[#e7d6ac] px-2">
//     <Navigation className="h-3.5 w-3.5 rotate-45 text-[#b9a05a]" />
//     <p className="font-mono text-[11px] font-bold">{ride.distanceKm} km</p>
//     {/* Naya hh:mm:ss dynamic formatted time yahan dikhega */}
    
//     <p className="font-mono text-[10px] text-[#6d6142] tracking-wider">{formattedDuration}</p>
//   </div>

//   {/* Drop Section */}
//   <div className="text-right">
//     <p className="flex items-center justify-end gap-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[#8a7a4d]">
//       <MapPin className="h-3 w-3" /> Drop
//     </p>
//     <p className="mt-1.5 text-[11px] font-semibold leading-snug">{ride.drop.address}</p>
//     <p className="mt-1 font-mono text-[10px] text-[#6d6142]">{rideWhen}</p>
//   </div>
// </div>


//         {/* Driver & vehicle */}
//         <div className="mt-6">
//           <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#8a7a4d]">Driver &amp; vehicle</p>
//           <div className="mt-2 flex items-center gap-3">
//             <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-ink text-[11px] font-bold text-[#f6edd8]">
//               {partnerInitials}
//             </div>
//             <div className="min-w-0 flex-1">
//               <p className="truncate text-[12px] font-extrabold leading-tight">{partnerName}</p>
//               <p className="mt-0.5 flex items-center gap-1 text-[9px] font-semibold text-[#2e7d32]">
//                 <BadgeCheck className="h-3 w-3" /> Verified RYDEX partner
//               </p>
//               {ride.partner?.phone && (
//                 <p className="mt-0.5 flex items-center gap-1 font-mono text-[11px] text-[#6d6142]">
//                   <Phone className="h-2.5 w-2.5" /> {ride.partner.phone}
//                 </p>
//               )}
//             </div>
//             <VehicleIcon className="h-6 w-6 shrink-0 text-[#b9a05a]" aria-hidden="true" />
//           </div>
//           <div className="mt-2 flex items-center justify-between gap-3 rounded-lg border border-[#e7d6ac] bg-[#f9f2de] px-3 py-2">
//             {ride.vehicle ? (
//               <div className="min-w-0">
//                 <p className="truncate text-[10px] font-bold">
//                   {`${ride.vehicle.brand} ${ride.vehicle.model}`.trim() || ride.vehicle.name}
//                 </p>
//                 <p className="mt-0.5 font-mono text-[9px] font-semibold tracking-wide text-[#6d6142]">
//                   {ride.vehicle.registrationNumber}
//                 </p>
//               </div>
//             ) : (
//               <div>
//                 <p className="text-[10px] font-bold">{category?.label || "Vehicle"} ride</p>
//                 <p className="mt-0.5 text-[9px] text-[#6d6142]">Broadcast category booking</p>
//               </div>
//             )}
//             <span className="shrink-0 rounded-full border border-[#e7d6ac] px-2 py-0.5 text-[8px] font-bold uppercase tracking-[0.18em] text-[#8a7a4d]">
//               {category?.label || ride.category}
//             </span>
//           </div>
//         </div>

//         {/* Fare */}
//         <div className="mt-7">
//           <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#8a7a4d]">Fare breakdown</p>
//           <div className="mt-2 space-y-1 font-mono text-[11px]">
//             <div className="flex items-baseline justify-between">
//               <span className="text-[#4a4230]">Base fare</span>
//               <span className="font-semibold">{inr(ride.fare.base)}</span>
//             </div>
//             <div className="flex items-baseline justify-between">
//               <span className="text-[#4a4230]">Distance · {ride.distanceKm} km</span>
//               <span className="font-semibold">{inr(ride.fare.distance)}</span>
//             </div>
//             <div className="flex items-baseline justify-between">
//               <span className="text-[#4a4230]">Time · {ride.durationMin} min</span>
//               <span className="font-semibold">{inr(ride.fare.time)}</span>
//             </div>
//             <div className="flex items-baseline justify-between">
//               <span className="text-[#4a4230]">RYDEX service fee</span>
//               <span className="font-semibold">{inr(ride.fare.platformFee)}</span>
//             </div>
//           </div>
//           <div className="mt-3 flex items-end justify-between border-t-2 border-dashed border-[#e7d6ac] pt-3">
//             <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#8a7a4d]">Total fare</span>
//             <span className="font-mono text-[26px] font-extrabold leading-none tracking-tight">
//               {inr(ride.fare.total)}
//             </span>
//           </div>
//           <div className="mt-1.5 flex items-center justify-between font-mono text-[9px] text-[#6d6142]">
//             <span>Payment</span>
//             <span className="font-bold uppercase">
//               {ride.paymentMethod === "cash" ? "Cash · PAID" : `Online · ${ride.paymentStatus}`}
//             </span>
//           </div>
//         </div>

//         <div className="mt-4">
//           <Divider />
//         </div>

//         {/* Thank you */}
//         <div className="mt-6 text-center">
//           <p className="font-display text-[26px] font-extrabold leading-none tracking-[-0.03em]">
//             Thank you<span className="text-[#b9a05a]">!</span>
//           </p>
//           <p className="mt-1 text-[12px] font-semibold text-[#6d6142]">
//             You rode with RYDEX - the fastest way across your city.
//           </p>
//           <div className="mt-5 flex justify-center">
//             <QRCodeSVG
//               value={`${appUrl || "https://rydexmobility.vercel.app"}/bookings/${ride._id}`}
//               size={120}
//               bgColor="#fdf9ec"
//               fgColor="#0b0b0b"
//               level="M"
//             />
//           </div>
//           <p className="mt-1.5 font-mono text-[12px] tracking-[0.3em] text-[#8a7a4d]">{bookingCode}</p>
//           <div className="mt-3 space-y-0.5 font-mono text-[10px] text-[#6d6142]">
//           <p>
//             {/* Email Link */}
//             <a 
//               href="mailto:support@rydex.app" 
//               className="text-inherit hover:underline"
//             >
//               support@rydex.app
//             </a> 
//             <span> · Support 24×7</span>
//           </p>
          
//           <p>
//             {/* Website Link */}
//             <a 
//               href="https://rydexmobility.vercel.app" 
//               target="_blank" 
//               rel="noopener noreferrer" 
//               className="text-inherit hover:underline"
//             >
//               rydexmobility.vercel.app
//             </a>
//           </p>
//         </div>
//           <p className="mt-2 text-[7px] font-medium uppercase tracking-[0.22em] text-[#a89a6e]">
//             Computer-generated receipt · No signature required
//           </p>
//         </div>
//       </div>
//     </div>
//   );
// }





import { QRCodeSVG } from "qrcode.react";
import { BadgeCheck, MapPin, Phone, Bike, CarFront, CarTaxiFront, Truck, Navigation } from "lucide-react";
import { CATEGORY_MAP } from "@rydex/shared/constants";
import { formatDate, initials, inr, resolveBookingCode } from "@rydex/shared/utils";
import type { VehicleCategory } from "@rydex/shared/types";

interface ReceiptVehicle {
  name: string;
  brand: string;
  model: string;
  registrationNumber: string;
  category?: VehicleCategory;
}

interface ReceiptPartner {
  name: string;
  phone?: string;
  partnerProfile?: { businessName?: string };
}

export interface ReceiptRide {
  _id: string;
  bookingCode?: string;
  status: string;
  category: VehicleCategory;
  scheduled?: boolean;
  date: string;
  time: string;
  createdAt: string;
  completedAt?: string;
  pickup: { address: string; lat: number; lng: number };
  drop: { address: string; lat: number; lng: number };
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
  paymentMethod: "cash" | "online";
  paymentStatus: "pending" | "paid" | "refunded" | "failed";
  vehicle: ReceiptVehicle | null;
  partner: ReceiptPartner | null;
  otpVerified: { pickup: boolean; drop: boolean };
}

const ZIGZAG =
  "M0 11 L5 1 L10 11 L15 1 L20 11 L25 1 L30 11 L35 1 L40 11 L45 1 L50 11 L55 1 L60 11 L65 1 L70 11 L75 1 L80 11 L85 1 L90 11 L95 1 L100 11 L105 1 L110 11 L115 1 L120 11 L125 1 L130 11 L135 1 L140 11 L145 1 L150 11 L155 1 L160 11 L165 1 L170 11 L175 1 L180 11 L185 1 L190 11 L195 1 L200 11 L205 1 L210 11 L215 1 L220 11 L225 1 L230 11 L235 1 L240 11 L245 1 L250 11 L255 1 L260 11 L265 1 L270 11 L275 1 L280 11 L285 1 L290 11 L295 1 L300 11 L305 1 L310 11 L315 1 L320 11";

function Zigzag({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 320 12"
      preserveAspectRatio="none"
      aria-hidden="true"
      className={`block h-3 w-full ${className}`}
    >
      <path
        d={ZIGZAG}
        fill="none"
        stroke="#e7d6ac"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Divider() {
  return <Zigzag />;
}

/**
 * Print-only receipt. Rendered hidden on screen; appears exclusively when the
 * user prints the ride page. Keeps the printable output to a clean single page.
 */
export default function PrintReceipt({ ride, appUrl }: { ride: ReceiptRide; appUrl?: string }) {
  const category = CATEGORY_MAP[ride.category];
  const partnerName = ride.partner?.partnerProfile?.businessName || ride.partner?.name || "RYDEX partner";
  const bookingCode = resolveBookingCode(ride);
  const partnerInitials = ride.partner ? initials(partnerName) : "RY";
  const vehicleIcon =
    ride.category === "bike" ? Bike
    : ride.category === "car" ? CarFront
    : ride.category === "auto" ? CarTaxiFront
    : Truck;
  const VehicleIcon = vehicleIcon;
  const rideWhen = ride.scheduled ? `${formatDate(ride.date)} at ${ride.time}` : `${formatDate(ride.createdAt)} · ${ride.time}`;

  // Calculate duration using the actual ride duration (in minutes).
  const totalSeconds = Math.max(0, Math.floor(ride.durationMin * 60));
  const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, "0");
  const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, "0");
  const seconds = String(totalSeconds % 60).padStart(2, "0");

  const formattedDuration = `${hours}:${minutes}:${seconds}`;

  return (
    <div className="hidden print:block" aria-hidden="true">
      <div
        className="mx-auto max-w-[640px] bg-[#fdf9ec] px-8 py-10 text-ink"
        style={{ fontFamily: "var(--font-inter), system-ui, sans-serif" }}
      >
        {/* Header */}
        <div className="relative text-center">
          <p className="mt-1 text-[25px] font-bold uppercase tracking-[0.34em] text-[#716032]">
            RYDEX
          </p>
          <p className="mt-2 font-mono text-[14px] font-semibold tracking-tight">
            Booking {bookingCode}
          </p>
        </div>

        <div className="mt-4">
          <Divider />
        </div>

        {/* Route */}
        {/* <div className="mt-4 grid grid-cols-[1fr_auto_1fr] gap-2">
          <div className="text-left">
            <p className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[#8a7a4d]">
              <Navigation className="h-3 w-3" /> Pickup
            </p>
            <p className="mt-1.5 text-[11px] font-semibold leading-snug">{ride.pickup.address}</p>
            <p className="mt-1 font-mono text-[10px] text-[#6d6142]">{rideWhen}</p>
          </div>
          <div className="flex flex-col items-center justify-center gap-1 border-x border-dashed border-[#e7d6ac] px-2">
            <Navigation className="h-3.5 w-3.5 rotate-45 text-[#b9a05a]" />
            <p className="font-mono text-[11px] font-bold">{ride.distanceKm} km</p>
            <p className="font-mono text-[10px] text-[#6d6142]">{ride.durationMin} min</p>
          </div>
          <div className="text-right">
            <p className="flex items-center justify-end gap-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[#8a7a4d]">
             <MapPin className="h-3 w-3" /> Drop
            </p>
            <p className="mt-1.5 text-[11px] font-semibold leading-snug">{ride.drop.address}</p>
            <p className="mt-1 font-mono text-[10px] text-[#6d6142]">{rideWhen}</p>
          </div>
        </div> */}

        <div className="mt-4 grid grid-cols-[1fr_auto_1fr] gap-2">
          {/* Pickup Section */}
          <div className="text-left">
            <p className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[#8a7a4d]">
              <Navigation className="h-3 w-3" /> Pickup
            </p>
            <p className="mt-1.5 text-[11px] font-semibold leading-snug">{ride.pickup.address}</p>
            <p className="mt-1 font-mono text-[10px] text-[#6d6142]">{rideWhen}</p>
          </div>

          {/* Middle Section */}
          <div className="flex flex-col items-center justify-center gap-1 border-x border-dashed border-[#e7d6ac] px-2">
            <Navigation className="h-3.5 w-3.5 rotate-45 text-[#b9a05a]" />
            <p className="font-mono text-[11px] font-bold">{ride.distanceKm} km</p>
            <p className="font-mono text-[10px] text-[#6d6142] tracking-wider">{formattedDuration}</p>
          </div>

          {/* Drop Section */}
          <div className="text-right">
            <p className="flex items-center justify-end gap-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[#8a7a4d]">
              <MapPin className="h-3 w-3" /> Drop
            </p>
            <p className="mt-1.5 text-[11px] font-semibold leading-snug">{ride.drop.address}</p>
            <p className="mt-1 font-mono text-[10px] text-[#6d6142]">{rideWhen}</p>
          </div>
        </div>

        {/* Driver & vehicle */}
        <div className="mt-6">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#8a7a4d]">Driver &amp; vehicle</p>
          <div className="mt-2 flex items-center gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-ink text-[11px] font-bold text-[#f6edd8]">
              {partnerInitials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12px] font-extrabold leading-tight">{partnerName}</p>
              <p className="mt-0.5 flex items-center gap-1 text-[9px] font-semibold text-[#2e7d32]">
                <BadgeCheck className="h-3 w-3" /> Verified RYDEX partner
              </p>
              {ride.partner?.phone && (
                <p className="mt-0.5 flex items-center gap-1 font-mono text-[11px] text-[#6d6142]">
                  <Phone className="h-2.5 w-2.5" /> 
                  {/* Clickable Phone Link */}
                  <a 
                    href={`tel:${ride.partner.phone}`} 
                    className="text-inherit hover:underline"
                  >
                    {ride.partner.phone}
                  </a>
                </p>
              )}
            </div>
            <VehicleIcon className="h-6 w-6 shrink-0 text-[#b9a05a]" aria-hidden="true" />
          </div>
          <div className="mt-2 flex items-center justify-between gap-3 rounded-lg border border-[#e7d6ac] bg-[#f9f2de] px-3 py-2">
            {ride.vehicle ? (
              <div className="min-w-0">
                <p className="truncate text-[10px] font-bold">
                  {`${ride.vehicle.brand} ${ride.vehicle.model}`.trim() || ride.vehicle.name}
                </p>
                <p className="mt-0.5 font-mono text-[9px] font-semibold tracking-wide text-[#6d6142]">
                  {ride.vehicle.registrationNumber}
                </p>
              </div>
            ) : (
              <div>
                <p className="text-[10px] font-bold">{category?.label || "Vehicle"} ride</p>
                <p className="mt-0.5 text-[9px] text-[#6d6142]">Broadcast category booking</p>
              </div>
            )}
            <span className="shrink-0 rounded-full border border-[#e7d6ac] px-2 py-0.5 text-[8px] font-bold uppercase tracking-[0.18em] text-[#8a7a4d]">
              {category?.label || ride.category}
            </span>
          </div>
        </div>

        {/* Fare */}
        <div className="mt-7">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#8a7a4d]">Fare breakdown</p>
          <div className="mt-2 space-y-1 font-mono text-[11px]">
            <div className="flex items-baseline justify-between">
              <span className="text-[#4a4230]">Base fare</span>
              <span className="font-semibold">{inr(ride.fare.base)}</span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-[#4a4230]">Distance · {ride.distanceKm} km</span>
              <span className="font-semibold">{inr(ride.fare.distance)}</span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-[#4a4230]">Time · {ride.durationMin} min</span>
              <span className="font-semibold">{inr(ride.fare.time)}</span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-[#4a4230]">RYDEX service fee</span>
              <span className="font-semibold">{inr(ride.fare.platformFee)}</span>
            </div>
          </div>
          <div className="mt-3 flex items-end justify-between border-t-2 border-dashed border-[#e7d6ac] pt-3">
            <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#8a7a4d]">Total fare</span>
            <span className="font-mono text-[26px] font-extrabold leading-none tracking-tight">
              {inr(ride.fare.total)}
            </span>
          </div>
          <div className="mt-1.5 flex items-center justify-between font-mono text-[9px] text-[#6d6142]">
            <span>Payment</span>
            <span className="font-bold uppercase">
              {ride.paymentMethod === "cash" ? "Cash · PAID" : `Online · ${ride.paymentStatus}`}
            </span>
          </div>
        </div>

        <div className="mt-4">
          <Divider />
        </div>

        {/* Thank you */}
        <div className="mt-6 text-center">
          <p className="font-display text-[26px] font-extrabold leading-none tracking-[-0.03em]">
            Thank you<span className="text-[#b9a05a]">!</span>
          </p>
          <p className="mt-1 text-[12px] font-semibold text-[#6d6142]">
            You rode with RYDEX - the fastest way across your city.
          </p>
          <div className="mt-5 flex justify-center">
            <QRCodeSVG
              value={`${appUrl || "https://rydexmobility.vercel.app"}/bookings/${ride._id}`}
              size={120}
              bgColor="#fdf9ec"
              fgColor="#0b0b0b"
              level="M"
            />
          </div>
          <p className="mt-1.5 font-mono text-[12px] tracking-[0.3em] text-[#8a7a4d]">{bookingCode}</p>
          <div className="mt-3 space-y-0.5 font-mono text-[10px] text-[#6d6142]">
            <p>
              {/* Email Link */}
              <a
                href="mailto:support@rydex.app"
                className="text-inherit hover:underline"
              >
                support@rydex.app
              </a>
              <span> · Support 24×7</span>
            </p>

            <p>
              {/* Website Link */}
              <a
                href="https://rydexmobility.vercel.app"
                target="_blank"
                rel="noopener noreferrer"
                className="text-inherit hover:underline"
              >
                rydexmobility.vercel.app
              </a>
            </p>
          </div>
          <p className="mt-2 text-[7px] font-medium uppercase tracking-[0.22em] text-[#a89a6e]">
            Computer-generated receipt · No signature required
          </p>
        </div>
      </div>
    </div>
  );
}