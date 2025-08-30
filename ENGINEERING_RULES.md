# ENGINEERING_RULES

These rules are mandatory for all autonomous development and must be followed without exception.  
If at any point context runs low, **stop, re-read this file, and re-index the entire codebase before continuing.**

---

## 0. Deployment Context

- This codebase powers the **NGI Capital App**, which is being deployed for the founders (Landon & Partner) to **start, account for, and manage all NGI Capital business entities**.  
- Development is for **full production deployment**—all code must be written to production-ready standards.  
- All **accounting, reporting, and financial logic** must comply with **U.S. GAAP** and relevant **ASC standards** (e.g., ASC 605/606 for revenue recognition, ASC 820 for fair value, ASC 842 for leases, etc.).  
- Financial outputs (reports, ledgers, consolidations) must align with standard accounting treatments: no shortcuts, no ad hoc approximations.  

---

## 1. Success Criteria

- All unit and integration tests pass (`pytest -q` or `make test`).  
- Lint, typecheck, and format checks pass (`make lint`, `make typecheck`, `make fmt`).  
- No violations of US GAAP or ASC rules in accounting-related modules.  
- No hallucinated code, functions, files, or APIs.  
- No Unicode in code, logs, comments, filenames—**ASCII only**.  
- Only minimal, necessary dependencies, added with justification.  
- No mock data. No connection to production systems during tests.  
- Ephemeral test DB only, seeded from schema.  
- Feature complete + safe for full NGI Capital deployment.  

---

## 2. Testing & Debugging (Pytest Required)

- **Always run pytest** before confirming development is complete.  
- If any test fails:
  1. Debug root cause.  
  2. Fix implementation.  
  3. Re-run pytest until fully green.  
- Add or update tests for all new logic.  
- No skipped or silenced tests.  

---

## 3. Accounting-Specific Rules

- All accounting modules must explicitly align with **US GAAP** and **ASC standards**.  
- Each accounting-related change must include:
  - Reference to applicable ASC standard in comments/docstring.  
  - Test coverage for compliance scenarios (e.g., deferred revenue, lease accounting).  
- Implementations must:
  - Use **double-entry accounting**.  
  - Maintain **audit trail** (journal entries must be immutable, reversible only via adjusting entries).  
  - Consolidate entities correctly under GAAP (intercompany eliminations, minority interest, etc.).  
- Never approximate GAAP-required calculations. If unclear, stop and request clarification.  

---

## 4. Dependencies

- New dependencies allowed only if essential.  
- If added:
  - Update `requirements.txt` or lockfile.  
  - Install via `make install`.  
  - Document reason.  
- Prefer stdlib or existing libs when possible.  

---

## 5. Data & Test DB

- No mock or fake data for accounting modules.  
- Use schema-derived seed data only.  
- Test DB must be ephemeral:
  - In-memory (e.g., SQLite) or disposable container.  
  - Initialized via migrations.  
- Never connect to real NGI Capital databases during tests.  

---

## 6. Context & Rules Enforcement

- Never hallucinate—derive code only from existing codebase, docs, and this file.  
- If context runs low:
  1. Stop.  
  2. Re-read ENGINEERING_RULES.  
  3. Re-scan codebase.  
  4. Resume only after re-establishing full context.  

---

## 7. Coding Standards

- Follow existing tech stack only.  
- ASCII only.  
- No direct `print`—use project logger.  
- No TODOs without linked tracked issues.  
- Match existing style, formatting, and error handling patterns.  

---

## 8. Prohibited Behaviors

- No hallucinated APIs or files.  
- No Unicode characters.  
- No mock data.  
- No silent exception swallowing.  
- No skipping GAAP/ASC-required steps.  

---

## 9. Definition of Done Checklist

Before marking a task complete:  

- [ ] All pytest tests pass.  
- [ ] Lint, typecheck, format pass.  
- [ ] No hallucinations, ASCII only.  
- [ ] New accounting logic complies with GAAP + ASC.  
- [ ] Dependencies minimized and documented.  
- [ ] Test DB ephemeral, seeded from schema.  
- [ ] Logs use project logger.  
- [ ] Commits small, PR includes test plan + GAAP/ASC notes.  
- [ ] If context was low, rules/codebase were re-read before continuing.  
- [ ] Feature is safe for NGI Capital full deployment.  

---
