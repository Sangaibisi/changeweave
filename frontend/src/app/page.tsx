"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowRight, GitBranch, Zap, Globe, BarChart3, Code2, Mail,
  ChevronRight, ShieldAlert, Layers, Cpu, Terminal, Blocks, Eye,
  Lock, ShieldCheck, Server, EyeOff
} from "lucide-react";
import { LogoMark } from "@/components/Logo";
import { ArchitectureDiagram } from "@/components/landing/ArchitectureDiagram";
import { BeforeAfter } from "@/components/landing/BeforeAfter";
import { TieredContextVisual } from "@/components/landing/TieredContextVisual";

const TERMINAL_LINES = [
  { type: "input", text: "git push origin main" },
  { type: "output", text: "Enumerating objects: 12, done." },
  { type: "accent", text: "→ Webhook received — analyzing changes" },
  { type: "output", text: "Fetching diffs for 4 commits..." },
  { type: "accent", text: "→ 4 files changed, +187 -42 lines" },
  { type: "accent", text: "→ 2 high-impact changes detected" },
  { type: "output", text: "Generating user-friendly release notes..." },
  { type: "result", text: "✓ Published: changelog.yourapp.com/v2.1.0" },
];

function TerminalAnimation() {
  const [visibleLines, setVisibleLines] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      setVisibleLines((prev) => (prev >= TERMINAL_LINES.length ? 0 : prev + 1));
    }, 650);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="glass rounded-xl overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-glass-border">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
          <div className="w-3 h-3 rounded-full bg-[#febc2e]" />
          <div className="w-3 h-3 rounded-full bg-[#28c840]" />
        </div>
        <span className="text-xs text-txt-muted font-mono ml-2">changeweave — analysis</span>
      </div>
      <div className="p-4 font-mono text-sm space-y-1.5 min-h-[240px]">
        {TERMINAL_LINES.slice(0, visibleLines).map((line, i) => (
          <div key={i} className="animate-fade-in flex items-start gap-2">
            {line.type === "input" && (
              <><span className="text-accent shrink-0">$</span><span className="text-txt">{line.text}</span></>
            )}
            {line.type === "output" && <span className="text-txt-muted pl-4">{line.text}</span>}
            {line.type === "accent" && <span className="text-accent pl-4">{line.text}</span>}
            {line.type === "result" && <span className="pl-4 text-green-400">{line.text}</span>}
          </div>
        ))}
        {visibleLines <= TERMINAL_LINES.length && (
          <div className="flex items-center gap-2">
            <span className="text-accent">$</span>
            <span className="w-2 h-4 bg-accent animate-blink" />
          </div>
        )}
      </div>
    </div>
  );
}

const CHECK = (
  <svg className="w-4 h-4 text-accent shrink-0" fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
  </svg>
);

export default function HomePage() {
  return (
    <div className="min-h-screen bg-surface noise-overlay">
      {/* ─── Navbar ──────────────────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-glass-border">
        <div className="flex items-center justify-between px-6 py-3.5 max-w-7xl mx-auto">
          <Link href="/" className="flex items-center gap-2.5">
            <LogoMark size={28} />
            <span className="text-base font-semibold text-txt tracking-tight">ChangeWeave</span>
          </Link>
          <div className="flex items-center gap-6">
            <Link href="#problem" className="text-sm text-txt-secondary hover:text-txt transition hidden md:block">Why</Link>
            <Link href="#how" className="text-sm text-txt-secondary hover:text-txt transition hidden md:block">How</Link>
            <Link href="#architecture" className="text-sm text-txt-secondary hover:text-txt transition hidden md:block">Architecture</Link>
            <Link href="#features" className="text-sm text-txt-secondary hover:text-txt transition hidden md:block">Features</Link>
            <a href="https://github.com/Sangaibisi/changeweave" target="_blank" rel="noopener noreferrer" className="text-sm text-txt-secondary hover:text-txt transition hidden md:block">GitHub</a>
            <Link href="/login" className="text-sm text-txt-secondary hover:text-txt transition">Log in</Link>
            <Link href="/register" className="btn-primary text-sm !py-2 !px-3.5">
              Get Started <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </nav>

      {/* ─── Hero ────────────────────────────────────────── */}
      <section className="relative min-h-screen flex items-center justify-center mesh-gradient pt-16">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] rounded-full bg-accent/[0.04] blur-[120px] animate-mesh-1" />
          <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] rounded-full bg-cyan-400/[0.03] blur-[100px] animate-mesh-2" />
          <div className="absolute top-1/2 left-1/2 w-[400px] h-[400px] rounded-full bg-purple-400/[0.025] blur-[80px] animate-mesh-3" />
        </div>

        <div className="relative z-10 max-w-6xl mx-auto px-6 grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <div className="badge-lime mb-6 w-fit">
              <span className="w-1.5 h-1.5 rounded-full bg-accent mr-2 animate-pulse" />
              AI that reads your code, not just your commits
            </div>

            <h1 className="text-5xl sm:text-6xl lg:text-[4.2rem] font-extrabold tracking-tight leading-[1.05]">
              <span className="text-gradient">Changelogs</span>
              <br />
              <span className="text-gradient">powered by</span>
              <br />
              <span className="text-gradient-accent">actual code diffs</span>
            </h1>

            <p className="mt-6 text-lg text-txt-secondary leading-relaxed max-w-lg">
              ChangeWeave analyzes your code changes at the <strong className="text-txt">line-of-code level</strong> — not
              just commit messages — to generate release notes your users actually understand. Even
              <code className="text-accent text-sm mx-1">&quot;fix stuff&quot;</code> becomes meaningful.
            </p>

            <div className="mt-10 flex items-center gap-4">
              <Link href="/register" className="btn-primary !px-6 !py-3 text-base">
                Start Free <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="#how" className="btn-ghost !px-6 !py-3 text-base">
                See How It Works
              </Link>
            </div>

            <div className="mt-10 flex flex-wrap items-center gap-6 text-sm text-txt-muted">
              <span className="flex items-center gap-1.5">{CHECK} No credit card</span>
              <span className="flex items-center gap-1.5">{CHECK} 5 min setup</span>
              <span className="flex items-center gap-1.5">{CHECK} LOC-level analysis</span>
            </div>
          </div>

          <div className="hidden lg:block">
            <TerminalAnimation />
          </div>
        </div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10">
          <ChevronRight className="h-5 w-5 text-txt-faint rotate-90 animate-bounce" />
        </div>
      </section>

      {/* ─── Problem / Solution ──────────────────────────── */}
      <section id="problem" className="max-w-6xl mx-auto px-6 py-32">
        <div className="text-center mb-16">
          <span className="badge-lime mb-4 inline-flex">The Problem</span>
          <h2 className="text-4xl sm:text-5xl font-bold tracking-tight text-gradient">
            Commit messages lie.
          </h2>
          <p className="mt-4 text-txt-secondary text-lg max-w-2xl mx-auto">
            Most changelog tools just beautify commit messages. But when your team writes
            <code className="text-accent text-sm mx-1">&quot;wip&quot;</code>,
            <code className="text-accent text-sm mx-1">&quot;fix stuff&quot;</code>, or
            <code className="text-accent text-sm mx-1">&quot;asdf&quot;</code> — those tools produce garbage.
            ChangeWeave reads the <strong className="text-txt">actual code</strong>.
          </p>
        </div>
        <BeforeAfter />
      </section>

      {/* ─── How It Works (Detailed) ────────────────────── */}
      <section id="how" className="max-w-5xl mx-auto px-6 py-32">
        <div className="text-center mb-16">
          <span className="badge-lime mb-4 inline-flex">How it works</span>
          <h2 className="text-4xl sm:text-5xl font-bold tracking-tight text-gradient">
            From git push to polished changelog
          </h2>
          <p className="mt-4 text-txt-secondary text-lg max-w-2xl mx-auto">
            Three steps. Five minutes. No commit discipline required.
          </p>
        </div>

        <div className="space-y-5">
          {[
            {
              step: "01", title: "Connect your repo",
              desc: "Link your GitHub repository with one OAuth click. We set up webhooks automatically to capture every push event.",
              mono: "github.com/acme/app → webhook active",
              icon: <GitBranch className="h-5 w-5 text-accent" />,
            },
            {
              step: "02", title: "We analyze your code changes — securely",
              desc: "Our analysis engine fetches only the changed lines from GitHub API — not your entire codebase. It detects categories, impact levels, and breaking changes. Your source code is never stored on our servers.",
              mono: "src/auth/session.ts → +12 -3 → Impact: HIGH",
              icon: <ShieldCheck className="h-5 w-5 text-accent" />,
            },
            {
              step: "03", title: "AI writes your release notes",
              desc: "The AI receives a structured summary — file names, change statistics, and only the minimal code context needed. It produces polished, categorized release notes your users actually understand.",
              mono: "structured summary → AI → polished markdown changelog",
              icon: <Zap className="h-5 w-5 text-accent" />,
            },
            {
              step: "04", title: "Review & publish",
              desc: "Edit the draft in our Markdown editor, then publish. Your changelog goes live at a custom URL with SEO, RSS feed, and Open Graph tags.",
              mono: "changelog.acme.com/v2.1.0 → live ✓",
              icon: <Globe className="h-5 w-5 text-accent" />,
            },
          ].map((item) => (
            <div key={item.step} className="glass glass-hover rounded-2xl p-6 sm:p-8 flex items-start gap-5 transition-all duration-300">
              <div className="flex flex-col items-center gap-2 shrink-0">
                <span className="text-2xl font-bold text-accent font-mono">{item.step}</span>
                <div className="w-10 h-10 rounded-xl bg-accent-muted flex items-center justify-center">{item.icon}</div>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-txt mb-1">{item.title}</h3>
                <p className="text-txt-secondary text-sm mb-3 leading-relaxed">{item.desc}</p>
                <code className="text-xs font-mono text-accent/80 bg-accent-muted rounded-md px-2.5 py-1 inline-block">{item.mono}</code>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Tiered Context Engine ───────────────────────── */}
      <section className="max-w-5xl mx-auto px-6 py-32">
        <div className="text-center mb-16">
          <span className="badge-lime mb-4 inline-flex">Intelligence</span>
          <h2 className="text-4xl sm:text-5xl font-bold tracking-tight text-gradient">
            Tiered Context Engine
          </h2>
          <p className="mt-4 text-txt-secondary text-lg max-w-2xl mx-auto">
            We don&apos;t dump entire diffs into the AI. Our token budget algorithm
            intelligently selects the right level of detail for each commit.
          </p>
        </div>
        <TieredContextVisual />
      </section>

      {/* ─── Security & Trust ──────────────────────────── */}
      <section id="architecture" className="max-w-6xl mx-auto px-6 py-32">
        <div className="text-center mb-16">
          <span className="badge-lime mb-4 inline-flex">Security</span>
          <h2 className="text-4xl sm:text-5xl font-bold tracking-tight text-gradient">
            Your code stays private
          </h2>
          <p className="mt-4 text-txt-secondary text-lg max-w-2xl mx-auto">
            We built ChangeWeave with a privacy-first architecture.
            Your codebase is never stored, and the AI only sees the minimum data needed to write great release notes.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-5 mb-8">
          <div className="glass glass-hover rounded-2xl p-8 transition-all duration-300">
            <div className="w-10 h-10 rounded-xl bg-accent-muted flex items-center justify-center mb-5">
              <EyeOff className="h-5 w-5 text-accent" />
            </div>
            <h3 className="text-xl font-semibold text-txt mb-2">Zero Code Storage</h3>
            <p className="text-txt-secondary text-sm leading-relaxed">
              We never store your source code. Our analysis engine processes changes in real-time
              and discards the data immediately after generating your changelog.
              Only commit messages and metadata are saved in our database.
            </p>
          </div>

          <div className="glass glass-hover rounded-2xl p-8 transition-all duration-300">
            <div className="w-10 h-10 rounded-xl bg-accent-muted flex items-center justify-center mb-5">
              <Lock className="h-5 w-5 text-accent" />
            </div>
            <h3 className="text-xl font-semibold text-txt mb-2">Minimal Data to AI</h3>
            <p className="text-txt-secondary text-sm leading-relaxed">
              The AI never sees your full codebase. Our analysis engine pre-processes everything
              and sends only structured summaries — file names, change statistics, and minimal
              diff context. A smart token budget ensures the least amount of data leaves your pipeline.
            </p>
          </div>

          <div className="glass glass-hover rounded-2xl p-8 transition-all duration-300">
            <div className="w-10 h-10 rounded-xl bg-accent-muted flex items-center justify-center mb-5">
              <ShieldCheck className="h-5 w-5 text-accent" />
            </div>
            <h3 className="text-xl font-semibold text-txt mb-2">GitHub Permissions Only</h3>
            <p className="text-txt-secondary text-sm leading-relaxed">
              We request read-only access to your repositories — nothing more.
              All data is fetched through GitHub&apos;s official API with your OAuth token.
              You can revoke access at any time from your GitHub settings.
            </p>
          </div>

          <div className="glass glass-hover rounded-2xl p-8 transition-all duration-300">
            <div className="w-10 h-10 rounded-xl bg-accent-muted flex items-center justify-center mb-5">
              <Server className="h-5 w-5 text-accent" />
            </div>
            <h3 className="text-xl font-semibold text-txt mb-2">Self-Host Option</h3>
            <p className="text-txt-secondary text-sm leading-relaxed">
              Need full control? Deploy ChangeWeave on your own infrastructure.
              The entire analysis engine runs in a Docker container — your code never leaves your network.
              Available on Enterprise plan.
            </p>
          </div>
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          <div className="glass rounded-xl p-5 text-center">
            <p className="text-2xl font-bold text-accent font-mono">0</p>
            <p className="text-xs text-txt-secondary mt-1">Lines of Code Stored</p>
            <p className="text-[10px] text-txt-faint mt-0.5">Only metadata persists in our DB</p>
          </div>
          <div className="glass rounded-xl p-5 text-center">
            <p className="text-2xl font-bold text-cyan-400 font-mono">Read-only</p>
            <p className="text-xs text-txt-secondary mt-1">GitHub Access</p>
            <p className="text-[10px] text-txt-faint mt-0.5">No write permissions, ever</p>
          </div>
          <div className="glass rounded-xl p-5 text-center">
            <p className="text-2xl font-bold text-purple-400 font-mono">~5%</p>
            <p className="text-xs text-txt-secondary mt-1">Of Your Diff Reaches AI</p>
            <p className="text-[10px] text-txt-faint mt-0.5">Smart token budget minimizes exposure</p>
          </div>
        </div>
      </section>

      {/* ─── Features Bento ──────────────────────────────── */}
      <section id="features" className="max-w-6xl mx-auto px-6 py-32">
        <div className="text-center mb-16">
          <span className="badge-lime mb-4 inline-flex">Features</span>
          <h2 className="text-4xl sm:text-5xl font-bold tracking-tight text-gradient">
            Beyond commit messages
          </h2>
          <p className="mt-4 text-txt-secondary text-lg max-w-xl mx-auto">
            Every feature is powered by real code analysis.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          <div className="md:col-span-4 glass glass-hover rounded-2xl p-8 transition-all duration-300">
            <div className="w-10 h-10 rounded-xl bg-accent-muted flex items-center justify-center mb-5">
              <Layers className="h-5 w-5 text-accent" />
            </div>
            <h3 className="text-xl font-semibold text-txt mb-2">LOC-Level Code Analysis</h3>
            <p className="text-txt-secondary text-sm leading-relaxed max-w-md">
              We fetch actual file diffs from GitHub — every added line, every deleted line.
              The AI sees <em>what your code does</em>, not just what your commit message says.
              Even <code className="text-accent text-xs">&quot;fix stuff&quot;</code> gets properly categorized.
            </p>
            <div className="mt-5 font-mono text-xs text-txt-muted glass rounded-lg p-3 inline-flex items-center gap-2">
              <span className="text-green-400">+12</span>
              <span className="text-red-400">-3</span>
              <span className="text-txt-faint">src/auth/session.ts → Impact: HIGH</span>
            </div>
          </div>

          <div className="md:col-span-2 glass glass-hover rounded-2xl p-8 transition-all duration-300 relative overflow-hidden">
            <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-amber-400/[0.06] blur-[40px]" />
            <div className="relative">
              <div className="w-10 h-10 rounded-xl bg-amber-400/10 flex items-center justify-center mb-5">
                <ShieldAlert className="h-5 w-5 text-amber-400" />
              </div>
              <h3 className="text-xl font-semibold text-txt mb-2">Breaking Change Detection</h3>
              <p className="text-txt-secondary text-sm leading-relaxed">
                Detects removed exports, changed function signatures, altered API routes, and schema migrations — automatically.
              </p>
            </div>
          </div>

          <div className="md:col-span-2 glass glass-hover rounded-2xl p-8 transition-all duration-300">
            <div className="w-10 h-10 rounded-xl bg-accent-muted flex items-center justify-center mb-5">
              <Blocks className="h-5 w-5 text-accent" />
            </div>
            <h3 className="text-xl font-semibold text-txt mb-2">Module Mapping</h3>
            <p className="text-txt-secondary text-sm leading-relaxed">
              Files are grouped into logical modules (auth, payments, UI). Changes are summarized by feature, not by file.
            </p>
          </div>

          <div className="md:col-span-4 glass glass-hover rounded-2xl p-8 transition-all duration-300">
            <div className="w-10 h-10 rounded-xl bg-accent-muted flex items-center justify-center mb-5">
              <GitBranch className="h-5 w-5 text-accent" />
            </div>
            <h3 className="text-xl font-semibold text-txt mb-2">Git Provider Integration</h3>
            <p className="text-txt-secondary text-sm leading-relaxed max-w-md">
              One-click GitHub connection with automatic webhook setup. GitLab and Bitbucket support coming soon.
              Every push, tag, and release event is captured and processed.
            </p>
            <div className="mt-5 flex items-center gap-3">
              <div className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-xs text-txt-muted font-mono">webhook → code analysis → changelog draft</span>
            </div>
          </div>

          <div className="md:col-span-3 glass glass-hover rounded-2xl p-8 transition-all duration-300">
            <div className="w-10 h-10 rounded-xl bg-cyan-400/10 flex items-center justify-center mb-5">
              <Terminal className="h-5 w-5 text-cyan-400" />
            </div>
            <h3 className="text-xl font-semibold text-txt mb-2">IDE Integration</h3>
            <p className="text-txt-secondary text-sm leading-relaxed">
              Use from Windsurf, Cursor, or Claude Desktop via MCP protocol.
              <code className="text-cyan-400 text-xs block mt-1">npx changeweave-mcp</code>
            </p>
          </div>

          <div className="md:col-span-3 glass glass-hover rounded-2xl p-8 transition-all duration-300">
            <div className="w-10 h-10 rounded-xl bg-accent-muted flex items-center justify-center mb-5">
              <Eye className="h-5 w-5 text-accent" />
            </div>
            <h3 className="text-xl font-semibold text-txt mb-2">Impact Scoring</h3>
            <p className="text-txt-secondary text-sm leading-relaxed">
              Each commit scored by module weight × change magnitude.
              Auth changes rank higher than test refactors. Critical paths are flagged.
            </p>
          </div>

          <div className="md:col-span-2 glass glass-hover rounded-2xl p-8 transition-all duration-300">
            <div className="w-10 h-10 rounded-xl bg-accent-muted flex items-center justify-center mb-5">
              <Globe className="h-5 w-5 text-accent" />
            </div>
            <h3 className="text-xl font-semibold text-txt mb-2">Public Pages</h3>
            <p className="text-txt-secondary text-sm leading-relaxed">
              SEO-optimized changelog at your custom domain. RSS + Open Graph included.
            </p>
          </div>

          <div className="md:col-span-2 glass glass-hover rounded-2xl p-8 transition-all duration-300">
            <div className="w-10 h-10 rounded-xl bg-accent-muted flex items-center justify-center mb-5">
              <Code2 className="h-5 w-5 text-accent" />
            </div>
            <h3 className="text-xl font-semibold text-txt mb-2">In-App Widget</h3>
            <p className="text-txt-secondary text-sm leading-relaxed">
              10KB SDK. Shadow DOM isolation. Show changelogs right inside your app.
            </p>
          </div>

          <div className="md:col-span-2 glass glass-hover rounded-2xl p-8 transition-all duration-300">
            <div className="w-10 h-10 rounded-xl bg-accent-muted flex items-center justify-center mb-5">
              <BarChart3 className="h-5 w-5 text-accent" />
            </div>
            <h3 className="text-xl font-semibold text-txt mb-2">Analytics</h3>
            <p className="text-txt-secondary text-sm leading-relaxed">
              Track views, engagement, and understand what users care about.
            </p>
          </div>
        </div>
      </section>

      {/* ─── Open Source ─────────────────────────────────── */}
      <section id="open-source" className="max-w-4xl mx-auto px-6 py-32 text-center">
        <span className="badge-lime mb-4 inline-flex">Open Source</span>
        <h2 className="text-4xl sm:text-5xl font-bold tracking-tight text-gradient mb-4">
          Free and self-hostable
        </h2>
        <p className="mt-4 text-txt-secondary text-lg max-w-2xl mx-auto">
          ChangeWeave is MIT-licensed. Run it on your own infrastructure — no usage limits,
          no vendor lock-in, full control of your data.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
          <a href="https://github.com/Sangaibisi/changeweave" target="_blank" rel="noopener noreferrer" className="btn-primary !px-6 !py-3">
            View on GitHub <ArrowRight className="h-4 w-4" />
          </a>
          <a href="https://github.com/Sangaibisi/changeweave#quick-start-docker" target="_blank" rel="noopener noreferrer" className="btn-ghost !px-6 !py-3">
            Quick Start
          </a>
        </div>
      </section>

      {/* ─── CTA ─────────────────────────────────────────── */}
      <section className="max-w-4xl mx-auto px-6 py-32">
        <div className="glass-accent rounded-2xl p-12 sm:p-16 text-center relative overflow-hidden">
          <div className="absolute -top-20 -left-20 w-64 h-64 rounded-full bg-accent/[0.06] blur-[80px]" />
          <div className="absolute -bottom-20 -right-20 w-64 h-64 rounded-full bg-cyan-400/[0.04] blur-[80px]" />
          <div className="relative z-10">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-txt mb-4">
              Your code tells a story.<br />Let AI write it.
            </h2>
            <p className="text-txt-secondary text-lg max-w-lg mx-auto mb-8">
              Stop spending hours writing changelogs. Stop depending on perfect commit messages.
              Let ChangeWeave read your diffs and generate release notes that actually make sense.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/register" className="btn-primary !px-8 !py-3.5 text-base">
                Start Free <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="#architecture" className="btn-ghost !px-6 !py-3 text-base">
                See How We Protect Your Code
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Footer ──────────────────────────────────────── */}
      <footer className="border-t border-glass-border py-10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid sm:grid-cols-4 gap-8 mb-8">
            <div className="sm:col-span-2">
              <div className="flex items-center gap-2.5 mb-3">
                <LogoMark size={24} />
                <span className="text-sm font-semibold text-txt">ChangeWeave</span>
              </div>
              <p className="text-xs text-txt-muted leading-relaxed max-w-xs">
                AI-powered changelog platform that analyzes actual code diffs
                to generate release notes your users understand. Privacy-first architecture.
              </p>
            </div>
            <div>
              <h4 className="text-xs font-semibold text-txt-secondary uppercase tracking-wider mb-3">Product</h4>
              <div className="space-y-2">
                <Link href="#features" className="block text-sm text-txt-muted hover:text-txt transition">Features</Link>
                <a href="https://github.com/Sangaibisi/changeweave" target="_blank" rel="noopener noreferrer" className="block text-sm text-txt-muted hover:text-txt transition">GitHub</a>
                <Link href="#architecture" className="block text-sm text-txt-muted hover:text-txt transition">Architecture</Link>
                <Link href="#how" className="block text-sm text-txt-muted hover:text-txt transition">How it Works</Link>
              </div>
            </div>
            <div>
              <h4 className="text-xs font-semibold text-txt-secondary uppercase tracking-wider mb-3">Developers</h4>
              <div className="space-y-2">
                <span className="block text-sm text-txt-muted">MCP Server Docs</span>
                <span className="block text-sm text-txt-muted">API Reference</span>
                <span className="block text-sm text-txt-muted">Widget SDK</span>
                <span className="block text-sm text-txt-muted">GitHub</span>
              </div>
            </div>
          </div>
          <div className="border-t border-glass-border pt-6 flex items-center justify-between">
            <p className="text-xs text-txt-faint">&copy; 2026 ChangeWeave. All rights reserved.</p>
            <div className="flex items-center gap-4 text-xs text-txt-faint">
              <span>Privacy</span>
              <span>Terms</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
