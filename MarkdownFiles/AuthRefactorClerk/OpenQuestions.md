# Open Questions — Unified Auth

- Admin gating source of truth:
  - Prefer Clerk organization slug (e.g., `ngi-capital`) and role (`admin`). Confirm naming and membership.
  - Do we also embed a custom `role` claim in Clerk JWT template to reduce org lookup latency?
- Session bridge removal timeline:
  - How long do we keep `/api/auth/session` enabled behind flag for safety?
- Student domain policy:
  - Keep domain enforcement in middleware or centralize in backend only for public app endpoints?
- Cross‑app routing:
  - Should marketing route Admins directly to Desktop domain, and Students to Student app, to avoid middleware‑level email checks?
- Tests:
  - For pytest/E2E, do we mock Clerk JWTs or use Clerk test tokens/service principal?
- Secrets management:
  - Confirm production key storage (Vault/GitHub OIDC → cloud secrets) and rotation cadence.
