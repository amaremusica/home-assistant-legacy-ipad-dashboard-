# iPad Pro Dashboard (v1.1.0)

Panel dla **iPad Pro M1** — katalog `ipad-pro-dashboard/` w tym samym repo co `ipad.html` (iPad 4).

## Instalacja na Home Assistant

```bash
# Masz już dashboard (iPad 4):
cd /config/www/dashboard
git pull origin main
bash /config/www/dashboard/ipad-pro-dashboard/scripts/ha-update-panel.sh

# Pierwsza instalacja:
git clone https://github.com/amaremusica/home-assistant-legacy-ipad-dashboard-.git /config/www/dashboard
bash /config/www/dashboard/ipad-pro-dashboard/scripts/ha-first-time-setup.sh
```

Otwórz: `http://IP:8123/local/ipad-pro/index.html`

## Auto-update

```yaml
shell_command2:
  update_ipad_pro_panel: bash /config/www/dashboard/ipad-pro-dashboard/scripts/ha-update-panel.sh
```

Pełna dokumentacja: [README.md](README.md)

## Import ustawień (JSON)

Plik na HA: `/config/www/ipad-pro/ipad-pro-config.json`  
URL: `http://IP:8123/local/ipad-pro/ipad-pro-config.json`

W panelu ☰:
1. **Preset z HA** — wczytuje ten plik automatycznie
2. **Importuj JSON** — wybierz plik z dysku
3. Uzupełnij **URL** i **token** → **Połącz**
