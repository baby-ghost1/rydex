import SiteNav from "@/components/site-nav";
import SiteFooter from "@/components/site-footer";
import AuthModal from "@/components/auth-modal";
import { cn } from "@rydex/shared/utils";

export default function PublicShell({
  children,
  darkNav = false,
  padded = true,
  footer = false,
}: {
  children: React.ReactNode;
  darkNav?: boolean;
  padded?: boolean;
  footer?: boolean;
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-canvas text-fg">
      <SiteNav dark={darkNav} />
      <main className={cn("flex-1", padded && "pt-28 sm:pt-32")}>{children}</main>
      {footer && <SiteFooter />}
      <AuthModal />
    </div>
  );
}
