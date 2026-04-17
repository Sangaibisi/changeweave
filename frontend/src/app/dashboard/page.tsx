"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Repo, Changelog } from "@/lib/types";
import { GitFork, FileText, Eye, Loader2, ArrowUpRight, Sparkles, Plus, Zap, Clock, TrendingUp, AlertCircle } from "lucide-react";
import Link from "next/link";
import { useAuthStore } from "@/lib/store";

export default function DashboardPage() {
  const { user } = useAuthStore();

  const { data: reposData, isLoading } = useQuery({
    queryKey: ["repos"],
    queryFn: () => api.get<Repo[]>("/repos"),
  });

  const repos = reposData?.data || [];
  const totalChangelogs = repos.reduce((sum, r) => sum + r.changelogCount, 0);
  const totalUnprocessed = repos.reduce((sum, r) => sum + r.unprocessedCommitCount, 0);
  const reposWithPending = repos.filter((r) => r.unprocessedCommitCount > 0);
  const firstName = user?.name?.split(" ")[0] || "there";

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-5 w-5 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-txt tracking-tight">{greeting}, {firstName}</h1>
        <p className="mt-1 text-sm text-txt-muted">
          {totalUnprocessed > 0
            ? `You have ${totalUnprocessed} pending commit${totalUnprocessed > 1 ? "s" : ""} ready to become release notes.`
            : repos.length > 0
              ? "All caught up. Your changelogs are up to date."
              : "Connect your first repository to get started."}
        </p>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        <StatCard icon={<GitFork className="h-3.5 w-3.5" />} label="Repos" value={repos.length} />
        <StatCard icon={<FileText className="h-3.5 w-3.5" />} label="Changelogs" value={totalChangelogs} color="text-green-400" />
        <StatCard icon={<Clock className="h-3.5 w-3.5" />} label="Pending" value={totalUnprocessed} color="text-amber-400" glow={totalUnprocessed > 0} />
        <StatCard icon={<TrendingUp className="h-3.5 w-3.5" />} label="Published" value={totalChangelogs} color="text-cyan-400" />
      </div>

      {/* Pending Commits Alert */}
      {reposWithPending.length > 0 && (
        <div className="glass-accent rounded-xl p-5 mb-8">
          <div className="flex items-start gap-4">
            <div className="h-10 w-10 rounded-xl bg-accent/15 flex items-center justify-center shrink-0 mt-0.5">
              <Sparkles className="h-5 w-5 text-accent" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-txt">Ready to generate</h3>
              <p className="text-xs text-txt-muted mt-1">
                {reposWithPending.length === 1
                  ? `${reposWithPending[0].fullName} has ${reposWithPending[0].unprocessedCommitCount} new commits waiting to be transformed into release notes.`
                  : `${reposWithPending.length} repositories have commits waiting to be transformed into release notes.`}
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                {reposWithPending.map((repo) => (
                  <Link key={repo.id} href={`/dashboard/repos/${repo.id}`}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-accent/10 border border-accent/20 px-3 py-1.5 text-[11px] font-medium text-accent hover:bg-accent/20 transition">
                    <Sparkles className="h-3 w-3" />
                    {repo.name}
                    <span className="text-accent/60 font-mono">{repo.unprocessedCommitCount}</span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Repositories & Changelogs */}
        <div className="lg:col-span-2 space-y-6">
          {/* Connected Repositories */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-semibold text-txt-secondary uppercase tracking-wider">Your Repositories</h2>
              <Link href="/dashboard/repos" className="text-[11px] font-medium text-accent hover:text-accent-dim transition flex items-center gap-1">
                Manage <ArrowUpRight className="h-3 w-3" />
              </Link>
            </div>

            {repos.length === 0 ? (
              <div className="glass rounded-xl p-10 text-center">
                <div className="w-10 h-10 rounded-xl bg-surface-200 flex items-center justify-center mx-auto mb-3">
                  <GitFork className="h-5 w-5 text-txt-faint" />
                </div>
                <h3 className="text-sm font-semibold text-txt">No repositories connected</h3>
                <p className="mt-1.5 text-xs text-txt-muted max-w-xs mx-auto">
                  Connect a GitHub repository and we&apos;ll automatically track your commits.
                </p>
                <Link href="/dashboard/repos" className="btn-primary mt-4 inline-flex !text-xs">
                  <Plus className="h-3.5 w-3.5" /> Connect Repository
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {repos.map((repo) => (
                  <Link key={repo.id} href={`/dashboard/repos/${repo.id}`}
                    className="glass glass-hover rounded-xl px-4 py-3.5 flex items-center justify-between transition-all duration-200 group">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-surface-200 flex items-center justify-center group-hover:bg-accent-muted transition">
                        <GitFork className="h-4 w-4 text-txt-muted group-hover:text-accent transition" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-txt group-hover:text-accent transition">{repo.fullName}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-txt-faint font-mono">{repo.defaultBranch}</span>
                          <span className="text-[10px] text-txt-faint">&middot; {repo.changelogCount} changelogs</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {repo.unprocessedCommitCount > 0 ? (
                        <span className="badge-amber text-[10px]">
                          <AlertCircle className="h-2.5 w-2.5 mr-0.5" />
                          {repo.unprocessedCommitCount} pending
                        </span>
                      ) : (
                        <span className="text-[10px] text-txt-faint">Up to date</span>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Quick Actions & Info */}
        <div className="space-y-5">
          {/* Quick Actions */}
          <div>
            <h2 className="text-xs font-semibold text-txt-secondary uppercase tracking-wider mb-3">Quick Actions</h2>
            <div className="space-y-2">
              <Link href="/dashboard/repos"
                className="glass glass-hover rounded-xl p-4 flex items-center gap-3 transition-all duration-200 group">
                <div className="h-9 w-9 rounded-xl bg-accent-muted flex items-center justify-center shrink-0">
                  <Plus className="h-4 w-4 text-accent" />
                </div>
                <div>
                  <p className="text-sm font-medium text-txt group-hover:text-accent transition">Connect Repository</p>
                  <p className="text-[10px] text-txt-faint">Import from GitHub</p>
                </div>
              </Link>

              {repos.length > 0 && (
                <Link href={`/dashboard/repos/${repos[0].id}`}
                  className="glass glass-hover rounded-xl p-4 flex items-center gap-3 transition-all duration-200 group">
                  <div className="h-9 w-9 rounded-xl bg-green-400/10 flex items-center justify-center shrink-0">
                    <Sparkles className="h-4 w-4 text-green-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-txt group-hover:text-green-400 transition">Generate Changelog</p>
                    <p className="text-[10px] text-txt-faint">AI-powered release notes</p>
                  </div>
                </Link>
              )}

              <Link href="/dashboard/settings"
                className="glass glass-hover rounded-xl p-4 flex items-center gap-3 transition-all duration-200 group">
                <div className="h-9 w-9 rounded-xl bg-cyan-400/10 flex items-center justify-center shrink-0">
                  <Zap className="h-4 w-4 text-cyan-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-txt group-hover:text-cyan-400 transition">Account Settings</p>
                  <p className="text-[10px] text-txt-faint">GitHub, profile, connections</p>
                </div>
              </Link>
            </div>
          </div>

          {/* Stats */}
          <div className="glass rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-txt-muted uppercase tracking-wider font-medium">Overview</span>
              <span className="badge-lime text-[10px]">Self-hosted</span>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-txt-faint">Repositories</span>
                <span className="text-xs text-txt-secondary font-mono">{repos.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-txt-faint">Changelogs this month</span>
                <span className="text-xs text-txt-secondary font-mono">{totalChangelogs}</span>
              </div>
            </div>
          </div>

          {/* How it works - for new users */}
          {repos.length === 0 && (
            <div className="glass rounded-xl p-4">
              <h3 className="text-xs font-semibold text-txt-secondary uppercase tracking-wider mb-3">How it works</h3>
              <div className="space-y-3">
                {[
                  { step: "1", text: "Connect a GitHub repo" },
                  { step: "2", text: "We fetch your commits" },
                  { step: "3", text: "AI generates release notes" },
                  { step: "4", text: "Review, edit & publish" },
                ].map((item) => (
                  <div key={item.step} className="flex items-center gap-3">
                    <span className="h-6 w-6 rounded-full bg-accent-muted flex items-center justify-center text-[10px] font-bold text-accent font-mono shrink-0">{item.step}</span>
                    <span className="text-xs text-txt-secondary">{item.text}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color, glow }: { icon: React.ReactNode; label: string; value: number; color?: string; glow?: boolean }) {
  return (
    <div className={`glass rounded-xl px-4 py-3.5 ${glow ? "glass-accent" : ""}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-2xl font-bold text-txt font-mono">{value}</p>
          <p className="text-[10px] text-txt-muted uppercase tracking-wider mt-0.5">{label}</p>
        </div>
        <div className={`${color || "text-accent"}`}>{icon}</div>
      </div>
    </div>
  );
}
