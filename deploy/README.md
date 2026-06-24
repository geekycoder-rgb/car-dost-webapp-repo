# `deploy/` — CarDost self-hosting bundle

This folder is everything you need to deploy CarDost to a single VPS.

**Read first:** [`../DEPLOYMENT.md`](../DEPLOYMENT.md) — the full guide.

| File | What it does |
|---|---|
| `docker-compose.yml` | Defines the 3-service stack (mongo / backend / frontend) |
| `Dockerfile.backend` | Builds the FastAPI image (Python 3.11) |
| `Dockerfile.frontend` | Builds the React static site, served by nginx |
| `.env.backend.example` | Copy to `.env.backend` and fill in secrets |
| `.env.frontend.example` | Copy to `.env.frontend` and set `REACT_APP_BACKEND_URL` |
| `nginx/cardost.conf` | Goes to `/etc/nginx/sites-available/` on the host (SSL termination) |
| `nginx/cardost.frontend.conf` | Lives inside the frontend container (SPA + /api proxy) |
| `scripts/install_ubuntu.sh` | One-shot VPS bootstrap (Docker + nginx + UFW + fail2ban) |
| `scripts/setup_ssl.sh` | `certbot --nginx` automation |
| `scripts/init_indexes.py` | Mongo indexes + settings doc bootstrap |
| `scripts/backup.sh` | Nightly mongodump + config archive |
| `scripts/restore.sh` | Restore a `.tar.gz` produced by `backup.sh` |

## TL;DR

```bash
sudo bash deploy/scripts/install_ubuntu.sh
cp deploy/.env.backend.example  deploy/.env.backend  && nano deploy/.env.backend
cp deploy/.env.frontend.example deploy/.env.frontend && nano deploy/.env.frontend
sudo cp deploy/nginx/cardost.conf /etc/nginx/sites-available/ && \
  sudo ln -sf /etc/nginx/sites-available/cardost.conf /etc/nginx/sites-enabled/cardost.conf
sudo bash deploy/scripts/setup_ssl.sh your-domain.com you@your-domain.com
docker compose -f deploy/docker-compose.yml --env-file deploy/.env.backend up -d --build
docker compose -f deploy/docker-compose.yml --env-file deploy/.env.backend \
  run --rm backend python /srv/cardost/init_indexes.py
```

That's it. Full walkthrough + troubleshooting in `DEPLOYMENT.md`.
