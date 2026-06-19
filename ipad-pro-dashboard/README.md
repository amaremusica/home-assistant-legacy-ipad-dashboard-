# Home Assistant Dashboard — iPad Pro (M1 / iPadOS 16+)

**Wersja:** `v1.1.0` · nowoczesny panel obok [legacy iPad 4](https://github.com/amaremusica/home-assistant-legacy-ipad-dashboard-)

Osobne repozytorium pod **iPad Pro 10″ (M1)** i nowsze — WebSocket, animacje CSS, kamery **WebRTC/HLS/4K**, pinch-zoom, pogoda, energia, Spotify + MA.

## Wymagania

- iPad Pro / iPad Air z **iPadOS 16+** (Safari)
- Home Assistant z Long-Lived Access Token
- Opcjonalnie: integracja **Music Assistant**, encje `scene.*`, kamery

## Instalacja na Home Assistant

```bash
cd /config/www
git clone https://github.com/amaremusica/home-assistant-ipad-pro-dashboard.git ipad-pro-dashboard
bash /config/www/ipad-pro-dashboard/scripts/ha-first-time-setup.sh
```

Do `configuration.yaml`:

```yaml
shell_command2:
  update_ipad_pro_panel: bash /config/www/ipad-pro-dashboard/scripts/ha-update-panel.sh
```

Restart HA. Otwórz na iPadzie:

`https://TWOJ-HA/local/ipad-pro/index.html`

☰ → URL + token → **Połącz** → Safari → **Dodaj do ekranu początkowego**.

## Co jest nowe vs iPad 4 (legacy)

| Funkcja | iPad Pro panel | Legacy iPad 4 |
|--------|----------------|---------------|
| JS | ES modules (nowoczesny) | ES5 |
| Stany HA | WebSocket + polling backup | Tylko polling |
| UI | Animacje, glass, View Transitions | Fallback bez blur |
| Kamery | Lazy snapshot + fullscreen stream | MJPEG tylko |
| Muzyka | Spotify browse + MA search | Pełny Spotify + MA |
| Pliki | `css/` + `js/` moduły | Jeden `ipad.html` |

## Struktura

```
index.html          — szkielet UI
css/app.css         — design system, animacje
js/config.js        — ustawienia localStorage
js/ha.js            — REST + WebSocket HA
js/ui.js            — nawigacja, toast
js/app.js           — logika widoków
version.json        — wersja dla auto-update
```

## Auto-aktualizacja

Przycisk **↺** w nagłówku wywołuje `shell_command2.update_ipad_pro_panel` (git pull + kopia do `/local/ipad-pro/`).

## Bezpieczeństwo

Token tylko w `localStorage` iPada — nigdy w Git. Zobacz [SECURITY.md](SECURITY.md).

## Legacy iPad 4

Stary panel **nie jest zastępowany** — nadal w repo `home-assistant-legacy-ipad-dashboard-` (`ipad.html`).
