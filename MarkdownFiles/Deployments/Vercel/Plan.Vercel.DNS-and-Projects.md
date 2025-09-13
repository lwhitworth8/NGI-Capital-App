# Plan — Vercel Projects, DNS, Backend

This is the step-by-step plan to stand up production.

Prereqs
- Clerk instance with production keys
- VM ready (public IP) for backend
- Access to Squarespace DNS

1) Backend VM (API)
- SSH to the VM and install Docker + Compose plugin:
  - Ubuntu quickstart:
    - `sudo apt-get update && sudo apt-get install -y ca-certificates curl gnupg`
    - `sudo install -m 0755 -d /etc/apt/keyrings`
    - `curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg`
    - `echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo $VERSION_CODENAME) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null`
    - `sudo apt-get update && sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin`
- Clone repo (read-only) to `/opt/ngi-capital`:
  - `sudo mkdir -p /opt/ngi-capital && sudo chown $USER /opt/ngi-capital`
  - `git clone https://github.com/lwhitworth8/NGI-Capital-App.git /opt/ngi-capital`
- Create a `.env` in `/opt/ngi-capital` with production values (see Env Matrix).
- Start backend only (from repo root):
  - `docker compose -f docker-compose.prod.yml up -d backend`
- Verify health: `curl http://localhost:8001/api/health` → should return 200 JSON.

2) TLS Reverse Proxy on VM (api.ngicapitaladvisory.com)
Option A — Caddy (simplest):
- Install Caddy: https://caddyserver.com/docs/install
- Create `/etc/caddy/Caddyfile`:
```
api.ngicapitaladvisory.com {
    encode gzip
    reverse_proxy 127.0.0.1:8001
}
```
- `sudo systemctl restart caddy`

Option B — Nginx + Certbot (if preferred):
- Install Nginx + Certbot, create a server block proxying to 127.0.0.1:8001, then `certbot --nginx -d api.ngicapitaladvisory.com`.

3) Squarespace DNS
- In Squarespace DNS panel for `ngicapitaladvisory.com`:
  - Apex: Add A record → Host `@` → Value `76.76.21.21` (Vercel) (Proxied: off)
  - `www`: CNAME → Host `www` → Value `cname.vercel-dns.com`
  - `admin`: CNAME → Host `admin` → Value assigned by Vercel Admin project (after adding domain)
  - `api`: A record → Host `api` → Value `<your VM public IP>`

4) Vercel Projects (Monorepo)
- Create Project: NGI Student
  - Git repo: `lwhitworth8/NGI-Capital-App`
  - Root Directory: `apps/student`
  - Install Command: `npm ci --prefix=../..`
  - Build Command: default
  - Production Branch: `production`
  - Environment Variables: see Env Matrix (Student)
  - Domains: add `ngicapitaladvisory.com` (apex) and `www.ngicapitaladvisory.com` (optional)

- Create Project: NGI Admin
  - Root Directory: `apps/desktop`
  - Install Command: `npm ci --prefix=../..`
  - Build Command: default
  - Production Branch: `production`
  - Environment Variables: see Env Matrix (Admin)
  - Domains: add `admin.ngicapitaladvisory.com`

5) Clerk Configuration
- In Clerk Dashboard → Allowlisted Origins and Redirect URLs:
  - Add: `https://ngicapitaladvisory.com`, `https://www.ngicapitaladvisory.com` (optional), `https://admin.ngicapitaladvisory.com`
- Update JWT template / audience if needed (backend expects `CLERK_AUDIENCE=backend`).
- Set Publishable + Secret keys in Vercel + VM.

6) Git Branching
- From local dev:
  - `git checkout -b production`
  - `git push origin production`
- In each Vercel project → Settings → Git → Production Branch = `production`.
- `main` continues as Preview (no domain attached by default).

7) Smoke Tests
- Student: load `/`, sign-in, redirected to `/projects`.
- Admin: visit `https://admin.ngicapitaladvisory.com/admin/dashboard`, sign-in → dashboard loads.
- Backend: `https://api.ngicapitaladvisory.com/api/health` → 200 JSON.
- Core flows: Advisory Projects list, Investor Management pages, Accounting quick checks.

