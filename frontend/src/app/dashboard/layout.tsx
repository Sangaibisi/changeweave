"use client";

import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  LayoutDashboard, GitFork, FileText, Settings, LogOut, Loader2,
  PanelLeftClose, PanelLeft, Sparkles, BarChart3, Share2, Globe,
  Shield, ExternalLink, BookOpen, MessageSquare,
  HelpCircle, Bell
} from "lucide-react";
import { LogoMark } from "@/components/Logo";
import { useAuthStore } from "@/lib/store";
import { api } from "@/lib/api";
import { Repo } from "@/lib/types";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-surface"><Loader2 className="h-6 w-6 animate-spin text-accent" /></div>}>
      <DashboardLayoutInner>{children}</DashboardLayoutInner>
    </Suspense>
  );
}

function DashboardLayoutInner({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user, isAuthenticated, isLoading, loadUser, logout } = useAuthStore();
  const [collapsed, setCollapsed] = useState(false);
  const currentTab = searchParams.get("tab");

  useEffect(() => { loadUser(); }, [loadUser]);
  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.push("/login");
  }, [isLoading, isAuthenticated, router]);

  const { data: reposData } = useQuery({
    queryKey: ["repos"],
    queryFn: () => api.get<Repo[]>("/repos"),
    enabled: isAuthenticated,
    staleTime: 60000,
  });

  const repos = reposData?.data || [];
  const totalChangelogs = repos.reduce((sum, r) => sum + r.changelogCount, 0);
  const totalPending = repos.reduce((sum, r) => sum + r.unprocessedCommitCount, 0);
  const connectedProviders = [
    user?.githubConnected && "GitHub",
    user?.gitlabConnected && "GitLab",
    user?.bitbucketConnected && "Bitbucket",
  ].filter(Boolean);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <Loader2 className="h-6 w-6 animate-spin text-accent" />
      </div>
    );
  }
  if (!isAuthenticated) return null;

  const handleLogout = () => { logout(); router.push("/login"); };
  const sidebarWidth = collapsed ? "w-[68px]" : "w-64";

  const NavLink = ({ href, label, icon: Icon, badge, exact, activeMatch }: {
    href: string; label: string; icon: typeof LayoutDashboard; badge?: number | string; exact?: boolean;
    activeMatch?: string;
  }) => {
    let active = false;
    const url = new URL(href, "http://x");
    const hrefPath = url.pathname;
    const hrefTab = url.searchParams.get("tab");

    if (activeMatch) {
      active = pathname.startsWith(activeMatch);
    } else if (hrefTab) {
      active = pathname === hrefPath && currentTab === hrefTab;
    } else if (exact) {
      active = pathname === hrefPath && !currentTab;
    } else {
      active = (pathname === hrefPath && !currentTab) || pathname.startsWith(hrefPath + "/");
    }

    return (
      <Link href={href} title={collapsed ? label : undefined}
        className={`flex items-center gap-3 px-2.5 py-[7px] rounded-lg text-[13px] font-medium transition-all duration-150 group ${
          active ? "bg-accent-muted text-accent" : "text-txt-muted hover:text-txt-secondary hover:bg-surface-200/50"
        }`}>
        <Icon className="h-[17px] w-[17px] shrink-0" />
        {!collapsed && (
          <>
            <span className="flex-1">{label}</span>
            {badge !== undefined && badge !== 0 && (
              <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-md ${
                active ? "bg-accent/20 text-accent" : "bg-surface-200/80 text-txt-faint"
              }`}>{badge}</span>
            )}
          </>
        )}
      </Link>
    );
  };

  const SectionLabel = ({ label }: { label: string }) => {
    if (collapsed) return <div className="h-px bg-glass-border mx-2.5 my-2" />;
    return (
      <p className="text-[10px] font-semibold text-txt-faint/60 uppercase tracking-[0.08em] px-2.5 pt-4 pb-1.5">{label}</p>
    );
  };

  return (
    <div className="min-h-screen bg-surface">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 ${sidebarWidth} border-r border-glass-border bg-surface-50 flex flex-col transition-all duration-200 z-40`}>

        {/* Logo */}
        <div className="flex items-center justify-between px-4 h-14 border-b border-glass-border shrink-0">
          <div className="flex items-center gap-2.5">
            <LogoMark size={26} className="shrink-0" />
            {!collapsed && <span className="text-sm font-bold text-txt tracking-tight">ChangeWeave</span>}
          </div>
          {!collapsed && (
            <button onClick={() => setCollapsed(true)}
              className="p-1 rounded-md text-txt-faint hover:text-txt-muted hover:bg-surface-200/50 transition">
              <PanelLeftClose className="h-4 w-4" />
            </button>
          )}
          {collapsed && (
            <button onClick={() => setCollapsed(false)}
              className="p-1 rounded-md text-txt-faint hover:text-txt-muted hover:bg-surface-200/50 transition absolute left-5">
              <PanelLeft className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-2 py-1 overflow-y-auto sidebar-scroll">
          <SectionLabel label="Overview" />
          <NavLink href="/dashboard" label="Dashboard" icon={LayoutDashboard} exact />
          <NavLink href="/dashboard/changelogs" label="Changelogs" icon={FileText} badge={totalChangelogs || undefined} activeMatch="/dashboard/changelogs" />
          <NavLink href="/dashboard/repos" label="Repositories" icon={GitFork} badge={repos.length || undefined} exact />

          <SectionLabel label="Create" />
          <NavLink href="/dashboard/repos?tab=generate" label="Generate with AI" icon={Sparkles} badge={totalPending > 0 ? totalPending : undefined} />

          <SectionLabel label="Insights" />
          <NavLink href="/dashboard/repos?tab=analytics" label="Analytics" icon={BarChart3} />

          <SectionLabel label="Distribute" />
          <NavLink href="/dashboard/repos?tab=public" label="Public Pages" icon={Globe} />
          <NavLink href="/dashboard/repos?tab=sharing" label="Sharing & API" icon={Share2} />

          <SectionLabel label="Account" />
          <NavLink href="/dashboard/settings" label="Settings" icon={Settings} exact />
          <NavLink href="/dashboard/settings?tab=connections" label="Connections" icon={Shield} badge={connectedProviders.length || undefined} />

          {/* Provider Connection Status */}
          {!collapsed && connectedProviders.length > 0 && (
            <div className="px-2.5 py-2 mt-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                {connectedProviders.map((p) => (
                  <span key={p as string} className="inline-flex items-center gap-1 text-[10px] text-txt-faint bg-surface-200/40 rounded-md px-1.5 py-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                    {p}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Help & Resources */}
          <SectionLabel label="Resources" />
          {!collapsed ? (
            <div className="space-y-0.5">
              <a href="https://github.com/Sangaibisi/changeweave" target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-3 px-2.5 py-[7px] rounded-lg text-[13px] text-txt-faint hover:text-txt-muted hover:bg-surface-200/50 transition group">
                <BookOpen className="h-[17px] w-[17px] shrink-0" />
                <span className="flex-1">Documentation</span>
                <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition" />
              </a>
              <a href="https://github.com/Sangaibisi/changeweave/issues"
                className="flex items-center gap-3 px-2.5 py-[7px] rounded-lg text-[13px] text-txt-faint hover:text-txt-muted hover:bg-surface-200/50 transition">
                <MessageSquare className="h-[17px] w-[17px] shrink-0" />
                <span>Feedback</span>
              </a>
              <a href="https://github.com/Sangaibisi/changeweave" target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-3 px-2.5 py-[7px] rounded-lg text-[13px] text-txt-faint hover:text-txt-muted hover:bg-surface-200/50 transition group">
                <HelpCircle className="h-[17px] w-[17px] shrink-0" />
                <span className="flex-1">Help Center</span>
                <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition" />
              </a>
            </div>
          ) : (
            <div className="space-y-0.5">
              <a href="https://github.com/Sangaibisi/changeweave" target="_blank" rel="noopener noreferrer" title="Documentation"
                className="flex items-center justify-center px-2.5 py-[7px] rounded-lg text-txt-faint hover:text-txt-muted hover:bg-surface-200/50 transition">
                <BookOpen className="h-[17px] w-[17px]" />
              </a>
            </div>
          )}
        </nav>

        {/* User Profile & Logout */}
        <div className="border-t border-glass-border p-2.5">
          {!collapsed ? (
            <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-surface-200/30 transition group">
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-accent/30 to-accent/10 flex items-center justify-center text-xs font-bold text-accent shrink-0 ring-2 ring-accent/10">
                {user?.name?.charAt(0)?.toUpperCase() || "U"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-txt-secondary truncate">{user?.name || "User"}</p>
                <p className="text-[10px] text-txt-faint truncate">{user?.email}</p>
              </div>
              <button onClick={handleLogout} title="Log out"
                className="p-1 rounded-md text-txt-faint hover:text-red-400 hover:bg-red-400/10 transition opacity-0 group-hover:opacity-100">
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <div className="space-y-1">
              <div className="flex justify-center py-1">
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-accent/30 to-accent/10 flex items-center justify-center text-xs font-bold text-accent ring-2 ring-accent/10">
                  {user?.name?.charAt(0)?.toUpperCase() || "U"}
                </div>
              </div>
              <button onClick={handleLogout} title="Log out"
                className="flex items-center justify-center w-full py-[7px] rounded-lg text-txt-faint hover:text-red-400 hover:bg-red-400/5 transition">
                <LogOut className="h-[17px] w-[17px]" />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Main */}
      <main className={`${collapsed ? "ml-[68px]" : "ml-64"} transition-all duration-200`}>
        <div className="max-w-6xl mx-auto px-8 py-8">
          {children}
        </div>
      </main>
    </div>
  );
}
