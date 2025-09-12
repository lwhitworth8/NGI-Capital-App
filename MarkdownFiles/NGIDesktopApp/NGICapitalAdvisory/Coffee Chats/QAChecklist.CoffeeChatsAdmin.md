# Coffee Chats Admin — QA Checklist (V1)

- Admin gating: only allowlisted admins can access Coffee Chats and Availability pages.
- Availability editor: create/edit/delete blocks; respects Google free/busy; 15/30‑minute options; 4‑week horizon enforced.
- Student slot picker: PST display; disabled states (pending/cooldown/blacklisted); Pending state after request.
- Admin views: Calendar overlays + List filters; request side panel; Accept/Propose/Cancel/No‑show/Completed actions work.
- Accept flow: Google event created, Meet enabled, both partners + student invited, reminders (1 day, 10 min).
  - In development, with Google not configured, a mock event id and Meet link are generated to validate flow.
- Propose: new time sent; student sees update; original request updated.
- Cancel: reasons captured; cancel_count increments; blacklist on ≥2 cancels.
- No‑show: no_show_count increments; cooldown 7 days applied.
- One pending per student enforced globally; new requests blocked until resolved.
- Auto‑expiry: > 7 days pending → Expired; student can request again.
- Join button: opens Google Calendar URL (not raw Meet link) in student portal.
- Telemetry: all key events persisted; error events logged.
- A11y: keyboard support on calendar and list; focus management; readable labels.
- Perf: month navigation smooth; slot rendering performant.

Environment note: When moving to production, enable real Google integration (ENABLE_GCAL=1) and re‑run a focused QA to validate free/busy masking and event creation with real accounts.

---
- Status color coding matches spec across calendar and list.
- “Both free” labeling visible and accurate.
- Propose flow constrained to availability; updates request timestamp correctly.
- Expiry job moves requests to Expired exactly at the 7‑day threshold.
- Join button opens Calendar web UI with the event in focus.
