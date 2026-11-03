"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Camera, CheckCircle2, Loader2, Mail, Phone, Save, ShieldCheck, UserRound } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/dashboard/ui";
import { api, uploadFile } from "@/lib/client-api";
import { initials } from "@rydex/shared/utils";

interface Profile {
  id: string;
  name: string;
  email: string;
  phone: string;
  image: string;
  role: string;
  partnerStatus: string;
  createdAt: string;
}

export default function ProfileClient() {
  const { update } = useSession();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [image, setImage] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api<{ user: Profile }>("/api/user/profile")
      .then((data) => {
        setProfile(data.user);
        setName(data.user.name || "");
        setPhone(data.user.phone || "");
        setImage(data.user.image || "");
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load your profile."))
      .finally(() => setLoading(false));
  }, []);

  async function pickAvatar(file?: File) {
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadFile(file);
      setImage(url);
      toast.success("Photo uploaded - save to apply");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not upload the photo.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setSaving(true);
    try {
      await api("/api/user/profile", {
        method: "PATCH",
        json: { name, phone, image },
      });
      await update();
      toast.success("Profile updated");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save your profile.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-5">
        <div className="skeleton h-20 rounded-2xl" />
        <div className="skeleton h-80 rounded-3xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Account"
        title="Profile & settings"
        description="Keep your contact details current so partners and support can reach you."
        actions={<Link href="/bookings" className="btn-outline">My bookings</Link>}
      />

      {error && <p className="rounded-2xl border border-danger/15 bg-danger/5 px-4 py-3 text-xs text-danger">{error}</p>}

      <div className="grid gap-5 lg:grid-cols-[1fr_0.6fr]">
        <form onSubmit={save} className="rounded-3xl border border-line bg-white p-5 sm:p-7">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <div className="relative">
              <span className="grid h-20 w-20 place-items-center overflow-hidden rounded-full bg-ink text-lg font-bold text-white">
                {image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={image} alt="Profile" className="h-full w-full object-cover" />
                ) : (
                  initials(profile?.name)
                )}
              </span>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="absolute -bottom-2 -right-2 grid h-11 w-11 place-items-center rounded-full border-2 border-white bg-lime text-ink shadow-sm transition hover:brightness-95 disabled:cursor-wait disabled:opacity-60"
                aria-label="Change profile photo"
              >
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Camera className="h-4 w-4" aria-hidden="true" />}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(event) => pickAvatar(event.target.files?.[0])}
              />
            </div>
            <div className="min-w-0">
              <p className="font-display text-xl font-extrabold tracking-tight">{profile?.name}</p>
              <p className="mt-0.5 text-xs text-fg-muted">{profile?.email}</p>
              <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-success/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-success">
                <CheckCircle2 className="h-3 w-3" /> Email verified
              </span>
            </div>
          </div>

          <div className="mt-7 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="profile-name">Full name</label>
              <div className="relative">
                <UserRound className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-subtle" />
                <input
                  id="profile-name"
                  className="input pl-10"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  minLength={2}
                  maxLength={60}
                  required
                />
              </div>
            </div>
            <div>
              <label className="label" htmlFor="profile-phone">Mobile number</label>
              <div className="relative">
                <Phone className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-subtle" />
                <input
                  id="profile-phone"
                  className="input pl-10"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value.replace(/\D/g, "").slice(0, 10))}
                  placeholder="98765 43210"
                  inputMode="tel"
                />
              </div>
            </div>
            <div className="sm:col-span-2">
              <label className="label" htmlFor="profile-email">Email address</label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-subtle" />
                <input id="profile-email" className="input bg-surface-muted/50 pl-10 text-fg-muted" value={profile?.email || ""} disabled />
              </div>
              <p className="mt-1.5 text-[10px] text-fg-subtle">Email changes require support verification for account security.</p>
            </div>
          </div>

          <button type="submit" disabled={saving} className="btn-dark mt-6">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save changes
          </button>
        </form>

        <div className="space-y-4">
          <section className="rounded-3xl border border-line bg-white p-5">
            <div className="flex items-center gap-2 text-sm font-bold"><ShieldCheck className="h-4 w-4" /> Account security</div>
            <div className="mt-4 space-y-3 text-[11px] text-fg-muted">
              <div className="flex items-center justify-between border-b border-line pb-3">
                <span>Password</span>
                <Link href="/forgot-password" className="font-semibold text-ink underline underline-offset-2">Change</Link>
              </div>
              <div className="flex items-center justify-between border-b border-line pb-3">
                <span>Email status</span>
                <span className="font-semibold text-success">Verified</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Account type</span>
                <span className="font-semibold capitalize text-ink">{profile?.role}</span>
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-line bg-white p-5">
            <div className="text-sm font-bold">Member since</div>
            <p className="mt-2 text-xs text-fg-muted">
              {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" }) : "-"}
            </p>
            <p className="mt-4 text-[11px] leading-relaxed text-fg-muted">
              Your data is handled according to our privacy policy. You can request a copy or deletion at any time.
            </p>
            <Link href="/privacy" className="mt-3 inline-block text-[11px] font-semibold underline underline-offset-2">Read privacy policy</Link>
          </section>

          {profile?.role === "user" && (
            <section className="rounded-3xl bg-ink p-5 text-white">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-lime">Partner mode</p>
              <p className="font-display mt-1.5 text-lg font-extrabold">Earn with your vehicle</p>
              <p className="mt-1 text-[11px] leading-relaxed text-fg-inverse-subtle">
                Complete a short onboarding and start accepting rides.
              </p>
              <Link href="/dashboard/partner" className="btn-light mt-4 w-full">Get started</Link>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
