# Student Projects â€“ Test Plan

## Scope
- List, detail, filters/sort, infinite scroll, apply, withdraw, coffee chat request states, completed showcase viewer, telemetry, visibility rules.

## Environments
- Clerkâ€‘gated; test student account; backend seeded with active/closed projects.

## Tests
### Unit
- Filter logic; sort comparator; URL param sync; word counter util; card clamp; visibility logic.
- Coffee Chat calendar: groups slots by date; formats times in PT; request submission handler.

### Integration
- List API integration with filters/sort; detail API merge; apply POST; applications/mine; chat request submit (mock endpoint); pending/accepted state rendering.
- Not Available page on draft/paused/hidden projects.

### E2E (Playwright)
- Signâ€‘in â†’ list appears; filters and sort reflect in URL; infinite scroll loads more.
- Open detail; apply to active project; see confirmation; Applications page shows submission.
- Withdraw from Applications; project removes student from applicants list (verify via UI state where possible or mock backend).
- Request coffee chat; see Pending state; simulate acceptance (mock) â†’ Accepted state; email instruction message visible; no join button.
- Closed project displays â€œCompletedâ€ and showcase PDF in carousel; opens viewer and fullscreen.
- Direct link to hidden/draft project â†’ Not available page.

### A11y & Perf
- Axe checks for list/detail/modals.
- Calendar controls have aria-labels (prev/next month, select date, request time); list/search/sort controls labeled.
- Scroll performance; lazy-loaded images; deferred PDF.
## Exit Criteria
- All P0/P1 pass; no Sevâ€‘1 open; telemetry events observed with correct props.
