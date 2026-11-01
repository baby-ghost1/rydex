"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { ArrowLeft, Loader2, MailCheck, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import OtpInput from "@/components/otp-input";
import { api } from "@/lib/client-api";

export default function VerifyEmailForm({ initialEmail = "" }: { initialEmail?: string }) {
  const router = useRouter();
  const [email, setEmail] = useState(initialEmail);
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [devOtp, setDevOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const [error, setError] = useState("");
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    if (!resendIn) return;
    const timer = setTimeout(() => setResendIn((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendIn]);

  async function verify() {
    setError("");
    if (!email || otp.length !== 6) {
      setError("Enter your email and the 6-digit code.");
      return;
    }
    setLoading(true);
    try {
      await api("/api/auth/verify-email", {
        method: "POST",
        json: { email, otp },
      });
      setVerified(true);
      toast.success("Email verified");
      if (password) {
        const result = await signIn("credentials", {
          email: email.trim().toLowerCase(),
          password,
          redirect: false,
        });
        if (!result?.error) {
          router.push("/dashboard");
          router.refresh();
          return;
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not verify the code.");
    } finally {
      setLoading(false);
    }
  }

  async function resend() {
    if (!email || resendIn > 0) return;
    setError("");
    setResending(true);
    try {
      const data = await api<{ devOtp?: string }>("/api/auth/resend-otp", {
        method: "POST",
        json: { email },
      });
      setDevOtp(data.devOtp || "");
      setResendIn(30);
      toast.success("A new code has been sent");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not resend the code.");
    } finally {
      setResending(false);
    }
  }

  if (verified) {
    return (
      <div className="text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-success/10">
          <MailCheck className="h-6 w-6 text-success" />
        </div>
        <h1 className="font-display mt-5 text-2xl font-extrabold tracking-tight">Email verified</h1>
        <p className="mt-2 text-sm leading-relaxed text-fg-muted">
          Your RYDEX account is active. Sign in to start booking.
        </p>
        <Link href="/login" className="btn-dark mt-6 w-full">Continue to sign in</Link>
      </div>
    );
  }

  return (
    <div>
      <Link href="/login" className="mb-6 inline-flex items-center gap-1.5 text-[11px] font-semibold text-fg-muted hover:text-ink">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to sign in
      </Link>
      <div className="grid h-14 w-14 place-items-center rounded-2xl bg-lime">
        <ShieldCheck className="h-6 w-6" />
      </div>
      <h1 className="font-display mt-5 text-3xl font-extrabold tracking-tight">Verify your email</h1>
      <p className="mt-2 text-sm leading-relaxed text-fg-muted">
        Enter the email you registered with and the 6-digit code we sent you.
      </p>

      <div className="mt-6 space-y-4">
        <div>
          <label className="label" htmlFor="verify-email">Email address</label>
          <input
            id="verify-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="input"
            placeholder="you@example.com"
            autoComplete="email"
          />
        </div>
        <div>
          <label className="label">Verification code</label>
          <OtpInput label="Verification code" value={otp} onChange={setOtp} disabled={loading} />
        </div>
        <div>
          <label className="label" htmlFor="verify-password">
            Password <span className="normal-case tracking-normal text-fg-subtle">(optional — sign in automatically)</span>
          </label>
          <input
            id="verify-password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="input"
            placeholder="Your password"
            autoComplete="current-password"
          />
        </div>

        {devOtp && (
          <p className="rounded-xl border border-warning/20 bg-warning/5 px-3 py-2 text-center text-[11px] text-warning">
            Local development code: <strong>{devOtp}</strong>
          </p>
        )}
        {error && <p className="rounded-xl border border-danger/15 bg-danger/5 px-3 py-2 text-xs text-danger">{error}</p>}

        <button type="button" onClick={verify} disabled={loading || otp.length !== 6} className="btn-dark w-full py-3.5">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
          Verify email
        </button>

        <p className="text-center text-xs text-fg-muted">
          Didn&apos;t receive the code?{" "}
          <button
            type="button"
            onClick={resend}
            disabled={resending || resendIn > 0 || !email}
            className="font-semibold text-ink underline underline-offset-2 disabled:cursor-not-allowed disabled:text-fg-subtle"
          >
            {resendIn > 0 ? `Resend in ${resendIn}s` : resending ? "Sending…" : "Resend code"}
          </button>
        </p>
      </div>
    </div>
  );
}
