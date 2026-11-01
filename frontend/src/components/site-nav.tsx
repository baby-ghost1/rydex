"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
  ChevronDown,
  LayoutDashboard,
  LogOut,
  Menu,
  Repeat2,
  Ticket,
  UserRound,
  X,
} from "lucide-react";
import Logo from "@/components/logo";
import { useAppDispatch } from "@/redux/hooks";
import { openAuthModal } from "@/redux/uiSlice";
import { cn, initials } from "@rydex/shared/utils";
import { api } from "@/lib/client-api";
import { toast } from "sonner";

const links = [
  { href: "/", label: "Home" },
  { href: "/bookings", label: "Bookings" },
  { href: "/fleet", label: "Fleet" },
  { href: "/#faq", label: "FAQ" },
  { href: "/contact", label: "Contact" },
];

export default function SiteNav({ dark = false }: { dark?: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { data: session, status, update } = useSession();

  const [menuOpen, setMenuOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [hash, setHash] = useState("");

  const accountRef = useRef<HTMLDivElement>(null);
  const accountButtonRef = useRef<HTMLButtonElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMenuOpen(false);
    setAccountOpen(false);
  }, [pathname]);

  useEffect(() => {
    const syncHash = () => setHash(window.location.hash);

    syncHash();
    window.addEventListener("hashchange", syncHash);
    window.addEventListener("popstate", syncHash);

    return () => {
      window.removeEventListener("hashchange", syncHash);
      window.removeEventListener("popstate", syncHash);
    };
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen && !accountOpen) return;

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;

      if (accountOpen && !accountRef.current?.contains(target)) {
        setAccountOpen(false);
      }

      if (
        menuOpen &&
        !mobileMenuRef.current?.contains(target) &&
        !menuButtonRef.current?.contains(target)
      ) {
        setMenuOpen(false);
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;

      if (accountOpen) {
        event.preventDefault();
        setAccountOpen(false);
        accountButtonRef.current?.focus();
        return;
      }

      if (menuOpen) {
        event.preventDefault();
        setMenuOpen(false);
        menuButtonRef.current?.focus();
      }
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen, accountOpen]);

  const dashboardHref =
    session?.user.role === "admin"
      ? "/dashboard/admin"
      : session?.user.role === "partner"
        ? "/dashboard/partner"
        : "/dashboard/user";

  function closeMenus() {
    setMenuOpen(false);
    setAccountOpen(false);
  }

  function handleNavClick(href: string) {
    closeMenus();
    const hashIndex = href.indexOf("#");
    setHash(hashIndex >= 0 ? href.slice(hashIndex) : "");
  }

  function isActive(href: string) {
    if (href === "/") {
      return pathname === "/" && hash !== "#faq";
    }

    const hashIndex = href.indexOf("#");
    if (hashIndex >= 0) {
      const path = href.slice(0, hashIndex) || "/";
      return pathname === path && hash === href.slice(hashIndex);
    }

    return pathname === href || pathname.startsWith(`${href}/`);
  }

  async function switchRole() {
    if (!session) return;
    setSwitching(true);

    try {
      const nextRole = session.user.role === "user" ? "partner" : "user";
      await api("/api/user/role", { method: "PATCH", json: { role: nextRole } });
      await update();
      toast.success(
        nextRole === "partner" ? "Partner mode enabled" : "Switched to rider mode",
      );
      router.push(
        nextRole === "partner"
          ? session.user.partnerStatus === "approved"
            ? "/dashboard/partner"
            : "/dashboard/partner/onboarding"
          : "/dashboard/user",
      );
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not switch mode");
    } finally {
      setSwitching(false);
    }
  }

  return (
    <header className="no-print relative inset-x-0 top-0 z-50 px-4 pt-2 sm:px-6">
      <div
        className={cn(
          "mx-auto flex max-w-6xl items-center justify-between gap-4 rounded-full border px-4 py-2.5 shadow-[0_18px_50px_rgba(0,0,0,0.12)] sm:px-6",
          dark
            ? "surface-inverse border-white/10"
            : "surface-default border-line",
        )}
      >
        <Logo dark={dark} className="min-h-11" />

        <nav aria-label="Primary" className="hidden items-center gap-1 lg:flex">
          {links.map((link) => {
            const active = isActive(link.href);
            const current = active
              ? link.href.includes("#")
                ? "location"
                : "page"
              : undefined;

            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => handleNavClick(link.href)}
                aria-current={current}
                className={cn(
                  "inline-flex min-h-11 items-center rounded-full px-4 text-[13px] font-medium transition",
                  dark
                    ? active
                      ? "bg-white text-ink"
                      : "text-fg-muted hover:bg-white/10 hover:text-fg"
                    : active
                      ? "bg-ink text-white"
                      : "text-fg-muted hover:bg-surface-muted hover:text-fg",
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          {status === "loading" ? (
            <>
              <div
                className="h-11 w-28 animate-pulse rounded-full bg-current/10"
                aria-hidden="true"
              />
              <span className="sr-only" role="status">
                Loading account status
              </span>
            </>
          ) : session?.user ? (
            <div className="relative" ref={accountRef}>
              <button
                ref={accountButtonRef}
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  setAccountOpen((open) => !open);
                }}
                className={cn(
                  "flex min-h-11 items-center gap-2 rounded-full border py-1 pl-1 pr-2.5 text-sm font-medium transition",
                  dark
                    ? "border-white/20 bg-white/10 text-fg hover:bg-white/15"
                    : "border-line bg-surface text-fg hover:bg-surface-muted",
                )}
                aria-expanded={accountOpen}
                aria-controls="account-menu"
                aria-label={`Account menu for ${session.user.name || "your account"}`}
              >
                <span
                  className={cn(
                    "grid h-7 w-7 place-items-center overflow-hidden rounded-full text-[11px] font-bold",
                    dark ? "bg-lime text-ink" : "bg-ink text-white",
                  )}
                  aria-hidden="true"
                >
                  {session.user.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={session.user.image}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    initials(session.user.name)
                  )}
                </span>
                <span className="hidden max-w-24 truncate sm:block">
                  {session.user.name?.split(" ")[0] || "Account"}
                </span>
                <ChevronDown
                  className={cn("h-3.5 w-3.5 transition", accountOpen && "rotate-180")}
                  aria-hidden="true"
                />
              </button>

              {accountOpen && (
                <div
                  id="account-menu"
                  className="surface-default absolute right-0 z-50 mt-3 w-60 overflow-hidden rounded-2xl border border-line p-1.5 text-fg shadow-2xl"
                >
                  <div className="border-b border-line px-3 py-2.5">
                    <p className="truncate text-sm font-semibold">
                      {session.user.name}
                    </p>
                    <p className="truncate text-xs text-fg-muted">
                      {session.user.email}
                    </p>
                  </div>

                  <Link
                    href={dashboardHref}
                    onClick={closeMenus}
                    className="mt-1 flex min-h-11 items-center gap-2.5 rounded-xl px-3 text-sm transition hover:bg-surface-muted"
                  >
                    <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
                    Dashboard
                  </Link>
                  <Link
                    href="/bookings"
                    onClick={closeMenus}
                    className="flex min-h-11 items-center gap-2.5 rounded-xl px-3 text-sm transition hover:bg-surface-muted"
                  >
                    <Ticket className="h-4 w-4" aria-hidden="true" />
                    My bookings
                  </Link>

                  {session.user.role !== "admin" && (
                    <button
                      type="button"
                      onClick={() => {
                        setAccountOpen(false);
                        void switchRole();
                      }}
                      disabled={switching}
                      aria-busy={switching}
                      className="flex min-h-11 w-full items-center gap-2.5 rounded-xl px-3 text-left text-sm transition hover:bg-surface-muted disabled:cursor-wait disabled:opacity-60"
                    >
                      <Repeat2 className="h-4 w-4" aria-hidden="true" />
                      {switching
                        ? "Switching…"
                        : session.user.role === "user"
                          ? "Become a partner"
                          : "Switch to rider"}
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setAccountOpen(false);
                      void signOut({ callbackUrl: "/" });
                    }}
                    className="flex min-h-11 w-full items-center gap-2.5 rounded-xl px-3 text-left text-sm text-danger transition hover:bg-danger/5"
                  >
                    <LogOut className="h-4 w-4" aria-hidden="true" />
                    Sign out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => dispatch(openAuthModal("login"))}
              className={cn(
                "hidden min-h-11 items-center gap-2 rounded-full px-5 text-[13px] font-semibold transition sm:inline-flex",
                dark
                  ? "bg-lime text-ink hover:brightness-95 active:scale-[0.98]"
                  : "bg-ink text-white hover:bg-ink-soft active:scale-[0.98]",
              )}
            >
              <UserRound className="h-3.5 w-3.5" aria-hidden="true" />
              Login
            </button>
          )}

          <button
            ref={menuButtonRef}
            type="button"
            onClick={() => {
              setAccountOpen(false);
              setMenuOpen((open) => !open);
            }}
            aria-label={menuOpen ? "Close navigation" : "Open navigation"}
            aria-expanded={menuOpen}
            aria-controls="mobile-navigation"
            className={cn(
              "icon-button border lg:hidden",
              dark
                ? "border-white/20 text-fg hover:bg-white/10"
                : "border-line text-fg hover:bg-surface-muted",
            )}
          >
            {menuOpen ? (
              <X className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Menu className="h-4 w-4" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div
          ref={mobileMenuRef}
          id="mobile-navigation"
          className={cn(
            "mx-auto mt-2 max-w-6xl overflow-hidden rounded-3xl border p-3 shadow-2xl lg:hidden",
            dark
              ? "surface-inverse border-white/10"
              : "surface-default border-line",
          )}
        >
          <nav aria-label="Mobile navigation" className="grid gap-1">
            {links.map((link) => {
              const active = isActive(link.href);
              const current = active
                ? link.href.includes("#")
                  ? "location"
                  : "page"
                : undefined;

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => handleNavClick(link.href)}
                  aria-current={current}
                  className={cn(
                    "flex min-h-11 items-center rounded-2xl px-4 text-sm font-medium transition",
                    active
                      ? dark
                        ? "bg-white/10 text-fg"
                        : "bg-surface-muted text-fg"
                      : dark
                        ? "text-fg-muted hover:bg-white/10 hover:text-fg"
                        : "text-fg-muted hover:bg-surface-muted hover:text-fg",
                  )}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          <div className="mt-2 border-t border-line pt-2">
            {session ? (
              <>
                <Link
                  href={dashboardHref}
                  onClick={closeMenus}
                  className={cn(
                    "flex min-h-11 items-center gap-2.5 rounded-2xl px-4 text-sm font-semibold transition",
                    dark
                      ? "bg-lime text-ink hover:brightness-95"
                      : "bg-ink text-white hover:bg-ink-soft",
                  )}
                >
                  <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
                  Dashboard
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    closeMenus();
                    void signOut({ callbackUrl: "/" });
                  }}
                  className={cn(
                    "mt-1 flex min-h-11 w-full items-center gap-2.5 rounded-2xl px-4 text-sm font-medium transition",
                    dark
                      ? "text-danger-on-dark hover:bg-white/10"
                      : "text-danger hover:bg-danger/5",
                  )}
                >
                  <LogOut className="h-4 w-4" aria-hidden="true" />
                  Sign out
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => {
                  closeMenus();
                  dispatch(openAuthModal("login"));
                }}
                className={cn(
                  "flex min-h-11 w-full items-center justify-center rounded-2xl px-4 text-sm font-semibold transition",
                  dark
                    ? "bg-lime text-ink hover:brightness-95"
                    : "bg-ink text-white hover:bg-ink-soft",
                )}
              >
                Login / Create account
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
