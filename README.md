<div align="center">

# 🧵 ChangeWeave

### **AI-native changelog generator that reads your code — not just your commit messages.**

*Stop copy-pasting git logs. Ship release notes your users actually understand.*

[![License: MIT](https://img.shields.io/badge/License-MIT-A3E635?style=flat-square)](./LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-A3E635?style=flat-square)](https://github.com/Sangaibisi/changeweave/pulls)
![Java](https://img.shields.io/badge/Java-17-F89820?style=flat-square&logo=openjdk&logoColor=white)
![Spring Boot](https://img.shields.io/badge/Spring_Boot-3-6DB33F?style=flat-square&logo=springboot&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-14-000000?style=flat-square&logo=nextdotjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-ready-2496ED?style=flat-square&logo=docker&logoColor=white)
![Postgres](https://img.shields.io/badge/PostgreSQL-16-4169E1?style=flat-square&logo=postgresql&logoColor=white)
![MCP](https://img.shields.io/badge/MCP-server-8B5CF6?style=flat-square)

</div>

---

## 🎯 The Problem

> *"feat: stuff"*, *"fix: bug"*, *"wip"*, *"asdf"* — every changelog author's nightmare.

Traditional changelog tools scrape commit messages and hope for the best. They miss breaking changes hiding inside refactors, get confused by squashed PRs, and produce release notes that read like `git log | grep -v chore`.

**ChangeWeave opens the diffs.** It reads what actually changed, groups related edits, filters noise, detects breaking changes, and writes release notes that a product manager — not just a committer — would be proud to ship.

## ✨ Features

- 🔬 **Diff-aware analysis** — categorizes changes and scores impact from real code, not commit message guesswork
- 🎚️ **Tiered context engine** — smart token budgeting across 3 tiers (summary → diffs → full files) so you only pay for depth where it matters
- 💥 **Breaking change detection** — flags removed exports, changed signatures, altered routes, schema migrations
- 🧹 **Noise filtering & PR grouping** — merges chatty commits, collapses revert chains, groups related edits into logical units
- 🌍 **Multi-provider** — GitHub · GitLab · Bitbucket Cloud · Bitbucket Data Center (self-hosted)
- 🗺️ **15 languages** — generate changelogs in any of 15 languages with one click
- 🎨 **Tone & audience tuning** — technical, marketing, casual — pick per release
- 📊 **Public changelog pages** — shareable URLs with view analytics and referrers
- 🤖 **MCP server built-in** — drive it from Claude Desktop, Cursor, or Windsurf via the Model Context Protocol
- 🔒 **Privacy-first** — fully self-hostable, tokens encrypted at rest, SSRF-guarded outbound calls
- 🆓 **MIT licensed** — no usage limits, no telemetry, no vendor lock-in

## 🏗️ Architecture

```
          ┌──────────────────────────────────────────────────┐
          │                                                  │
          ▼                                                  │
   ┌─────────────┐           ┌──────────────┐          ┌────┴───────┐
   │  🌐 Browser │──── UI ──▶│  🎨 Next.js  │─── API ─▶│ ☕ Spring  │
   └─────────────┘           │   Frontend   │          │   Boot API │
                             └──────────────┘          └──┬──┬──┬───┘
                                                          │  │  │
                              ┌───────────────────────────┘  │  └────────┐
                              ▼                              ▼           ▼
                     ┌──────────────┐              ┌──────────────┐  ┌────────┐
                     │ 🧠 MCP Server│              │ 🐘 Postgres  │  │🔴 Redis│
                     │  (Node/TS)   │              │   + Flyway   │  │ cache  │
                     └──────┬───────┘              └──────────────┘  └────────┘
                            │
                            ▼
                     ┌──────────────────────────────────────────┐
                     │  🐙 GitHub · 🦊 GitLab · 🪣 Bitbucket   │
                     └──────────────────────────────────────────┘
```

### How a release note is born 🐣

1. **📥 Trigger** — webhook fires on `git push`, or you hit *Generate* manually in the dashboard.
2. **📡 Fetch** — backend pulls commits + diffs via the provider API (GitHub / GitLab / Bitbucket).
3. **🧪 Analyze** — MCP server runs the pipeline:
   - `noise-filter` drops boilerplate commits
   - `revert-detector` collapses `A → B → revert(A+B)` chains
   - `pr-grouper` merges related commits into logical changes
   - `commit-clusterer` finds semantic clusters
   - `impact-scorer` tags HIGH / MEDIUM / LOW impact
   - `breaking-detector` sniffs out API breaks
   - `module-mapper` groups files into features
4. **💬 Generate** — `AITransformationService` turns the structured analysis into prose (OpenAI by default, rule-based fallback when no key is set).
5. **🚀 Publish** — you review, edit, and ship to a public changelog page with a shareable URL.

### Tech stack

| Layer | What's inside |
|-------|--------------|
| **Backend** ☕ | Java 17 · Spring Boot 3 · Spring Security · JPA · Flyway migrations |
| **Frontend** 🎨 | Next.js 14 (App Router) · React · TailwindCSS · Zustand · React Query |
| **MCP Server** 🧠 | Node.js 18+ · TypeScript · `@modelcontextprotocol/sdk` · Octokit |
| **Storage** 🗄️ | PostgreSQL 16 · Redis 7 |
| **AI** 🤖 | OpenAI (`gpt-4o-mini` default) — any OpenAI-compatible endpoint works |
| **Ops** 🐳 | Docker · Docker Compose (dev + prod profiles) |

## 🚀 Quick Start (Docker)

**Prerequisites:** [Docker Desktop](https://www.docker.com/products/docker-desktop/) and git.

```bash
git clone https://github.com/Sangaibisi/changeweave.git
cd changeweave
cp .env.example .env        # 💡 optional — defaults boot the app as-is
docker compose up --build -d
```

Everything comes up locally — no cloud account required:

| 🧩 Service | 🔗 URL |
|-----------|--------|
| Frontend | [http://localhost:3000](http://localhost:3000) |
| Backend API | [http://localhost:8080/api](http://localhost:8080/api) |
| MCP Server | [http://localhost:3100/mcp](http://localhost:3100/mcp) |
| PostgreSQL | `localhost:5432` |
| Redis | `localhost:6379` |

Register an account on the frontend and you're in. 🎉

> 💡 Without `OPENAI_API_KEY`, ChangeWeave falls back to rule-based changelog generation. Add a key whenever you want the AI polish.

See [SETUP.md](./SETUP.md) for rebuilds, logs, resets and more.

## ⚙️ Configuration

All config is env-driven. The [`.env.example`](./.env.example) ships **dev-safe defaults** — the app boots unchanged. Set these when you want the real thing:

| Variable | What it unlocks |
|----------|----------------|
| 🤖 `OPENAI_API_KEY` | AI-generated changelog prose |
| 🐙 `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | GitHub OAuth login + repo connect ([create app](https://github.com/settings/developers)) |
| 🪝 `GITHUB_WEBHOOK_SECRET` | Webhook signature verification |
| 🦊 `GITLAB_CLIENT_ID` / `GITLAB_CLIENT_SECRET` | GitLab OAuth ([create app](https://gitlab.com/-/user_settings/applications)) |
| 🪣 `BITBUCKET_CLIENT_ID` / `BITBUCKET_CLIENT_SECRET` | Bitbucket Cloud OAuth |
| 🏢 `BITBUCKET_DC_URL` | Base URL for self-hosted Bitbucket Data Center (PAT auth) |
| 🔐 `JWT_SECRET` | **Production-required** — min 256-bit random string |
| 📧 `MAIL_*` | SMTP credentials (SendGrid by default) for transactional email |

## 💻 Local Development (hybrid)

Run infra in Docker, backend/frontend on your host for fast reloads:

```bash
# ☕ Only the infra
docker compose up -d postgres redis

# Backend (terminal 1)
cd backend
mvn spring-boot:run

# Frontend (terminal 2)
cd frontend
npm install
npm run dev
```

## 🤖 MCP Integration

ChangeWeave ships its own Model Context Protocol server so Claude, Cursor, Windsurf and friends can analyze commits and draft changelogs **from inside your editor**.

```json
{
  "mcpServers": {
    "changeweave": {
      "command": "npx",
      "args": ["changeweave-mcp"],
      "env": { "GITHUB_TOKEN": "ghp_xxxxxxxxxxxx" }
    }
  }
}
```

Tools exposed: `analyze_commits`, `generate_changelog`, `get_commit_diff`, `compare_refs`, `detect_breaking_changes`, `list_changelogs`, `publish_changelog`.

Full docs → [`mcp/README.md`](./mcp/README.md).

## 🌐 Production Deployment

`docker-compose.prod.yml` is the production profile:

- ✅ Requires a real `JWT_SECRET` (fails fast if missing)
- ✅ Requires `PUBLIC_URL` + `CORS_ORIGINS` to point at your domain
- ✅ Expects an external reverse-proxy network named `changeweave-proxy` (Traefik / Caddy / nginx-proxy — your call)

```bash
export PUBLIC_URL=https://changelog.your-domain.com
export CORS_ORIGINS=https://changelog.your-domain.com
export JWT_SECRET=$(openssl rand -base64 48)
export OPENAI_API_KEY=sk-...

docker network create changeweave-proxy
docker compose -f docker-compose.prod.yml up -d
```

Point your reverse proxy at the `frontend` (port 3000) and `backend` (port 8080) services and you're live. 🎈

## 🛡️ Security

- 🔑 JWT access tokens (15 min) + refresh tokens (7 days) with rotation
- 🚧 SSRF guard on all outbound HTTP calls
- 🔐 Provider tokens encrypted before being persisted
- 🕸️ Production compose isolates the app network from the public proxy network
- 🧵 No telemetry — the project phones nobody home

Found a security issue? Please [open an issue](https://github.com/Sangaibisi/changeweave/issues) — don't disclose publicly until there's a fix.

## 📁 Project Layout

```
changeweave/
├── 📂 backend/                Spring Boot API
│   └── src/main/java/com/changelogai/
│       ├── controller/        REST endpoints
│       ├── service/           Business logic
│       │   ├── provider/      GitHub / GitLab / Bitbucket adapters
│       │   └── AITransformationService.java
│       ├── security/          JWT + SSRF guard
│       └── entity/            JPA models
├── 📂 frontend/               Next.js 14 app
│   └── src/app/
│       ├── (auth)/            login / register
│       ├── dashboard/         authenticated UI
│       └── changelog/[slug]/  public changelog pages
├── 📂 mcp/                    MCP server (Node/TS)
│   └── src/
│       ├── analysis/          breaking · revert · clusterer · impact
│       ├── context/           3-tier token budgeting
│       ├── tools/             7 MCP tools
│       └── providers/         git provider integrations
├── 🐳 docker-compose.yml      dev stack
├── 🐳 docker-compose.prod.yml prod stack
└── 📄 SETUP.md                docker cheatsheet
```

## 🤝 Contributing

PRs and issues are warmly welcome. 💚

- No CLA required — contributions are released under the MIT License
- Keep changes focused; one concern per PR
- Run the stack locally before submitting (see *Local Development*)
- Follow existing code style — no separate style guide yet

First time contributing to OSS? [Open an issue](https://github.com/Sangaibisi/changeweave/issues/new) and say hi — we'll point you at something friendly.

## 📜 License

[MIT](./LICENSE) © Sangaibisi — free to use, modify, and ship. Go build cool stuff.

---

<div align="center">

**⭐ If ChangeWeave saves you even one painful release day, please star the repo.**

Made with 🧵 and long nights.

</div>
