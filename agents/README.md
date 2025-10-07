NGI Capital App — Agents Setup (OpenAI Agent Builder)

Purpose
- Introduce a Software Manager agent that orchestrates specialist agents (Code, UI/UX, Testing/QA, Docs, Security) using OpenAI Agent Builder and Workflows.
- Document MCP tool setup, guardrails, environment variables, and integration touchpoints for this repo.

Architecture
- Software Manager (orchestrator): Plans tasks, routes sub-tasks to specialists, aggregates results, enforces policy.
- Specialists:
  - Code Engineer: repo edits, refactors, small features; uses Filesystem MCP only.
  - UI/UX Engineer: components, Tailwind/Radix patterns; reads/writes `apps/desktop` and `packages/ui`.
  - Testing Engineer: unit (Jest/pytest), e2e (Playwright) author; may run tests in CI, not locally from agent.
  - Docs Writer: PRDs/QA/AC in `MarkdownFiles/**`, CHANGELOGs, READMEs.
  - Security Engineer: scans (Snyk MCP), flags secrets, recommends fixes.
  - Data Analyst (optional): metrics/reporting prototyping; no prod DB access.

Guardrails (high level)
- Default-deny tools; allow per-agent minimal set. No network fetch unless needed.
- Filesystem writes restricted to workspace and specific subpaths per agent.
- No credential exfiltration; redact `.env*`, `secrets`, tokens; never paste secret values to outputs.
- Never push to remote or publish packages; changes remain as local patches/PR descriptions.
- No destructive ops (rm -rf, schema drops) without explicit human approval.

MCP Tooling
- Reuse existing MCP servers defined in `.cursor/mcp.json` and surface them to Agents with tight scopes:
  - filesystem: path pinned to the repo root.
  - fetch: for limited HTTP GET of docs/specs; block posting data.
  - memory: ephemeral task memory.
  - sequential-thinking: chain-of-thought tool for planning (no PII/secrets in thoughts).
  - snyk: static analysis (set `SNYK_TOKEN`).
  - brave-search: research (non-sensitive queries only).

What you need to create in OpenAI Agent Builder
1) Create Agents
   - Software Manager: System prompt must route tasks; only calls child agents + MCP where allowed.
   - Create specialist agents with clear instructions and tool permissions. Use names below for consistency:
     - NGI Software Manager
     - NGI Code Engineer
     - NGI UIUX Engineer
     - NGI Testing Engineer
     - NGI Docs Writer
     - NGI Security Engineer
2) Connect MCP Tool Sources
   - Register MCP servers mirroring `.cursor/mcp.json`. For filesystem MCP, point to this repo path.
   - For security: disallow environment inheritance; explicitly pass only needed env vars to MCPs.
3) Build a Workflow
   - Create a Workflow “NGI Software Development Workflow”. Steps:
     - Intake → Plan (Manager) → Fan-out (call Code/UIUX/Testing/Docs/Security agents as needed) → Aggregate → Deliverable.
   - Publish the workflow and copy its ID.

Repository Integration
- Environment
  - Add the following to `.env` or environment manager:
    - `OPENAI_API_KEY`
    - `OPENAI_PROJECT` (if using Projects)
    - `OPENAI_WORKFLOW_SOFTWARE_MANAGER_ID`
    - Optional: individual `OPENAI_AGENT_*` IDs if you want to call agents directly.
- Backend (FastAPI)
  - Add a small route to kick off a workflow (see `scripts/agents_run_workflow.py` as a reference). For production, build a dedicated `src/api/routes/agents.py` with POST `/api/agents/run` that accepts `{ task, context }` and calls the workflow.
- Frontend (Next.js)
  - Add an Admin tool (e.g., `/admin/dev/agents`) that POSTs to `/api/agents/run` and streams logs/results. For previews, you may also invoke the workflow directly from a Next Route Handler if needed.

Local Dev
1) Set env in `.env`: `OPENAI_API_KEY`, `OPENAI_WORKFLOW_SOFTWARE_MANAGER_ID`.
2) Optionally install the OpenAI Python SDK in your dev shell for the helper script:
   - `pip install openai>=1.51.0`
3) Run: `python scripts/agents_run_workflow.py --task "Refactor Students table for performance"`

MCP Policy (summarized; see `agents/policies/permissions.yaml`)
- Software Manager: may call child agents, fetch (read-only), memory, sequential-thinking.
- Code Engineer: filesystem (write) limited to `src/**`, `apps/**`, `packages/ui/**`, docs; fetch (read-only); no network writes; no external exec.
- UIUX Engineer: filesystem (write) limited to `apps/desktop/**`, `packages/ui/**`; fetch (design docs); no backend files.
- Testing Engineer: filesystem (write) limited to test paths; allowed to read configs; not allowed to run commands (CI-only).
- Docs Writer: filesystem (write) limited to `MarkdownFiles/**`, READMEs, changelogs.
- Security Engineer: read-only filesystem; Snyk MCP; can open PR notes.

Security & Data Handling
- Never include raw secrets in agent messages or outputs. Redact and reference variable names.
- Design agents to avoid sending proprietary code snippets to third-party services unless reviewed.
- For any code generation, prefer minimal diffs and reference file paths, not full file dumps.

Traceability
- Keep human-readable specs inside this `agents/` directory:
  - `workflows/*.json` templates
  - `policies/permissions.yaml`
  - This README

Troubleshooting
- 401/Permission errors: verify `OPENAI_API_KEY` and workflow/agent IDs.
- MCP not found: ensure the Agent Builder MCP Tool Source is pointed at the same path and host.
- Agent loops: tighten prompts and tool permissions; add step limits and output length caps.

Next Steps
- Wire a small FastAPI router for `/api/agents/run` and add a minimal Admin UI panel to submit tasks and display results.

