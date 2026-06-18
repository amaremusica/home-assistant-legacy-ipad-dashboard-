#!/bin/sh
# Aktualizacja panelu iPad z Git na Home Assistant.
# Uruchom w Terminal & SSH add-on (HA OS) lub przez shell_command.

set -e
REPO="/config/www/dashboard"
WWW="/config/www"

cd "$REPO" || exit 1
git pull origin main
cp "$REPO/ipad.html" "$WWW/ipad.html"
cp "$REPO/ipad.css" "$WWW/ipad.css"
cp "$REPO/ipad-version.json" "$WWW/ipad-version.json"
echo "OK: panel zaktualizowany ($(cat "$WWW/ipad-version.json"))"
