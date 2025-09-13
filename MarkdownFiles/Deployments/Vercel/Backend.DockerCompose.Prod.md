# Backend — Docker Compose (Production)

We will reuse the existing `docker-compose.prod.yml` and start only the backend service.

Steps
1) SSH to your VM and clone repo (read-only) to `/opt/ngi-capital`.
2) Create a production `.env` in `/opt/ngi-capital` (see Env Vars Matrix).
3) From repo root, run:
```
docker compose -f docker-compose.prod.yml up -d backend
```
4) Verify health:
```
curl http://localhost:8001/api/health
```
5) Add a reverse proxy (Caddy recommended) for TLS at `api.ngicapitaladvisory.com`.

Systemd (optional)
- If you want Compose to start on boot, create a systemd service that runs the command above.

Notes
- The compose file mounts `./ngi_capital.db` into `/app/data/ngi_capital.db` inside the container. Back this file up before demo.
- If you need to seed or migrate, use `python init_db_simple.py` inside the container or `docker compose exec`.

