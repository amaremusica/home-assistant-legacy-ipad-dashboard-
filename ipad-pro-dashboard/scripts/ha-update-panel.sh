#!/bin/sh
# Aktualizacja panelu iPad Pro z Git na Home Assistant.
# Działa z monorepo (dashboard/ipad-pro-dashboard/) lub osobnym klonem.
set -e
SCRIPT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
PARENT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
WWW="/config/www/ipad-pro"

# Monorepo: /config/www/dashboard/ipad-pro-dashboard + ipad.html w rodzicu
if [ -f "$PARENT_DIR/ipad.html" ] && [ -d "$PARENT_DIR/.git" ]; then
  cd "$PARENT_DIR" && git pull origin main
  REPO="$SCRIPT_DIR"
elif [ -d "$SCRIPT_DIR/.git" ]; then
  cd "$SCRIPT_DIR" && git pull origin main
  REPO="$SCRIPT_DIR"
else
  REPO="$SCRIPT_DIR"
fi

mkdir -p "$WWW"
cp "$REPO/index.html" "$WWW/index.html"
cp "$REPO/version.json" "$WWW/version.json"
cp "$REPO/manifest.webmanifest" "$WWW/manifest.webmanifest"
rm -rf "$WWW/css" "$WWW/js"
cp -R "$REPO/css" "$WWW/"
cp -R "$REPO/js" "$WWW/"
echo "OK: iPad Pro panel zaktualizowany ($(cat "$WWW/version.json"))"
