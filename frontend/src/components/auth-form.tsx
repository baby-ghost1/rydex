"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  Loader2,
  Mail,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { registerSchema } from "@rydex/shared/validation";
import { api } from "@/lib/client-api";
import OtpInput from "@/components/otp-input";
import { cn } from "@rydex/shared/utils";

type Mode = "login" | "register" | "verify";

export default function AuthForm({
  initialMode = "login",
  onSuccess,
  compact = false,
  onModeChange,
}: {
  initialMode?: Mode;
  onSuccess?: () => void;
  compact?: boolean;
  onModeChange?: (mode: Mode) => void;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleEnabled, setGoogleEnabled] = useState(false);
  const [error, setError] = useState("");
  const [devOtp, setDevOtp] = useState("");
  const [resendIn, setResendIn] = useState(0);

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [terms, setTerms] = useState(true);
  const [otp, setOtp] = useState("");
  const [pendingPassword, setPendingPassword] = useState("");
  const errorRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMode(initialMode), [initialMode]);
  useEffect(() => onModeChange?.(mode), [mode, onModeChange]);
  useEffect(() => {
    if (error) errorRef.current?.focus();
  }, [error]);
  useEffect(() => {
    fetch("/api/config")
      .then((res) => res.json())
      .then((data) => setGoogleEnabled(Boolean(data.googleEnabled)))
      .catch(() => setGoogleEnabled(false));
  }, []);

  useEffect(() => {
    if (!resendIn) return;
    const timer = setTimeout(() => setResendIn((v) => v - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendIn]);

  function switchMode(next: Mode) {
    setMode(next);
    setError("");
    setDevOtp("");
  }

  async function handleLogin(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    if (!loginEmail || !loginPassword) {
      setError("Enter your email and password.");
      return;
    }
    setLoading(true);
    try {
      const result = await signIn("credentials", {
        email: loginEmail.trim().toLowerCase(),
        password: loginPassword,
        redirect: false,
      });
      if (result?.error) {
        setError(
          "Invalid email or password. If you just registered, verify your email first.",
        );
        return;
      }
      toast.success("Welcome back to RYDEX");
      onSuccess?.();
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Could not sign you in. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    const parsed = registerSchema.safeParse({ name, email, phone, password });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message || "Check your details.");
      return;
    }
    if (!terms) {
      setError("Please accept the terms and privacy policy.");
      return;
    }
    setLoading(true);
    try {
      const data = await api<{ email: string; devOtp?: string }>("/api/auth/register", {
        method: "POST",
        json: parsed.data,
      });
      setEmail(data.email);
      setPendingPassword(password);
      setDevOtp(data.devOtp || "");
      setMode("verify");
      setResendIn(30);
      toast.success("Verification code sent");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed.");
    } finally {
      setLoading(false);
    }
  }

  async function verify(code: string) {
    if (code.length !== 6) return;
    setError("");
    setLoading(true);
    try {
      await api("/api/auth/verify-email", {
        method: "POST",
        json: { email, otp: code },
      });
      const result = await signIn("credentials", {
        email,
        password: pendingPassword,
        redirect: false,
      });
      if (result?.error) {
        toast.success("Email verified. Sign in to continue.");
        setLoginEmail(email);
        switchMode("login");
        return;
      }
      toast.success("Email verified — welcome to RYDEX");
      onSuccess?.();
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not verify the code.");
    } finally {
      setLoading(false);
    }
  }

  async function resend() {
    if (!email || resendIn > 0) return;
    setError("");
    setLoading(true);
    try {
      const data = await api<{ devOtp?: string }>("/api/auth/resend-otp", {
        method: "POST",
        json: { email },
      });
      setDevOtp(data.devOtp || "");
      setResendIn(30);
      toast.success("A new code is on its way");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not resend the code.");
    } finally {
      setLoading(false);
    }
  }

  async function google() {
    setLoading(true);
    try {
      await signIn("google", { callbackUrl: "/dashboard" });
    } catch {
      setError("Google sign-in is not configured.");
      setLoading(false);
    }
  }

  return (
    <div>
      {mode !== "verify" && (
        <>
          <div className="mb-6 text-center">
            <h2
              id="auth-title"
              className={cn(
                "font-display font-extrabold tracking-tight text-fg",
                compact ? "text-2xl" : "text-3xl",
              )}
            >
              {mode === "login" ? "Welcome back" : "Create account"}
            </h2>
            <p className="mt-1.5 text-sm text-fg-muted">
              {mode === "login"
                ? "Sign in to book your next ride."
                : "Your next ride is one tap away."}
            </p>
          </div>

          {googleEnabled && (
            <>
              <button
                type="button"
                onClick={google}
                disabled={loading}
                className="flex min-h-11 w-full items-center justify-center gap-3 rounded-xl border border-line-strong bg-surface px-4 py-3 text-sm font-semibold text-fg transition hover:border-fg-subtle hover:bg-surface-muted disabled:opacity-60"
              >
                <svg className="h-4 w-4" viewBox="0 0 48 48" aria-hidden="true">
                  <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.3 6.1 29.4 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.6-.4-3.9z"/>
                  <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.3 6.1 29.4 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
                  <path fill="#4CAF50" d="M24 44c5.2 0 10-2 13.6-5.2l-6.3-5.3C29.2 35.1 26.7 36 24 36c-5.3 0-9.7-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/>
                  <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.3-2.3 4.2-4 5.5l6.3 5.3C41.4 35.6 44 30.3 44 24c0-1.3-.1-2.6-.4-3.9z"/>
                </svg>
                Continue with Google
              </button>
              <div className="my-5 flex items-center gap-3">
                <span className="h-px flex-1 bg-line" />
                <span className="text-[10px] font-semibold uppercase tracking-widest text-fg-subtle">
                  or
                </span>
                <span className="h-px flex-1 bg-line" />
              </div>
            </>
          )}

          <AnimatePresence mode="wait">
            <motion.form
              key={mode}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
              onSubmit={mode === "login" ? handleLogin : handleRegister}
              className="space-y-3.5"
            >
              {mode === "register" && (
                <div>
                  <label className="label" htmlFor="auth-name">Full name</label>
                  <input
                    id="auth-name"
                    className="input"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Aarav Sharma"
                    autoComplete="name"
                    aria-describedby={error ? "auth-error" : undefined}
                    required
                  />
                </div>
              )}

              <div>
                <label className="label" htmlFor="auth-email">Email address</label>
                <input
                  id="auth-email"
                  type="email"
                  className="input"
                  value={mode === "login" ? loginEmail : email}
                  onChange={(e) => (mode === "login" ? setLoginEmail(e.target.value) : setEmail(e.target.value))}
                  placeholder="you@example.com"
                  autoComplete="email"
                  aria-describedby={error ? "auth-error" : undefined}
                  required
                />
              </div>

              {mode === "register" && (
                <div>
                  <label className="label" htmlFor="auth-phone">Mobile number</label>
                  <div className="flex">
                    <span className="grid place-items-center rounded-l-xl border border-r-0 border-line-strong bg-surface-muted px-3 text-sm text-fg-muted">+91</span>
                    <input
                      id="auth-phone"
                      className="input rounded-l-none"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                      placeholder="98765 43210"
                      inputMode="tel"
                      autoComplete="tel-national"
                      aria-describedby={error ? "auth-error" : undefined}
                      required
                    />
                  </div>
                </div>
              )}

              <div>
                <div className="flex items-center justify-between">
                  <label className="label" htmlFor="auth-password">Password</label>
                  {mode === "login" && (
                    <Link href="/forgot-password" className="mb-1.5 inline-flex min-h-11 items-center text-xs font-semibold text-fg-muted hover:text-fg">
                      Forgot password?
                    </Link>
                  )}
                </div>
                <div className="relative">
                  <input
                    id="auth-password"
                    type={showPassword ? "text" : "password"}
                    className="input pr-12"
                    value={mode === "login" ? loginPassword : password}
                    onChange={(e) => (mode === "login" ? setLoginPassword(e.target.value) : setPassword(e.target.value))}
                    placeholder={mode === "login" ? "Your password" : "8+ characters, letter & number"}
                    autoComplete={mode === "login" ? "current-password" : "new-password"}
                    aria-describedby={error ? "auth-error" : undefined}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="icon-button absolute right-0 top-1/2 -translate-y-1/2 text-fg-muted hover:text-fg"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
                  </button>
                </div>
              </div>

              {mode === "register" && (
                <label className="flex min-h-11 cursor-pointer items-start gap-2.5 pt-1 text-xs leading-relaxed text-fg-muted">
                  <input
                    type="checkbox"
                    checked={terms}
                    onChange={(e) => setTerms(e.target.checked)}
                    className="mt-0.5 h-5 w-5 shrink-0 accent-black"
                  />
                  <span>
                    I agree to RYDEX&apos;s{" "}
                    <Link href="/terms" className="font-semibold text-fg underline underline-offset-2">Terms</Link>{" "}
                    and{" "}
                    <Link href="/privacy" className="font-semibold text-fg underline underline-offset-2">Privacy Policy</Link>.
                  </span>
                </label>
              )}

              {error && (
                <div
                  id="auth-error"
                  ref={errorRef}
                  tabIndex={-1}
                  role="alert"
                  aria-live="assertive"
                  className="rounded-xl border border-danger/20 bg-danger/5 px-3.5 py-2.5 text-xs leading-relaxed text-danger outline-none"
                >
                  {error}
                  {error.includes("verify") && (
                    <button
                      type="button"
                      className="ml-1 font-semibold underline"
                      onClick={() => {
                        setEmail(loginEmail);
                        setMode("verify");
                        resend();
                      }}
                    >
                      Resend code
                    </button>
                  )}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                aria-busy={loading}
                className="btn-dark mt-2 w-full py-3.5"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                {mode === "login" ? "Sign in" : "Create account"}
                {!loading && <ArrowRight className="h-4 w-4" aria-hidden="true" />}
              </button>
            </motion.form>
          </AnimatePresence>

          <p className="mt-5 text-center text-xs text-fg-muted">
            {mode === "login" ? "New to RYDEX?" : "Already have an account?"}{" "}
            <button
              type="button"
              onClick={() => switchMode(mode === "login" ? "register" : "login")}
              className="inline-flex min-h-11 items-center font-semibold text-fg underline underline-offset-2"
            >
              {mode === "login" ? "Create an account" : "Sign in"}
            </button>
          </p>
        </>
      )}

      {mode === "verify" && (
        <div>
          <button
            type="button"
            onClick={() => switchMode("register")}
            className="mb-6 inline-flex min-h-11 items-center gap-1.5 text-xs font-semibold text-fg-muted hover:text-fg"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" /> Back
          </button>
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-lime">
            <Mail className="h-6 w-6 text-ink" aria-hidden="true" />
          </div>
          <h2 id="auth-title" className="font-display mt-5 text-2xl font-extrabold tracking-tight">Verify your email</h2>
          <p className="mt-2 text-sm leading-relaxed text-fg-muted">
            We sent a 6-digit code to <span className="font-semibold text-fg">{email}</span>.
            Enter it below to activate your account.
          </p>

          <div className="mt-6">
            <OtpInput
              value={otp}
              onChange={(value) => {
                setOtp(value);
                if (value.length === 6) verify(value);
              }}
              disabled={loading}
            />
          </div>

          {devOtp && (
            <p className="mt-3 rounded-xl border border-warning/20 bg-warning/5 px-3 py-2 text-center text-xs text-warning">
              Local development code: <strong>{devOtp}</strong> (shown because email is not configured)
            </p>
          )}

          {error && (
            <p
              id="auth-error"
              ref={errorRef}
              tabIndex={-1}
              role="alert"
              aria-live="assertive"
              className="mt-3 rounded-xl border border-danger/20 bg-danger/5 px-3 py-2 text-xs text-danger outline-none"
            >
              {error}
            </p>
          )}

          <button
            type="button"
            onClick={() => verify(otp)}
            disabled={loading || otp.length !== 6}
            aria-busy={loading}
            className="btn-dark mt-5 w-full py-3.5"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <ShieldCheck className="h-4 w-4" aria-hidden="true" />}
            Verify & continue
          </button>

          <p className="mt-4 text-center text-xs text-fg-muted">
            Didn&apos;t receive it?{" "}
            <button
              type="button"
              onClick={resend}
              disabled={resendIn > 0 || loading}
              className="inline-flex min-h-11 items-center font-semibold text-fg underline underline-offset-2 disabled:cursor-not-allowed disabled:text-fg-subtle"
            >
              {resendIn > 0 ? `Resend in ${resendIn}s` : "Resend code"}
            </button>
          </p>
        </div>
      )}
    </div>
  );
}
