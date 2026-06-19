# Changelog — iPad Pro Dashboard

## [1.1.0] — 2026-06-19

### Dodane
- **Kamery 4K** — snapshot do 3840×2160, stream: WebRTC → HLS → MJPEG (auto).
- **Pinch-to-zoom** w pełnoekranowej kamerze.
- Przyciski trybu streamu: WebRTC / HLS / MJPEG w modalu.
- Badge **LIVE**, animacje kart kamer (hover, pulse).
- Zakładka **Pogoda** — hero + prognoza 7 dni (`weather.get_forecasts`).
- Pasek **energii** (3 fazy) na ekranie Dom.
- Więcej pokoi: łazienki, ogród.
- Etykiety kamer i tryb streamu w ☰.
- Animacje: grain overlay, modal spring, stagger sekcji.

### Zmienione
- Domyślne encje dopasowane do instalacji użytkownika.

## [1.0.1] — 2026-06-19

### Zmienione
- Przycisk ↺ wywołuje `shell_command2.update_ipad_pro_panel` (zgodnie z `configuration.yaml` użytkownika).

## [1.0.0] — 2026-06-19

### Dodane
- Nowe repozytorium pod **iPad Pro M1** (iPadOS 16+).
- Modułowy front: `css/app.css`, `js/*.js` (ES modules).
- **WebSocket** HA — stany na żywo + polling co 45 s jako backup.
- **Animacje** — orb ambient, slide-in sekcje, przejścia zakładek, View Transitions API.
- **Kamery** — lazy snapshot, odświeżanie co 4 s, fullscreen MJPEG stream w `<dialog>`.
- **Muzyka** — Spotify browse (WebSocket), MA search, now playing bar.
- **Pokoje** — salon / sypialnia / kuchnia (łatwo rozszerzyć w `config.js`).
- Modal ☰ — URL, token, Spotify, MA, lista kamer, eksport JSON.
- Skrypty HA: `ha-update-panel.sh`, `ha-first-time-setup.sh`.
- PWA `manifest.webmanifest` — dodaj do ekranu początkowego.
