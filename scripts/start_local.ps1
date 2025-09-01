$ErrorActionPreference = 'Stop'

function Set-EnvFromDotEnv($path) {
  if (-not (Test-Path $path)) { return }
  Get-Content $path | ForEach-Object {
    $line = $_.Trim()
    if ($line -eq '' -or $line.StartsWith('#')) { return }
    $idx = $line.IndexOf('=')
    if ($idx -lt 1) { return }
    $key = $line.Substring(0, $idx).Trim()
    $val = $line.Substring($idx + 1).Trim()
    # strip optional quotes
    if ($val.StartsWith('"') -and $val.EndsWith('"')) { $val = $val.Substring(1, $val.Length-2) }
    if ($val.StartsWith("'") -and $val.EndsWith("'")) { $val = $val.Substring(1, $val.Length-2) }
    Set-Item -Path Env:$key -Value $val | Out-Null
  }
}

Push-Location "$PSScriptRoot\.."  # repo root

Write-Host "[local] Loading .env into environment..." -ForegroundColor Cyan
Set-EnvFromDotEnv ".env"

Write-Host "[local] Ensuring Python venv and backend deps..." -ForegroundColor Cyan
if (-not (Test-Path ".venv")) {
  python -m venv .venv
}
& .\.venv\Scripts\python -m pip install --upgrade pip > $null
& .\.venv\Scripts\python -m pip install -r requirements.txt

Write-Host "[local] Initializing database (if needed)..." -ForegroundColor Cyan
& .\.venv\Scripts\python init_db_simple.py

Write-Host "[local] Starting backend (FastAPI @ http://localhost:8001) ..." -ForegroundColor Cyan
$venvPy = (Resolve-Path ".\.venv\Scripts\python.exe").Path
$uvicornArgs = @('-m','uvicorn','src.api.main:app','--host','0.0.0.0','--port','8001')
$backendProc = Start-Process -FilePath $venvPy -ArgumentList $uvicornArgs -PassThru -WindowStyle Minimized

Write-Host "[local] Ensuring Next.js env and deps..." -ForegroundColor Cyan
Push-Location "apps\desktop"
if (-not (Test-Path ".env.local")) {
  @'
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_INSERT_YOUR_PUBLISHABLE_KEY_HERE
CLERK_PUBLISHABLE_KEY=pk_test_INSERT_YOUR_PUBLISHABLE_KEY_HERE
CLERK_SECRET_KEY=sk_test_INSERT_YOUR_SECRET_KEY_HERE
CLERK_SIGN_IN_URL=/sign-in
CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_API_URL=http://localhost:8001
'@ | Out-File -Encoding ASCII ".env.local"
  Write-Warning "Created apps\\desktop\\.env.local with placeholders. Update with your real Clerk keys."
}

if (-not (Test-Path "node_modules")) {
  npm install
}

Write-Host "[local] Starting Next.js (http://localhost:3001) ... (Ctrl+C to stop both FE+BE)" -ForegroundColor Cyan
try {
  npm run dev
}
finally {
  Write-Host "[local] Stopping backend (port 8001) ..." -ForegroundColor Yellow
  try {
    if ($backendProc -and -not $backendProc.HasExited) {
      Stop-Process -Id $backendProc.Id -Force -ErrorAction SilentlyContinue
    }
  } catch {}
}

Pop-Location
Pop-Location
