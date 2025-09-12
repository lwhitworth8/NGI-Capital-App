# Projects Module – Open Questions (Expanded)

## Data & Schema
- Final representation for multi‑lead: join table vs JSON column? (Recommend join table `advisory_project_leads`)
- Final representation for questions: dedicated table with ordering vs JSON? (Recommend table `advisory_project_questions` with idx)
- Storage paths: standardize `/uploads/advisory-projects/{id}/hero|gallery|showcase/`

## Taxonomy
- Confirm final majors list and labels; add alias mapping (e.g., "EECS" → "Electrical Engineering", "CS" → "Computer Science").

## Limits & Constraints
- Confirm hero/gallery max size and types (proposed: JPG/PNG ≤ 10MB).
- Showcase PDF size limit (proposed ≤ 25MB) and viewer behavior (inline vs download only).

## Code Generation
- ABC fallback when client/project <3 alnum chars (pad with X). Confirm.
- Confirm sequence uniqueness policy (per ABC vs global). Proposed per ABC.

## Metrics
- Confirm exact event table name(s), partitioning, and index strategy; rollup cadence and retention (> 90 days summarized).

## UX
- Decide between modal vs drawer for Create/Edit (recommend right‑side drawer to allow preview alongside).
- Confirm presence/placement of Live Preview (split‑pane vs tab).

## Cross‑Module
- Assignments source of truth for analysts count used in open roles (advisory_project_assignments). Confirm reconciliation behavior.
- Coffee Chats module endpoint contracts for slot listing, request, acceptance, and Google Meet invite emission.


---
## Resolved Decisions (V1)
- Multi-lead: join table advisory_project_leads(project_id, email).
- Questions: table advisory_project_questions(project_id, idx, prompt) with explicit ordering.
- Upload paths: /uploads/advisory-projects/{project_id}/hero|gallery|showcase/.
- Majors: curated UC list with aliases (EECS -> Electrical Engineering; CS -> Computer Science). Full appendix in V2.
- Media: Hero/Gallery JPG or PNG up to 10 MB each; Showcase PDF up to 25 MB with inline viewer.
- Project code: ABC fallback pads with X; sequence uniqueness per ABC.
- Metrics: project_events (partitioned daily), indexed by (project_id, ts, type); daily rollups; retain raw 90+ days then summarize.
- UI: Create/Edit uses right-side drawer; Live Preview in split-pane.
- Open roles: source of truth advisory_project_assignments (active analysts), reconcile on assignment changes.
- Coffee Chats: endpoints per CoffeeChats PRD.
