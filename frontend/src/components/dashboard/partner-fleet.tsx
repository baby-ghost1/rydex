"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  Camera,
  CarFront,
  Loader2,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  Star,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader, EmptyState } from "@/components/dashboard/ui";
import Modal from "@/components/ui/modal";
import { CATEGORY_MAP, VEHICLE_CATEGORIES } from "@rydex/shared/constants";
import { api, uploadFile } from "@/lib/client-api";
import { cn, inr } from "@rydex/shared/utils";
import type { VehicleCategory } from "@rydex/shared/types";

interface FleetVehicle {
  _id: string;
  category: VehicleCategory;
  name: string;
  brand: string;
  model: string;
  year: number;
  registrationNumber: string;
  image: string;
  description?: string;
  pricePerKm: number;
  baseFare: number;
  pricePerHour?: number;
  minimumFare?: number;
  seats: number;
  transmission?: "manual" | "automatic";
  fuel?: "petrol" | "diesel" | "electric" | "cng";
  available: boolean;
  approved: boolean;
  rating: number;
  totalTrips: number;
}

interface FormState {
  category: VehicleCategory;
  name: string;
  brand: string;
  model: string;
  year: string;
  registrationNumber: string;
  image: string;
  description: string;
  pricePerKm: string;
  baseFare: string;
  pricePerHour: string;
  minimumFare: string;
  seats: string;
  transmission: string;
  fuel: string;
  available: boolean;
}

const emptyForm: FormState = {
  category: "car",
  name: "",
  brand: "",
  model: "",
  year: String(new Date().getFullYear()),
  registrationNumber: "",
  image: "",
  description: "",
  pricePerKm: "",
  baseFare: "",
  pricePerHour: "",
  minimumFare: "",
  seats: "4",
  transmission: "manual",
  fuel: "petrol",
  available: true,
};

const currentYear = new Date().getFullYear();

export default function PartnerFleet() {
  const { data: session } = useSession();
  const [vehicles, setVehicles] = useState<FleetVehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "available" | "offline">("all");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<FleetVehicle | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState<FleetVehicle | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [toggling, setToggling] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const isApproved = session?.user.partnerStatus === "approved";

  async function load(silent = false) {
    if (!silent) setRefreshing(true);
    try {
      const data = await api<{ vehicles: FleetVehicle[] }>("/api/vehicles?mine=1&limit=50");
      setVehicles(data.vehicles || []);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load your fleet.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return vehicles.filter((vehicle) => {
      if (filter === "available" && !vehicle.available) return false;
      if (filter === "offline" && vehicle.available) return false;
      if (!needle) return true;
      return [vehicle.name, vehicle.brand, vehicle.model, vehicle.registrationNumber]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(needle));
    });
  }, [vehicles, filter, query]);

  function openCreate() {
    setEditing(null);
    setForm({ ...emptyForm, seats: "4" });
    setEditorOpen(true);
  }

  function openEdit(vehicle: FleetVehicle) {
    setEditing(vehicle);
    setForm({
      category: vehicle.category,
      name: vehicle.name,
      brand: vehicle.brand,
      model: vehicle.model,
      year: String(vehicle.year),
      registrationNumber: vehicle.registrationNumber,
      image: vehicle.image,
      description: vehicle.description || "",
      pricePerKm: String(vehicle.pricePerKm),
      baseFare: String(vehicle.baseFare),
      pricePerHour: String(vehicle.pricePerHour || 0),
      minimumFare: String(vehicle.minimumFare || 0),
      seats: String(vehicle.seats),
      transmission: vehicle.transmission || "",
      fuel: vehicle.fuel || "",
      available: vehicle.available,
    });
    setEditorOpen(true);
  }

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function uploadImage(file?: File) {
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadFile(file);
      update("image", url);
      toast.success("Vehicle photo uploaded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not upload the photo.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!form.image) {
      toast.error("Upload a vehicle photo first.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        category: form.category,
        name: form.name,
        brand: form.brand,
        model: form.model,
        year: Number(form.year),
        registrationNumber: form.registrationNumber.trim().toUpperCase(),
        image: form.image,
        description: form.description,
        seats: Number(form.seats),
        transmission: form.transmission || undefined,
        fuel: form.fuel || undefined,
        pricePerKm: Number(form.pricePerKm),
        baseFare: Number(form.baseFare),
        pricePerHour: Number(form.pricePerHour || 0),
        minimumFare: Number(form.minimumFare || 0),
        available: form.available,
      };
      if (editing) {
        await api(`/api/vehicles/${editing._id}`, { method: "PATCH", json: payload });
        toast.success("Vehicle updated");
      } else {
        await api("/api/vehicles", { method: "POST", json: payload });
        toast.success("Vehicle added to your fleet");
      }
      setEditorOpen(false);
      setEditing(null);
      await load(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save the vehicle.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleAvailability(vehicle: FleetVehicle) {
    setToggling(vehicle._id);
    try {
      await api(`/api/vehicles/${vehicle._id}`, {
        method: "PATCH",
        json: { available: !vehicle.available },
      });
      setVehicles((current) =>
        current.map((item) => (item._id === vehicle._id ? { ...item, available: !item.available } : item)),
      );
      toast.success(vehicle.available ? "Vehicle set offline" : "Vehicle is now available");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update availability.");
    } finally {
      setToggling("");
    }
  }

  async function remove() {
    if (!deleting) return;
    setDeleteLoading(true);
    try {
      await api(`/api/vehicles/${deleting._id}`, { method: "DELETE" });
      setVehicles((current) => current.filter((item) => item._id !== deleting._id));
      toast.success("Vehicle removed");
      setDeleting(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not remove the vehicle.");
    } finally {
      setDeleteLoading(false);
    }
  }

  const availableCount = vehicles.filter((vehicle) => vehicle.available).length;
  const liveCount = vehicles.filter((vehicle) => vehicle.available && vehicle.approved).length;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Fleet"
        title="Your vehicles."
        description="Add vehicles, set your rates and control when each one is available for bookings."
        actions={
          <>
            <button type="button" onClick={() => load()} disabled={refreshing} className="btn-outline">
              {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CarFront className="h-4 w-4" />} Refresh
            </button>
            <button type="button" onClick={openCreate} disabled={!isApproved} className="btn-dark">
              <Plus className="h-4 w-4" /> Add vehicle
            </button>
          </>
        }
      />

      {!isApproved && (
        <div className="flex flex-col justify-between gap-3 rounded-2xl border border-warning/20 bg-warning/5 px-4 py-3 sm:flex-row sm:items-center">
          <p className="text-xs text-warning">
            Your partner account must be approved before you can add or publish vehicles.
          </p>
          <Link href="/dashboard/partner/onboarding" className="text-[11px] font-semibold text-warning underline underline-offset-2">
            View onboarding
          </Link>
        </div>
      )}

      {error && <p className="rounded-2xl border border-danger/15 bg-danger/5 px-4 py-3 text-xs text-danger">{error}</p>}

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          { label: "Vehicles", value: vehicles.length },
          { label: "Available", value: availableCount },
          { label: "Live listings", value: liveCount },
          { label: "Completed trips", value: vehicles.reduce((sum, vehicle) => sum + vehicle.totalTrips, 0) },
        ].map((item) => (
          <div key={item.label} className="rounded-2xl border border-line bg-white p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-fg-subtle">{item.label}</p>
            <p className="font-display mt-2 text-xl font-extrabold sm:text-2xl">{loading ? "—" : item.value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="no-scrollbar flex gap-1 overflow-x-auto rounded-full border border-line bg-white p-1.5">
          {[
            { key: "all", label: "All vehicles" },
            { key: "available", label: "Available" },
            { key: "offline", label: "Offline" },
          ].map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setFilter(item.key as typeof filter)}
              className={cn(
                "inline-flex min-h-11 shrink-0 items-center rounded-full px-3.5 text-xs font-semibold transition",
                filter === item.key ? "bg-ink text-white" : "text-fg-muted hover:bg-surface-muted hover:text-ink",
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-fg-subtle" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="input !rounded-full !py-2.5 pl-9 pr-12 text-xs"
            placeholder="Search name, model or registration"
            aria-label="Search fleet"
          />
          {query && (
            <button type="button" onClick={() => setQuery("")} className="absolute right-1 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full text-fg-subtle transition hover:bg-surface-muted hover:text-ink" aria-label="Clear search">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {loading && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="skeleton h-80 rounded-3xl bg-white" />
          ))}
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((vehicle) => (
            <article key={vehicle._id} className="overflow-hidden rounded-3xl border border-line bg-white">
              <div className="relative aspect-[16/9] overflow-hidden bg-surface-muted">
                <Image src={vehicle.image} alt={vehicle.name} fill sizes="(max-width: 640px) 100vw, 33vw" className="object-cover" />
                <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
                  <span className={cn("rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider", vehicle.approved ? "bg-success text-white" : "bg-warning text-white")}>
                    {vehicle.approved ? "Approved" : "Under review"}
                  </span>
                  <span className={cn("rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider", vehicle.available ? "bg-surface/95 text-ink" : "bg-ink/85 text-white")}>
                    {vehicle.available ? "Available" : "Offline"}
                  </span>
                </div>
                <div className="absolute right-3 top-3 rounded-full bg-ink/75 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-white backdrop-blur">
                  {CATEGORY_MAP[vehicle.category]?.label || vehicle.category}
                </div>
              </div>

              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h2 className="truncate text-sm font-bold">{vehicle.name}</h2>
                    <p className="mt-0.5 text-[10px] text-fg-muted">{vehicle.brand} {vehicle.model} · {vehicle.year}</p>
                  </div>
                  <span className="shrink-0 rounded-md border border-line bg-surface-muted px-2 py-1 font-mono text-[10px] font-semibold">{vehicle.registrationNumber}</span>
                </div>

                <div className="mt-3 grid grid-cols-3 gap-2 border-y border-line py-3 text-center">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-fg-subtle">Base</p>
                    <p className="text-[11px] font-bold">{inr(vehicle.baseFare)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-fg-subtle">Per km</p>
                    <p className="text-[11px] font-bold">{inr(vehicle.pricePerKm)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-fg-subtle">Per hour</p>
                    <p className="text-[11px] font-bold">{inr(vehicle.pricePerHour || 0)}</p>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between text-[10px] text-fg-muted">
                  <span className="inline-flex items-center gap-1"><Star className="h-3 w-3 fill-ink text-ink" /> {vehicle.rating ? vehicle.rating.toFixed(1) : "New"} · {vehicle.totalTrips} trips</span>
                  <button
                    type="button"
                    onClick={() => toggleAvailability(vehicle)}
                    disabled={Boolean(toggling) || !isApproved}
                    className={cn(
                      "relative h-5 w-9 rounded-full transition disabled:opacity-50",
                      vehicle.available ? "bg-success" : "bg-surface-muted/15",
                    )}
                    aria-label={vehicle.available ? "Set vehicle offline" : "Set vehicle available"}
                  >
                    {toggling === vehicle._id ? (
                      <Loader2 className="absolute left-2 top-1 h-3 w-3 animate-spin text-white" />
                    ) : (
                      <span className={cn("absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition", vehicle.available ? "left-[18px]" : "left-0.5")} />
                    )}
                  </button>
                </div>

                <div className="mt-4 flex gap-2">
                  <button type="button" onClick={() => openEdit(vehicle)} className="btn-outline flex-1 !px-3 !py-2 text-[11px]">
                    <Pencil className="h-3.5 w-3.5" /> Edit
                  </button>
                  {vehicle.approved && vehicle.available ? (
                    <Link href={`/book/${vehicle._id}`} className="btn-dark flex-1 !px-3 !py-2 text-[11px]">
                      View <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  ) : (
                    <button type="button" onClick={() => setDeleting(vehicle)} className="btn-outline flex-1 !px-3 !py-2 text-[11px] text-danger">
                      <Trash2 className="h-3.5 w-3.5" /> Remove
                    </button>
                  )}
                </div>
                {vehicle.approved && vehicle.available && (
                  <button type="button" onClick={() => setDeleting(vehicle)} className="mt-2 w-full text-[10px] font-semibold text-fg-subtle hover:text-danger">
                    Remove from fleet
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <EmptyState
          icon={CarFront}
          title={query ? "No matching vehicles" : "Your fleet is empty"}
          description={
            query
              ? "Try a different name, model or registration number."
              : isApproved
                ? "Add your first vehicle with photos, documents and rates to start receiving bookings."
                : "Once approved, you can add vehicles to your fleet."
          }
          action={
            query ? (
              <button type="button" onClick={() => setQuery("")} className="btn-outline">Clear search</button>
            ) : isApproved ? (
              <button type="button" onClick={openCreate} className="btn-dark"><Plus className="h-4 w-4" /> Add vehicle</button>
            ) : (
              <Link href="/dashboard/partner/onboarding" className="btn-dark">View onboarding</Link>
            )
          }
        />
      )}

      <div className="rounded-3xl border border-line bg-white p-5">
        <div className="flex items-start gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-lime"><ShieldCheck className="h-4 w-4" /></span>
          <div>
            <p className="text-sm font-bold">Keep every listing accurate.</p>
            <p className="mt-1 text-[11px] leading-relaxed text-fg-muted">
              Registration numbers, pricing and availability feed directly into rider search and fare estimates. Set a vehicle offline whenever it is unavailable.
            </p>
          </div>
        </div>
      </div>

      <Modal
        open={editorOpen}
        onClose={() => {
          if (!saving) {
            setEditorOpen(false);
            setEditing(null);
          }
        }}
        labelledBy="vehicle-editor-title"
        className="max-w-3xl"
      >
        <p className="eyebrow">{editing ? "Edit listing" : "New listing"}</p>
        <div id="vehicle-editor-title" className="font-display mt-1 text-2xl font-extrabold tracking-tight">
          {editing ? editing.name : "Add a vehicle"}
        </div>
        <p className="mt-1 text-xs text-fg-muted">
          All fields are shown to riders. Upload a clear photo and set your rates carefully.
        </p>

        <form onSubmit={save} className="mt-5 max-h-[65vh] space-y-4 overflow-y-auto pr-1">
          <div className="rounded-2xl bg-surface-muted/60 p-3.5">
            <label className="label">Vehicle photo</label>
            <div className="flex items-center gap-3">
              <div className="relative h-20 w-28 shrink-0 overflow-hidden rounded-xl bg-white">
                {form.image ? (
                  <Image src={form.image} alt="Vehicle preview" fill sizes="112px" className="object-cover" />
                ) : (
                  <div className="grid h-full place-items-center"><Camera className="h-5 w-5 text-fg-subtle" /></div>
                )}
              </div>
              <div>
                <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} className="btn-outline !px-3 !py-2 text-[11px]">
                  {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
                  {form.image ? "Replace photo" : "Upload photo"}
                </button>
                <p className="mt-1.5 text-[10px] text-fg-subtle">JPG, PNG or WebP · up to 10 MB</p>
                <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(event) => uploadImage(event.target.files?.[0])} />
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="vf-category">Category</label>
              <select
                id="vf-category"
                value={form.category}
                onChange={(event) => {
                  const category = event.target.value as VehicleCategory;
                  update("category", category);
                  update("seats", String(CATEGORY_MAP[category]?.seats || 2));
                }}
                className="input"
              >
                {VEHICLE_CATEGORIES.map((category) => (
                  <option key={category.value} value={category.value}>{category.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="vf-name">Listing name</label>
              <input id="vf-name" required minLength={2} maxLength={80} value={form.name} onChange={(event) => update("name", event.target.value)} className="input" placeholder="e.g. Toyota Fortuner" />
            </div>
            <div>
              <label className="label" htmlFor="vf-brand">Brand</label>
              <input id="vf-brand" required maxLength={40} value={form.brand} onChange={(event) => update("brand", event.target.value)} className="input" placeholder="Toyota" />
            </div>
            <div>
              <label className="label" htmlFor="vf-model">Model</label>
              <input id="vf-model" required maxLength={40} value={form.model} onChange={(event) => update("model", event.target.value)} className="input" placeholder="Fortuner 4x4" />
            </div>
            <div>
              <label className="label" htmlFor="vf-year">Year</label>
              <input id="vf-year" type="number" required min={2000} max={currentYear + 1} value={form.year} onChange={(event) => update("year", event.target.value)} className="input" />
            </div>
            <div>
              <label className="label" htmlFor="vf-reg">Registration number</label>
              <input id="vf-reg" required minLength={6} maxLength={16} value={form.registrationNumber} onChange={(event) => update("registrationNumber", event.target.value.toUpperCase())} className="input font-mono uppercase" placeholder="KA01AB1234" />
            </div>
            <div>
              <label className="label" htmlFor="vf-seats">Seats</label>
              <input id="vf-seats" type="number" required min={1} max={20} value={form.seats} onChange={(event) => update("seats", event.target.value)} className="input" />
            </div>
            <div>
              <label className="label" htmlFor="vf-transmission">Transmission</label>
              <select id="vf-transmission" value={form.transmission} onChange={(event) => update("transmission", event.target.value)} className="input">
                <option value="">Not specified</option>
                <option value="manual">Manual</option>
                <option value="automatic">Automatic</option>
              </select>
            </div>
            <div>
              <label className="label" htmlFor="vf-fuel">Fuel</label>
              <select id="vf-fuel" value={form.fuel} onChange={(event) => update("fuel", event.target.value)} className="input">
                <option value="">Not specified</option>
                <option value="petrol">Petrol</option>
                <option value="diesel">Diesel</option>
                <option value="electric">Electric</option>
                <option value="cng">CNG</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="label" htmlFor="vf-description">Description</label>
              <textarea id="vf-description" rows={3} maxLength={400} value={form.description} onChange={(event) => update("description", event.target.value)} className="input resize-none" placeholder="Highlight what makes this vehicle comfortable or useful for riders." />
            </div>
          </div>

          <div className="rounded-2xl border border-line p-3.5">
            <p className="text-xs font-bold">Pricing</p>
            <p className="mt-0.5 text-[10px] text-fg-subtle">Fares shown to riders combine these rates with trip distance and duration.</p>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div>
                <label className="label !text-[10px]" htmlFor="vf-base">Base fare (₹)</label>
                <input id="vf-base" type="number" required min={0} max={5000} step="1" value={form.baseFare} onChange={(event) => update("baseFare", event.target.value)} className="input !py-2.5" />
              </div>
              <div>
                <label className="label !text-[10px]" htmlFor="vf-km">Per km (₹)</label>
                <input id="vf-km" type="number" required min={1} max={500} step="1" value={form.pricePerKm} onChange={(event) => update("pricePerKm", event.target.value)} className="input !py-2.5" />
              </div>
              <div>
                <label className="label !text-[10px]" htmlFor="vf-hour">Per hour (₹)</label>
                <input id="vf-hour" type="number" min={0} max={5000} step="1" value={form.pricePerHour} onChange={(event) => update("pricePerHour", event.target.value)} className="input !py-2.5" />
              </div>
              <div>
                <label className="label !text-[10px]" htmlFor="vf-min">Minimum fare (₹)</label>
                <input id="vf-min" type="number" min={0} max={10000} step="1" value={form.minimumFare} onChange={(event) => update("minimumFare", event.target.value)} className="input !py-2.5" />
              </div>
            </div>
          </div>

          <label className="flex cursor-pointer items-center justify-between gap-3 rounded-2xl border border-line px-3.5 py-3">
            <span>
              <span className="block text-xs font-semibold">Available for bookings</span>
              <span className="block text-[10px] text-fg-subtle">Turn off while the vehicle is in service or off the road.</span>
            </span>
            <input type="checkbox" checked={form.available} onChange={(event) => update("available", event.target.checked)} className="h-4 w-4 accent-ink" />
          </label>

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={() => setEditorOpen(false)} disabled={saving} className="btn-outline flex-1">Cancel</button>
            <button type="submit" disabled={saving || uploading} className="btn-dark flex-1">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : editing ? <BadgeCheck className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {editing ? "Save changes" : "Add vehicle"}
            </button>
          </div>
        </form>
      </Modal>

      <Modal open={Boolean(deleting)} onClose={() => setDeleting(null)} labelledBy="delete-vehicle-title" className="max-w-sm">
        <div className="flex items-center gap-2 text-danger"><AlertTriangle className="h-4 w-4" /><span className="text-[10px] font-semibold uppercase tracking-wider">Remove vehicle</span></div>
        <div id="delete-vehicle-title" className="font-display mt-3 text-2xl font-extrabold tracking-tight">Remove {deleting?.name}?</div>
        <p className="mt-2 text-sm leading-relaxed text-fg-muted">
          The listing will be deleted from your fleet. This cannot be undone. Vehicles with active bookings cannot be removed.
        </p>
        <div className="mt-6 flex gap-2">
          <button type="button" onClick={() => setDeleting(null)} className="btn-outline flex-1">Keep vehicle</button>
          <button type="button" onClick={remove} disabled={deleteLoading} className="btn flex-1 bg-danger text-white hover:bg-danger/90">
            {deleteLoading && <Loader2 className="h-4 w-4 animate-spin" />} Remove
          </button>
        </div>
      </Modal>
    </div>
  );
}
