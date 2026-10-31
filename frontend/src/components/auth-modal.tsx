"use client";

import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect } from "react";
import AuthForm from "@/components/auth-form";
import Modal from "@/components/ui/modal";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { closeAuthModal } from "@/redux/uiSlice";

export default function AuthModal() {
  const dispatch = useAppDispatch();
  const { open, mode } = useAppSelector((state) => state.ui.authModal);
  const { status } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (status === "authenticated" && open) {
      dispatch(closeAuthModal());
      if (pathname === "/login") router.push("/dashboard");
    }
  }, [status, open, dispatch, pathname, router]);

  return (
    <Modal
      open={open}
      onClose={() => dispatch(closeAuthModal())}
      labelledBy="auth-title"
      className="max-w-[430px]"
    >
      <AuthForm
        initialMode={mode === "register" ? "register" : "login"}
        onSuccess={() => dispatch(closeAuthModal())}
        compact
      />
    </Modal>
  );
}
