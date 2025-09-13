NGI Capital Production Backend Setup

Purpose
- Stand up the backend API at https://api.ngicapitaladvisory.com for Vercel frontends.

Prereqs
- Ubuntu VM with public IP
- sudo user with SSH access
- Domain DNS control (Squarespace)

1) Install Docker + Compose
- Ubuntu:
  sudo apt-get update && sudo apt-get install -y ca-certificates curl gnupg
  sudo install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo $VERSION_CODENAME) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
  sudo apt-get update && sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

2) Clone the repo
  sudo mkdir -p /opt/ngi-capital && sudo chown $USER /opt/ngi-capital
  git clone https://github.com/lwhitworth8/NGI-Capital-App.git /opt/ngi-capital

3) Create .env (production)
- Copy ops/production/.env.backend.example to /opt/ngi-capital/.env and fill values.

4) Start backend only
  cd /opt/ngi-capital
  docker compose -f docker-compose.prod.yml up -d backend
  curl http://localhost:8001/api/health  # expect 200 JSON

5) TLS reverse proxy (choose one)
- Caddy (simple):
  sudo mkdir -p /etc/caddy
  sudo cp /opt/ngi-capital/ops/production/caddy/Caddyfile /etc/caddy/Caddyfile
  sudo systemctl restart caddy || (sudo apt install -y debian-keyring debian-archive-keyring && sudo apt install -y caddy && sudo systemctl restart caddy)

- Nginx + Certbot (alternative):
  sudo apt-get install -y nginx
  sudo cp /opt/ngi-capital/ops/production/nginx/api.nginx.conf /etc/nginx/conf.d/api.nginx.conf
  sudo nginx -t && sudo systemctl reload nginx
  sudo snap install core; sudo snap refresh core
  sudo snap install --classic certbot
  sudo ln -s /snap/bin/certbot /usr/bin/certbot
  sudo certbot --nginx -d api.ngicapitaladvisory.com

6) DNS (Squarespace)
- A @ (optional): 76.76.21.21  # Vercel apex
- CNAME www: cname.vercel-dns.com  # Student
- CNAME admin: value shown in Vercel Admin project
- A api: <VM public IP>

7) Verify end-to-end
- https://api.ngicapitaladvisory.com/api/health → 200
- https://ngicapitaladvisory.com/ and https://admin.ngicapitaladvisory.com/

