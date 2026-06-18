# Testowanie panelu iPad (iOS 10)

Checklist po zmianach — na iPadzie 4 lub emulatorze Safari iOS 10.

## Połączenie
- [ ] Pierwsze uruchomienie: modal ☰, zapis URL + token
- [ ] Nagłówek: `⬤ online` po połączeniu
- [ ] Przy złym tokenie: banner błędu + komunikat
- [ ] Eksport / import konfiguracji ☰ (JSON)

## Zakładki
- [ ] Dom — pogoda, pokoje, energia, Spotify mini, kamera, śmieci
- [ ] Salon / Sypialnia / Kuchnia / Łazienki / Ogród — światła, sensory
- [ ] Energia — 3 fazy
- [ ] K1C — status drukarki
- [ ] Kamery — MJPEG bez migania (min. 2 min)
- [ ] Muzyka — browse Spotify, odtwarzanie
- [ ] Pogoda — prognoza dzienna/godzinowa

## System
- [ ] Dimming po bezruchu + wybudzenie dotykiem / ruchem
- [ ] Motyw jasny/ciemny — zapis po restarcie
- [ ] Auto-update: banner „Teraz” / „Za 1 h” (bez auto-reload)
- [ ] `ipad.css` ładuje się z `/local/`

## Wydajność
- [ ] Panel responsywny — brak zawieszeń przy pollingu co 15 s
- [ ] Na iOS 10: brak problemów z blur (klasa `legacy-safari`)
