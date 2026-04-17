"use client";

export function BeforeAfter() {
  return (
    <div className="grid md:grid-cols-2 gap-6">
      {/* Before */}
      <div className="glass rounded-2xl overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-glass-border bg-red-500/[0.03]">
          <div className="w-2 h-2 rounded-full bg-red-400/60" />
          <span className="text-xs text-red-400/80 font-medium">Without ChangeWeave</span>
        </div>
        <div className="p-5 space-y-4">
          <div className="space-y-2 font-mono text-xs">
            <p className="text-txt-muted">$ git log --oneline</p>
            <p className="text-txt-faint">a1b2c3d fix stuff</p>
            <p className="text-txt-faint">e4f5g6h wip</p>
            <p className="text-txt-faint">i7j8k9l update auth</p>
            <p className="text-txt-faint">m0n1o2p refactor</p>
            <p className="text-txt-faint">q3r4s5t misc changes</p>
          </div>
          <div className="border-t border-glass-border pt-4">
            <p className="text-xs text-txt-muted mb-2">Generated changelog:</p>
            <div className="glass rounded-lg p-3 space-y-1.5">
              <p className="text-xs text-txt-faint">- Fix stuff</p>
              <p className="text-xs text-txt-faint">- Wip</p>
              <p className="text-xs text-txt-faint">- Update auth</p>
              <p className="text-xs text-txt-faint">- Refactor</p>
              <p className="text-xs text-txt-faint">- Misc changes</p>
            </div>
            <p className="mt-3 text-xs text-red-400/70 italic">Useless. No one understands what changed.</p>
          </div>
        </div>
      </div>

      {/* After */}
      <div className="glass rounded-2xl overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-glass-border bg-accent/[0.03]">
          <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
          <span className="text-xs text-accent font-medium">With ChangeWeave</span>
        </div>
        <div className="p-5 space-y-4">
          <div className="space-y-2 font-mono text-xs">
            <p className="text-txt-muted">Analyzing actual code diffs...</p>
            <p className="text-accent/60">src/auth/session.ts <span className="text-green-400">+12</span> <span className="text-red-400">-3</span></p>
            <p className="text-accent/60">src/payments/checkout.ts <span className="text-green-400">+45</span> <span className="text-red-400">-8</span></p>
            <p className="text-accent/60">src/ui/theme.ts <span className="text-green-400">+120</span> <span className="text-red-400">-30</span></p>
            <p className="text-txt-muted mt-1">Tiered context → GPT-4o-mini → polished output</p>
          </div>
          <div className="border-t border-glass-border pt-4">
            <p className="text-xs text-txt-muted mb-2">Generated changelog:</p>
            <div className="glass-accent rounded-lg p-3 space-y-2">
              <p className="text-xs font-medium text-txt">✨ New Features</p>
              <p className="text-xs text-txt-secondary pl-3">Dark mode is here! Switch between light and dark themes from your settings.</p>
              <p className="text-xs font-medium text-txt mt-2">🐛 Bug Fixes</p>
              <p className="text-xs text-txt-secondary pl-3">Fixed an issue where expired sessions caused an infinite login loop.</p>
              <p className="text-xs font-medium text-txt mt-2">⚠️ Breaking Changes</p>
              <p className="text-xs text-txt-secondary pl-3">GET /api/users removed. Use GET /api/v2/users instead.</p>
            </div>
            <p className="mt-3 text-xs text-accent italic">Even &quot;fix stuff&quot; becomes meaningful.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
