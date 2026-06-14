#!/bin/sh
# Aktualizacja panelu iPad z Git na Home Assistant.
# Uruchom w Terminal & SSH add-on (HA OS) lub przez shell_command.
#
# Jednorazowa konfiguracja:
#   cd /config/www
#   git clone https://github.com/amaremusica/home-assistant-legacy-ipad-dashboard-.git dashboard
#
# Potem ten skrypt kopiuje ipad.html i ipad-version.json do /config/www/

set -e
REPO="/config/www/dashboard"
WWW="/config/www"

cd "$REPO" || exit 1
git pull origin main
cp "$REPO/ipad.html" "$WWW/ipad.html"
cp "$REPO/ipad-version.json" "$WWW/ipad-version.json"
echo "OK: panel zaktualizowany ($(cat "$WWW/ipad-version.json"))"
