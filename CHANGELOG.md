# Changelog

Wszystkie istotne zmiany w panelu iPad (iOS 10) są dokumentowane w tym pliku.

## [11.7.4] — 2026-06-14

### Dodane
- **Kamery — strumień na żywo** (MJPEG przez `camera_proxy_stream`), płynny obraz zamiast migawek co 5 s.
- Przy wygaszeniu ekranu strumień się zatrzymuje (oszczędność sieci/CPU).
- Automatyczny fallback do migawek, gdy strumień niedostępny.

## [11.7.3] — 2026-06-14

### Naprawione
- **Środkowa kolumna Dom** znów mieści się na jednym ekranie: sceny w siatce pokoi, energia elastyczna, bieganie + lodówka obok siebie.

## [11.7.2] — 2026-06-14

### Zmienione — auto-aktualizacja
- iPad **sam się przeładowuje** gdy na HA jest nowszy `ipad-version.json` (po ~2,5 s).
- Co **30 min** panel prosi HA o `shell_command.update_ipad_panel` (`git pull` + kopia plików).
- Sprawdzanie wersji co **2 min** (wcześniej 5 min).
- „Później” → wstrzymanie na 1 h (zamiast ukrywania na stałe).

**Wymaga jednorazowej konfiguracji HA** (patrz README): `git clone` + `shell_command` w `configuration.yaml`.

## [11.7.1] — 2026-06-14

### Naprawione
- **Kuchnia** — usunięte nieistniejące `light.swiatlo_kuchnia_swiatlo`; zostają Blat (`_2`) i Sufit (`_3`) wg rzeczywistych encji HA.
- **Sceny** — domyślnie puste (brak `scene.*` w HA); przyciski wyszarzone do czasu konfiguracji w ☰.

## [11.7] — 2026-06-14

### Dodane
- **Sceny na ekranie Dom** — Wieczór, Wyjdź, Wszystko off (entity_id konfigurowalne w ☰).
- **Ustawienia ☰** — Łóżko 1/2 (encja + nazwa), trzy sceny.

### Naprawione
- **Kuchnia** — dodane `light.swiatlo_kuchnia_swiatlo` (Sufit), poprawione nazwy (Blat, Sufit 3), czujnik temperatury.
- **Pralka / suszarka** przeniesione z Kuchni do **Łazienki → Pralnia**.
- **Sypialnia** — przywrócone `switch.marcin_sypialnia` / `switch.marzenka_sypialnia` (Marcin / Marzenka).
- Usunięte martwe odwołania do chipów kuchni (`ck-*`).

## [11.6.3] — 2026-06-15

### Naprawione
- Baner aktualizacji tylko gdy wersja na serwerze **nowsza** (fix pętli `11.6.2 → 11.6`).
- „Zaktualizuj” nie przeładowuje do starszej wersji.

## [11.6.2] — 2026-06-15

### Test
- Wersja testowa auto-update — po wrzuceniu `ipad-version.json` na HA iPad pokaże baner „Zaktualizuj”.

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
