# Student Learning – UX Spec (Coming Soon)

## 1) Route & Layout
- Route: /learning
- Top-level page using student app layout and global styles.

## 2) Content
- Hero block centered vertically on viewport (or top-aligned on small screens):
  - H1: “Student Learning — Coming Soon”
  - Subtext (muted): “We’re building a focused learning experience for analysts. Stay tuned in upcoming releases.”
- Background: subtle gradient consistent with app theme (reuse existing marketing components if available).

## 3) Theming & A11y
- Respect dark/light theme.
- H1 must be first heading on the page; subtext uses body text with sufficient contrast.
- No interactive controls; ensure no tabbable elements are inadvertently present.

## 4) Mobile Behavior
- Stack content with generous spacing; avoid heavy imagery; keep payload light.

## 5) Top Navigation
- Include a visible "Learning" link in the student header that routes to `/learning`.
- Publicly accessible; no CTA/forms on the page.
