# CarDost — Self-Hosting Deployment Guide

Production-grade deployment of the CarDost e-commerce stack to a fresh Ubuntu 24.04 LTS VPS, using Docker Compose behind a host-level nginx reverse proxy with Let's Encrypt SSL.

> **Stack**: React (CRA) + FastAPI + MongoDB 7 + nginx + certbot.
> **Min server**: 2 vCPU / 2 GB RAM / 25 GB SSD. Recommended: 2 vCPU / 4 GB / 40 GB.

---

## 0. What's in this package

```
/app
├── backend/                    FastAPI source (server.py, email_service.py, requirements.txt, tests/, data/)
├── frontend/                   React source (src/, public/, package.json, yarn.lock, craco config)
└── deploy/
    ├── Dockerfile.backend
    ├── Dockerfile.frontend
    ├── docker-compose.yml
    ├── .env.backend.example
    ├── .env.frontend.example
    ├── nginx/
    │   ├── cardost.conf                 ← host-level (SSL termination)
    │   └── cardost.frontend.conf        ← inside the frontend container
    └── scripts/
        ├── install_ubuntu.sh            ← one-shot VPS bootstrap
        ├── setup_ssl.sh                 ← Let's Encrypt
        ├── init_indexes.py              ← Mongo indexes + settings bootstrap
        ├── backup.sh                    ← nightly mongodump + config archive
        └── restore.sh                   ← restore from archive
```

---

## 1. Architecture

```
                       ┌────────────────────────────────────────────────────┐
                       │                  VPS  (Ubuntu 24.04)               │
                       │                                                    │
   Internet ──HTTPS──▶ │  ┌─── nginx ─── 443/80 ───┐                        │
                       │  │ SSL term + redirects   │                        │
                       │  └─── proxy_pass ▶ 127.0.0.1:8080 ──┐              │
                       │                                     │              │
                       │                       ┌─────────────▼──────────┐   │
                       │  Docker network       │ cardost-frontend       │   │
                       │  "cardost_net"        │ nginx + React build    │   │
                       │                       │ serves /, proxies /api │   │
                       │                       └────────┬───────────────┘   │
                       │                                │                   │
                       │                       ┌────────▼─────────┐         │
                       │                       │ cardost-backend  │         │
                       │                       │ FastAPI :8001    │         │
                       │                       └────────┬─────────┘         │
                       │                                │                   │
                       │                       ┌────────▼─────────┐         │
                       │                       │  cardost-mongo   │         │
                       │                       │  MongoDB 7       │         │
                       │                       │  vol: mongo_data │         │
                       │                       └──────────────────┘         │
                       └────────────────────────────────────────────────────┘
```

- **Only port 22 (SSH), 80, and 443 are exposed publicly.** The backend and Mongo are network-isolated inside the Docker bridge.
- **Frontend is built once** with `REACT_APP_BACKEND_URL` baked into the bundle — change → rebuild.
- **MongoDB data persists** in a named Docker volume (`mongo_data`). The backup script does logical dumps; the volume itself is the disaster-recovery floor.

---

## 2. Prerequisites

1. A VPS (DigitalOcean / Hetzner / Linode / AWS Lightsail) running **Ubuntu 24.04 LTS**.
2. A registered domain (e.g. `cardost.in`) with an **A record → your VPS IP** and a `www` CNAME or A record pointing to the same IP.
3. SSH access to the VPS as a sudoer.
4. **Razorpay** account for payments (test keys work for staging).
5. **SMTP** mailbox (GoDaddy Titan / Microsoft 365 / Zoho / SendGrid) — configured via Admin UI after first boot.
6. (Optional) **Shiprocket** account for live logistics — configured in Admin UI.

---

## 3. One-shot deployment (the happy path)

```bash
# ── 3.1 On your laptop: package the source ─────────────────────────────────
cd /path/to/cardost
tar --exclude='node_modules' \
    --exclude='__pycache__' \
    --exclude='.git' \
    --exclude='frontend/build' \
    -czf cardost-src.tar.gz backend frontend deploy

scp cardost-src.tar.gz root@your-vps-ip:/tmp/

# ── 3.2 On the VPS: bootstrap ───────────────────────────────────────────────
ssh root@your-vps-ip

sudo bash <<'EOF'
mkdir -p /opt/cardost && cd /opt/cardost
tar -xzf /tmp/cardost-src.tar.gz
bash deploy/scripts/install_ubuntu.sh
EOF

# ── 3.3 Configure secrets ───────────────────────────────────────────────────
sudo -u cardost bash -c '
  cd /opt/cardost
  cp deploy/.env.backend.example  deploy/.env.backend
  cp deploy/.env.frontend.example deploy/.env.frontend
  nano deploy/.env.backend          # ← set JWT_SECRET, MONGO_ROOT_PASSWORD, RAZORPAY_*, FRONTEND_URL
  nano deploy/.env.frontend         # ← set REACT_APP_BACKEND_URL=https://your-domain.com
'

# ── 3.4 nginx site + SSL ────────────────────────────────────────────────────
sudo cp /opt/cardost/deploy/nginx/cardost.conf /etc/nginx/sites-available/cardost.conf
sudo ln -sf /etc/nginx/sites-available/cardost.conf /etc/nginx/sites-enabled/cardost.conf
sudo rm -f /etc/nginx/sites-enabled/default
sudo bash /opt/cardost/deploy/scripts/setup_ssl.sh your-domain.com admin@your-domain.com

# ── 3.5 Bring up the stack ──────────────────────────────────────────────────
cd /opt/cardost
sudo -u cardost docker compose \
   -f deploy/docker-compose.yml \
   --env-file deploy/.env.backend \
   up -d --build

# ── 3.6 Initialise indexes + settings doc ───────────────────────────────────
sudo -u cardost docker compose \
   -f deploy/docker-compose.yml \
   --env-file deploy/.env.backend \
   run --rm backend python /srv/cardost/init_indexes.py

# ── 3.7 Set up nightly backups ──────────────────────────────────────────────
sudo crontab -l 2>/dev/null > /tmp/cron; \
  echo '0 3 * * * /opt/cardost/deploy/scripts/backup.sh >> /var/log/cardost/backup.log 2>&1' >> /tmp/cron; \
  sudo crontab /tmp/cron
```

Open `https://your-domain.com` — the React SPA loads, `/api/products` returns data, and the seeded admin (`admin@cardost.com` / `Admin@123`) can sign in. **Change the admin password immediately.**

---

## 4. Environment variables

### Backend — `deploy/.env.backend`

| Variable | Required | Example | Notes |
|---|---|---|---|
| `MONGO_ROOT_USERNAME` | ✅ | `cardost_root` | Used by the mongo container only |
| `MONGO_ROOT_PASSWORD` | ✅ | `***strong***` | 32+ random chars |
| `DB_NAME` | ✅ | `cardost` | Mongo database name |
| `JWT_SECRET` | ✅ | `python -c "import secrets;print(secrets.token_urlsafe(48))"` | Sign-in tokens |
| `RAZORPAY_KEY_ID` | ✅ | `rzp_live_xxx` | Razorpay dashboard → API Keys |
| `RAZORPAY_KEY_SECRET` | ✅ | `xxx` | Same dashboard |
| `RAZORPAY_WEBHOOK_SECRET` | ⚠️ | `xxx` | Required only if you wire the webhook |
| `FRONTEND_URL` | ✅ | `https://your-domain.com` | Used in email links + CORS |
| `STORAGE_URL` | ✅ | `https://integrations.emergentagent.com/objstore/api/v1/storage` | See §8 to self-host |
| `EMERGENT_LLM_KEY` | ⚠️ | — | Only if you keep Emergent Object Storage |

> SMTP credentials are stored in the **DB** (the `settings` collection) and managed from **Admin → Integrations → Email**, not in `.env`. The same goes for Shiprocket creds.

### Frontend — `deploy/.env.frontend`

| Variable | Required | Example | Notes |
|---|---|---|---|
| `REACT_APP_BACKEND_URL` | ✅ | `https://your-domain.com` | Baked into the JS bundle at build time |

---

## 5. Database

### Collections

| Collection | Purpose |
|---|---|
| `users` | Customers + admin accounts. Hashed passwords (bcrypt). |
| `products` | Catalog. Includes price, gallery, compatible variants, SEO fields. |
| `orders` | Created/paid/shipped/delivered. Includes Shiprocket payload + status timestamps. |
| `car_makes`, `car_models`, `car_variants` | 3-level vehicle hierarchy used for fitment search. |
| `categories` | Top-nav driven; admin-editable. |
| `banners` | Home-page hero carousel. |
| `reviews` | Per-product customer reviews. |
| `coupons` | Discount codes. |
| `tax_rules` | GST rules. |
| `contacts` | Contact-form submissions (admin can mark read/reply). |
| `files` | Pointers to objects in storage (image uploads). |
| `settings` | Singleton (`id: "global"`). Razorpay/Shiprocket/SMTP/alias config. |

### Indexes & seed

The `init_indexes.py` script (run once at deploy time) creates ~22 indexes covering:
- Unique IDs on every collection
- Unique `users.email` and `categories.slug`
- Compound indexes on `orders` for `(user_id, created_at)`, `(address.email, created_at)`, `(status, created_at)`
- Text index on `products(name, description, tags)` for search
- Sparse index on `products.seo_slug` for SEO routes

It also bootstraps the singleton `settings` doc with safe defaults (`mock_payment: true`, `smtp_enabled: false`).

### Schema migrations

The backend is forward-compatible by design: new fields default to safe values via Pydantic. A live auto-migration in `get_settings_doc()` corrects historical SMTP host typos. For larger structural changes, write a one-off script in `deploy/scripts/migrations/`.

---

## 6. SSL setup

`deploy/scripts/setup_ssl.sh` runs `certbot --nginx` which:
1. Solves the HTTP-01 challenge on port 80.
2. Generates certs in `/etc/letsencrypt/live/your-domain.com/`.
3. Patches nginx with `ssl_certificate` / `ssl_certificate_key` directives.
4. Enables HSTS + HTTP→HTTPS redirect.
5. Installs a systemd timer for auto-renewal (`certbot.timer`).

To test renewal manually:
```bash
sudo certbot renew --dry-run
```

---

## 7. Backups & restore

### Schedule

The `install_ubuntu.sh` step prints a cron line; the recommended schedule is **nightly at 03:00 UTC**:
```cron
0 3 * * *  /opt/cardost/deploy/scripts/backup.sh >> /var/log/cardost/backup.log 2>&1
```

Each run produces `/var/backups/cardost/cardost-YYYY-MM-DD_HHMM.tar.gz` containing:
- A gzipped `mongodump --archive` (the **entire DB**)
- A snapshot of `.env.backend`, `.env.frontend`, and the host nginx site config

Default retention is **14 archives** (override with `RETENTION=30 backup.sh`).

### Off-site copy

After the local archive lands, push it to S3/Backblaze/Wasabi. Add to the cron line:
```bash
0 3 * * *  /opt/cardost/deploy/scripts/backup.sh && \
           aws s3 cp /var/backups/cardost/cardost-$(date +\%Y-\%m-\%d)_*.tar.gz s3://your-bucket/cardost/ \
           >> /var/log/cardost/backup.log 2>&1
```

### Restore

```bash
sudo bash /opt/cardost/deploy/scripts/restore.sh /var/backups/cardost/cardost-2026-02-15_0300.tar.gz
# answer RESTORE to confirm — drops & rebuilds the DB
```

---

## 8. File storage (uploads)

Out of the box the app uses **Emergent Object Storage** (`STORAGE_URL` in `.env.backend`). For a fully self-hosted setup:

**Option A — Keep Emergent Storage** (recommended for the first deploy):
- Set `STORAGE_URL=https://integrations.emergentagent.com/objstore/api/v1/storage`
- Set `EMERGENT_LLM_KEY=<your Emergent universal key>`

**Option B — Swap to MinIO** (S3-compatible, runs in the same Docker network):
1. Add a `minio` service to `docker-compose.yml` (image `minio/minio`, persistent volume, ports `9000` internal only).
2. Rewrite `put_object` / `get_object` in `backend/server.py` to use `boto3`:
   ```python
   import boto3
   s3 = boto3.client('s3', endpoint_url='http://minio:9000', aws_access_key_id=..., aws_secret_access_key=...)
   ```
3. Add a `minio_data` volume and a bucket-bootstrap step in `init_indexes.py`.

This is intentionally not wired by default to keep the package light — it's ~50 LoC if you need it.

---

## 9. Updates / re-deploys

```bash
cd /opt/cardost
git pull                    # or scp a new tarball

sudo -u cardost docker compose \
   -f deploy/docker-compose.yml \
   --env-file deploy/.env.backend \
   up -d --build             # rebuilds whatever changed (backend or frontend)

# If you changed REACT_APP_BACKEND_URL or env vars, force-rebuild the frontend:
sudo -u cardost docker compose \
   -f deploy/docker-compose.yml \
   --env-file deploy/.env.backend \
   up -d --build --force-recreate frontend
```

**Zero-downtime tip**: keep two copies (`blue` / `green`) and switch the nginx upstream when the new copy is healthy.

---

## 10. Operations cheat-sheet

```bash
# Logs (follow, last 200 lines)
docker compose -f deploy/docker-compose.yml logs -f --tail=200 backend
docker compose -f deploy/docker-compose.yml logs -f --tail=200 frontend
docker compose -f deploy/docker-compose.yml logs -f --tail=200 mongo

# Shell into the backend container
docker compose -f deploy/docker-compose.yml exec backend bash

# Mongo shell
docker compose -f deploy/docker-compose.yml exec mongo mongosh \
   -u "$MONGO_ROOT_USERNAME" -p "$MONGO_ROOT_PASSWORD" --authenticationDatabase admin

# Run the pytest suite against the live container
docker compose -f deploy/docker-compose.yml exec backend \
   bash -c 'REACT_APP_BACKEND_URL=http://localhost:8001 pytest tests/ -v'

# Restart a single service
docker compose -f deploy/docker-compose.yml restart backend

# Tear down (keeps the DB volume)
docker compose -f deploy/docker-compose.yml down

# Tear down AND wipe data (irreversible!)
docker compose -f deploy/docker-compose.yml down -v
```

---

## 11. Security checklist

- [x] Firewall locked down to 22/80/443 (UFW)
- [x] fail2ban on sshd
- [x] HSTS + secure headers via nginx
- [x] Non-root user in the backend Docker image
- [x] Mongo bound to Docker-internal network only (never exposed to host)
- [x] Secrets in `.env` files (chmod 600 — handled by docker-compose)
- [x] Razorpay webhook secret verified server-side
- [x] JWT signed with a strong `JWT_SECRET`
- [ ] **You must rotate** the seeded admin password (`admin@cardost.com` / `Admin@123`) on first login
- [ ] **You must point** the SMTP secrets at your own mailbox (Admin → Integrations → Email)
- [ ] (Optional) Move SSH to a non-standard port + key-only auth

---

## 12. Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `502 Bad Gateway` on `/api/...` | Backend not listening / crashed | `docker compose logs backend` — look for stack trace |
| Admin can sign in but settings won't save | `JWT_SECRET` rotated mid-session | Sign out + back in |
| SMTP test fails 535 | Wrong host or app password | Use GoDaddy `smtpout.secureserver.net:587` (not Titan's direct host) |
| Razorpay 401 in checkout | Live keys in mock mode (or vice-versa) | Toggle Admin → Integrations → Razorpay → MOCK |
| Mongo container restarts | Out of disk | `df -h` + prune old backups / Docker images |
| Cert renewal fails | Port 80 not open | `ufw status` — must allow "Nginx Full" |

---

## 13. Production sizing

| Tier | vCPU | RAM | Disk | Notes |
|---|---|---|---|---|
| Staging / Demo | 1 | 2 GB | 25 GB | Mongo + backend share a vCPU |
| Standard prod | 2 | 4 GB | 50 GB | Comfortable up to ~100 orders/day |
| Growth | 4 | 8 GB | 100 GB | Move Mongo to its own VM at this point |

When you outgrow a single VM:
- Move MongoDB to **MongoDB Atlas** (`MONGO_URL=mongodb+srv://...`) — no app changes needed.
- Front the backend with a load balancer; the backend is stateless.
- Move static assets (the React `build/` output) to a CDN (CloudFront/Bunny).

---

## Support

The full source ships with `/app/backend/tests/` — run the pytest suite as a regression baseline:
```bash
docker compose -f deploy/docker-compose.yml exec backend pytest tests/ -v
```

For app-level operations (admin tasks, content, orders) see **`/app/memory/PRD.md`**.
