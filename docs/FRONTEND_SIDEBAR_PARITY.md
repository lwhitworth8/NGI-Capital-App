Frontend Sidebar Parity (Admin ↔ Student)

Goal
- Ensure the Student left sidebar renders identically to the Admin sidebar in both width and typography.

Canonical Design
- Canonical source: apps/desktop/src/components/layout/Sidebar.tsx
- Target: apps/student/src/components/StudentSidebar.tsx

Exact Sizing (pixel-locked)
- Sidebar container (Student):
  - className: "w-60 w-[240px] flex-none bg-card border-r border-border flex flex-col h-screen text-[16px]"
  - Notes: Adds w-[240px] and flex-none to guarantee 240px width regardless of root rem. text-[16px] pins base font-size to 16px.
- Brand header:
  - className: "h-16 flex items-center px-[24px] border-b border-border flex-shrink-0"
  - Title: "text-[24px] font-bold tracking-tight"
- Nav links:
  - className: "w-full flex items-center px-[12px] py-[8px] text-[16px] font-medium tracking-[-0.006em] rounded-lg transition-colors"
  - Active: "bg-blue-600 text-white shadow-sm"
  - Hover: "hover:bg-muted"
- Profile row:
  - Button: "w-full flex items-center gap-3 text-left hover:bg-muted p-2 rounded-lg transition-colors"
  - Avatar: "h-9 w-9 rounded-full bg-blue-600 text-white font-semibold"
  - Name: "text-base font-medium truncate"
  - Menu items: "px-4 py-2 text-sm text-foreground hover:bg-muted"

Tailwind/Next Requirements
- apps/student/tailwind.config.js must include:
  - content: ['./src/app/**/*.{ts,tsx}', './src/components/**/*.{ts,tsx}', '../../packages/ui/src/**/*.{ts,tsx}', './node_modules/@ngi/ui/dist/**/*.{js,jsx,ts,tsx}']
  - presets: [require('@ngi/ui/tailwind-preset')]
- apps/student/src/app/globals.css:
  - html { font-size: 16px; }  // aligns rem base with admin
  - body should have bg-background and text-foreground to match theme tokens

Docker Dev (Windows/WSL/Hyper-V) – Hot Reload Tips
- Compose already sets WATCHPACK_POLLING=true for student and admin. If changes don’t reflect:
  1) Restart student dev container: docker compose -f docker-compose.dev.yml restart student
  2) Restart frontend + nginx if assets get misrouted: docker compose -f docker-compose.dev.yml restart frontend nginx
  3) Verify updated file inside container:
     - docker exec -it ngi-student sh
     - sed -n '1,160p' /app/src/components/StudentSidebar.tsx
  4) Confirm compiled CSS updated by inspecting network panel for hot updates.

Common Reasons Changes Don’t Appear
- Tailwind not seeing files (wrong content globs). Fix: match the config above.
- Root rem differs between apps (html font-size not 16px). Fix: set html { font-size: 16px } in student globals.css.
- Sidebar flex shrink causes narrower width. Fix: add flex-none and explicit w-[240px].
- Nginx dev misroutes /_next assets. Fix: restart nginx; ensure admin assets are under /admin/_next and student under /_next.

Long-term: Shared Component
- Move the admin Sidebar into packages/ui (e.g., packages/ui/src/components/layout/AppSidebar.tsx) and consume from both apps.
  - Remove admin-only concerns (e.g., advisoryListApplications API) via props.
  - Benefits: single source of truth, guaranteed visual parity.

Verification Checklist
- Student sidebar container computed width = 240px.
- Nav link computed font-size = 16px; spacing matches admin visually.
- Avatar circle 36px (h-9 w-9) with initials using font-semibold.
- Dropdown items use text-sm and identical padding.

MCP-Aided Troubleshooting (optional)
- Filesystem MCP: confirm file content and live container code match.
- Brave Search MCP: reference Next.js + Docker + Tailwind hot reload notes if issues persist.

