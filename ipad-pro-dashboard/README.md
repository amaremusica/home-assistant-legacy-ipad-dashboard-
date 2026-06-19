# Home Assistant Dashboard — iPad Pro (M1 / iPadOS 16+)

**Wersja:** `v1.1.0` · panel w repozytorium [legacy iPad 4](https://github.com/amaremusica/home-assistant-legacy-ipad-dashboard-) → katalog **`ipad-pro-dashboard/`**

Panel dla **iPad Pro 10″ (M1)** — WebSocket, animacje CSS, kamery **WebRTC/HLS/4K**, pinch-zoom, pogoda, energia, Spotify + MA.

> **Uwaga:** Nie ma osobnego repo `home-assistant-ipad-pro-dashboard` na GitHubie. Wszystko jest w monorepo powyżej.

## Wymagania

- iPad Pro / iPad Air z **iPadOS 16+** (Safari)
- Home Assistant z Long-Lived Access Token
- Opcjonalnie: integracja **Music Assistant**, encje `scene.*`, kamery

## Instalacja na Home Assistant

### Masz już panel iPad 4 (`/config/www/dashboard`):

```bash
cd /config/www/dashboard
git pull origin main
bash /config/www/dashboard/ipad-pro-dashboard/scripts/ha-update-panel.sh
```

### Pierwsza instalacja (oba panele):

```bash
git clone https://github.com/amaremusica/home-assistant-legacy-ipad-dashboard-.git /config/www/dashboard
bash /config/www/dashboard/ipad-pro-dashboard/scripts/ha-first-time-setup.sh
```

Do `configuration.yaml`:

```yaml
shell_command2:
  update_ipad_pro_panel: bash /config/www/dashboard/ipad-pro-dashboard/scripts/ha-update-panel.sh
```

Restart HA. Otwórz na iPad Pro:

`https://TWOJ-HA/local/ipad-pro/index.html`

☰ → URL + token → **Połącz** → Safari → **Dodaj do ekranu początkowego**.

## Co jest nowe vs iPad 4 (legacy)

| Funkcja | iPad Pro panel | Legacy iPad 4 |
|--------|----------------|---------------|
| JS | ES modules (nowoczesny) | ES5 |
| Stany HA | WebSocket + polling backup | Tylko polling |
| UI | Animacje, glass, View Transitions | Fallback bez blur |
| Kamery | WebRTC / HLS / 4K snapshot | MJPEG |
| Muzyka | Spotify browse + MA search | Pełny Spotify + MA |
| Pliki | `css/` + `js/` moduły | Jeden `ipad.html` |

## Auto-aktualizacja

Przycisk **↺** → `shell_command2.update_ipad_pro_panel` (git pull w `/config/www/dashboard` + kopia do `/local/ipad-pro/`).

## Bezpieczeństwo

Token tylko w `localStorage` iPada — nigdy w Git. Zobacz [SECURITY.md](SECURITY.md).
