"use client";

import { useState, type ReactNode } from "react";
import { Provider } from "react-redux";
import { SessionProvider } from "next-auth/react";
import { Toaster } from "sonner";
import { makeStore } from "@/redux/store";

export default function Providers({ children }: { children: ReactNode }) {
  // Create the store exactly once per browser session without touching a ref
  // during render (React Compiler safe).
  const [store] = useState(makeStore);

  return (
    <SessionProvider refetchOnWindowFocus={false}>
      <Provider store={store}>
        {children}
        <Toaster
          position="top-center"
          richColors
          closeButton
          toastOptions={{
            style: { borderRadius: "16px", fontFamily: "inherit" },
          }}
        />
      </Provider>
    </SessionProvider>
  );
}
