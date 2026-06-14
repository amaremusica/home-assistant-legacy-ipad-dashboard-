# Changelog

Wszystkie istotne zmiany w panelu iPad (iOS 10) są dokumentowane w tym pliku.

## [11.6] — 2026-06-14

### Dodane
- **Auto-aktualizacja** — panel co 5 min sprawdza `/local/ipad-version.json`; baner „Zaktualizuj” / „Później” gdy jest nowsza wersja na serwerze.
- **`ipad-version.json`** — mały plik wersji do wdrożenia obok `ipad.html` w `/config/www/`.
- **Skrypt HA** — `scripts/ha-update-panel.sh` + przykład `ha/shell_command.example.yaml` (git pull co 6 h).

### Ulepszone
- Przycisk ↺ wymusza przeładowanie z cache-bust (`?v=…&_=timestamp`).
- **Bezpieczeństwo (repo publiczne)** — usunięto domyślne IP i encje osobiste; Spotify, TV, śmieci i ruch konfigurowalne w ustawieniach panelu (`localStorage`).

### Techniczne
- Wersja build: `v11.6`
- Przy każdej nowej wersji podbij: `BUILD` w JS, `<!-- build -->`, `#ver`, **`ipad-version.json`**

## [11.5] — 2026-06-14

### Dodane
- **Wywóz śmieci** — kafelek z kalendarza (domyślnie `calendar.trash`, konfigurowalny): data, typ odpadów, kolorowa ikona kosza.
- **Zakładka Pogoda** — pełna strona prognozy: hero, statystyki, prognoza godzinowa i dzienna, opady, kierunek wiatru.
- **Wschód / zachód słońca** na głównej karcie pogody (encja `sun.sun`).
- **Pasek postępu Spotify** — czas utworu i płynna aktualizacja co sekundę.
- **Prognoza 5-dniowa** na ekranie Dom — min/max temperatura i prawdopodobieństwo opadów.
- **Kalendarz biegania** — wydarzenia z `calendar.bieganie` na dziś.

### Ulepszone
- **Spotify** — ikony SVG (play/pause/prev/next) zamiast emoji; szybsza animacja equalizera (`transform: scaleY`).
- **Światła** — optimistic UI (natychmiastowa reakcja po tapnięciu); cały kafelek pokoju „świeci” gdy światło włączone.
- **Kamery** — zamrożenie odświeżania przy przygaszonym ekranie; wymuszone odświeżenie po wybudzeniu (fix czarnego obrazu na iOS 10).
- **Prognoza pogody** — fallback WebSocket gdy REST API nie działa na iOS 10; zawsze 5 kafelków (placeholdery gdy brak danych).
- **Layout** — spacing przez `margin` zamiast `gap` (kompatybilność iOS 10); niższy dolny pasek (AQ, Paczkomat, Ogród, śmieci).
- **Lodówka** — poprawna encja zamrażarki (`sensor.lodowka_freezer_temperature`) i etykieta „Zamrażarka”.

### Techniczne
- Wersja build: `v11.5`
- Główny plik produkcyjny: `ipad.html` (poprzedni stabilny: `ipad-v10.5.html`)
