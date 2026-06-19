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
