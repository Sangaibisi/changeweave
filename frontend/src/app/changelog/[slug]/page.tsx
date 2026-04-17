"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { Zap, Rss, ArrowLeft, ShieldAlert } from "lucide-react";
import { MarkdownRenderer } from "@/components/markdown-renderer";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api";

interface PublicChangelog {
  id: string;
  version: string;
  title: string;
  content: string | null;
  slug: string;
  publishedAt: string;
  viewCount: number;
}

export default function PublicChangelogPage() {
  const { slug } = useParams<{ slug: string }>();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [changelogs, setChangelogs] = useState<PublicChangelog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [accessDenied, setAccessDenied] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const tokenParam = token ? `&token=${encodeURIComponent(token)}` : "";

  useEffect(() => {
    fetch(`${API_URL}/public/${slug}/changelogs?size=50${tokenParam}`)
      .then((r) => {
        if (r.status === 400 || r.status === 403) { setAccessDenied(true); return null; }
        if (!r.ok) throw new Error("Failed to load");
        return r.json();
      })
      .then((res) => {
        if (!res) return;
        const items = res.data?.content || [];
        setChangelogs(items);
        if (items.length > 0) setSelectedId(items[0].id);
      })
      .catch(() => setError("Failed to load changelogs."))
      .finally(() => setLoading(false));
  }, [slug, tokenParam]);

  const selected = changelogs.find((c) => c.id === selectedId);

  if (loading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (accessDenied) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="text-center max-w-sm">
          <div className="w-12 h-12 rounded-xl bg-amber-400/10 flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="h-6 w-6 text-amber-400" />
          </div>
          <h1 className="text-xl font-bold text-txt mb-2">Access Denied</h1>
          <p className="text-txt-muted text-sm">This changelog requires a valid access token. Please check the URL or contact the project owner.</p>
          <Link href="/" className="btn-ghost mt-6 inline-flex !text-xs"><ArrowLeft className="h-3.5 w-3.5" /> Home</Link>
        </div>
      </div>
    );
  }

  if (error || changelogs.length === 0) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-txt mb-2">{error ? "Error" : "No changelogs yet"}</h1>
          <p className="text-txt-muted text-sm">{error || "This project hasn't published any changelogs."}</p>
          <Link href="/" className="btn-ghost mt-6 inline-flex !text-xs"><ArrowLeft className="h-3.5 w-3.5" /> Home</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface">
      {/* Header */}
      <header className="border-b border-glass-border">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-accent flex items-center justify-center">
              <Zap className="h-4 w-4 text-surface" />
            </div>
            <div>
              <h1 className="text-sm font-semibold text-txt">{slug}</h1>
              <p className="text-[10px] text-txt-faint">Changelog</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <a href={`${API_URL}/public/${slug}/rss${token ? `?token=${encodeURIComponent(token)}` : ""}`} className="btn-ghost !py-1.5 !px-2.5 !text-[11px]" title="RSS Feed">
              <Rss className="h-3.5 w-3.5" /> RSS
            </a>
            <a href="/" className="text-[11px] text-txt-faint hover:text-accent transition">
              Powered by <span className="font-semibold">ChangeWeave</span>
            </a>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-10 grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-10">
        {/* Sidebar - Version list */}
        <aside className="hidden lg:block">
          <h2 className="text-xs font-semibold text-txt-secondary uppercase tracking-wider mb-4">Releases</h2>
          <nav className="space-y-1">
            {changelogs.map((cl) => (
              <button
                key={cl.id}
                onClick={() => setSelectedId(cl.id)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all duration-150 ${
                  selectedId === cl.id
                    ? "bg-accent-muted text-accent font-medium"
                    : "text-txt-muted hover:text-txt-secondary hover:bg-surface-200/50"
                }`}
              >
                <span className="font-mono text-xs">{cl.version}</span>
                <p className="text-[10px] text-txt-faint mt-0.5 truncate">{cl.title}</p>
              </button>
            ))}
          </nav>
        </aside>

        {/* Main content */}
        <main>
          {/* Mobile version selector */}
          <div className="lg:hidden mb-6">
            <select
              value={selectedId || ""}
              onChange={(e) => setSelectedId(e.target.value)}
              className="input-dark !py-2 font-mono text-sm"
            >
              {changelogs.map((cl) => (
                <option key={cl.id} value={cl.id}>{cl.version} — {cl.title}</option>
              ))}
            </select>
          </div>

          {selected && (
            <article>
              <div className="flex items-center gap-3 mb-2">
                <span className="font-mono text-2xl font-bold text-txt">{selected.version}</span>
                <span className="badge-lime text-[10px]">Published</span>
              </div>
              <h2 className="text-lg text-txt-secondary mb-1">{selected.title}</h2>
              <p className="text-xs text-txt-faint mb-8">
                {formatDistanceToNow(new Date(selected.publishedAt), { addSuffix: true })}
                {" · "}{selected.viewCount} views
              </p>

              <div className="glass rounded-xl p-6 sm:p-8">
                <MarkdownRenderer content={selected.content || "*No content yet.*"} />
              </div>
            </article>
          )}
        </main>
      </div>

      {/* Footer */}
      <footer className="border-t border-glass-border mt-20 py-6">
        <div className="max-w-5xl mx-auto px-6 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2 text-txt-faint hover:text-accent transition">
            <div className="w-4 h-4 rounded bg-accent/20 flex items-center justify-center">
              <Zap className="h-2.5 w-2.5 text-accent" />
            </div>
            <span className="text-[11px] font-medium">Powered by ChangeWeave</span>
          </a>
          <p className="text-[10px] text-txt-faint">{slug}</p>
        </div>
      </footer>
    </div>
  );
}
