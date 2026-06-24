#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
# CarDost — first-boot install on Ubuntu 24.04 LTS VPS
# Usage:    sudo bash deploy/scripts/install_ubuntu.sh
# Idempotent: safe to re-run.
# ─────────────────────────────────────────────────────────────
set -euo pipefail

if [[ $EUID -ne 0 ]]; then
  echo "Run as root (sudo bash $0)" >&2
  exit 1
fi

echo "──[1/7]── Updating apt + base utilities"
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get upgrade -y
apt-get install -y \
    ca-certificates curl gnupg lsb-release ufw fail2ban \
    nginx git unzip jq cron logrotate

echo "──[2/7]── Installing Docker Engine + Compose plugin"
if ! command -v docker >/dev/null; then
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  chmod a+r /etc/apt/keyrings/docker.gpg
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
    https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" > /etc/apt/sources.list.d/docker.list
  apt-get update -y
  apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
  systemctl enable --now docker
fi

echo "──[3/7]── Installing certbot (Let's Encrypt)"
apt-get install -y certbot python3-certbot-nginx

echo "──[4/7]── Firewall (UFW)"
ufw --force reset >/dev/null
ufw default deny incoming
ufw default allow outgoing
ufw allow OpenSSH
ufw allow "Nginx Full"
ufw --force enable

echo "──[5/7]── fail2ban — sshd jail with sane defaults"
cat >/etc/fail2ban/jail.local <<'EOF'
[DEFAULT]
bantime  = 1h
findtime = 10m
maxretry = 5

[sshd]
enabled = true
EOF
systemctl enable --now fail2ban

echo "──[6/7]── Creating deploy user & directories"
id -u cardost &>/dev/null || useradd -m -s /bin/bash cardost
usermod -aG docker cardost || true
install -d -o cardost -g cardost /opt/cardost
install -d /var/www/certbot
install -d /var/backups/cardost
install -d /var/log/cardost

echo "──[7/7]── Logrotate for nginx"
cat >/etc/logrotate.d/cardost <<'EOF'
/var/log/nginx/cardost.*.log {
    weekly
    rotate 12
    compress
    delaycompress
    missingok
    notifempty
    sharedscripts
    postrotate
        [ -s /run/nginx.pid ] && kill -USR1 `cat /run/nginx.pid`
    endscript
}
EOF

echo
echo "✅ Base install complete."
echo
echo "Next steps:"
echo "  1. As 'cardost' user: git clone your repo to /opt/cardost (or scp the source)"
echo "  2. cp deploy/.env.backend.example deploy/.env.backend  &&  edit secrets"
echo "  3. cp deploy/.env.frontend.example deploy/.env.frontend &&  edit REACT_APP_BACKEND_URL"
echo "  4. sudo cp deploy/nginx/cardost.conf /etc/nginx/sites-available/"
echo "     sudo ln -s /etc/nginx/sites-available/cardost.conf /etc/nginx/sites-enabled/"
echo "     sudo sed -i 's/your-domain.com/REAL_DOMAIN/g' /etc/nginx/sites-available/cardost.conf"
echo "  5. sudo bash deploy/scripts/setup_ssl.sh REAL_DOMAIN your@email.com"
echo "  6. cd /opt/cardost && docker compose -f deploy/docker-compose.yml --env-file deploy/.env.backend up -d --build"
echo "  7. docker compose -f deploy/docker-compose.yml run --rm backend python /srv/cardost/init_indexes.py"
echo "  8. Add the backup cron:  sudo crontab -e   →   0 3 * * * /opt/cardost/deploy/scripts/backup.sh"
