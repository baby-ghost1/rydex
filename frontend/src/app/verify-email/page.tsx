import PublicShell from "@/components/public-shell";
import VerifyEmailForm from "@/components/verify-email-form";

export const metadata = { title: "Verify email" };

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const emailParam = Array.isArray(params.email) ? params.email[0] : params.email;

  return (
    <PublicShell footer={false}>
      <div className="mx-auto flex min-h-[calc(100dvh-9rem)] max-w-lg items-center px-5 pb-12 sm:px-6">
        <div className="w-full rounded-[32px] border border-line bg-white p-6 shadow-[0_24px_70px_rgba(0,0,0,0.06)] sm:p-10">
          <VerifyEmailForm initialEmail={emailParam || ""} />
        </div>
      </div>
    </PublicShell>
  );
}
