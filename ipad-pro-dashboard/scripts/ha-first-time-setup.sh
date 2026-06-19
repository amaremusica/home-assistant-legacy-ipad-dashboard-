#!/bin/sh
# Pierwsza instalacja panelu iPad Pro na Home Assistant OS.
set -e
SCRIPT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
DASHBOARD="/config/www/dashboard"

if [ ! -f "$DASHBOARD/ipad.html" ]; then
  echo "Klonuję repozytorium dashboard…"
  git clone https://github.com/amaremusica/home-assistant-legacy-ipad-dashboard-.git "$DASHBOARD"
fi

bash "$DASHBOARD/ipad-pro-dashboard/scripts/ha-update-panel.sh"
echo ""
echo "Gotowe. Otwórz na iPad Pro:"
echo "  http://IP:8123/local/ipad-pro/index.html"
echo ""
echo "W configuration.yaml (shell_command2):"
echo "  update_ipad_pro_panel: bash /config/www/dashboard/ipad-pro-dashboard/scripts/ha-update-panel.sh"
