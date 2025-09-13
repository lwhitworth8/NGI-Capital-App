# NGI Capital Docker Setup

This document provides instructions for running the NGI Capital application using Docker.

Auth Update (Clerk-only)
- Legacy password-based login and cookie bridge are removed.
- Use Clerk for sign-in; ensure `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `CLERK_ISSUER`, and `CLERK_JWKS_URL` are set.
- Any "Default Credentials" referenced elsewhere are deprecated and should not be used.

## Prerequisites

- Docker Desktop (Windows/Mac) or Docker Engine (Linux)
- Docker Compose v2.0+
- Make (optional, for using Makefile commands)
- 4GB+ RAM available for Docker
- 10GB+ free disk space

## Quick Start

### Using Make (Recommended)

```bash
# Initial setup (builds images, creates .env, initializes database)
make init

# Start development environment
make dev

# View logs
make logs
```

### Using Docker Compose Directly

```bash
# Copy environment variables
cp .env.example .env

# Build images
docker-compose build

# Start services
docker-compose up -d

# Initialize database
docker exec ngi-backend python init_db_simple.py

# View logs
docker-compose logs -f
```

## Architecture

The application consists of the following services:

### Core Services (Development)
- **backend**: FastAPI application (Port 8001)
- **frontend**: Next.js application (Port 3000)

### Additional Services (Production)
- **postgres**: PostgreSQL database (Port 5432)
- **redis**: Redis cache (Port 6379)
- **nginx**: Reverse proxy (Ports 80/443)

## Service URLs

- **API**: http://localhost:8001
- **Frontend**: http://localhost:3000
- **API Documentation**: http://localhost:8001/docs
- **Health Check**: http://localhost:8001/health

## Authentication

Use Clerk for sign-in. There are no in-app passwords.
Ensure these env vars are set in `.env` or your compose environment:
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`
- `CLERK_ISSUER`, `CLERK_JWKS_URL`, `CLERK_AUDIENCE`

## Common Commands

### Service Management

```bash
# Start all services
make up
# OR
docker-compose up -d

# Stop all services
make down
# OR
docker-compose down

# Restart services
make restart
# OR
docker-compose restart

# View service status
make status
# OR
docker-compose ps
```

### Logs

```bash
# View all logs
make logs
# OR
docker-compose logs -f

# View specific service logs
make logs-api        # API logs only
make logs-frontend   # Frontend logs only
# OR
docker-compose logs -f backend
docker-compose logs -f frontend
```

### Database Operations

```bash
# Initialize database
make db-init

# Backup database
make db-backup

# Restore database
make db-restore

# Access database shell (PostgreSQL)
make shell-db
```

### Development

```bash
# Open shell in API container
make shell-api
# OR
docker exec -it ngi-backend /bin/bash

# Open shell in frontend container
make shell-frontend
# OR
docker exec -it ngi-frontend /bin/sh

# Run tests
make test
# OR
docker exec ngi-backend pytest tests/

# Rebuild services
make rebuild
```

### Health Checks

```bash
# Check all services health
make health

# Test API endpoint
make test-api
```

## Environment Variables

Key environment variables (see `.env.example` for full list):

- `DATABASE_URL`: Database connection string
- `SECRET_KEY`: Application secret key
- `JWT_SECRET_KEY`: JWT signing key
- `CORS_ORIGINS`: Allowed CORS origins
- `MERCURY_API_KEY`: Mercury Bank API key (optional)
- `REDIS_URL`: Redis connection string (production)

## Production Deployment

### Start Production Stack

```bash
# Start with all production services
make prod
# OR
docker-compose --profile production up -d
```

This includes:
- PostgreSQL database
- Redis cache
- Nginx reverse proxy
- Monitoring services (optional)

### SSL/TLS Configuration

1. Place SSL certificates in `nginx/ssl/`:
   - `cert.pem`: SSL certificate
   - `key.pem`: Private key

2. Uncomment HTTPS server block in `nginx/nginx.conf`

3. Update environment variables:
   ```bash
   CORS_ORIGINS=https://yourdomain.com
   NEXT_PUBLIC_API_URL=https://yourdomain.com
   ```

## Troubleshooting

### Container Won't Start

```bash
# Check logs
docker-compose logs backend
docker-compose logs frontend

# Rebuild images
docker-compose build --no-cache
```

### Database Connection Issues

```bash
# Check database is running
docker-compose ps postgres

# Verify database initialization
docker exec ngi-backend python -c "import sqlite3; conn = sqlite3.connect('/app/data/ngi_capital.db'); print('Database OK')"
```

### Port Conflicts

If ports are already in use:

1. Stop conflicting services, OR
2. Change ports in `docker-compose.yml`:
   ```yaml
   ports:
     - "8002:8001"  # Change host port
   ```

### Permission Issues

On Linux, if you encounter permission issues:

```bash
# Fix permissions
sudo chown -R $USER:$USER .
```

### Clean Start

For a complete fresh start:

```bash
# Remove all containers and volumes
make clean-all
# OR
docker-compose down -v --rmi all

# Reinitialize
make init
```

## Monitoring

### View Container Stats

```bash
# Real-time statistics
docker stats

# One-time snapshot
make stats
```

### Logs Management

Logs are stored in:
- API logs: `./logs/`
- Docker logs: Use `docker-compose logs`

To clear logs:
```bash
rm -rf logs/*
docker-compose restart
```

## Backup & Restore

### Automatic Backups

Backups run daily at 2 AM (configurable in `.env`):
- Location: `./backups/`
- Retention: 30 days (default)

### Manual Backup

```bash
make db-backup
# OR
docker exec ngi-backend /bin/bash scripts/backup.sh
```

### Restore from Backup

```bash
make db-restore
# OR
docker exec ngi-backend /bin/bash scripts/restore.sh
```

## Performance Optimization

### Resource Limits

Add to `docker-compose.yml` for production:

```yaml
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '2.0'
          memory: 2G
        reservations:
          cpus: '1.0'
          memory: 1G
```

### Caching

Redis is included for production caching:
- Session management
- API response caching
- Rate limiting

## Security Notes

1. **Change default passwords** in production
2. **Use strong SECRET_KEY** values
3. **Enable HTTPS** for production
4. **Restrict CORS origins** appropriately
5. **Regular security updates**: `docker-compose pull`
6. **Implement firewall rules** for production

## Support

For issues or questions:
1. Check logs: `make logs`
2. Verify health: `make health`
3. Review this documentation
4. Check application logs in `./logs/`

## Development Workflow

1. Make code changes
2. Services auto-reload (development mode)
3. Check logs: `make logs`
4. Run tests: `make test`
5. Commit changes

## Updating

To update the application:

```bash
# Pull latest code
git pull

# Rebuild and restart
make rebuild
# OR
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

---

For more details, see the main [README.md](README.md) and [NGI_CAPITAL_INTERNAL_APP.md](NGI_CAPITAL_INTERNAL_APP.md).
