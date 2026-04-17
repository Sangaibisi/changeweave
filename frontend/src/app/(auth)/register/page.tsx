"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { LogoMark } from "@/components/Logo";
import { useAuthStore } from "@/lib/store";
import toast from "react-hot-toast";

export default function RegisterPage() {
  const router = useRouter();
  const register = useAuthStore((s) => s.register);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) { toast.error("Password must be at least 8 characters"); return; }
    setLoading(true);
    try {
      await register(name, email, password);
      router.push("/dashboard");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Registration failed");
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface px-4 relative">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute bottom-1/3 right-1/3 w-[500px] h-[500px] rounded-full bg-accent/[0.03] blur-[120px]" />
      </div>
      <div className="w-full max-w-sm relative z-10">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2.5 mb-8">
            <LogoMark size={32} />
            <span className="text-lg font-semibold text-txt">ChangeWeave</span>
          </Link>
          <h1 className="text-2xl font-bold text-txt tracking-tight">Create your account</h1>
          <p className="mt-2 text-sm text-txt-muted">Start shipping changelogs on autopilot</p>
        </div>

        <form onSubmit={handleSubmit} className="glass rounded-2xl p-6 space-y-5">
          <div>
            <label htmlFor="name" className="block text-xs font-medium text-txt-secondary mb-1.5 uppercase tracking-wider">Name</label>
            <input id="name" type="text" required value={name} onChange={(e) => setName(e.target.value)}
              className="input-dark" placeholder="Jane Doe" />
          </div>
          <div>
            <label htmlFor="email" className="block text-xs font-medium text-txt-secondary mb-1.5 uppercase tracking-wider">Email</label>
            <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              className="input-dark" placeholder="you@company.com" />
          </div>
          <div>
            <label htmlFor="password" className="block text-xs font-medium text-txt-secondary mb-1.5 uppercase tracking-wider">Password</label>
            <input id="password" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)}
              className="input-dark" placeholder="Min. 8 characters" />
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full !mt-6 disabled:opacity-50">
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Create Account
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-txt-muted">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-accent hover:text-accent-dim transition">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
