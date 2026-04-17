"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import toast, { Toaster, ToastBar } from "react-hot-toast";
import { X } from "lucide-react";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            retry: 1,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster
        position="bottom-right"
        toastOptions={{
          duration: 3500,
          style: {
            background: "rgba(24, 24, 27, 0.85)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            border: "1px solid rgba(255, 255, 255, 0.06)",
            color: "#fafafa",
            fontSize: "13px",
            fontWeight: 500,
            borderRadius: "12px",
            padding: "12px 16px",
            maxWidth: "380px",
            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.4)",
          },
          success: {
            iconTheme: { primary: "#a3e635", secondary: "#09090b" },
            style: {
              border: "1px solid rgba(163, 230, 53, 0.15)",
              boxShadow: "0 8px 32px rgba(0, 0, 0, 0.4), 0 0 20px rgba(163, 230, 53, 0.06)",
            },
          },
          error: {
            iconTheme: { primary: "#ef4444", secondary: "#09090b" },
            style: {
              border: "1px solid rgba(239, 68, 68, 0.15)",
              boxShadow: "0 8px 32px rgba(0, 0, 0, 0.4), 0 0 20px rgba(239, 68, 68, 0.06)",
            },
          },
        }}
      >
        {(t) => (
          <ToastBar toast={t} style={{ ...t.style, animation: t.visible ? "slideUp 0.3s ease-out" : "fadeOut 0.2s ease-in forwards" }}>
            {({ icon, message }) => (
              <div className="flex items-center gap-2 w-full">
                {icon}
                <span className="flex-1">{message}</span>
                {t.type !== "loading" && (
                  <button onClick={() => toast.dismiss(t.id)}
                    className="shrink-0 p-0.5 rounded-md text-zinc-500 hover:text-zinc-300 hover:bg-white/5 transition">
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            )}
          </ToastBar>
        )}
      </Toaster>
    </QueryClientProvider>
  );
}
