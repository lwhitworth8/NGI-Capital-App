$ErrorActionPreference = 'Stop'

# Jump to repo root (this script lives in scripts/)
Push-Location "$PSScriptRoot\.."

Write-Host "Navigating to apps\\desktop ..."
Set-Location "apps\desktop"

if (-not (Test-Path "package.json")) {
  Write-Error "apps\\desktop not found or package.json missing. Are you running from the repo root?"
  exit 1
}

# Ensure env file exists (optional)
if (-not (Test-Path ".env.local")) {
  Write-Host "Creating apps\\desktop\\.env.local (if you have real secrets, paste them now)."
  @'
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_c291Z2h0LXNlYWwtOTIuY2xlcmsuYWNjb3VudHMuZGV2JA
CLERK_PUBLISHABLE_KEY=pk_test_c291Z2h0LXNlYWwtOTIuY2xlcmsuYWNjb3VudHMuZGV2JA
CLERK_SECRET_KEY=sk_test_fill_me_here
CLERK_SIGN_IN_URL=/sign-in
CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_API_URL=http://localhost:8001
'@ | Out-File -Encoding ASCII ".env.local"
}

# Install deps if node_modules is missing
if (-not (Test-Path "node_modules")) {
  Write-Host "Installing dependencies (npm install) ..."
  npm install
}

Write-Host "Starting Next.js dev server on http://localhost:3001 ..."
npm run dev

Pop-Location

