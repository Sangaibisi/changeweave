"use client";

import { useAuthStore } from "@/lib/store";
import { api } from "@/lib/api";
import { User, Shield, Github, Loader2, GitlabIcon, Server } from "lucide-react";
import { Suspense, useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import toast from "react-hot-toast";

const PROVIDERS = [
  { key: "GITHUB", name: "GitHub", icon: Github, desc: "Connect repositories from GitHub.com", color: "text-white" },
  { key: "GITLAB", name: "GitLab", icon: GitlabIcon, desc: "Connect repositories from GitLab.com or self-hosted", color: "text-orange-400" },
  { key: "BITBUCKET", name: "Bitbucket", icon: () => (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4"><path d="M.778 1.213a.768.768 0 00-.768.892l3.263 19.81c.084.5.515.868 1.022.873H19.95a.772.772 0 00.77-.646l3.27-20.03a.768.768 0 00-.768-.892zM14.52 15.53H9.522L8.17 8.466h7.561z"/></svg>
  ), desc: "Connect repositories from Bitbucket Cloud", color: "text-blue-400" },
  { key: "BITBUCKET_DC", name: "Bitbucket DC", icon: Server, desc: "Connect to self-hosted Bitbucket Data Center", color: "text-purple-400" },
];

export default function SettingsPage() {
  return (
    <Suspense>
      <SettingsPageInner />
    </Suspense>
  );
}

function SettingsPageInner() {
  const { user, loadUser } = useAuthStore();
  const searchParams = useSearchParams();
  const connectionsRef = useRef<HTMLDivElement>(null);
  const [name, setName] = useState(user?.name || "");
  const [savingProfile, setSavingProfile] = useState(false);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);

  useEffect(() => {
    if (searchParams.get("tab") === "connections" && connectionsRef.current) {
      connectionsRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [searchParams]);

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    try {
      await api.patch("/auth/me", { name });
      await loadUser();
      toast.success("Profile updated");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally { setSavingProfile(false); }
  };

  const handleConnect = async (providerKey: string) => {
    setConnecting(providerKey);
    try {
      const res = await api.get<{ url: string }>(`/providers/${providerKey}/auth`);
      window.location.href = res.data.url;
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : `${providerKey} is not configured`);
      setConnecting(null);
    }
  };

  const handleDisconnect = async (providerKey: string) => {
    setDisconnecting(providerKey);
    try {
      await api.delete(`/providers/${providerKey}`);
      await loadUser();
      toast.success("Disconnected");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to disconnect");
    } finally { setDisconnecting(null); }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-txt tracking-tight">Settings</h1>
      <p className="mt-1 text-sm text-txt-muted">Manage your account and preferences</p>

      <div className="mt-8 space-y-5">
        {/* Profile */}
        <div className="glass rounded-xl p-6">
          <div className="flex items-center gap-2.5 mb-5">
            <User className="h-4 w-4 text-accent" />
            <h2 className="text-sm font-semibold text-txt-secondary uppercase tracking-wider">Profile</h2>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-txt-muted mb-1.5">Name</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="input-dark" />
            </div>
            <div>
              <label className="block text-xs font-medium text-txt-muted mb-1.5">Email</label>
              <input type="email" defaultValue={user?.email || ""} disabled
                className="input-dark !bg-surface-200/30 !text-txt-muted cursor-not-allowed" />
            </div>
          </div>
          <button onClick={handleSaveProfile} disabled={savingProfile} className="btn-primary mt-5 !text-xs disabled:opacity-50">
            {savingProfile ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
            Save Changes
          </button>
        </div>

        {/* Git Provider Connections */}
        <div ref={connectionsRef} className="glass rounded-xl p-6">
          <div className="flex items-center gap-2.5 mb-5">
            <Shield className="h-4 w-4 text-accent" />
            <h2 className="text-sm font-semibold text-txt-secondary uppercase tracking-wider">Git Connections</h2>
          </div>
          <div className="space-y-3">
            {PROVIDERS.map((p) => {
              const isConnected = (p.key === "GITHUB" && user?.githubConnected) ||
                (p.key === "GITLAB" && user?.gitlabConnected) ||
                ((p.key === "BITBUCKET" || p.key === "BITBUCKET_DC") && user?.bitbucketConnected);
              const Icon = p.icon;
              return (
                <div key={p.key}
                  className="flex items-center justify-between py-3 px-4 rounded-lg bg-surface-200/20 hover:bg-surface-200/40 transition">
                  <div className="flex items-center gap-3">
                    <div className={`h-9 w-9 rounded-lg bg-surface-200 flex items-center justify-center ${p.color}`}>
                      <Icon />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-txt">{p.name}</p>
                      <p className="text-[10px] text-txt-faint">{isConnected ? "Connected" : p.desc}</p>
                    </div>
                  </div>
                  {isConnected ? (
                    <button onClick={() => handleDisconnect(p.key)} disabled={disconnecting === p.key}
                      className="btn-ghost !py-1.5 !px-3 !text-xs !text-red-400 !border-red-400/20 hover:!bg-red-400/5 disabled:opacity-50">
                      {disconnecting === p.key ? <Loader2 className="h-3 w-3 animate-spin" /> : "Disconnect"}
                    </button>
                  ) : (
                    <button onClick={() => handleConnect(p.key)} disabled={connecting === p.key}
                      className="btn-primary !py-1.5 !px-3 !text-xs disabled:opacity-50">
                      {connecting === p.key ? <><Loader2 className="h-3 w-3 animate-spin" /> Connecting...</> : "Connect"}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
