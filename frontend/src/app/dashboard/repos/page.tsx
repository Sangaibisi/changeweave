"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Suspense, useState, useMemo, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { Repo } from "@/lib/types";
import { GitFork, Plus, Loader2, ExternalLink, ArrowUpRight, Search, Lock, Globe, X, User, Building2, Users } from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";

interface GitHubRepo {
  id: number;
  name: string;
  fullName: string;
  description: string | null;
  url: string;
  defaultBranch: string;
  private: boolean;
  language: string | null;
  updatedAt: string;
  ownerLogin: string;
  ownerAvatarUrl: string | null;
  ownerType: "User" | "Organization";
  role: "owner" | "organization" | "collaborator";
}

interface RepoGroup {
  key: string;
  label: string;
  icon: typeof User;
  repos: GitHubRepo[];
}

const TAB_TO_PANEL: Record<string, string> = {
  generate: "create",
  analytics: "analytics",
  public: "sharing",
  sharing: "sharing",
};

export default function ReposPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-16"><Loader2 className="h-5 w-5 animate-spin text-txt-faint" /></div>}>
      <ReposPageInner />
    </Suspense>
  );
}

function ReposPageInner() {
  const queryClient = useQueryClient();
  const routerNav = useRouter();
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab");
  const [showConnect, setShowConnect] = useState(false);
  const [search, setSearch] = useState("");
  const [redirected, setRedirected] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["repos"],
    queryFn: () => api.get<Repo[]>("/repos"),
  });

  const repos = data?.data || [];

  // Auto-redirect to first repo when a tab shortcut is used from sidebar
  useEffect(() => {
    if (tab && repos.length > 0 && !redirected) {
      setRedirected(true);
      const targetRepo = tab === "generate"
        ? repos.find((r) => r.unprocessedCommitCount > 0) || repos[0]
        : repos[0];
      routerNav.replace(`/dashboard/repos/${targetRepo.id}?panel=${TAB_TO_PANEL[tab] || tab}`);
    }
  }, [tab, repos, redirected, routerNav]);

  const { data: ghData, isLoading: ghLoading, refetch: refetchGH } = useQuery({
    queryKey: ["github-repos"],
    queryFn: () => api.get<GitHubRepo[]>("/repos/github"),
    enabled: false,
  });

  const connectMutation = useMutation({
    mutationFn: (fullName: string) => api.post<Repo>("/repos", { fullName }),
    onSuccess: (_, fullName) => {
      queryClient.invalidateQueries({ queryKey: ["repos"] });
      queryClient.invalidateQueries({ queryKey: ["github-repos"] });
      toast.success(`${fullName} connected!`);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const ghRepos = ghData?.data || [];
  const connectedFullNames = new Set(repos.map((r) => r.fullName));

  const filteredGHRepos = ghRepos.filter((r) =>
    r.fullName.toLowerCase().includes(search.toLowerCase()) ||
    (r.description && r.description.toLowerCase().includes(search.toLowerCase()))
  );

  const groupedRepos = useMemo<RepoGroup[]>(() => {
    const ownerRepos: GitHubRepo[] = [];
    const collabRepos: GitHubRepo[] = [];
    const orgMap = new Map<string, GitHubRepo[]>();

    for (const repo of filteredGHRepos) {
      if (repo.role === "owner") {
        ownerRepos.push(repo);
      } else if (repo.role === "collaborator") {
        collabRepos.push(repo);
      } else {
        const key = repo.ownerLogin;
        if (!orgMap.has(key)) orgMap.set(key, []);
        orgMap.get(key)!.push(repo);
      }
    }

    const groups: RepoGroup[] = [];
    if (ownerRepos.length > 0) {
      groups.push({ key: "_owner", label: "Your Repositories", icon: User, repos: ownerRepos });
    }
    Array.from(orgMap.entries()).forEach(([orgName, orgRepos]) => {
      groups.push({ key: orgName, label: orgName, icon: Building2, repos: orgRepos });
    });
    if (collabRepos.length > 0) {
      groups.push({ key: "_collab", label: "Collaborator", icon: Users, repos: collabRepos });
    }
    return groups;
  }, [filteredGHRepos]);

  const handleOpenPicker = () => {
    setShowConnect(true);
    refetchGH();
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-txt tracking-tight">Repositories</h1>
          <p className="mt-1 text-sm text-txt-muted">Manage your connected GitHub repositories</p>
        </div>
        <button onClick={handleOpenPicker} className="btn-primary">
          <Plus className="h-4 w-4" />
          Connect Repo
        </button>
      </div>

      {/* GitHub Repo Picker */}
      {showConnect && (
        <div className="mt-6 glass-accent rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-glass-border">
            <span className="text-xs font-semibold text-txt-secondary uppercase tracking-wider">Select a GitHub Repository</span>
            <button onClick={() => setShowConnect(false)} className="text-txt-faint hover:text-txt-muted transition">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="px-5 py-3 border-b border-glass-border">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-txt-faint" />
              <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Search repositories..." className="input-dark !pl-9 !py-2 !text-xs" />
            </div>
          </div>

          <div className="max-h-[420px] overflow-y-auto">
            {ghLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-5 w-5 animate-spin text-accent mr-2" />
                <span className="text-sm text-txt-muted">Fetching your repositories...</span>
              </div>
            ) : filteredGHRepos.length === 0 ? (
              <div className="py-12 text-center text-sm text-txt-muted">
                {ghRepos.length === 0 ? "No repositories found on your GitHub account." : "No matching repositories."}
              </div>
            ) : (
              groupedRepos.map((group) => (
                <div key={group.key}>
                  {/* Group Header */}
                  <div className="sticky top-0 z-10 flex items-center gap-2.5 px-5 py-2 bg-surface-50 border-b border-glass-border">
                    {group.repos[0]?.ownerAvatarUrl ? (
                      <img src={group.repos[0].ownerAvatarUrl} alt={group.label} className="h-5 w-5 rounded-full" />
                    ) : (
                      <group.icon className="h-4 w-4 text-txt-faint" />
                    )}
                    <span className="text-[11px] font-semibold text-txt-secondary uppercase tracking-wider">{group.label}</span>
                    <span className="text-[10px] text-txt-faint font-mono">{group.repos.length}</span>
                  </div>

                  {/* Repos */}
                  {group.repos.map((repo) => {
                    const alreadyConnected = connectedFullNames.has(repo.fullName);
                    return (
                      <div key={repo.id}
                        className="flex items-center justify-between px-5 py-3 border-b border-glass-border last:border-b-0 hover:bg-surface-200/30 transition">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="h-8 w-8 rounded-lg bg-surface-200 flex items-center justify-center shrink-0">
                            {repo.private ? <Lock className="h-3.5 w-3.5 text-txt-faint" /> : <Globe className="h-3.5 w-3.5 text-txt-faint" />}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-txt truncate">{repo.name}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              {repo.language && <span className="text-[10px] text-txt-faint font-mono">{repo.language}</span>}
                              {repo.description && <span className="text-[10px] text-txt-faint truncate max-w-[200px]">{repo.description}</span>}
                            </div>
                          </div>
                        </div>
                        {alreadyConnected ? (
                          <span className="badge-lime text-[10px] shrink-0">Connected</span>
                        ) : (
                          <button
                            onClick={() => connectMutation.mutate(repo.fullName)}
                            disabled={connectMutation.isPending}
                            className="btn-primary !py-1 !px-3 !text-[11px] shrink-0 disabled:opacity-50">
                            {connectMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Connect"}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      <div className="mt-8">
        {isLoading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-5 w-5 animate-spin text-txt-faint" /></div>
        ) : repos.length === 0 ? (
          <div className="glass rounded-2xl p-16 text-center">
            <div className="w-12 h-12 rounded-xl bg-surface-200 flex items-center justify-center mx-auto mb-4">
              <GitFork className="h-6 w-6 text-txt-faint" />
            </div>
            <h3 className="text-sm font-semibold text-txt">No repositories yet</h3>
            <p className="mt-2 text-sm text-txt-muted max-w-xs mx-auto">
              Connect your first GitHub repository to start generating changelogs.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {repos.map((repo) => (
              <div key={repo.id} className="glass glass-hover rounded-xl px-5 py-4 flex items-center justify-between transition-all duration-200 group">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-lg bg-surface-200 flex items-center justify-center group-hover:bg-accent-muted transition">
                    <GitFork className="h-5 w-5 text-txt-muted group-hover:text-accent transition" />
                  </div>
                  <div>
                    <Link href={`/dashboard/repos/${repo.id}`} className="text-sm font-medium text-txt hover:text-accent transition">
                      {repo.fullName}
                    </Link>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-txt-faint font-mono">{repo.defaultBranch}</span>
                      <span className="text-xs text-txt-faint">{repo.changelogCount} changelogs</span>
                      {repo.unprocessedCommitCount > 0 && (
                        <span className="badge-amber text-[10px]">{repo.unprocessedCommitCount} pending</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <a href={repo.providerRepoUrl} target="_blank" rel="noopener noreferrer"
                    className="p-2 text-txt-faint hover:text-txt-muted transition rounded-lg hover:bg-surface-200/50">
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                  <Link href={`/dashboard/repos/${repo.id}`}
                    className="btn-ghost !py-1.5 !px-3 !text-xs">
                    Changelogs <ArrowUpRight className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
