# Onboarding Admin – Overview (Expanded)

A lean onboarding workflow for Analysts using Google tools and internal checklists. Admins schedule a single interview, send a manual offer email, collect and upload signed legal documents (NDA, IP assignment, Unpaid Internship Consent), provision an NGI email, and then grant access to the student’s My Projects. Instances auto‑create on Offer → Accepted; access is gated until completion. All documents are secured, PDF‑only, and saved in the central Documents system.

References:
- PRD.OnboardingAdmin.md
- UX.Spec.OnboardingAdmin.md
- TestPlan.OnboardingAdmin.md
- QAChecklist.OnboardingAdmin.md
- AcceptanceCriteria.OnboardingAdmin.md
- OpenQuestions.OnboardingAdmin.md

Current Implementation (V1 dev):
- Fixed onboarding flow per student + project (no templates): NGI email creation, Intern Agreement send/receive, optional NDA send/receive, upload signed PDFs, finalize to onboard.
- Admin UI at NGI Advisory → Onboarding with flow creation and a checklist-like workflow per flow.
- Finalize creates project assignment and archives the related application.
