"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  ArrowLeft,
  BadgeIndianRupee,
  Bike,
  CalendarRange,
  ChevronDown,
  ClipboardList,
  Gauge,
  LogOut,
  Menu,
  Package,
  ShieldCheck,
  Sparkles,
  UserRound,
  Users,
  X,
} from "lucide-react";
import Logo from "@/components/logo";
import { cn, initials } from "@rydex/shared/utils";
import type { PartnerStatus, UserRole } from "@rydex/shared/types";

export interface DashboardUser {
  id: string;
  name: string;
  email: string;
  image?: string | null;
  role: UserRole;
  partnerStatus: PartnerStatus;
}

interface NavItem {
  href: string;
  label: string;
  icon: typeof Gauge;
  exact?: boolean;
  badge?: string;
}

function navFor(user: DashboardUser): { label: string; items: NavItem[] }[] {
  if (user.role === "admin") {
    return [
      {
        label: "Operations",
        items: [
          { href: "/dashboard/admin", label: "Overview", icon: Gauge, exact: true },
          { href: "/dashboard/admin/vendors", label: "Vendors", icon: Users },
          { href: "/dashboard/admin/bookings", label: "All bookings", icon: ClipboardList },
        ],
      },
    ];
  }

  if (user.role === "partner") {
    if (user.partnerStatus !== "approved") {
      return [
        {
          label: "Partner dashboard",
          items: [
            { href: "/dashboard/partner", label: "Overview", icon: Gauge, exact: true },
            {
              href: "/dashboard/partner/onboarding",
              label: "Onboarding",
              icon: ShieldCheck,
              badge: user.partnerStatus === "pending" ? "Pending" : "Action",
            },
          ],
        },
        {
          label: "Rider",
          items: [
            { href: "/dashboard/user", label: "Rider overview", icon: UserRound },
            { href: "/bookings", label: "My bookings", icon: Package },
          ],
        },
      ];
    }

    return [
      {
        label: "Partner dashboard",
        items: [
          { href: "/dashboard/partner", label: "Overview", icon: Gauge, exact: true },
          { href: "/dashboard/partner/requests", label: "Requests", icon: Sparkles },
          { href: "/dashboard/partner/rides", label: "Rides", icon: CalendarRange },
          { href: "/dashboard/partner/fleet", label: "My fleet", icon: Bike },
          { href: "/dashboard/partner/earnings", label: "Earnings", icon: BadgeIndianRupee },
        ],
      },
      {
        label: "Rider",
        items: [
          { href: "/dashboard/user", label: "Rider overview", icon: UserRound },
          { href: "/bookings", label: "My bookings", icon: Package },
        ],
      },
    ];
  }

  return [
    {
      label: "Your rides",
      items: [
        { href: "/dashboard/user", label: "Overview", icon: Gauge, exact: true },
        { href: "/dashboard/user/bookings", label: "My bookings", icon: Package },
        { href: "/dashboard/user/profile", label: "Profile", icon: UserRound },
      ],
    },
    {
      label: "Explore",
      items: [
        { href: "/book", label: "Book a ride", icon: Bike },
        { href: "/fleet", label: "Browse fleet", icon: Users },
        { href: "/dashboard/partner", label: "Become a partner", icon: Sparkles },
      ],
    },
  ];
}

export default function DashboardShell({
  user,
  children,
}: {
  user: DashboardUser;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const groups = navFor(user);

  const drawerRef = useRef<HTMLDivElement>(null);
  const drawerTriggerRef = useRef<HTMLButtonElement>(null);
  const drawerCloseRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    drawerCloseRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setMobileOpen(false);
        drawerTriggerRef.current?.focus();
        return;
      }

      if (event.key !== "Tab" || !drawerRef.current) return;

      const focusable = Array.from(
        drawerRef.current.querySelectorAll<HTMLElement>(
          "a[href], button:not([disabled]), [tabindex]:not([tabindex='-1'])",
        ),
      ).filter((element) => element.getClientRects().length > 0);

      if (!focusable.length) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [mobileOpen]);

  const roleLabel =
    user.role === "admin"
      ? "Administrator"
      : user.role === "partner"
        ? "Partner account"
        : "Rider account";

  const sidebar = (
    <div className="flex h-full flex-col bg-surface text-fg">
      <div className="px-5 pt-6">
        <Logo dark={false} className="min-h-11" />
        <div className="mt-5 flex items-center gap-2.5 rounded-2xl border border-line bg-surface-muted p-2.5">
          <span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full bg-ink text-xs font-bold text-white">
            {user.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.image} alt="" className="h-full w-full object-cover" />
            ) : (
              initials(user.name)
            )}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-fg">{user.name}</p>
            <p className="truncate text-xs text-fg-muted">{roleLabel}</p>
          </div>
          <ChevronDown className="h-4 w-4 text-fg-subtle" aria-hidden="true" />
        </div>
      </div>

      <nav
        aria-label="Dashboard navigation"
        className="no-scrollbar mt-6 flex-1 overflow-y-auto px-3 pb-4"
      >
        {groups.map((group) => (
          <div key={group.label} className="mb-5">
            <p className="px-3 pb-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-fg-subtle">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const active = item.exact
                  ? pathname === item.href
                  : pathname === item.href || pathname.startsWith(`${item.href}/`);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex min-h-11 items-center gap-2.5 rounded-xl px-3 text-sm font-medium transition",
                      active
                        ? "bg-ink text-white shadow-sm"
                        : "text-fg-muted hover:bg-surface-muted hover:text-fg",
                    )}
                  >
                    <Icon
                      className={cn(
                        "h-4 w-4",
                        active ? "text-lime" : "text-fg-subtle",
                      )}
                      aria-hidden="true"
                    />
                    <span className="flex-1">{item.label}</span>
                    {item.badge && (
                      <span
                        className={cn(
                          "rounded-full px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                          active
                            ? "bg-lime text-ink"
                            : "bg-warning/10 text-warning",
                        )}
                      >
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-line p-3">
        <Link
          href="/"
          className="flex min-h-11 items-center gap-2.5 rounded-xl px-3 text-sm font-medium text-fg-muted transition hover:bg-surface-muted hover:text-fg"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to RYDEX
        </Link>
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/" })}
          className="flex min-h-11 w-full items-center gap-2.5 rounded-xl px-3 text-left text-sm font-medium text-danger transition hover:bg-danger/5"
        >
          <LogOut className="h-4 w-4" aria-hidden="true" /> Sign out
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-dvh bg-surface-muted text-fg">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-line bg-surface lg:block">
        {sidebar}
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-[70] lg:hidden">
          <button
            type="button"
            aria-label="Close navigation"
            className="absolute inset-0 bg-ink/50 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <div
            ref={drawerRef}
            id="dashboard-navigation"
            className="absolute inset-y-0 left-0 w-[86%] max-w-[300px] overflow-y-auto border-r border-line bg-surface shadow-2xl"
          >
            <div className="absolute right-3 top-4 z-10">
              <button
                ref={drawerCloseRef}
                type="button"
                onClick={() => setMobileOpen(false)}
                aria-label="Close navigation"
                className="icon-button border border-line bg-surface text-fg-muted hover:bg-surface-muted hover:text-fg"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            {sidebar}
          </div>
        </div>
      )}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-line bg-surface-muted/90 px-4 backdrop-blur-xl sm:px-6 lg:hidden">
  {/* Upar line ke aakhiri mein 'lg:hidden' jod diya hai, jisse desktop par poora header hide rahega */}
  
  <div className="flex items-center gap-3">
    <button
      ref={drawerTriggerRef}
      type="button"
      onClick={() => setMobileOpen(true)}
      aria-label="Open navigation"
      aria-expanded={mobileOpen}
      aria-controls="dashboard-navigation"
      className="icon-button border border-line bg-surface text-fg"
    >
      <Menu className="h-4 w-4" aria-hidden="true" />
    </button>
    
    <div className="hidden text-xs font-semibold uppercase tracking-[0.14em] text-fg-subtle sm:block">
      RYDEX workspace
    </div>
  </div>
</header>


        <main className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 sm:py-8">{children}</main>
      </div>
    </div>
  );
}
