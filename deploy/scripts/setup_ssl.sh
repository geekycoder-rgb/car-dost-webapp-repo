#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
# CarDost — Let's Encrypt SSL setup (nginx plugin)
#
# Usage:   sudo bash deploy/scripts/setup_ssl.sh DOMAIN EMAIL
# Example: sudo bash deploy/scripts/setup_ssl.sh cardost.in admin@cardost.in
#
# Prerequisites:
#   • DOMAIN's A record (and www CNAME) points to this server
#   • Port 80 + 443 are open in UFW (install_ubuntu.sh does this)
#   • nginx is running with the cardost.conf site (placeholder OK pre-cert)
# ─────────────────────────────────────────────────────────────
set -euo pipefail

DOMAIN="${1:?usage: setup_ssl.sh DOMAIN EMAIL}"
EMAIL="${2:?usage: setup_ssl.sh DOMAIN EMAIL}"

if [[ $EUID -ne 0 ]]; then
  echo "Run as root (sudo bash $0 $DOMAIN $EMAIL)" >&2
  exit 1
fi

echo "→ Patching /etc/nginx/sites-available/cardost.conf with domain: $DOMAIN"
if [[ -f /etc/nginx/sites-available/cardost.conf ]]; then
  sed -i "s/your-domain\.com/$DOMAIN/g" /etc/nginx/sites-available/cardost.conf
fi

echo "→ Provisioning cert for $DOMAIN + www.$DOMAIN"
certbot --nginx \
  --non-interactive --agree-tos \
  --email "$EMAIL" \
  --redirect \
  -d "$DOMAIN" -d "www.$DOMAIN"

echo "→ Reloading nginx"
nginx -t
systemctl reload nginx

echo "→ Verifying auto-renewal timer"
systemctl enable --now certbot.timer
systemctl status certbot.timer --no-pager | head -5

echo
echo "✅ SSL is live for https://$DOMAIN"
echo "   Auto-renews via systemd timer. Test with:  sudo certbot renew --dry-run"
