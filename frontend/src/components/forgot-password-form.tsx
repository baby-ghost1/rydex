"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Eye, EyeOff, KeyRound, Loader2, MailCheck } from "lucide-react";
import { toast } from "sonner";
import OtpInput from "@/components/otp-input";
import { api } from "@/lib/client-api";

export default function ForgotPasswordForm() {
  const router = useRouter();
  const [stage, setStage] = useState<"request" | "reset">("request");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [devOtp, setDevOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function requestCode(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await api<{ devOtp?: string }>("/api/auth/forgot-password", {
        method: "POST",
        json: { email },
      });
      setDevOtp(data.devOtp || "");
      setStage("reset");
      toast.success("If that account exists, a reset code is on its way.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send the reset code.");
    } finally {
      setLoading(false);
    }
  }

  async function resetPassword(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    if (otp.length !== 6) {
      setError("Enter the 6-digit reset code.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      await api("/api/auth/reset-password", {
        method: "POST",
        json: { email, otp, password },
      });
      toast.success("Password updated — sign in with your new password");
      router.push("/login");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reset your password.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <Link href="/login" className="mb-6 inline-flex items-center gap-1.5 text-[11px] font-semibold text-fg-muted hover:text-ink">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to sign in
      </Link>

      <div className="grid h-14 w-14 place-items-center rounded-2xl bg-surface-muted">
        {stage === "request" ? <KeyRound className="h-6 w-6" /> : <MailCheck className="h-6 w-6" />}
      </div>
      <h1 className="font-display mt-5 text-3xl font-extrabold tracking-tight">
        {stage === "request" ? "Forgot password?" : "Choose a new password"}
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-fg-muted">
        {stage === "request"
          ? "Enter the email linked to your account and we'll send a one-time reset code."
          : `Enter the code sent to ${email} and set a new password.`}
      </p>

      {stage === "request" ? (
        <form onSubmit={requestCode} className="mt-6 space-y-4">
          <div>
            <label className="label" htmlFor="forgot-email">Email address</label>
            <input
              id="forgot-email"
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="input"
              placeholder="you@example.com"
              autoComplete="email"
            />
          </div>
      {error && (
        <p
          role="alert"
          className="rounded-xl border border-danger/20 bg-danger/5 px-3 py-2 text-xs text-danger"
        >
          {error}
        </p>
      )}
          <button type="submit" disabled={loading} aria-busy={loading} className="btn-dark w-full py-3.5">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <ArrowRight className="h-4 w-4" aria-hidden="true" />}
            Send reset code
          </button>
        </form>
      ) : (
        <form onSubmit={resetPassword} className="mt-6 space-y-4">
          <div>
            <label className="label">Reset code</label>
            <OtpInput value={otp} onChange={setOtp} disabled={loading} />
          </div>
          <div>
            <label className="label" htmlFor="new-password">New password</label>
            <div className="relative">
              <input
                id="new-password"
                type={show ? "text" : "password"}
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="input pr-12"
                placeholder="8+ characters, letter & number"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShow((value) => !value)}
                aria-label={show ? "Hide password" : "Show password"}
                className="icon-button absolute right-0 top-1/2 -translate-y-1/2 text-fg-subtle hover:text-ink"
              >
                {show ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
              </button>
            </div>
          </div>
          <div>
            <label className="label" htmlFor="confirm-password">Confirm new password</label>
            <input
              id="confirm-password"
              type={show ? "text" : "password"}
              required
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
              className="input"
              placeholder="Repeat password"
              autoComplete="new-password"
            />
          </div>

          {devOtp && (
            <p className="rounded-xl border border-warning/20 bg-warning/5 px-3 py-2 text-center text-xs text-warning">
              Local development code: <strong>{devOtp}</strong>
            </p>
          )}
          {error && (
            <p
              role="alert"
              className="rounded-xl border border-danger/20 bg-danger/5 px-3 py-2 text-xs text-danger"
            >
              {error}
            </p>
          )}

          <button type="submit" disabled={loading} aria-busy={loading} className="btn-dark w-full py-3.5">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <KeyRound className="h-4 w-4" aria-hidden="true" />}
            Reset password
          </button>
          <button
            type="button"
            onClick={() => {
              setStage("request");
              setError("");
            }}
            className="inline-flex min-h-11 w-full items-center justify-center text-center text-xs font-semibold text-fg-muted hover:text-ink"
          >
            Use a different email
          </button>
        </form>
      )}
    </div>
  );
}
