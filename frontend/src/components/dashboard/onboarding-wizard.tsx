"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  Camera,
  Check,
  CheckCircle2,
  Clock3,
  FileText,
  Landmark,
  Loader2,
  LockKeyhole,
  PlayCircle,
  ShieldCheck,
  Upload,
  Video,
  Wallet,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/dashboard/ui";
import ZegoKycRoom from "@/components/dashboard/zego-kyc-room";
import { CATEGORY_MAP, ONBOARDING_STEPS, type OnboardingStepId } from "@rydex/shared/constants";
import { api, uploadFile } from "@/lib/client-api";
import { cn, formatDate, inr } from "@rydex/shared/utils";
import type { PartnerStatus, VehicleCategory } from "@rydex/shared/types";

interface OnboardingProfile {
  businessName: string;
  ownerName: string;
  vehicleDraft: {
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
  documents: {
    drivingLicense?: string;
    vehicleRc?: string;
    insurance?: string;
    permit?: string;
  };
  bank: {
    accountHolder: string;
    accountNumberLast4: string;
    ifsc: string;
    bankName: string;
    upiId?: string;
  };
  kyc: {
    status: "not_started" | "pending" | "approved" | "rejected";
    videoUrl: string;
    roomId: string;
    note: string;
    submittedAt: string | null;
  };
  pricing: {
    perKm?: number;
    baseFare?: number;
    perHour?: number;
    minimumFare?: number;
    waitingCharge?: number;
  };
  submittedAt: string | null;
  reviewedAt: string | null;
  rejectionReason: string;
}

interface Completion {
  vehicleComplete: boolean;
  documentsComplete: boolean;
  bankComplete: boolean;
  kycComplete: boolean;
  pricingComplete: boolean;
  all: boolean;
}

interface OnboardingResponse {
  profile: OnboardingProfile;
  completion: Completion;
  partnerStatus: PartnerStatus;
  role: string;
}

interface PostResponse extends OnboardingResponse {
  message: string;
}

interface VehicleForm {
  businessName: string;
  ownerName: string;
  category: VehicleCategory;
  name: string;
  brand: string;
  model: string;
  year: string;
  registrationNumber: string;
  seats: string;
  transmission: string;
  fuel: string;
  image: string;
  description: string;
}

interface DocumentForm {
  drivingLicense: string;
  vehicleRc: string;
  insurance: string;
  permit: string;
}

interface BankForm {
  accountHolder: string;
  accountNumber: string;
  confirmAccountNumber: string;
  ifsc: string;
  bankName: string;
  upiId: string;
}

interface PricingForm {
  perKm: string;
  baseFare: string;
  perHour: string;
  minimumFare: string;
  waitingCharge: string;
}

const currentYear = new Date().getFullYear();

const emptyVehicle: VehicleForm = {
  businessName: "",
  ownerName: "",
  category: "car",
  name: "",
  brand: "",
  model: "",
  year: String(currentYear),
  registrationNumber: "",
  seats: "4",
  transmission: "manual",
  fuel: "petrol",
  image: "",
  description: "",
};

const emptyDocuments: DocumentForm = {
  drivingLicense: "",
  vehicleRc: "",
  insurance: "",
  permit: "",
};

const emptyBank: BankForm = {
  accountHolder: "",
  accountNumber: "",
  confirmAccountNumber: "",
  ifsc: "",
  bankName: "",
  upiId: "",
};

const emptyPricing: PricingForm = {
  perKm: "",
  baseFare: "",
  perHour: "",
  minimumFare: "",
  waitingCharge: "",
};

const stepIds: OnboardingStepId[] = ONBOARDING_STEPS.map((step) => step.id);

function firstIncomplete(completion: Completion): OnboardingStepId {
  if (!completion.vehicleComplete) return "vehicle";
  if (!completion.documentsComplete) return "documents";
  if (!completion.bankComplete) return "bank";
  if (!completion.kycComplete) return "kyc";
  if (!completion.pricingComplete) return "pricing";
  return "review";
}

export default function OnboardingWizard() {
  const router = useRouter();
  const { data: session, update } = useSession();
  const [data, setData] = useState<OnboardingResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeStep, setActiveStep] = useState<OnboardingStepId>("vehicle");
  const [vehicle, setVehicle] = useState<VehicleForm>(emptyVehicle);
  const [documents, setDocuments] = useState<DocumentForm>(emptyDocuments);
  const [bank, setBank] = useState<BankForm>(emptyBank);
  const [pricing, setPricing] = useState<PricingForm>(emptyPricing);
  const [videoUrl, setVideoUrl] = useState("");
  const [roomId, setRoomId] = useState("");
  const [saving, setSaving] = useState("");
  const [uploading, setUploading] = useState("");
  const [bankEditing, setBankEditing] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [zegoEnabled, setZegoEnabled] = useState(false);
  const [kycRoomOpen, setKycRoomOpen] = useState(false);
  const [justSubmitted, setJustSubmitted] = useState(false);
  const vehicleImageRef = useRef<HTMLInputElement>(null);
  const docRefs = {
    drivingLicense: useRef<HTMLInputElement>(null),
    vehicleRc: useRef<HTMLInputElement>(null),
    insurance: useRef<HTMLInputElement>(null),
    permit: useRef<HTMLInputElement>(null),
  };
  const videoRef = useRef<HTMLInputElement>(null);

  function hydrate(result: OnboardingResponse) {
    const profile = result.profile;
    const draft = profile.vehicleDraft || {};
    setData(result);
    setVehicle({
      businessName: profile.businessName || "",
      ownerName: profile.ownerName || "",
      category: draft.category || "car",
      name: draft.name || "",
      brand: draft.brand || "",
      model: draft.model || "",
      year: String(draft.year || currentYear),
      registrationNumber: draft.registrationNumber || "",
      seats: String(draft.seats || CATEGORY_MAP[draft.category || "car"]?.seats || 2),
      transmission: draft.transmission || "manual",
      fuel: draft.fuel || "petrol",
      image: draft.image || "",
      description: draft.description || "",
    });
    setDocuments({
      drivingLicense: profile.documents?.drivingLicense || "",
      vehicleRc: profile.documents?.vehicleRc || "",
      insurance: profile.documents?.insurance || "",
      permit: profile.documents?.permit || "",
    });
    setBank({
      accountHolder: profile.bank?.accountHolder || "",
      accountNumber: "",
      confirmAccountNumber: "",
      ifsc: profile.bank?.ifsc || "",
      bankName: profile.bank?.bankName || "",
      upiId: profile.bank?.upiId || "",
    });
    setBankEditing(!result.completion.bankComplete);
    setPricing({
      perKm: profile.pricing?.perKm !== undefined ? String(profile.pricing.perKm) : "",
      baseFare: profile.pricing?.baseFare !== undefined ? String(profile.pricing.baseFare) : "",
      perHour: profile.pricing?.perHour !== undefined ? String(profile.pricing.perHour) : "0",
      minimumFare: profile.pricing?.minimumFare !== undefined ? String(profile.pricing.minimumFare) : "0",
      waitingCharge: profile.pricing?.waitingCharge !== undefined ? String(profile.pricing.waitingCharge) : "0",
    });
    setVideoUrl(profile.kyc?.videoUrl || "");
    setRoomId(profile.kyc?.roomId || "");
    setActiveStep(firstIncomplete(result.completion));
  }

  useEffect(() => {
    Promise.all([
      api<OnboardingResponse>("/api/partner/onboarding"),
      fetch("/api/config").then((response) => (response.ok ? response.json() : null)).catch(() => null),
    ])
      .then(([result, config]) => {
        hydrate(result);
        setZegoEnabled(Boolean(config?.zegoEnabled));
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load your partner application."))
      .finally(() => setLoading(false));
  }, []);

  const completion = data?.completion;
  const status = data?.partnerStatus || "none";
  const profile = data?.profile;

  const completeFor: Record<OnboardingStepId, boolean> = {
    vehicle: Boolean(completion?.vehicleComplete),
    documents: Boolean(completion?.documentsComplete),
    bank: Boolean(completion?.bankComplete),
    kyc: Boolean(completion?.kycComplete),
    pricing: Boolean(completion?.pricingComplete),
    review: Boolean(completion?.all),
  };

  const unlocked = useMemo(() => {
    const map: Record<OnboardingStepId, boolean> = {
      vehicle: true,
      documents: false,
      bank: false,
      kyc: false,
      pricing: false,
      review: false,
    };
    let previousComplete = true;
    for (const step of stepIds) {
      map[step] = step === "vehicle" ? true : previousComplete;
      previousComplete = previousComplete && completeFor[step];
    }
    return map;
  }, [completion]); // eslint-disable-line react-hooks/exhaustive-deps

  const activeIndex = stepIds.indexOf(activeStep);
  const activeMeta = ONBOARDING_STEPS[activeIndex];

  function updateVehicle<K extends keyof VehicleForm>(key: K, value: VehicleForm[K]) {
    setVehicle((current) => ({ ...current, [key]: value }));
  }

  function updatePricing<K extends keyof PricingForm>(key: K, value: PricingForm[K]) {
    setPricing((current) => ({ ...current, [key]: value }));
  }

  async function uploadVehicleImage(file?: File) {
    if (!file) return;
    setUploading("vehicle-image");
    try {
      const url = await uploadFile(file);
      updateVehicle("image", url);
      toast.success("Vehicle photo uploaded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not upload the photo.");
    } finally {
      setUploading("");
      if (vehicleImageRef.current) vehicleImageRef.current.value = "";
    }
  }

  async function uploadDocument(key: keyof DocumentForm, file?: File) {
    if (!file) return;
    setUploading(`doc-${key}`);
    try {
      const url = await uploadFile(file);
      setDocuments((current) => ({ ...current, [key]: url }));
      toast.success("Document uploaded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not upload the document.");
    } finally {
      setUploading("");
      const ref = docRefs[key];
      if (ref.current) ref.current.value = "";
    }
  }

  async function uploadVideo(file?: File) {
    if (!file) return;
    setUploading("video");
    try {
      const url = await uploadFile(file);
      setVideoUrl(url);
      toast.success("Verification video uploaded - submit it for review below");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not upload the video.");
    } finally {
      setUploading("");
      if (videoRef.current) videoRef.current.value = "";
    }
  }

  async function saveStep(step: OnboardingStepId, payload: object, advance = true) {
    setSaving(step);
    setError("");
    try {
      const result = await api<PostResponse>("/api/partner/onboarding", {
        method: "POST",
        json: { step, ...payload },
      });
      hydrate({ ...result, profile: result.profile });
      toast.success(result.message);
      if (result.partnerStatus === "pending") {
        setJustSubmitted(true);
        await update();
        router.refresh();
      } else if (session?.user.role === "user") {
        await update();
        router.refresh();
      }
      if (advance && step !== "review") {
        const next = firstIncomplete(result.completion);
        setActiveStep(next);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not save this step.";
      setError(message);
      toast.error(message);
      return null;
    } finally {
      setSaving("");
    }
  }

  async function submitVehicle(event: React.FormEvent) {
    event.preventDefault();
    if (!vehicle.image) {
      toast.error("Upload a clear vehicle photo.");
      return;
    }
    await saveStep("vehicle", {
      businessName: vehicle.businessName,
      ownerName: vehicle.ownerName,
      category: vehicle.category,
      name: vehicle.name,
      brand: vehicle.brand,
      model: vehicle.model,
      year: Number(vehicle.year),
      registrationNumber: vehicle.registrationNumber,
      seats: Number(vehicle.seats),
      transmission: vehicle.transmission || undefined,
      fuel: vehicle.fuel || undefined,
      image: vehicle.image,
      description: vehicle.description,
    });
  }

  async function submitDocuments(event: React.FormEvent) {
    event.preventDefault();
    if (!documents.drivingLicense || !documents.vehicleRc || !documents.insurance) {
      toast.error("Upload the driving licence, vehicle RC and insurance.");
      return;
    }
    await saveStep("documents", documents);
  }

  async function submitBank(event: React.FormEvent) {
    event.preventDefault();
    if (bank.accountNumber !== bank.confirmAccountNumber) {
      toast.error("Account numbers do not match.");
      return;
    }
    await saveStep("bank", bank);
  }

  async function submitKyc(override?: { videoUrl?: string; roomId?: string }) {
    const nextVideo = override?.videoUrl ?? videoUrl;
    const nextRoom = override?.roomId ?? roomId;
    if (!nextVideo && !nextRoom) {
      toast.error("Complete the live call or upload a verification video.");
      return;
    }
    await saveStep("kyc", { videoUrl: nextVideo, roomId: nextRoom });
  }

  async function submitPricing(event: React.FormEvent) {
    event.preventDefault();
    await saveStep("pricing", {
      perKm: Number(pricing.perKm),
      baseFare: Number(pricing.baseFare),
      perHour: Number(pricing.perHour || 0),
      minimumFare: Number(pricing.minimumFare || 0),
      waitingCharge: Number(pricing.waitingCharge || 0),
    });
  }

  async function submitApplication() {
    if (!confirmed) {
      toast.error("Confirm that your details and documents are accurate.");
      return;
    }
    const result = await saveStep("review", {}, false);
    if (result) {
      setJustSubmitted(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  function goTo(step: OnboardingStepId) {
    if (!unlocked[step] && step !== activeStep) return;
    setActiveStep(step);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (loading) {
    return (
      <div className="space-y-5">
        <div className="skeleton h-24 rounded-2xl" />
        <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
          <div className="skeleton h-96 rounded-3xl" />
          <div className="skeleton h-[520px] rounded-3xl" />
        </div>
      </div>
    );
  }

  if (!data || !profile) {
    return (
      <div className="rounded-3xl border border-danger/15 bg-danger/5 p-8 text-center">
        <AlertTriangle className="mx-auto h-6 w-6 text-danger" />
        <p className="font-display mt-3 text-xl font-bold">Could not load onboarding</p>
        <p className="mt-1 text-sm text-fg-muted">{error || "Please refresh and try again."}</p>
        <button type="button" onClick={() => window.location.reload()} className="btn-dark mt-5">Reload</button>
      </div>
    );
  }

  if (status === "approved") {
    return (
      <div className="space-y-6">
        <PageHeader eyebrow="Partner status" title="You're approved." description="Your vehicle is live and riders can book it now." />
        <section className="relative overflow-hidden rounded-3xl bg-ink p-6 text-white sm:p-8">
          <div className="relative z-10 max-w-2xl">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-lime px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-ink">
              <BadgeCheck className="h-3 w-3" /> Verified partner
            </span>
            <h2 className="font-display mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl">
              Welcome to the road, {profile.businessName || session?.user.name}.
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-fg-inverse-muted">
              Your application, documents and video KYC are approved. Keep your fleet available and respond to new requests quickly.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              <Link href="/dashboard/partner/requests" className="btn-lime">View requests <ArrowRight className="h-4 w-4" /></Link>
              <Link href="/dashboard/partner/fleet" className="btn-light">Manage fleet</Link>
              <Link href="/dashboard/partner/earnings" className="btn border border-white/15 text-white hover:bg-surface/10">Earnings</Link>
            </div>
          </div>
          <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-lime/10 blur-3xl" />
        </section>
        <ReviewSummary profile={profile} completion={completion!} />
      </div>
    );
  }

  if (status === "pending") {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Application status"
          title="We're reviewing your application."
          description="Our team is checking your vehicle, documents, payout details and video KYC. You'll get an email when the review is complete."
          actions={<Link href="/dashboard/partner" className="btn-outline">Partner overview</Link>}
        />
        <section className="rounded-3xl border border-warning/20 bg-warning/5 p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-warning/10 text-warning"><Clock3 className="h-5 w-5" /></span>
            <div>
              <p className="text-sm font-bold text-warning">Submitted {profile.submittedAt ? formatDate(profile.submittedAt, true) : "for review"}</p>
              <p className="mt-1 max-w-2xl text-[11px] leading-relaxed text-fg-muted">
                Approval typically takes one business day. Editing is paused while the application is under review. If our team needs something, we&apos;ll email you and reopen the application.
              </p>
            </div>
          </div>
        </section>
        <ReviewSummary profile={profile} completion={completion!} />
        <div className="flex flex-col items-start justify-between gap-3 rounded-3xl border border-line bg-white p-5 sm:flex-row sm:items-center">
          <p className="text-xs text-fg-muted">Need to correct something urgently or ask about the review?</p>
          <Link href="/contact" className="btn-dark">Contact partner support</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Partner onboarding"
        title={status === "rejected" ? "Let's fix your application." : "Become a RYDEX partner."}
        description="Six short steps to get verified, set your rates and go live. Your progress saves at every step."
        actions={
          <Link href="/dashboard/partner" className="btn-outline">
            <ArrowLeft className="h-4 w-4" /> Partner overview
          </Link>
        }
      />

      {status === "rejected" && (
        <section className="rounded-2xl border border-danger/20 bg-danger/5 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
            <div>
              <p className="text-xs font-bold text-danger">Changes requested by the RYDEX team</p>
              <p className="mt-1 text-[11px] leading-relaxed text-fg-muted">
                {profile.rejectionReason || "Update the requested details and submit your application again."}
              </p>
            </div>
          </div>
        </section>
      )}

      {error && <p className="rounded-2xl border border-danger/15 bg-danger/5 px-4 py-3 text-xs text-danger">{error}</p>}

      <div className="grid gap-5 lg:grid-cols-[250px_1fr]">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-3xl border border-line bg-white p-2.5">
            {ONBOARDING_STEPS.map((step, index) => {
              const done = completeFor[step.id];
              const active = activeStep === step.id;
              const available = unlocked[step.id];
              return (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => goTo(step.id)}
                  disabled={!available}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition",
                    active ? "bg-ink text-white" : available ? "hover:bg-surface-muted" : "opacity-45",
                  )}
                >
                  <span
                    className={cn(
                      "grid h-8 w-8 shrink-0 place-items-center rounded-full border text-[10px] font-bold transition",
                      done
                        ? "border-success bg-success text-white"
                        : active
                          ? "border-lime bg-lime text-ink"
                          : "border-line text-fg-subtle",
                    )}
                  >
                    {done ? <Check className="h-3.5 w-3.5" /> : index + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-semibold">{step.label}</span>
                    <span className={cn("block truncate text-[10px]", active ? "text-fg-inverse-subtle" : "text-fg-subtle")}>{step.description}</span>
                  </span>
                  {!available && !done && <LockKeyhole className="h-3 w-3 shrink-0 text-fg-subtle" />}
                </button>
              );
            })}
          </div>
          <div className="mt-3 rounded-2xl bg-lime p-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-fg-muted">Partner share</p>
            <p className="font-display mt-1 text-2xl font-extrabold tracking-tight">90%</p>
            <p className="mt-1 text-[10px] leading-relaxed text-fg-muted">
              You keep 90% of every completed fare. RYDEX retains a 10% platform fee.
            </p>
          </div>
        </aside>

        <div className="min-w-0">
          <div className="rounded-3xl border border-line bg-white p-5 sm:p-7">
            <div className="flex items-start justify-between gap-3 border-b border-line pb-4">
              <div>
                <p className="eyebrow">Step {activeIndex + 1} of {ONBOARDING_STEPS.length}</p>
                <h2 className="font-display mt-1 text-2xl font-extrabold tracking-tight">{activeMeta.label}</h2>
                <p className="mt-1 text-xs text-fg-muted">{activeMeta.description}</p>
              </div>
              {completeFor[activeStep] && (
                <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2.5 py-1 text-[10px] font-semibold text-success">
                  <CheckCircle2 className="h-3 w-3" /> Saved
                </span>
              )}
            </div>

            <div className="mt-5">
              {activeStep === "vehicle" && (
                <form onSubmit={submitVehicle} className="space-y-5">
                  <div className="rounded-2xl bg-surface-muted/60 p-4">
                    <p className="text-xs font-bold">Business details</p>
                    <p className="mt-0.5 text-[10px] text-fg-muted">These appear to riders alongside your vehicle.</p>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <div>
                        <label className="label" htmlFor="on-business">Business / fleet name</label>
                        <input id="on-business" required minLength={2} maxLength={80} value={vehicle.businessName} onChange={(event) => updateVehicle("businessName", event.target.value)} className="input" placeholder="e.g. Velocity Rides" />
                      </div>
                      <div>
                        <label className="label" htmlFor="on-owner">Owner name</label>
                        <input id="on-owner" required minLength={2} maxLength={80} value={vehicle.ownerName} onChange={(event) => updateVehicle("ownerName", event.target.value)} className="input" placeholder="Full legal name" />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="label">Vehicle photo</label>
                    <div className="flex flex-col gap-3 rounded-2xl border border-dashed border-line p-3 sm:flex-row sm:items-center">
                      <div className="relative h-28 w-full overflow-hidden rounded-xl bg-surface-muted sm:h-20 sm:w-28">
                        {vehicle.image ? (
                          <Image src={vehicle.image} alt="Vehicle preview" fill sizes="112px" className="object-cover" />
                        ) : (
                          <div className="grid h-full place-items-center"><Camera className="h-5 w-5 text-fg-subtle" /></div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <button type="button" onClick={() => vehicleImageRef.current?.click()} disabled={Boolean(uploading)} className="btn-outline !px-3 !py-2 text-[11px]">
                          {uploading === "vehicle-image" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                          {vehicle.image ? "Replace photo" : "Upload photo"}
                        </button>
                        <p className="mt-1.5 text-[10px] leading-relaxed text-fg-subtle">A clear side or front photo. JPG, PNG or WebP up to 10 MB.</p>
                      </div>
                      <input ref={vehicleImageRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(event) => uploadVehicleImage(event.target.files?.[0])} />
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="label" htmlFor="on-category">Vehicle category</label>
                      <select
                        id="on-category"
                        value={vehicle.category}
                        onChange={(event) => {
                          const category = event.target.value as VehicleCategory;
                          updateVehicle("category", category);
                          updateVehicle("seats", String(CATEGORY_MAP[category]?.seats || 2));
                        }}
                        className="input"
                      >
                        {Object.values(CATEGORY_MAP).map((category) => (
                          <option key={category.value} value={category.value}>{category.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="label" htmlFor="on-name">Listing name</label>
                      <input id="on-name" required minLength={2} maxLength={80} value={vehicle.name} onChange={(event) => updateVehicle("name", event.target.value)} className="input" placeholder="e.g. Toyota Fortuner" />
                    </div>
                    <div>
                      <label className="label" htmlFor="on-brand">Brand</label>
                      <input id="on-brand" required maxLength={40} value={vehicle.brand} onChange={(event) => updateVehicle("brand", event.target.value)} className="input" placeholder="Toyota" />
                    </div>
                    <div>
                      <label className="label" htmlFor="on-model">Model</label>
                      <input id="on-model" required maxLength={40} value={vehicle.model} onChange={(event) => updateVehicle("model", event.target.value)} className="input" placeholder="Fortuner 4x4" />
                    </div>
                    <div>
                      <label className="label" htmlFor="on-year">Year</label>
                      <input id="on-year" type="number" required min={2000} max={currentYear + 1} value={vehicle.year} onChange={(event) => updateVehicle("year", event.target.value)} className="input" />
                    </div>
                    <div>
                      <label className="label" htmlFor="on-reg">Registration number</label>
                      <input id="on-reg" required minLength={6} maxLength={16} value={vehicle.registrationNumber} onChange={(event) => updateVehicle("registrationNumber", event.target.value.toUpperCase())} className="input font-mono uppercase" placeholder="KA01AB1234" />
                    </div>
                    <div>
                      <label className="label" htmlFor="on-seats">Seats</label>
                      <input id="on-seats" type="number" required min={1} max={20} value={vehicle.seats} onChange={(event) => updateVehicle("seats", event.target.value)} className="input" />
                    </div>
                    <div>
                      <label className="label" htmlFor="on-transmission">Transmission</label>
                      <select id="on-transmission" value={vehicle.transmission} onChange={(event) => updateVehicle("transmission", event.target.value)} className="input">
                        <option value="">Not specified</option>
                        <option value="manual">Manual</option>
                        <option value="automatic">Automatic</option>
                      </select>
                    </div>
                    <div>
                      <label className="label" htmlFor="on-fuel">Fuel</label>
                      <select id="on-fuel" value={vehicle.fuel} onChange={(event) => updateVehicle("fuel", event.target.value)} className="input">
                        <option value="">Not specified</option>
                        <option value="petrol">Petrol</option>
                        <option value="diesel">Diesel</option>
                        <option value="electric">Electric</option>
                        <option value="cng">CNG</option>
                      </select>
                    </div>
                    <div className="sm:col-span-2">
                      <label className="label" htmlFor="on-description">Description</label>
                      <textarea id="on-description" rows={3} maxLength={400} value={vehicle.description} onChange={(event) => updateVehicle("description", event.target.value)} className="input resize-none" placeholder="Tell riders what makes this vehicle comfortable or useful." />
                    </div>
                  </div>

                  <StepActions
                    saving={saving === "vehicle"}
                    label="Save & continue"
                    onNext={() => {}}
                    submit
                  />
                </form>
              )}

              {activeStep === "documents" && (
                <form onSubmit={submitDocuments} className="space-y-4">
                  <div className="rounded-2xl border border-line bg-surface-muted/40 px-4 py-3 text-[11px] leading-relaxed text-fg-muted">
                    <ShieldCheck className="mr-1.5 inline h-3.5 w-3.5 text-success" />
                    Upload clear, current documents. Images or PDFs up to 10 MB. The name on your licence should match your owner name.
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {([
                      ["drivingLicense", "Driving licence", "Front and back, clearly readable", true],
                      ["vehicleRc", "Vehicle RC", "Current registration certificate", true],
                      ["insurance", "Vehicle insurance", "Valid policy covering the vehicle", true],
                      ["permit", "Commercial permit", "Optional - required for some commercial vehicles", false],
                    ] as const).map(([key, label, description, required]) => (
                      <DocumentField
                        key={key}
                        label={label}
                        description={description}
                        required={required}
                        value={documents[key]}
                        uploading={uploading === `doc-${key}`}
                        inputRef={docRefs[key]}
                        onPick={(file) => uploadDocument(key, file)}
                        onRemove={() => setDocuments((current) => ({ ...current, [key]: "" }))}
                      />
                    ))}
                  </div>
                  <StepActions saving={saving === "documents"} label="Save & continue" submit />
                </form>
              )}

              {activeStep === "bank" && (
                <div className="space-y-4">
                  {!bankEditing && completion?.bankComplete ? (
                    <div className="space-y-4">
                      <div className="rounded-2xl border border-success/20 bg-success/5 p-5">
                        <div className="flex items-start gap-3">
                          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white text-success"><Landmark className="h-4 w-4" /></span>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-bold">Payout account saved</p>
                            <p className="mt-1 text-[11px] text-fg-muted">{profile.bank.bankName} · {profile.bank.accountHolder}</p>
                            <p className="mt-2 font-mono text-sm tracking-wider">•••• {profile.bank.accountNumberLast4} <span className="ml-2 font-sans text-[10px] text-fg-subtle">{profile.bank.ifsc}</span></p>
                            {profile.bank.upiId && <p className="mt-1 text-[10px] text-fg-muted">UPI: {profile.bank.upiId}</p>}
                          </div>
                        </div>
                      </div>
                      <p className="flex items-start gap-1.5 text-[10px] leading-relaxed text-fg-subtle">
                        <LockKeyhole className="mt-0.5 h-3 w-3 shrink-0" /> Account numbers are encrypted with AES-256-GCM. Only the last four digits are shown.
                      </p>
                      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
                        <button type="button" onClick={() => setBankEditing(true)} className="btn-outline">Change bank details</button>
                        <button type="button" onClick={() => goTo(firstIncomplete({ ...completion!, bankComplete: true }))} className="btn-dark">
                          Continue <ArrowRight className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <form onSubmit={submitBank} className="space-y-4">
                      <div className="rounded-2xl bg-surface-muted/60 p-4">
                        <p className="text-xs font-bold">Where should we send your earnings?</p>
                        <p className="mt-0.5 text-[10px] leading-relaxed text-fg-muted">
                          Use an account in the business owner&apos;s name. Full numbers are encrypted and never returned to the browser after saving.
                        </p>
                      </div>
                      <div>
                        <label className="label" htmlFor="on-bank-holder">Account holder name</label>
                        <input id="on-bank-holder" required minLength={2} maxLength={80} value={bank.accountHolder} onChange={(event) => setBank({ ...bank, accountHolder: event.target.value })} className="input" />
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <label className="label" htmlFor="on-account">Account number</label>
                          <input id="on-account" required inputMode="numeric" pattern="\d{9,18}" value={bank.accountNumber} onChange={(event) => setBank({ ...bank, accountNumber: event.target.value.replace(/\D/g, "").slice(0, 18) })} className="input font-mono" placeholder="9-18 digits" />
                        </div>
                        <div>
                          <label className="label" htmlFor="on-account-confirm">Confirm account number</label>
                          <input id="on-account-confirm" required inputMode="numeric" pattern="\d{9,18}" value={bank.confirmAccountNumber} onChange={(event) => setBank({ ...bank, confirmAccountNumber: event.target.value.replace(/\D/g, "").slice(0, 18) })} className="input font-mono" placeholder="Re-enter account number" />
                        </div>
                        <div>
                          <label className="label" htmlFor="on-bank-name">Bank name</label>
                          <input id="on-bank-name" required minLength={2} maxLength={80} value={bank.bankName} onChange={(event) => setBank({ ...bank, bankName: event.target.value })} className="input" placeholder="e.g. HDFC Bank" />
                        </div>
                        <div>
                          <label className="label" htmlFor="on-ifsc">IFSC code</label>
                          <input id="on-ifsc" required maxLength={11} value={bank.ifsc} onChange={(event) => setBank({ ...bank, ifsc: event.target.value.toUpperCase() })} className="input font-mono uppercase" placeholder="HDFC0001234" />
                        </div>
                      </div>
                      <div>
                        <label className="label" htmlFor="on-upi">UPI ID <span className="normal-case tracking-normal text-fg-subtle">(optional)</span></label>
                        <input id="on-upi" maxLength={80} value={bank.upiId} onChange={(event) => setBank({ ...bank, upiId: event.target.value })} className="input" placeholder="yourname@bank" />
                      </div>
                      <StepActions
                        saving={saving === "bank"}
                        label="Save & continue"
                        submit
                        extra={
                          completion?.bankComplete ? (
                            <button type="button" onClick={() => setBankEditing(false)} className="btn-outline">Cancel change</button>
                          ) : null
                        }
                      />
                    </form>
                  )}
                </div>
              )}

              {activeStep === "kyc" && (
                <div className="space-y-4">
                  {profile.kyc.status === "approved" && (
                    <div className="rounded-2xl border border-success/20 bg-success/5 p-5">
                      <div className="flex items-start gap-3">
                        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white text-success"><BadgeCheck className="h-5 w-5" /></span>
                        <div>
                          <p className="text-sm font-bold text-success">Video KYC approved</p>
                          <p className="mt-1 text-[11px] leading-relaxed text-fg-muted">Your identity has been verified by the RYDEX team. Continue to set your pricing.</p>
                        </div>
                      </div>
                      <button type="button" onClick={() => goTo("pricing")} className="btn-dark mt-4">Continue to pricing <ArrowRight className="h-4 w-4" /></button>
                    </div>
                  )}

                  {profile.kyc.status === "pending" && (
                    <div className="rounded-2xl border border-warning/20 bg-warning/5 p-5">
                      <div className="flex items-start gap-3">
                        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white text-warning"><Clock3 className="h-5 w-5" /></span>
                        <div>
                          <p className="text-sm font-bold text-warning">Video KYC under review</p>
                          <p className="mt-1 text-[11px] leading-relaxed text-fg-muted">
                            Your verification was submitted {profile.kyc.submittedAt ? formatDate(profile.kyc.submittedAt, true) : "for review"}. You can continue with pricing while our team reviews it.
                          </p>
                        </div>
                      </div>
                      <button type="button" onClick={() => setActiveStep("pricing")} className="btn-dark mt-4">Continue to pricing <ArrowRight className="h-4 w-4" /></button>
                    </div>
                  )}

                  {profile.kyc.status === "rejected" && (
                    <div className="rounded-2xl border border-danger/20 bg-danger/5 p-4">
                      <div className="flex items-start gap-3">
                        <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
                        <div>
                          <p className="text-xs font-bold text-danger">Video KYC needs another attempt</p>
                          <p className="mt-1 text-[11px] text-fg-muted">{profile.kyc.note || "Please complete a new live call or upload a fresh verification video."}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {profile.kyc.status !== "approved" && profile.kyc.status !== "pending" && (
                    <>
                      <div className="rounded-2xl border border-line p-4">
                        <div className="flex items-start gap-3">
                          <span className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-full", zegoEnabled ? "bg-lime" : "bg-surface-muted text-fg-subtle")}><Video className="h-4 w-4" /></span>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-sm font-bold">Live video KYC</p>
                              <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider", zegoEnabled ? "bg-success/10 text-success" : "bg-surface-muted text-fg-subtle")}>
                                {zegoEnabled ? "Available" : "Not configured"}
                              </span>
                            </div>
                            <p className="mt-1 text-[11px] leading-relaxed text-fg-muted">
                              Join a secure verification room. Our team checks your face and documents live. Allow camera and microphone access.
                            </p>
                            <button
                              type="button"
                              disabled={!zegoEnabled}
                              onClick={() => setKycRoomOpen(true)}
                              className="btn-dark mt-3 !py-2.5 text-[11px]"
                            >
                              <PlayCircle className="h-4 w-4" /> Start live KYC
                            </button>
                            {!zegoEnabled && (
                              <p className="mt-2 text-[10px] leading-relaxed text-warning">
                                Live video KYC isn&apos;t configured on this deployment. Upload a recorded video below instead.
                              </p>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="relative flex items-center gap-3 py-1">
                        <span className="h-px flex-1 bg-line" />
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-fg-subtle">or record a video</span>
                        <span className="h-px flex-1 bg-line" />
                      </div>

                      <div className="rounded-2xl border border-dashed border-line p-4">
                        <p className="text-sm font-bold">Upload a verification video</p>
                        <p className="mt-1 text-[11px] leading-relaxed text-fg-muted">
                          In one continuous clip, state your full name, show your face clearly, then show your driving licence and vehicle RC. Keep it under 10 MB (MP4 or WebM).
                        </p>
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <button type="button" onClick={() => videoRef.current?.click()} disabled={Boolean(uploading)} className="btn-outline !py-2.5 text-[11px]">
                            {uploading === "video" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                            {videoUrl ? "Replace video" : "Choose video"}
                          </button>
                          {videoUrl && (
                            <a href={videoUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[10px] font-semibold text-success underline underline-offset-2">
                              <PlayCircle className="h-3.5 w-3.5" /> Preview uploaded video
                            </a>
                          )}
                          <input ref={videoRef} type="file" accept="video/mp4,video/webm,video/quicktime" hidden onChange={(event) => uploadVideo(event.target.files?.[0])} />
                        </div>
                        {videoUrl && (
                          <button
                            type="button"
                            onClick={() => submitKyc({ videoUrl })}
                            disabled={saving === "kyc"}
                            className="btn-dark mt-3 w-full"
                          >
                            {saving === "kyc" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                            Submit video for verification
                          </button>
                        )}
                      </div>

                      {roomId && (
                        <button type="button" onClick={() => submitKyc({ roomId })} disabled={saving === "kyc"} className="btn-outline w-full">
                          {saving === "kyc" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Video className="h-4 w-4" />}
                          Mark joined live room as submitted
                        </button>
                      )}
                    </>
                  )}
                </div>
              )}

              {activeStep === "pricing" && (
                <form onSubmit={submitPricing} className="space-y-4">
                  <div className="rounded-2xl bg-ink p-4 text-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-lime">Your payout</p>
                        <p className="mt-1 text-[11px] text-fg-inverse-subtle">You receive 90% of each completed fare.</p>
                      </div>
                      <Wallet className="h-5 w-5 text-lime" />
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="label" htmlFor="on-per-km">Per kilometre (₹)</label>
                      <input id="on-per-km" type="number" required min={1} max={500} step="1" value={pricing.perKm} onChange={(event) => updatePricing("perKm", event.target.value)} className="input" placeholder="14" />
                      <p className="mt-1 text-[10px] text-fg-subtle">Charged for total route distance.</p>
                    </div>
                    <div>
                      <label className="label" htmlFor="on-base">Base fare (₹)</label>
                      <input id="on-base" type="number" required min={0} max={5000} step="1" value={pricing.baseFare} onChange={(event) => updatePricing("baseFare", event.target.value)} className="input" placeholder="99" />
                      <p className="mt-1 text-[10px] text-fg-subtle">Fixed pickup charge on every booking.</p>
                    </div>
                    <div>
                      <label className="label" htmlFor="on-hour">Per hour (₹)</label>
                      <input id="on-hour" type="number" min={0} max={5000} step="1" value={pricing.perHour} onChange={(event) => updatePricing("perHour", event.target.value)} className="input" />
                      <p className="mt-1 text-[10px] text-fg-subtle">Applied to estimated trip duration.</p>
                    </div>
                    <div>
                      <label className="label" htmlFor="on-minimum">Minimum fare (₹)</label>
                      <input id="on-minimum" type="number" min={0} max={10000} step="1" value={pricing.minimumFare} onChange={(event) => updatePricing("minimumFare", event.target.value)} className="input" />
                      <p className="mt-1 text-[10px] text-fg-subtle">The lowest total charge for any ride.</p>
                    </div>
                    <div>
                      <label className="label" htmlFor="on-waiting">Waiting charge per minute (₹)</label>
                      <input id="on-waiting" type="number" min={0} max={1000} step="1" value={pricing.waitingCharge} onChange={(event) => updatePricing("waitingCharge", event.target.value)} className="input" />
                      <p className="mt-1 text-[10px] text-fg-subtle">Stored in your partner profile for operational reference.</p>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-line bg-surface-muted/40 p-4">
                    <p className="text-[11px] font-semibold">Example: 10 km · 30 min trip</p>
                    <p className="mt-1 text-[10px] text-fg-muted">Using the rates above, before any minimum-fare adjustment.</p>
                    <div className="mt-2 flex items-end justify-between">
                      <p className="font-display text-2xl font-extrabold">
                        {inr(
                          Number(pricing.baseFare || 0) +
                            Number(pricing.perKm || 0) * 10 +
                            Number(pricing.perHour || 0) * 0.5,
                        )}
                      </p>
                      <p className="text-[10px] font-semibold text-success">
                        You earn {inr(
                          (Number(pricing.baseFare || 0) +
                            Number(pricing.perKm || 0) * 10 +
                            Number(pricing.perHour || 0) * 0.5) *
                            0.9,
                        )}
                      </p>
                    </div>
                  </div>

                  <StepActions saving={saving === "pricing"} label="Save & continue to review" submit />
                </form>
              )}

              {activeStep === "review" && (
                <div className="space-y-5">
                  <div className={cn("rounded-2xl border p-4", completion?.all ? "border-success/20 bg-success/5" : "border-warning/20 bg-warning/5")}>
                    <div className="flex items-start gap-3">
                      {completion?.all ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" /> : <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />}
                      <div>
                        <p className={cn("text-xs font-bold", completion?.all ? "text-success" : "text-warning")}>
                          {completion?.all ? "Everything is ready" : "Some steps still need attention"}
                        </p>
                        <p className="mt-1 text-[11px] leading-relaxed text-fg-muted">
                          {completion?.all
                            ? "Check the summary below, confirm it is accurate and submit your application for review."
                            : "Complete each incomplete step before submitting. Locked steps will unlock as you go."}
                        </p>
                      </div>
                    </div>
                  </div>

                  <ReviewSummary profile={profile} completion={completion!} compact />

                  <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-line p-4">
                    <input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-ink" />
                    <span className="text-[11px] leading-relaxed text-fg-muted">
                      I confirm that the vehicle, documents, bank details and identity information provided are accurate and belong to me or my business. I agree to the{" "}
                      <Link href="/terms" target="_blank" className="font-semibold text-ink underline underline-offset-2">partner terms</Link>.
                    </span>
                  </label>

                  {justSubmitted ? (
                    <div className="rounded-2xl bg-success/5 p-5 text-center">
                      <CheckCircle2 className="mx-auto h-6 w-6 text-success" />
                      <p className="font-display mt-2 text-lg font-bold">Application submitted</p>
                      <p className="mt-1 text-xs text-fg-muted">We&apos;ll email you once the review is complete.</p>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={submitApplication}
                      disabled={!completion?.all || !confirmed || saving === "review"}
                      className="btn-dark w-full py-3.5"
                    >
                      {saving === "review" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                      Submit application for review
                    </button>
                  )}
                  <p className="text-center text-[10px] text-fg-subtle">
                    Editing is paused while under review. You&apos;ll be notified by email about the decision.
                  </p>
                </div>
              )}
            </div>
          </div>

          {activeStep !== "review" && (
            <div className="mt-4 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => activeIndex > 0 && goTo(stepIds[activeIndex - 1])}
                disabled={activeIndex === 0}
                className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-fg-muted transition hover:text-ink disabled:opacity-30"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Previous step
              </button>
              {completeFor[activeStep] && activeStep !== "kyc" && activeStep !== "bank" && (
                <button
                  type="button"
                  onClick={() => goTo(stepIds[Math.min(stepIds.length - 1, activeIndex + 1)])}
                  className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-fg-muted transition hover:text-ink"
                >
                  Skip saved step <ArrowRight className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <ZegoKycRoom
        open={kycRoomOpen}
        vendorId={undefined}
        onClose={() => setKycRoomOpen(false)}
        onJoined={(joinedRoomId) => {
          setRoomId(joinedRoomId);
          toast.success("Connected to the KYC room");
          submitKyc({ roomId: joinedRoomId });
        }}
      />
    </div>
  );
}

function StepActions({
  saving,
  label,
  submit = false,
  extra,
}: {
  saving: boolean;
  label: string;
  submit?: boolean;
  onNext?: () => void;
  extra?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col-reverse gap-2 border-t border-line pt-4 sm:flex-row sm:items-center sm:justify-between">
      <div>{extra}</div>
      <button type={submit ? "submit" : "button"} disabled={saving} className="btn-dark sm:ml-auto">
        {saving && <Loader2 className="h-4 w-4 animate-spin" />}
        {label} {!saving && <ArrowRight className="h-4 w-4" />}
      </button>
    </div>
  );
}

function DocumentField({
  label,
  description,
  required,
  value,
  uploading,
  inputRef,
  onPick,
  onRemove,
}: {
  label: string;
  description: string;
  required: boolean;
  value: string;
  uploading: boolean;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onPick: (file?: File) => void;
  onRemove: () => void;
}) {
  const uploaded = Boolean(value);
  return (
    <div className={cn("rounded-2xl border p-4", uploaded ? "border-success/20 bg-success/5" : "border-dashed border-line")}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-bold">{label} {required && <span className="text-danger">*</span>}</p>
          <p className="mt-0.5 text-[10px] leading-relaxed text-fg-muted">{description}</p>
        </div>
        <span className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-full", uploaded ? "bg-success/10 text-success" : "bg-surface-muted text-fg-subtle")}>
          {uploaded ? <Check className="h-3.5 w-3.5" /> : <FileText className="h-3.5 w-3.5" />}
        </span>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => inputRef.current?.click()} disabled={uploading} className="btn-outline !px-3 !py-2 text-[10px]">
          {uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
          {uploaded ? "Replace" : "Upload"}
        </button>
        {uploaded && (
          <>
            <a href={value} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[10px] font-semibold text-success underline underline-offset-2">
              View <ArrowUpRight className="h-3 w-3" />
            </a>
            <button type="button" onClick={onRemove} className="text-[10px] font-semibold text-fg-subtle hover:text-danger">Remove</button>
          </>
        )}
      </div>
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,application/pdf" hidden onChange={(event) => onPick(event.target.files?.[0])} />
    </div>
  );
}

function ReviewSummary({
  profile,
  completion,
  compact = false,
}: {
  profile: OnboardingProfile;
  completion: Completion;
  compact?: boolean;
}) {
  const draft = profile.vehicleDraft || {};
  const rows = [
    { label: "Vehicle", done: completion.vehicleComplete, value: draft.name ? `${draft.name} · ${draft.registrationNumber}` : "Not added", href: "#" },
    { label: "Documents", done: completion.documentsComplete, value: completion.documentsComplete ? "Licence, RC and insurance uploaded" : "Missing documents", href: "#" },
    { label: "Payout account", done: completion.bankComplete, value: profile.bank?.accountNumberLast4 ? `${profile.bank.bankName} · •••• ${profile.bank.accountNumberLast4}` : "Not added", href: "#" },
    { label: "Video KYC", done: completion.kycComplete, value: profile.kyc?.status ? profile.kyc.status.replace("_", " ") : "Not started", href: "#" },
    { label: "Pricing", done: completion.pricingComplete, value: profile.pricing?.perKm !== undefined ? `${inr(profile.pricing.perKm)}/km + ${inr(profile.pricing.baseFare || 0)} base` : "Not set", href: "#" },
  ];
  return (
    <section className={cn("rounded-3xl border border-line bg-white", compact ? "p-4" : "p-5 sm:p-6")}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-lg font-bold tracking-tight">Application summary</h2>
          <p className="mt-0.5 text-[10px] text-fg-muted">Everything our review team will see</p>
        </div>
        {completion.all && <span className="rounded-full bg-success/10 px-2.5 py-1 text-[10px] font-semibold text-success">Complete</span>}
      </div>
      {!compact && (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl bg-surface-muted/60 p-3.5">
            <p className="text-[10px] uppercase tracking-wider text-fg-subtle">Business</p>
            <p className="mt-1 text-xs font-bold">{profile.businessName || "Not provided"}</p>
            <p className="text-[10px] text-fg-muted">{profile.ownerName || "Owner not provided"}</p>
          </div>
          <div className="rounded-2xl bg-surface-muted/60 p-3.5">
            <p className="text-[10px] uppercase tracking-wider text-fg-subtle">Vehicle</p>
            <p className="mt-1 text-xs font-bold">{draft.name || "Not added"}</p>
            <p className="text-[10px] text-fg-muted">{draft.registrationNumber || "No registration"} · {draft.category || "No category"}</p>
          </div>
        </div>
      )}
      <div className="mt-4 divide-y divide-line">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center gap-3 py-2.5">
            <span className={cn("grid h-6 w-6 shrink-0 place-items-center rounded-full", row.done ? "bg-success/10 text-success" : "bg-warning/10 text-warning")}>
              {row.done ? <Check className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
            </span>
            <span className="w-24 shrink-0 text-[10px] font-semibold text-fg-muted">{row.label}</span>
            <span className="min-w-0 flex-1 truncate text-right text-[10px] text-fg-muted">{row.value}</span>
          </div>
        ))}
      </div>
      {profile.rejectionReason && (
        <p className="mt-3 rounded-xl bg-danger/5 px-3 py-2 text-[10px] leading-relaxed text-danger">
          Previous review note: {profile.rejectionReason}
        </p>
      )}
      {profile.submittedAt && (
        <p className="mt-3 text-[10px] text-fg-subtle">Submitted {formatDate(profile.submittedAt, true)}</p>
      )}
    </section>
  );
}
