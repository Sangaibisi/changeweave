"use client";

export function TieredContextVisual() {
  return (
    <div className="space-y-3">
      {/* Tier 1 */}
      <div className="glass glass-hover rounded-xl p-5 transition-all duration-300 group">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-lg bg-green-400/10 flex items-center justify-center shrink-0">
            <span className="text-green-400 font-bold text-sm font-mono">T1</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="text-sm font-semibold text-txt">Summary</h4>
              <span className="text-[10px] font-mono text-green-400/70 bg-green-400/10 rounded px-1.5 py-0.5">~50 tokens/commit</span>
              <span className="text-[10px] font-mono text-txt-faint">Always active</span>
            </div>
            <p className="text-xs text-txt-secondary mb-2">Commit messages + file names + LOC statistics</p>
            <div className="font-mono text-[11px] text-txt-faint bg-surface-50 rounded-lg p-2.5">
              abc1234 — &quot;fix stuff&quot; | auth/session.ts (+12, -3) | Impact: HIGH
            </div>
          </div>
        </div>
      </div>

      {/* Tier 2 */}
      <div className="glass glass-hover rounded-xl p-5 transition-all duration-300 group">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
            <span className="text-accent font-bold text-sm font-mono">T2</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="text-sm font-semibold text-txt">Diff Hunks</h4>
              <span className="text-[10px] font-mono text-accent/70 bg-accent/10 rounded px-1.5 py-0.5">~200-500 tokens</span>
              <span className="text-[10px] font-mono text-txt-faint">High impact commits</span>
            </div>
            <p className="text-xs text-txt-secondary mb-2">Actual code changes for high-impact commits</p>
            <div className="font-mono text-[11px] bg-surface-50 rounded-lg p-2.5 space-y-0.5">
              <p className="text-txt-faint">@@ -45,3 +45,12 @@</p>
              <p className="text-red-400/70">- if (token.expired) redirect(&apos;/login&apos;)</p>
              <p className="text-green-400/70">+ if (token.expired) {"{"}</p>
              <p className="text-green-400/70">+   clearSession(token.userId)</p>
              <p className="text-green-400/70">+   redirect(&apos;/login&apos;)</p>
              <p className="text-green-400/70">+ {"}"}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tier 3 */}
      <div className="glass glass-hover rounded-xl p-5 transition-all duration-300 group">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-lg bg-amber-400/10 flex items-center justify-center shrink-0">
            <span className="text-amber-400 font-bold text-sm font-mono">T3</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="text-sm font-semibold text-txt">Full File Context</h4>
              <span className="text-[10px] font-mono text-amber-400/70 bg-amber-400/10 rounded px-1.5 py-0.5">~1000+ tokens</span>
              <span className="text-[10px] font-mono text-txt-faint">Breaking changes only</span>
            </div>
            <p className="text-xs text-txt-secondary mb-2">Complete before/after file state for breaking change analysis</p>
            <div className="font-mono text-[11px] bg-surface-50 rounded-lg p-2.5 space-y-0.5">
              <p className="text-amber-400/70">⚠ EXPORT_REMOVED: getUserById() removed from api/users.ts</p>
              <p className="text-amber-400/70">⚠ SIGNATURE_CHANGED: createUser(name) → createUser(name, opts)</p>
              <p className="text-txt-faint">→ Migration: Use /api/v2/users endpoint instead</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
