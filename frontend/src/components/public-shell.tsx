import SiteFooter from "@/components/site-footer";
import AuthModal from "@/components/auth-modal";
import { cn } from "@rydex/shared/utils";

export default function PublicShell({
  children,
  padded = true,
  footer = false,
}: {
  children: React.ReactNode;
  padded?: boolean;
  footer?: boolean;
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-canvas text-fg">
      {/* Navbar sirf home page pe render hota hai (hero ke andar). */}
      <main className={cn("flex-1", padded && "pt-16 sm:pt-20")}>{children}</main>
      {footer && <SiteFooter />}
      <AuthModal />
    </div>
  );
}
