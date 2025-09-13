NGI Capital Production Backend Setup (Current State + How-To)

Purpose
- Serve the backend API at https://api.ngicapitaladvisory.com for the Vercel frontends.
- Keep local dev containers for fast iteration, with a clean prod stack for demo.

Current State
- Frontends: deployed on Vercel (Student at apex, Admin at admin subdomain).
- Domains (Squarespace DNS):
  - @ A -> 76.76.21.21 (Vercel)
  - www CNAME -> Vercel value (or cname.vercel-dns.com)
  - admin CNAME -> Vercel value (or cname.vercel-dns.com)
  - api A -> <public IPv4 of host running this stack>
- Backend: runs via Docker Compose with Caddy TLS proxy inside the stack.
- TLS: Caddy auto-issues certs with ACME (Let's Encrypt), needs 80/443 open to the host.

Prereqs
- A host with public IPv4 (Windows or Linux). On Windows, use Docker Desktop.
- Ports 80 and 443 forwarded from your router to this host (TCP).
- Domain DNS control (Squarespace) to point api.<domain> to your IPv4.

1) DNS (Squarespace)
- A @ (optional): 76.76.21.21  # Vercel apex
- CNAME www: cname.vercel-dns.com  # Student
- CNAME admin: value shown in Vercel Admin project
- A api: <VM public IP>

2) Create the production env file (repo root)
- Copy ops/production/.env.backend.example to ./.env (or ./.env.prod) and set:
  - SECRET_KEY, JWT_SECRET_KEY (strong values)
  - CLERK_ISSUER, CLERK_JWKS_URL, CLERK_AUDIENCE=backend
  - CORS_ORIGINS=https://ngicapitaladvisory.com,https://admin.ngicapitaladvisory.com
  - FRONTEND_URL=https://ngicapitaladvisory.com
  - API_DOMAIN=api.ngicapitaladvisory.com
  - API_EMAIL=you@yourdomain.com (contact email for ACME)

3) Start the stack (backend + HTTPS) with one command
- On Windows (PowerShell), from repo root:
  docker compose -f ops/production/docker-compose.stack.yml --env-file .env.prod up -d --build

4) Port forwarding (router)
- Forward TCP 80 and 443 from your router/NAT to your host LAN IP (e.g., 192.168.1.x).
- Keep Windows Firewall rules for 80/443 open (we provided commands earlier).

5) Verify end-to-end
- Caddy will auto-issue the cert. Watch logs:
  docker logs -f ngi-caddy
- API health:
  Invoke-WebRequest https://api.ngicapitaladvisory.com/api/health -UseBasicParsing  # expect 200
- Frontends:
  https://ngicapitaladvisory.com and https://admin.ngicapitaladvisory.com

Troubleshooting
- ACME challenge timeouts: almost always router is not forwarding 80/443 to your host. Fix port forwarding and Caddy will retry.
- 502 Bad Gateway from Caddy: proxy target name must resolve inside the compose network. We point Caddy to ngi-backend-prod:8001.
- Windows only: if your ISP blocks 80/443 on residential plans, consider a small cloud VM for the demo.
