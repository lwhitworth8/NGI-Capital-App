# Acceptance Criteria — Marketing Homepage (V1)

1) The marketing page at `/` renders with a fixed theme, ignoring system theme, and includes sections in this order: Hero, Advisory Projects, Student Learning (Coming Soon), Student Incubator (Coming Soon), Footer.
2) The top navbar contains anchors to the three sections plus a Sign In button; only the secondary navbar becomes sticky on scroll.
3) Both nav bars use blue-600 underlines on hover, with the active section indicated by a persistent blue underline in the secondary navbar.
4) The hero headline cycles the words “Experiences, Opportunities, Impacts” every ~3 seconds with a fade/slide animation and pauses the rotation under prefers-reduced-motion.
5) Clicking “Sign In” routes to `/sign-in`. No direct links to `/projects` exist on the marketing page.
6) The Advisory Projects section uses the approved bullet copy describing institutional advisory experience, mentorship, client-ready deliverables, teamwork, and clear timelines.
7) Learning (Coming Soon) and Incubator (Coming Soon) sections render the specified copy and alternating dark/light backgrounds with blue gradients.
8) Telemetry events are posted: `marketing_view` on mount, `nav_click` on anchor click, and `cta_click` on “Sign In”.
9) The marketing page sets `noindex, nofollow` for search engines.
10) The page is accessible: visible focus outlines on interactive controls, sufficient contrast on dark backgrounds, and keyboard navigable.
11) Footer Terms and Privacy links use placeholder `#` URLs until the dedicated pages are created; the sign‑in page must use the same links to stay consistent.
