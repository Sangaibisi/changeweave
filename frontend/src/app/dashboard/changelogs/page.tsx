"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Repo } from "@/lib/types";
import { FileText, Loader2, ArrowUpRight } from "lucide-react";
import Link from "next/link";

export default function ChangelogsOverviewPage() {
  const { data, isLoading } = useQuery({ queryKey: ["repos"], queryFn: () => api.get<Repo[]>("/repos") });
  const repos = data?.data || [];

  return (
    <div>
      <h1 className="text-2xl font-bold text-txt tracking-tight">Changelogs</h1>
      <p className="mt-1 text-sm text-txt-muted">Select a repository to manage its changelogs</p>

      <div className="mt-8">
        {isLoading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-5 w-5 animate-spin text-txt-faint" /></div>
        ) : repos.length === 0 ? (
          <div className="glass rounded-2xl p-16 text-center">
            <div className="w-12 h-12 rounded-xl bg-surface-200 flex items-center justify-center mx-auto mb-4">
              <FileText className="h-6 w-6 text-txt-faint" />
            </div>
            <h3 className="text-sm font-semibold text-txt">No repositories connected</h3>
            <p className="mt-2 text-sm text-txt-muted max-w-xs mx-auto">Connect a repository first to start creating changelogs.</p>
            <Link href="/dashboard/repos" className="btn-primary mt-6 inline-flex">Go to Repositories</Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {repos.map((repo) => (
              <Link key={repo.id} href={`/dashboard/repos/${repo.id}`}
                className="glass glass-hover rounded-xl p-5 transition-all duration-200 group">
                <div className="flex items-center justify-between mb-4">
                  <div className="h-9 w-9 rounded-lg bg-accent-muted flex items-center justify-center">
                    <FileText className="h-4 w-4 text-accent" />
                  </div>
                  <ArrowUpRight className="h-3.5 w-3.5 text-txt-faint group-hover:text-accent transition" />
                </div>
                <p className="text-sm font-medium text-txt truncate group-hover:text-accent transition">{repo.fullName}</p>
                <div className="flex items-center justify-between mt-3 text-xs text-txt-faint">
                  <span className="font-mono">{repo.changelogCount} logs</span>
                  {repo.unprocessedCommitCount > 0 && <span className="badge-amber text-[10px]">{repo.unprocessedCommitCount} pending</span>}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
