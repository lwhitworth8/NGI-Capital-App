@echo off
setlocal enabledelayedexpansion

cd /d "%~dp0\..\apps\desktop"
if not exist package.json (
  echo apps\desktop not found or package.json missing. Run from repo root.
  exit /b 1
)

if not exist .env.local (
  echo Creating .env.local with placeholders. Update CLERK_SECRET_KEY.
  > .env.local echo NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_c291Z2h0LXNlYWwtOTIuY2xlcmsuYWNjb3VudHMuZGV2JA
  >> .env.local echo CLERK_PUBLISHABLE_KEY=pk_test_c291Z2h0LXNlYWwtOTIuY2xlcmsuYWNjb3VudHMuZGV2JA
  >> .env.local echo CLERK_SECRET_KEY=sk_test_fill_me_here
  >> .env.local echo CLERK_SIGN_IN_URL=/sign-in
  >> .env.local echo CLERK_SIGN_UP_URL=/sign-up
  >> .env.local echo NEXT_PUBLIC_API_URL=http://localhost:8001
)

if not exist node_modules (
  echo Installing dependencies...
  npm install
)

echo Starting Next.js dev server on http://localhost:3001 ...
npm run dev

