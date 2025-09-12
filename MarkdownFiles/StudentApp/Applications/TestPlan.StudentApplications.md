# Student Applications – Test Plan

## 1) Scope
List view (newest-first), detail rendering (answers/resume snapshot), withdraw flow, profile gate banner, updated badge behavior, and basic accessibility.

## 2) Data Setup
- Create applications in various statuses (New/Reviewing/Interview/Offer/Joined/Rejected/Withdrawn) with answer snapshots and a resume URL at submission time.
- Mark one app as updated since last view (simulate via updated_at > last_seen_at).
- Ensure a profile-incomplete test user.

## 3) Unit & Integration
- List order: newest-first across all items and sections.
- Detail answers: long responses collapse/expand; no timestamps; prompts in correct order.
- Resume snapshot: Download works; preview opens if supported; does not show current resume unless equals snapshot.
- Withdraw: confirm modal; POST withdraw; status updates to Withdrawn; list moves item to Past Applications.
- Profile gate: banner displays when required fields missing; CTA deep-links to Settings.
- Updated badge: shown when status changed since last view; clears on viewing detail.

## 4) E2E (Playwright)
- Render list; open detail; withdraw and confirm; see status change reflected.
- Profile incomplete user sees banner; clicking CTA opens Settings.
- Joined app displays info note and remains visible; (future) My Projects module will also list it.

## 5) A11y & Perf
- Axe checks for list and detail; keyboard navigation through buttons.
- Lazy load resume preview on open; collapse heavy answer text by default.

## 6) Exit Criteria
- All critical paths pass; withdraw consistently updates; no PII leakage in telemetry or logs.

---
## 7) Negative & Concurrency
- Unauthorized detail fetch returns 403; UI redirects to sign-in.
- Withdraw race: status changed to Rejected/Joined while modal open → show final status and block if Joined.
- Missing snapshot: fallback UI + telemetry event logged.

## 8) Telemetry Validation
- Verify list_view, detail_open, withdraw_click/confirm, badge_clear events with correct ids.
- Ensure no answer text appears in telemetry payloads.
