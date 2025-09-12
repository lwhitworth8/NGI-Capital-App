# MCP Setup and Workflow (Context7 + Snyk)

This document describes how we integrate MCP servers into our engineering workflow to keep docs up-to-date (Context7) and continuously check security (Snyk).

## 1) MCP Client Configuration

- File: `C:\Users\<you>\.codex\config.toml`
- Use TOML array syntax (`args = [...]`), not YAML (`args:`).

Example:

```
[mcp_servers.context7]
command = "npx"
args = ["-y", "@upstash/context7-mcp", "--api-key", "${CONTEXT7_API_KEY}"]

[mcp_servers.snyk-security]
command = "npx"
args = ["-y", "snyk@latest", "mcp", "-t", "stdio"]
```

- Set environment variables in your shell or OS keychain:
  - `CONTEXT7_API_KEY=...`
  - `SNYK_TOKEN=...` (required by Snyk)

## 2) Sanity Checks (Local)

These do not fully exercise MCP (which uses stdio + an MCP-aware client), but validate tool availability:

- Node/NPM presence
  - `node -v`
  - `npm -v`

- Context7 MCP resolves via npx (will download on first run):
  - `npx -y @upstash/context7-mcp --help` (expect a server usage banner or wait state)

- Snyk CLI available:
  - `npx -y snyk@latest --version`

If these commands resolve, your MCP client can launch both servers.

## 3) Context7 – Doc Refresh Workflow

Run from your MCP-aware client (e.g., Codex Desktop) with Context7 selected:

Prompt templates:
- “Refresh the PRD to reflect current code: MarkdownFiles/NGIDesktopApp/NGICapitalAdvisory/Projects/PRD.Projects.md and apps/desktop/src/app/ngi-advisory/projects/page.tsx, plus src/api/routes/advisory.py. Summarize diffs and propose doc edits.”
- “Audit Students Admin doc to match code: MarkdownFiles/NGIDesktopApp/NGICapitalAdvisory/Students/PRD.StudentsAdmin.md vs apps/desktop/src/app/ngi-advisory/students/page.tsx and src/api/routes/advisory.py. List gaps and suggested changes.”

Apply recommended edits to the MD files as a PR or commit.

## 4) Snyk Security – Continuous Checks

From an MCP-aware client or terminal:

- Node/TS (monorepo):
  - `npx -y snyk@latest test --all-projects --exclude=test,tests --severity-threshold=high`
  - Optionally: `npx snyk code test --severity-threshold=high`

- Python (FastAPI):
  - `npx -y snyk@latest test --file=requirements.txt`

Interpret findings, patch vulnerable transitive dependencies (or pin), and re-run until clean.

## 5) Add to QA Gates

- Projects Admin + Students Admin checklists include:
  - Context7 “Doc Freshness” step before QA.
  - Snyk high-severity gate (no high severity issues allowed).

## 6) Operational Notes

- Context7 maintains knowledge context for our stack; prefer code → doc refresh before merging feature PRs.
- Snyk requires `SNYK_TOKEN`; for CI, store in secrets and run on push/PR.

