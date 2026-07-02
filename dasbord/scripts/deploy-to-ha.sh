#!/bin/sh
# Wgraj dashboard + awatar Pauli na Home Assistant.
# Uruchom w Terminal & SSH (HA OS).

set -e
REPO="/config/www/dashboard/dasbord"
WWW="/config/www"

cp "$REPO/dom.yaml" "$WWW/dom.yaml"
cp "$REPO/paula-icon.png" "$WWW/paula-icon.png"
echo "OK: dom.yaml + paula-icon.png → $WWW"
echo "Zaimportuj dashboard w HA: Ustawienia → Panele → Importuj z YAML"
