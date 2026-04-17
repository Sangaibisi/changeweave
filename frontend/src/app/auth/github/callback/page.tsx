"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { api } from "@/lib/api";

function CallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const code = searchParams.get("code");
    const state = searchParams.get("state");

    if (!code || !state) {
      setStatus("error");
      setErrorMsg("Missing authorization code from GitHub.");
      return;
    }

    api.get<void>(`/auth/github/callback?code=${code}&state=${state}`)
      .then(() => {
        setStatus("success");
        setTimeout(() => router.push("/dashboard/settings"), 1500);
      })
      .catch((err) => {
        setStatus("error");
        setErrorMsg(err instanceof Error ? err.message : "Failed to connect GitHub.");
      });
  }, [searchParams, router]);

  return (
    <div className="glass rounded-2xl p-10 text-center max-w-sm w-full">
      {status === "loading" && (
        <>
          <Loader2 className="h-8 w-8 animate-spin text-accent mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-txt">Connecting GitHub...</h2>
          <p className="text-sm text-txt-muted mt-2">Please wait while we verify your account.</p>
        </>
      )}
      {status === "success" && (
        <>
          <CheckCircle2 className="h-8 w-8 text-green-400 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-txt">GitHub Connected!</h2>
          <p className="text-sm text-txt-muted mt-2">Redirecting to settings...</p>
        </>
      )}
      {status === "error" && (
        <>
          <XCircle className="h-8 w-8 text-red-400 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-txt">Connection Failed</h2>
          <p className="text-sm text-txt-muted mt-2">{errorMsg}</p>
          <button onClick={() => router.push("/dashboard/settings")}
            className="btn-ghost mt-6 !text-xs">
            Back to Settings
          </button>
        </>
      )}
    </div>
  );
}

export default function GitHubCallbackPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-surface">
      <Suspense fallback={
        <div className="glass rounded-2xl p-10 text-center max-w-sm w-full">
          <Loader2 className="h-8 w-8 animate-spin text-accent mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-txt">Connecting GitHub...</h2>
        </div>
      }>
        <CallbackHandler />
      </Suspense>
    </div>
  );
}
