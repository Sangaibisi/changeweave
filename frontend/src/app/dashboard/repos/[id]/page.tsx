"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useCallback, useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { Repo, Changelog, RepoVisibility } from "@/lib/types";
import { ArrowLeft, Plus, FileText, Loader2, Eye, Check, Pencil, Sparkles, RefreshCw, Share2, Copy, Globe, Lock, ShieldCheck, RefreshCcw, Rss, Code2, ExternalLink, Trash2, Unplug, Settings, Mic, Users, FileCode, Tag, ChevronDown, BarChart3, TrendingUp, Globe2, Languages } from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";
import { formatDistanceToNow } from "date-fns";

export default function RepoDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [showSharing, setShowSharing] = useState(false);
  const [showAiSettings, setShowAiSettings] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);

  // Auto-open panel from sidebar navigation (?panel=create|analytics|sharing|settings)
  useEffect(() => {
    const panel = searchParams.get("panel");
    if (!panel) return;
    if (panel === "create") setShowCreate(true);
    else if (panel === "analytics") setShowAnalytics(true);
    else if (panel === "sharing") setShowSharing(true);
    else if (panel === "settings") setShowAiSettings(true);
  }, [searchParams]);
  const [version, setVersion] = useState("");
  const [title, setTitle] = useState("");
  const [upToDate, setUpToDate] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);

  const { data: repoData } = useQuery({ queryKey: ["repo", id], queryFn: () => api.get<Repo>(`/repos/${id}`) });
  const { data: changelogsData, isLoading } = useQuery({ queryKey: ["changelogs", id], queryFn: () => api.get<{ content: Changelog[] }>(`/repos/${id}/changelogs`) });
  const { data: tagsData } = useQuery({ queryKey: ["tags", id], queryFn: () => api.get<{ name: string; sha: string }[]>(`/repos/${id}/tags`), enabled: showCreate });

  const createMutation = useMutation({
    mutationFn: () => api.post<Changelog>(`/repos/${id}/changelogs`, { version, title: title || undefined }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["changelogs", id] }); setShowCreate(false); setVersion(""); setTitle(""); toast.success("Changelog created!"); },
    onError: (err: Error) => toast.error(err.message),
  });

  const generateMutation = useMutation({
    mutationFn: () => api.post<Changelog>(`/repos/${id}/changelogs/generate`, { version, title: title || undefined }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["changelogs", id] }); queryClient.invalidateQueries({ queryKey: ["repo", id] }); setShowCreate(false); setVersion(""); setTitle(""); toast.success("Changelog generated with AI!"); },
    onError: (err: Error) => toast.error(err.message),
  });

  const syncMutation = useMutation({
    mutationFn: () => api.post<{ synced: number }>(`/repos/${id}/sync`),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["repo", id] });
      queryClient.invalidateQueries({ queryKey: ["changelogs", id] });
      toast.success(`${res.data.synced} commits synced!`);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const syncAndCreateMutation = useMutation({
    mutationFn: () => api.post<{ synced: number }>(`/repos/${id}/sync`),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["repo", id] });
      queryClient.invalidateQueries({ queryKey: ["changelogs", id] });
      if (res.data.synced > 0) {
        setUpToDate(false);
        setShowCreate(true);
        toast.success(`${res.data.synced} new commits found!`);
      } else {
        setUpToDate(true);
        setShowCreate(false);
        toast.success("No new commits — you're already up to date!");
      }
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const publishMutation = useMutation({
    mutationFn: (cid: string) => api.post<Changelog>(`/repos/${id}/changelogs/${cid}/publish`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["changelogs", id] }); toast.success("Published!"); },
    onError: (err: Error) => toast.error(err.message),
  });

  const visibilityMutation = useMutation({
    mutationFn: (visibility: RepoVisibility) => api.patch<Repo>(`/repos/${id}/visibility`, { visibility }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["repo", id] }); toast.success("Visibility updated!"); },
    onError: (err: Error) => toast.error(err.message),
  });

  const regenerateTokenMutation = useMutation({
    mutationFn: () => api.post<Repo>(`/repos/${id}/regenerate-token`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["repo", id] }); toast.success("Access token regenerated!"); },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (cid: string) => api.delete(`/repos/${id}/changelogs/${cid}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["changelogs", id] });
      queryClient.invalidateQueries({ queryKey: ["repo", id] });
      setConfirmDeleteId(null);
      toast.success("Changelog deleted!");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const settingsMutation = useMutation({
    mutationFn: (settings: Record<string, unknown>) => api.patch<Repo>(`/repos/${id}/settings`, { settings }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["repo", id] }); toast.success("Settings saved!"); },
    onError: (err: Error) => toast.error(err.message),
  });

  const disconnectMutation = useMutation({
    mutationFn: () => api.delete(`/repos/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["repos"] });
      toast.success("Repository disconnected!");
      router.push("/dashboard/repos");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const copyToClipboard = useCallback((text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => toast.success(`${label} copied!`));
  }, []);

  const repo = repoData?.data;
  const changelogs = changelogsData?.data?.content || [];
  const handleCreate = (e: React.FormEvent) => { e.preventDefault(); if (!version) { toast.error("Version required"); return; } createMutation.mutate(); };

  return (
    <div>
      <Link href="/dashboard/repos" className="inline-flex items-center gap-1.5 text-xs text-txt-muted hover:text-txt-secondary transition mb-6">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to Repositories
      </Link>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-txt tracking-tight">{repo?.fullName || "..."}</h1>
          <p className="mt-1 text-sm text-txt-muted">{repo?.description || "Manage changelogs"}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowAnalytics(!showAnalytics)}
            className={`btn-ghost !text-xs ${showAnalytics ? "!border-accent/30 !text-accent" : ""}`}>
            <BarChart3 className="h-3.5 w-3.5" /> Analytics
          </button>
          <button onClick={() => setShowAiSettings(!showAiSettings)}
            className={`btn-ghost !text-xs ${showAiSettings ? "!border-accent/30 !text-accent" : ""}`}>
            <Settings className="h-3.5 w-3.5" /> AI Settings
          </button>
          <button onClick={() => setShowSharing(!showSharing)}
            className={`btn-ghost !text-xs ${showSharing ? "!border-accent/30 !text-accent" : ""}`}>
            <Share2 className="h-3.5 w-3.5" /> Share
          </button>
          <button onClick={() => syncMutation.mutate()} disabled={syncMutation.isPending}
            className="btn-ghost !text-xs disabled:opacity-50">
            {syncMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            Sync Commits
          </button>
          <button
            onClick={() => {
              if (repo && repo.unprocessedCommitCount === 0) {
                setUpToDate(false);
                syncAndCreateMutation.mutate();
              } else {
                setShowCreate(!showCreate);
              }
            }}
            disabled={syncAndCreateMutation.isPending}
            className="btn-primary disabled:opacity-50"
          >
            {syncAndCreateMutation.isPending ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Checking…</>
            ) : (
              <><Plus className="h-4 w-4" /> New Changelog</>
            )}
          </button>
        </div>
      </div>

      {upToDate && !showCreate && (
        <div className="mt-6 glass rounded-xl p-5 flex items-center gap-3 border border-green-500/20 bg-green-500/5">
          <div className="h-9 w-9 rounded-lg bg-green-400/10 flex items-center justify-center shrink-0">
            <Check className="h-4 w-4 text-green-400" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-green-400">Already up to date</p>
            <p className="text-xs text-txt-muted mt-0.5">There are no new commits since your last changelog. Push some code and try again.</p>
          </div>
          <button onClick={() => setUpToDate(false)} className="text-txt-faint hover:text-txt-secondary transition">
            <ArrowLeft className="h-4 w-4 rotate-180" />
          </button>
        </div>
      )}

      {showCreate && (
        <form onSubmit={handleCreate} className="mt-6 glass-accent rounded-xl p-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-txt-secondary mb-1.5 uppercase tracking-wider">Version *</label>
              <input type="text" value={version} onChange={(e) => setVersion(e.target.value)} placeholder="v1.2.0" className="input-dark font-mono" />
              {tagsData?.data && tagsData.data.length > 0 && (
                <VersionSuggestions tags={tagsData.data} onSelect={(v) => setVersion(v)} />
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-txt-secondary mb-1.5 uppercase tracking-wider">Title</label>
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="New Features & Bug Fixes" className="input-dark" />
            </div>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button type="submit" disabled={createMutation.isPending || generateMutation.isPending} className="btn-ghost !text-xs disabled:opacity-50">
              {createMutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              <Plus className="h-3.5 w-3.5" /> Empty Draft
            </button>
            <button type="button" onClick={() => { if (!version) { toast.error("Version required"); return; } generateMutation.mutate(); }}
              disabled={createMutation.isPending || generateMutation.isPending}
              className="btn-primary !text-xs disabled:opacity-50">
              {generateMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              Generate with AI
            </button>
          </div>
        </form>
      )}

      {/* Analytics Panel */}
      {showAnalytics && repo && <AnalyticsPanel repoId={id} />}

      {/* AI Settings Panel */}
      {showAiSettings && repo && (
        <AiSettingsPanel
          repo={repo}
          onSave={(s) => settingsMutation.mutate(s)}
          isSaving={settingsMutation.isPending}
        />
      )}

      {/* Sharing & Integration Panel */}
      {showSharing && repo && (
        <SharingPanel
          repo={repo}
          onVisibilityChange={(v) => visibilityMutation.mutate(v)}
          onRegenerateToken={() => regenerateTokenMutation.mutate()}
          onCopy={copyToClipboard}
          isUpdating={visibilityMutation.isPending}
          isRegenerating={regenerateTokenMutation.isPending}
        />
      )}

      <div className="mt-8">
        {isLoading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-5 w-5 animate-spin text-txt-faint" /></div>
        ) : changelogs.length === 0 ? (
          <div className="glass rounded-2xl p-16 text-center">
            <div className="w-12 h-12 rounded-xl bg-surface-200 flex items-center justify-center mx-auto mb-4">
              <FileText className="h-6 w-6 text-txt-faint" />
            </div>
            <h3 className="text-sm font-semibold text-txt">No changelogs yet</h3>
            <p className="mt-2 text-sm text-txt-muted">Create one or push code to auto-generate.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {changelogs.map((cl) => (
              <div key={cl.id} className="glass glass-hover rounded-xl px-5 py-4 flex items-center justify-between transition-all duration-200 group">
                <Link href={`/dashboard/changelogs/${cl.id}`} className="flex items-center gap-3.5 flex-1 min-w-0">
                  <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${cl.draft ? "bg-amber-400/10" : "bg-green-400/10"}`}>
                    <FileText className={`h-4 w-4 ${cl.draft ? "text-amber-400" : "text-green-400"}`} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2.5">
                      <span className="text-sm font-semibold text-txt font-mono group-hover:text-accent transition">{cl.version}</span>
                      <span className={cl.draft ? "badge-amber text-[10px]" : "badge-lime text-[10px]"}>
                        {cl.draft ? "Draft" : "Published"}
                      </span>
                    </div>
                    <p className="text-xs text-txt-faint mt-0.5 truncate">
                      {cl.title} &middot; {cl.publishedAt
                        ? formatDistanceToNow(new Date(cl.publishedAt), { addSuffix: true })
                        : formatDistanceToNow(new Date(cl.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                </Link>
                <div className="flex items-center gap-2 shrink-0 ml-3">
                  <span className="text-xs text-txt-faint font-mono flex items-center gap-1"><Eye className="h-3 w-3" />{cl.viewCount}</span>
                  {cl.draft && (
                    <button onClick={() => publishMutation.mutate(cl.id)} disabled={publishMutation.isPending}
                      className="inline-flex items-center gap-1 rounded-lg bg-green-500/10 border border-green-500/20 px-2.5 py-1.5 text-[11px] font-medium text-green-400 hover:bg-green-500/20 transition disabled:opacity-50">
                      <Check className="h-3 w-3" /> Publish
                    </button>
                  )}
                  <Link href={`/dashboard/changelogs/${cl.id}?mode=edit`}
                    className="btn-ghost !py-1.5 !px-2.5 !text-[11px]">
                    <Pencil className="h-3 w-3" /> Edit
                  </Link>
                  {confirmDeleteId === cl.id ? (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => deleteMutation.mutate(cl.id)}
                        disabled={deleteMutation.isPending}
                        className="inline-flex items-center gap-1 rounded-lg bg-red-500/10 border border-red-500/20 px-2.5 py-1.5 text-[11px] font-medium text-red-400 hover:bg-red-500/20 transition disabled:opacity-50"
                      >
                        {deleteMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                        Confirm
                      </button>
                      <button onClick={() => setConfirmDeleteId(null)} className="btn-ghost !py-1.5 !px-2 !text-[11px]">
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDeleteId(cl.id)}
                      className="p-1.5 text-txt-faint hover:text-red-400 hover:bg-red-400/5 rounded-lg transition opacity-0 group-hover:opacity-100"
                      title="Delete changelog"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Danger Zone */}
      <div className="mt-12 border border-red-500/10 rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-red-500/10 bg-red-500/5">
          <span className="text-xs font-semibold text-red-400 uppercase tracking-wider">Danger Zone</span>
        </div>
        <div className="px-5 py-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-txt">Disconnect Repository</p>
            <p className="text-xs text-txt-faint mt-0.5">This will hide the repo and all its changelogs. Webhook will be removed.</p>
          </div>
          {!confirmDisconnect ? (
            <button onClick={() => setConfirmDisconnect(true)}
              className="btn-ghost !text-xs !border-red-500/20 !text-red-400 hover:!bg-red-500/10">
              <Unplug className="h-3.5 w-3.5" /> Disconnect
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => disconnectMutation.mutate()}
                disabled={disconnectMutation.isPending}
                className="inline-flex items-center gap-1.5 rounded-lg bg-red-500/10 border border-red-500/30 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-500/20 transition disabled:opacity-50"
              >
                {disconnectMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Unplug className="h-3.5 w-3.5" />}
                Yes, disconnect
              </button>
              <button onClick={() => setConfirmDisconnect(false)} className="btn-ghost !py-1.5 !px-3 !text-xs">
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api";

const VISIBILITY_OPTIONS: { value: RepoVisibility; label: string; desc: string; icon: typeof Globe }[] = [
  { value: "PUBLIC", label: "Public", desc: "Anyone can view changelogs", icon: Globe },
  { value: "TOKEN_PROTECTED", label: "Token Protected", desc: "Requires access token to view", icon: ShieldCheck },
  { value: "PRIVATE", label: "Private", desc: "Only you can view changelogs", icon: Lock },
];

function SharingPanel({
  repo,
  onVisibilityChange,
  onRegenerateToken,
  onCopy,
  isUpdating,
  isRegenerating,
}: {
  repo: Repo;
  onVisibilityChange: (v: RepoVisibility) => void;
  onRegenerateToken: () => void;
  onCopy: (text: string, label: string) => void;
  isUpdating: boolean;
  isRegenerating: boolean;
}) {
  const [confirmRegen, setConfirmRegen] = useState(false);
  const tokenParam = repo.visibility === "TOKEN_PROTECTED" && repo.accessToken ? `?token=${repo.accessToken}` : "";
  const publicPageUrl = `${APP_URL}/changelog/${repo.slug}${tokenParam}`;
  const apiUrl = `${API_URL}/public/${repo.slug}/changelogs${tokenParam}`;
  const rssUrl = `${API_URL}/public/${repo.slug}/rss${tokenParam}`;

  return (
    <div className="mt-6 glass rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3.5 border-b border-glass-border flex items-center gap-2.5">
        <Share2 className="h-4 w-4 text-accent" />
        <span className="text-xs font-semibold text-txt uppercase tracking-wider">Sharing & Integration</span>
      </div>

      <div className="p-5 space-y-6">
        {/* Visibility Selector */}
        <div>
          <label className="block text-xs font-medium text-txt-secondary mb-3 uppercase tracking-wider">Changelog Visibility</label>
          <div className="grid grid-cols-3 gap-2">
            {VISIBILITY_OPTIONS.map((opt) => {
              const isActive = repo.visibility === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => !isActive && onVisibilityChange(opt.value)}
                  disabled={isUpdating}
                  className={`relative rounded-xl p-3.5 text-left transition-all duration-200 disabled:opacity-60 ${
                    isActive
                      ? "bg-accent-muted border border-accent/30"
                      : "glass glass-hover"
                  }`}
                >
                  <opt.icon className={`h-4 w-4 mb-2 ${isActive ? "text-accent" : "text-txt-faint"}`} />
                  <p className={`text-xs font-semibold ${isActive ? "text-accent" : "text-txt-secondary"}`}>{opt.label}</p>
                  <p className="text-[10px] text-txt-faint mt-0.5">{opt.desc}</p>
                  {isActive && isUpdating && (
                    <Loader2 className="absolute top-3 right-3 h-3 w-3 animate-spin text-accent" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Access Token */}
        {repo.visibility === "TOKEN_PROTECTED" && (
          <div>
            <label className="block text-xs font-medium text-txt-secondary mb-2 uppercase tracking-wider">Access Token</label>
            <div className="flex items-center gap-2">
              <div className="flex-1 flex items-center glass rounded-lg px-3.5 py-2.5">
                <code className="text-xs text-accent font-mono flex-1 truncate">{repo.accessToken || "—"}</code>
                <button
                  onClick={() => repo.accessToken && onCopy(repo.accessToken, "Token")}
                  className="ml-2 text-txt-faint hover:text-accent transition shrink-0"
                  title="Copy token"
                >
                  <Copy className="h-3.5 w-3.5" />
                </button>
              </div>
              {!confirmRegen ? (
                <button
                  onClick={() => setConfirmRegen(true)}
                  className="btn-ghost !py-2.5 !px-3 !text-[11px] shrink-0"
                  title="Regenerate token"
                >
                  <RefreshCcw className="h-3.5 w-3.5" />
                </button>
              ) : (
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => { onRegenerateToken(); setConfirmRegen(false); }}
                    disabled={isRegenerating}
                    className="inline-flex items-center gap-1 rounded-lg bg-red-500/10 border border-red-500/20 px-2.5 py-2 text-[11px] font-medium text-red-400 hover:bg-red-500/20 transition disabled:opacity-50"
                  >
                    {isRegenerating ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCcw className="h-3 w-3" />}
                    Confirm
                  </button>
                  <button onClick={() => setConfirmRegen(false)} className="btn-ghost !py-2 !px-2.5 !text-[11px]">
                    Cancel
                  </button>
                </div>
              )}
            </div>
            <p className="text-[10px] text-txt-faint mt-2">
              Regenerating the token will invalidate all existing integrations using the current token.
            </p>
          </div>
        )}

        {/* Shareable URLs */}
        {repo.visibility !== "PRIVATE" && (
          <div>
            <label className="block text-xs font-medium text-txt-secondary mb-3 uppercase tracking-wider">Endpoints</label>
            <div className="space-y-2">
              <CopyableUrl icon={<ExternalLink className="h-3.5 w-3.5" />} label="Changelog Page" url={publicPageUrl} onCopy={onCopy} />
              <CopyableUrl icon={<Code2 className="h-3.5 w-3.5" />} label="JSON API" url={apiUrl} onCopy={onCopy} />
              <CopyableUrl icon={<Rss className="h-3.5 w-3.5" />} label="RSS Feed" url={rssUrl} onCopy={onCopy} />
            </div>
          </div>
        )}

        {repo.visibility === "PRIVATE" && (
          <div className="flex items-start gap-3 rounded-xl bg-surface-200/50 p-4">
            <Lock className="h-4 w-4 text-txt-faint mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-medium text-txt-secondary">Changelogs are private</p>
              <p className="text-[10px] text-txt-faint mt-1">
                Public access is disabled. Only you can view changelogs from the dashboard. Switch to Public or Token Protected to share.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface AnalyticsData {
  totalViews: number;
  periodViews: number;
  days: number;
  dailyViews: { date: string; views: number }[];
  topChangelogs: { version: string; title: string; views: number }[];
  topReferrers: { referrer: string; views: number }[];
}

function AnalyticsPanel({ repoId }: { repoId: string }) {
  const [days, setDays] = useState(30);
  const { data, isLoading } = useQuery({
    queryKey: ["analytics", repoId, days],
    queryFn: () => api.get<AnalyticsData>(`/repos/${repoId}/analytics?days=${days}`),
  });

  const analytics = data?.data;
  const maxViews = analytics?.dailyViews ? Math.max(...analytics.dailyViews.map((d) => d.views), 1) : 1;

  return (
    <div className="mt-6 glass rounded-xl overflow-hidden">
      <div className="px-5 py-3.5 border-b border-glass-border flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <BarChart3 className="h-4 w-4 text-accent" />
          <span className="text-xs font-semibold text-txt uppercase tracking-wider">Analytics</span>
        </div>
        <div className="flex items-center gap-1">
          {[7, 30, 90].map((d) => (
            <button key={d} onClick={() => setDays(d)}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-medium transition ${days === d ? "bg-accent-muted text-accent border border-accent/30" : "glass glass-hover text-txt-faint"}`}>
              {d}d
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="p-10 flex justify-center"><Loader2 className="h-4 w-4 animate-spin text-txt-faint" /></div>
      ) : analytics ? (
        <div className="p-5 space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-3 gap-3">
            <div className="glass rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-txt">{analytics.totalViews.toLocaleString()}</p>
              <p className="text-[10px] text-txt-faint uppercase tracking-wider mt-1">Total Views</p>
            </div>
            <div className="glass rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-accent">{analytics.periodViews.toLocaleString()}</p>
              <p className="text-[10px] text-txt-faint uppercase tracking-wider mt-1">Last {days} Days</p>
            </div>
            <div className="glass rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-txt">{analytics.dailyViews.length > 0 ? Math.round(analytics.periodViews / analytics.dailyViews.length) : 0}</p>
              <p className="text-[10px] text-txt-faint uppercase tracking-wider mt-1">Avg / Day</p>
            </div>
          </div>

          {/* Daily Views Bar Chart */}
          {analytics.dailyViews.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-txt-secondary mb-3 uppercase tracking-wider flex items-center gap-1.5">
                <TrendingUp className="h-3.5 w-3.5" /> Daily Views
              </label>
              <div className="flex items-end gap-[2px] h-24">
                {analytics.dailyViews.map((d) => (
                  <div key={d.date} className="flex-1 group relative" title={`${d.date}: ${d.views} views`}>
                    <div className="bg-accent/30 hover:bg-accent/50 rounded-t transition-all"
                      style={{ height: `${Math.max((d.views / maxViews) * 100, 2)}%` }} />
                  </div>
                ))}
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-[9px] text-txt-faint">{analytics.dailyViews[0]?.date}</span>
                <span className="text-[9px] text-txt-faint">{analytics.dailyViews[analytics.dailyViews.length - 1]?.date}</span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-5">
            {/* Top Changelogs */}
            {analytics.topChangelogs.length > 0 && (
              <div>
                <label className="block text-xs font-medium text-txt-secondary mb-2 uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5" /> Top Changelogs
                </label>
                <div className="space-y-1">
                  {analytics.topChangelogs.map((c, i) => (
                    <div key={i} className="flex items-center justify-between glass rounded-lg px-3 py-2">
                      <div className="min-w-0">
                        <span className="text-xs font-mono font-semibold text-accent">{c.version}</span>
                        <span className="text-[10px] text-txt-faint ml-2 truncate">{c.title}</span>
                      </div>
                      <span className="text-[10px] text-txt-secondary font-medium shrink-0 ml-2">{c.views}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Top Referrers */}
            {analytics.topReferrers.length > 0 && (
              <div>
                <label className="block text-xs font-medium text-txt-secondary mb-2 uppercase tracking-wider flex items-center gap-1.5">
                  <Globe2 className="h-3.5 w-3.5" /> Top Referrers
                </label>
                <div className="space-y-1">
                  {analytics.topReferrers.map((r, i) => (
                    <div key={i} className="flex items-center justify-between glass rounded-lg px-3 py-2">
                      <span className="text-xs text-txt-secondary truncate">{r.referrer}</span>
                      <span className="text-[10px] text-txt-secondary font-medium shrink-0 ml-2">{r.views}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="p-10 text-center text-xs text-txt-faint">No analytics data yet</div>
      )}
    </div>
  );
}

function bumpVersion(tag: string, type: "major" | "minor" | "patch"): string {
  const clean = tag.replace(/^v/, "");
  const parts = clean.split(".").map(Number);
  if (parts.length < 3 || parts.some(isNaN)) return tag;
  if (type === "major") return `v${parts[0] + 1}.0.0`;
  if (type === "minor") return `v${parts[0]}.${parts[1] + 1}.0`;
  return `v${parts[0]}.${parts[1]}.${parts[2] + 1}`;
}

function VersionSuggestions({ tags, onSelect }: { tags: { name: string; sha: string }[]; onSelect: (v: string) => void }) {
  const latest = tags[0]?.name;
  if (!latest) return null;

  const suggestions = [
    { label: "Patch", version: bumpVersion(latest, "patch"), color: "text-green-400" },
    { label: "Minor", version: bumpVersion(latest, "minor"), color: "text-blue-400" },
    { label: "Major", version: bumpVersion(latest, "major"), color: "text-amber-400" },
  ];

  return (
    <div className="mt-2">
      <p className="text-[10px] text-txt-faint flex items-center gap-1 mb-1.5">
        <Tag className="h-3 w-3" /> Latest tag: <code className="text-accent font-mono">{latest}</code>
      </p>
      <div className="flex items-center gap-1.5">
        {suggestions.map((s) => (
          <button key={s.label} type="button" onClick={() => onSelect(s.version)}
            className="inline-flex items-center gap-1 rounded-lg glass glass-hover px-2 py-1 text-[10px] font-medium transition">
            <span className={s.color}>{s.label}</span>
            <code className="text-txt-secondary font-mono">{s.version}</code>
          </button>
        ))}
      </div>
    </div>
  );
}

const TONE_OPTIONS = [
  { value: "", label: "Default", desc: "Balanced product tone" },
  { value: "professional", label: "Professional", desc: "Formal & business-oriented" },
  { value: "casual", label: "Casual", desc: "Friendly & conversational" },
  { value: "technical", label: "Technical", desc: "Developer-focused details" },
  { value: "marketing", label: "Marketing", desc: "Enthusiastic & value-driven" },
];

const AUDIENCE_OPTIONS = [
  { value: "", label: "Default", desc: "General audience" },
  { value: "end-users", label: "End Users", desc: "Non-technical, benefits focus" },
  { value: "developers", label: "Developers", desc: "API changes, migration notes" },
  { value: "stakeholders", label: "Stakeholders", desc: "Business impact & ROI" },
  { value: "mixed", label: "Mixed", desc: "Balanced for all readers" },
];

const TEMPLATE_OPTIONS = [
  { value: "", label: "Default", desc: "AI decides the best format", icon: FileCode },
  { value: "whats-new", label: "What's New", desc: "Announcement style, celebratory", icon: Sparkles },
  { value: "release-notes", label: "Release Notes", desc: "Added, Changed, Fixed, Removed", icon: FileText },
  { value: "patch-notes", label: "Patch Notes", desc: "Gaming/software style", icon: FileCode },
  { value: "keep-a-changelog", label: "Keep a Changelog", desc: "keepachangelog.com standard", icon: FileText },
];

const LANGUAGE_OPTIONS = [
  { value: "", label: "English", flag: "🇺🇸" },
  { value: "tr", label: "Türkçe", flag: "🇹🇷" },
  { value: "de", label: "Deutsch", flag: "🇩🇪" },
  { value: "fr", label: "Français", flag: "🇫🇷" },
  { value: "es", label: "Español", flag: "🇪🇸" },
  { value: "pt", label: "Português", flag: "🇵🇹" },
  { value: "it", label: "Italiano", flag: "🇮🇹" },
  { value: "nl", label: "Nederlands", flag: "🇳🇱" },
  { value: "ja", label: "日本語", flag: "🇯🇵" },
  { value: "ko", label: "한국어", flag: "🇰🇷" },
  { value: "zh", label: "中文", flag: "🇨🇳" },
  { value: "ru", label: "Русский", flag: "🇷🇺" },
  { value: "ar", label: "العربية", flag: "🇸🇦" },
  { value: "pl", label: "Polski", flag: "🇵🇱" },
  { value: "uk", label: "Українська", flag: "🇺🇦" },
];

function AiSettingsPanel({ repo, onSave, isSaving }: { repo: Repo; onSave: (s: Record<string, unknown>) => void; isSaving: boolean }) {
  const s = repo.settings || {};
  const [tone, setTone] = useState((s.aiTone as string) || "");
  const [audience, setAudience] = useState((s.aiAudience as string) || "");
  const [template, setTemplate] = useState((s.changelogTemplate as string) || "");
  const [language, setLanguage] = useState((s.language as string) || "");

  const handleSave = () => onSave({ aiTone: tone, aiAudience: audience, changelogTemplate: template, language });

  return (
    <div className="mt-6 glass rounded-xl overflow-hidden">
      <div className="px-5 py-3.5 border-b border-glass-border flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Settings className="h-4 w-4 text-accent" />
          <span className="text-xs font-semibold text-txt uppercase tracking-wider">AI Generation Settings</span>
        </div>
        <button onClick={handleSave} disabled={isSaving} className="btn-primary !text-[11px] !py-1.5 !px-3 disabled:opacity-50">
          {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
          Save
        </button>
      </div>

      <div className="p-5 space-y-6">
        {/* Tone */}
        <div>
          <label className="block text-xs font-medium text-txt-secondary mb-3 uppercase tracking-wider flex items-center gap-1.5">
            <Mic className="h-3.5 w-3.5" /> Writing Tone
          </label>
          <div className="grid grid-cols-5 gap-2">
            {TONE_OPTIONS.map((opt) => {
              const isActive = tone === opt.value;
              return (
                <button key={opt.value} onClick={() => setTone(opt.value)}
                  className={`rounded-xl p-3 text-left transition-all duration-200 ${isActive ? "bg-accent-muted border border-accent/30" : "glass glass-hover"}`}>
                  <p className={`text-xs font-semibold ${isActive ? "text-accent" : "text-txt-secondary"}`}>{opt.label}</p>
                  <p className="text-[10px] text-txt-faint mt-0.5">{opt.desc}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Audience */}
        <div>
          <label className="block text-xs font-medium text-txt-secondary mb-3 uppercase tracking-wider flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5" /> Target Audience
          </label>
          <div className="grid grid-cols-5 gap-2">
            {AUDIENCE_OPTIONS.map((opt) => {
              const isActive = audience === opt.value;
              return (
                <button key={opt.value} onClick={() => setAudience(opt.value)}
                  className={`rounded-xl p-3 text-left transition-all duration-200 ${isActive ? "bg-accent-muted border border-accent/30" : "glass glass-hover"}`}>
                  <p className={`text-xs font-semibold ${isActive ? "text-accent" : "text-txt-secondary"}`}>{opt.label}</p>
                  <p className="text-[10px] text-txt-faint mt-0.5">{opt.desc}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Language */}
        <div>
          <label className="block text-xs font-medium text-txt-secondary mb-3 uppercase tracking-wider flex items-center gap-1.5">
            <Languages className="h-3.5 w-3.5" /> Output Language
          </label>
          <div className="grid grid-cols-5 gap-2">
            {LANGUAGE_OPTIONS.map((opt) => {
              const isActive = language === opt.value;
              return (
                <button key={opt.value} onClick={() => setLanguage(opt.value)}
                  className={`rounded-xl p-2.5 text-left transition-all duration-200 ${isActive ? "bg-accent-muted border border-accent/30" : "glass glass-hover"}`}>
                  <span className="text-sm">{opt.flag}</span>
                  <p className={`text-xs font-semibold mt-1 ${isActive ? "text-accent" : "text-txt-secondary"}`}>{opt.label}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Template */}
        <div>
          <label className="block text-xs font-medium text-txt-secondary mb-3 uppercase tracking-wider flex items-center gap-1.5">
            <FileCode className="h-3.5 w-3.5" /> Changelog Template
          </label>
          <div className="grid grid-cols-5 gap-2">
            {TEMPLATE_OPTIONS.map((opt) => {
              const isActive = template === opt.value;
              return (
                <button key={opt.value} onClick={() => setTemplate(opt.value)}
                  className={`rounded-xl p-3 text-left transition-all duration-200 ${isActive ? "bg-accent-muted border border-accent/30" : "glass glass-hover"}`}>
                  <opt.icon className={`h-3.5 w-3.5 mb-1.5 ${isActive ? "text-accent" : "text-txt-faint"}`} />
                  <p className={`text-xs font-semibold ${isActive ? "text-accent" : "text-txt-secondary"}`}>{opt.label}</p>
                  <p className="text-[10px] text-txt-faint mt-0.5">{opt.desc}</p>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function CopyableUrl({ icon, label, url, onCopy }: { icon: React.ReactNode; label: string; url: string; onCopy: (text: string, label: string) => void }) {
  return (
    <div className="flex items-center gap-2.5 glass rounded-lg px-3.5 py-2.5 group">
      <span className="text-txt-faint shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] text-txt-faint uppercase tracking-wider font-medium">{label}</p>
        <p className="text-xs text-txt-secondary font-mono truncate mt-0.5">{url}</p>
      </div>
      <button onClick={() => onCopy(url, label)} className="text-txt-faint hover:text-accent transition shrink-0 opacity-0 group-hover:opacity-100">
        <Copy className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
