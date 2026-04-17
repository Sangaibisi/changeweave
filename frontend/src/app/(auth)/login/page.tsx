"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { LogoMark } from "@/components/Logo";
import { useAuthStore } from "@/lib/store";
import toast from "react-hot-toast";

export default function LoginPage() {
  const router = useRouter();
  const login = useAuthStore((s) => s.login);

  const savedEmail = typeof window !== "undefined" ? localStorage.getItem("rememberedEmail") || "" : "";
  const [email, setEmail] = useState(savedEmail);
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(!!savedEmail);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (rememberMe) {
        localStorage.setItem("rememberedEmail", email);
      } else {
        localStorage.removeItem("rememberedEmail");
      }
      await login(email, password);
      router.push("/dashboard");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Login failed";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface px-4 relative">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/3 w-[500px] h-[500px] rounded-full bg-accent/[0.03] blur-[120px]" />
      </div>

      <div className="w-full max-w-sm relative z-10">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2.5 mb-8">
            <LogoMark size={32} />
            <span className="text-lg font-semibold text-txt">ChangeWeave</span>
          </Link>
          <h1 className="text-2xl font-bold text-txt tracking-tight">Welcome back</h1>
          <p className="mt-2 text-sm text-txt-muted">Sign in to continue</p>
        </div>

        <form onSubmit={handleSubmit} className="glass rounded-2xl p-6 space-y-5">
          <div>
            <label htmlFor="email" className="block text-xs font-medium text-txt-secondary mb-1.5 uppercase tracking-wider">
              Email
            </label>
            <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              className="input-dark" placeholder="you@company.com" />
          </div>
          <div>
            <label htmlFor="password" className="block text-xs font-medium text-txt-secondary mb-1.5 uppercase tracking-wider">
              Password
            </label>
            <input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
              className="input-dark" placeholder="Enter your password" />
          </div>

          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-glass-border bg-surface-200 text-accent focus:ring-accent/30 cursor-pointer" />
            <span className="text-xs text-txt-muted">Remember me</span>
          </label>

          <button type="submit" disabled={loading} className="btn-primary w-full !mt-4 disabled:opacity-50">
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Sign In
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-txt-muted">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="font-medium text-accent hover:text-accent-dim transition">
            Sign up free
          </Link>
        </p>
      </div>
    </div>
  );
}
