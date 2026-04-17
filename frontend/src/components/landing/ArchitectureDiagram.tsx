"use client";

export function ArchitectureDiagram() {
  return (
    <div className="glass rounded-2xl p-6 sm:p-8 overflow-x-auto">
      <svg viewBox="0 0 800 420" fill="none" className="w-full min-w-[600px]" xmlns="http://www.w3.org/2000/svg">
        {/* Dashboard Box */}
        <rect x="20" y="160" width="160" height="100" rx="12" fill="rgba(163,230,53,0.08)" stroke="rgba(163,230,53,0.3)" strokeWidth="1.5" />
        <text x="100" y="195" textAnchor="middle" fill="#a3e635" fontSize="13" fontWeight="600" fontFamily="Inter,sans-serif">Dashboard</text>
        <text x="100" y="215" textAnchor="middle" fill="#a1a1aa" fontSize="10" fontFamily="Inter,sans-serif">Next.js + React</text>
        <text x="100" y="232" textAnchor="middle" fill="#71717a" fontSize="10" fontFamily="Inter,sans-serif">User clicks "Generate"</text>

        {/* Arrow: Dashboard → Backend */}
        <line x1="180" y1="210" x2="260" y2="210" stroke="rgba(163,230,53,0.4)" strokeWidth="1.5" markerEnd="url(#arrow)" />
        <text x="220" y="200" textAnchor="middle" fill="#71717a" fontSize="9" fontFamily="JetBrains Mono,monospace">API</text>

        {/* Backend Box */}
        <rect x="260" y="140" width="180" height="140" rx="12" fill="rgba(24,24,27,0.8)" stroke="rgba(255,255,255,0.12)" strokeWidth="1.5" />
        <text x="350" y="172" textAnchor="middle" fill="#fafafa" fontSize="13" fontWeight="600" fontFamily="Inter,sans-serif">Java Backend</text>
        <text x="350" y="192" textAnchor="middle" fill="#a1a1aa" fontSize="10" fontFamily="Inter,sans-serif">MCP Client</text>
        <rect x="280" y="205" width="140" height="24" rx="6" fill="rgba(163,230,53,0.06)" stroke="rgba(163,230,53,0.15)" strokeWidth="1" />
        <text x="350" y="221" textAnchor="middle" fill="#a3e635" fontSize="9" fontFamily="JetBrains Mono,monospace">McpAnalysisService</text>
        <rect x="280" y="238" width="140" height="24" rx="6" fill="rgba(34,211,238,0.06)" stroke="rgba(34,211,238,0.15)" strokeWidth="1" />
        <text x="350" y="254" textAnchor="middle" fill="#22d3ee" fontSize="9" fontFamily="JetBrains Mono,monospace">AITransformation</text>

        {/* Arrow: Backend → MCP Server */}
        <line x1="440" y1="210" x2="520" y2="210" stroke="rgba(34,211,238,0.4)" strokeWidth="1.5" markerEnd="url(#arrowCyan)" />
        <text x="480" y="198" textAnchor="middle" fill="#71717a" fontSize="9" fontFamily="JetBrains Mono,monospace">JSON-RPC</text>
        <text x="480" y="228" textAnchor="middle" fill="#52525b" fontSize="8" fontFamily="JetBrains Mono,monospace">HTTP POST /mcp</text>

        {/* MCP Server Box */}
        <rect x="520" y="100" width="260" height="220" rx="12" fill="rgba(24,24,27,0.8)" stroke="rgba(34,211,238,0.2)" strokeWidth="1.5" />
        <text x="650" y="130" textAnchor="middle" fill="#22d3ee" fontSize="13" fontWeight="600" fontFamily="Inter,sans-serif">MCP Server</text>
        <text x="650" y="148" textAnchor="middle" fill="#a1a1aa" fontSize="10" fontFamily="Inter,sans-serif">TypeScript — Analysis Engine</text>

        {/* MCP internals */}
        <rect x="540" y="162" width="110" height="22" rx="5" fill="rgba(163,230,53,0.06)" stroke="rgba(163,230,53,0.15)" strokeWidth="1" />
        <text x="595" y="177" textAnchor="middle" fill="#a3e635" fontSize="8" fontFamily="JetBrains Mono,monospace">Diff Fetcher</text>

        <rect x="660" y="162" width="110" height="22" rx="5" fill="rgba(163,230,53,0.06)" stroke="rgba(163,230,53,0.15)" strokeWidth="1" />
        <text x="715" y="177" textAnchor="middle" fill="#a3e635" fontSize="8" fontFamily="JetBrains Mono,monospace">LOC Analyzer</text>

        <rect x="540" y="192" width="110" height="22" rx="5" fill="rgba(168,85,247,0.06)" stroke="rgba(168,85,247,0.15)" strokeWidth="1" />
        <text x="595" y="207" textAnchor="middle" fill="#a855f7" fontSize="8" fontFamily="JetBrains Mono,monospace">Tiered Context</text>

        <rect x="660" y="192" width="110" height="22" rx="5" fill="rgba(168,85,247,0.06)" stroke="rgba(168,85,247,0.15)" strokeWidth="1" />
        <text x="715" y="207" textAnchor="middle" fill="#a855f7" fontSize="8" fontFamily="JetBrains Mono,monospace">Impact Scorer</text>

        <rect x="540" y="222" width="110" height="22" rx="5" fill="rgba(245,158,11,0.06)" stroke="rgba(245,158,11,0.15)" strokeWidth="1" />
        <text x="595" y="237" textAnchor="middle" fill="#f59e0b" fontSize="8" fontFamily="JetBrains Mono,monospace">Breaking Detect</text>

        <rect x="660" y="222" width="110" height="22" rx="5" fill="rgba(245,158,11,0.06)" stroke="rgba(245,158,11,0.15)" strokeWidth="1" />
        <text x="715" y="237" textAnchor="middle" fill="#f59e0b" fontSize="8" fontFamily="JetBrains Mono,monospace">Module Mapper</text>

        {/* Arrow: MCP → GitHub */}
        <line x1="650" y1="320" x2="650" y2="370" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" markerEnd="url(#arrowGray)" />
        <text x="650" y="348" textAnchor="middle" fill="#71717a" fontSize="9" fontFamily="JetBrains Mono,monospace">REST API</text>

        {/* GitHub Box */}
        <rect x="580" y="370" width="140" height="40" rx="8" fill="rgba(24,24,27,0.6)" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
        <text x="650" y="395" textAnchor="middle" fill="#a1a1aa" fontSize="11" fontFamily="Inter,sans-serif">GitHub API</text>

        {/* Arrow: Backend → DB */}
        <line x1="350" y1="280" x2="350" y2="340" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" markerEnd="url(#arrowGray)" />

        {/* DB Box */}
        <rect x="290" y="340" width="120" height="40" rx="8" fill="rgba(24,24,27,0.6)" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
        <text x="350" y="365" textAnchor="middle" fill="#a1a1aa" fontSize="11" fontFamily="Inter,sans-serif">PostgreSQL</text>

        {/* Arrow: Backend → LLM */}
        <line x1="350" y1="140" x2="350" y2="70" stroke="rgba(168,85,247,0.3)" strokeWidth="1.5" markerEnd="url(#arrowPurple)" />

        {/* LLM Box */}
        <rect x="290" y="25" width="120" height="45" rx="8" fill="rgba(168,85,247,0.08)" stroke="rgba(168,85,247,0.2)" strokeWidth="1" />
        <text x="350" y="48" textAnchor="middle" fill="#a855f7" fontSize="11" fontWeight="500" fontFamily="Inter,sans-serif">GPT-4o-mini</text>
        <text x="350" y="62" textAnchor="middle" fill="#71717a" fontSize="9" fontFamily="Inter,sans-serif">Final polish</text>

        {/* IDE Box (bonus) */}
        <rect x="580" y="25" width="140" height="50" rx="8" fill="rgba(34,211,238,0.05)" stroke="rgba(34,211,238,0.15)" strokeWidth="1" strokeDasharray="4 3" />
        <text x="650" y="48" textAnchor="middle" fill="#22d3ee" fontSize="10" fontWeight="500" fontFamily="Inter,sans-serif">Windsurf / Cursor</text>
        <text x="650" y="62" textAnchor="middle" fill="#52525b" fontSize="9" fontFamily="Inter,sans-serif">Direct MCP (stdio)</text>
        <line x1="650" y1="75" x2="650" y2="100" stroke="rgba(34,211,238,0.2)" strokeWidth="1" strokeDasharray="4 3" markerEnd="url(#arrowCyan)" />

        {/* Arrow markers */}
        <defs>
          <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="rgba(163,230,53,0.5)" />
          </marker>
          <marker id="arrowCyan" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="rgba(34,211,238,0.5)" />
          </marker>
          <marker id="arrowGray" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="rgba(255,255,255,0.2)" />
          </marker>
          <marker id="arrowPurple" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="rgba(168,85,247,0.5)" />
          </marker>
        </defs>
      </svg>
    </div>
  );
}
