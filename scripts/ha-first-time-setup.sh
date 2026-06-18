#!/bin/sh
# Jednorazowa konfiguracja auto-aktualizacji panelu na Home Assistant OS.
# Uruchom w Terminal & SSH add-on:
#   bash /config/www/dashboard/scripts/ha-first-time-setup.sh
#
# Po tym dodaj shell_command do configuration.yaml (instrukcja na końcu skryptu).

set -e
REPO_URL="https://github.com/amaremusica/home-assistant-legacy-ipad-dashboard-.git"
REPO="/config/www/dashboard"
WWW="/config/www"

echo "=== Panel iPad — pierwsza konfiguracja ==="

if ! command -v git >/dev/null 2>&1; then
  echo "BŁĄD: brak git. Zainstaluj add-on Terminal & SSH lub git w HA."
  exit 1
fi

mkdir -p "$WWW"

if [ -d "$REPO/.git" ]; then
  echo "Repo już istnieje — git pull..."
  cd "$REPO"
  git pull origin main
else
  echo "Klonuję repo do $REPO ..."
  git clone "$REPO_URL" "$REPO"
fi

echo "Kopiuję panel do $WWW ..."
cp "$REPO/ipad.html" "$WWW/ipad.html"
cp "$REPO/ipad.css" "$WWW/ipad.css"
cp "$REPO/ipad-version.json" "$WWW/ipad-version.json"
if [ ! -f "$WWW/entities.json" ] && [ -f "$REPO/entities.json.example" ]; then
  cp "$REPO/entities.json.example" "$WWW/entities.json"
  echo "Utworzono $WWW/entities.json z przykładu — dostosuj encje."
fi

echo ""
echo "OK — wersja na HA: $(cat "$WWW/ipad-version.json")"
echo ""
echo "=== KROK 2 (ręcznie): configuration.yaml ==="
echo ""
echo "Dodaj ten fragment i zrestartuj Home Assistant:"
echo ""
echo "shell_command:"
echo "  update_ipad_panel: bash /config/www/dashboard/scripts/ha-update-panel.sh"
echo ""
echo "Opcjonalnie — backup co 6 h (automation w ha/shell_command.example.yaml)."
echo ""
echo "=== KROK 3: iPad ==="
echo "Otwórz: http://TWOJE_IP:8123/local/ipad.html"
echo "W rogu powinna być wersja z ipad-version.json."
echo ""
echo "Od teraz: git push na GitHub → iPad co ~30 min sam pobierze update z HA."
