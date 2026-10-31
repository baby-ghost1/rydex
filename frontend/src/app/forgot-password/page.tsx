import PublicShell from "@/components/public-shell";
import ForgotPasswordForm from "@/components/forgot-password-form";

export const metadata = { title: "Reset password" };

export default function ForgotPasswordPage() {
  return (
    <PublicShell footer={false}>
      <div className="mx-auto flex min-h-[calc(100dvh-9rem)] max-w-lg items-center px-5 pb-12 sm:px-6">
        <div className="w-full rounded-[32px] border border-line bg-white p-6 shadow-[0_24px_70px_rgba(0,0,0,0.06)] sm:p-10">
          <ForgotPasswordForm />
        </div>
      </div>
    </PublicShell>
  );
}
