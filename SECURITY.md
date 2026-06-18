# Bezpieczeństwo

To repozytorium jest **publiczne**. Nie commituj:

- tokenów Home Assistant (Long-Lived Access Token)
- haseł, kluczy API, webhooków
- prywatnych adresów IP (np. `192.168.x.x`) jako domyślnych wartości
- adresów e-mail w nazwach encji (np. kalendarze Google)

## Co jest bezpieczne w repo

- `ipad.html` + `ipad.css` — token i URL HA trzymane tylko w `localStorage` na iPadzie (ustawienia panelu)
- encje przykładowe (`media_player.spotify`, `calendar.trash`, `binary_sensor.motion`)
- placeholdery w formularzu konfiguracji
- `entities.json.example` — szablon bez danych osobowych (opcjonalny `/local/entities.json` na HA)

## Po sklonowaniu / aktualizacji

W panelu (☰ Ustawienia) uzupełnij **własne** encje:

| Pole | Przykład u Ciebie |
|------|-------------------|
| Adres HA | `http://192.168.x.x:8123` |
| Token | z profilu HA |
| Czujnik ruchu | `binary_sensor.twoj_czujnik` |
| Spotify | `media_player.spotify_...` |
| Kalendarz śmieci | `calendar.twoj_kalendarz` |
| Telewizor | `media_player.twoj_tv` |

Te wartości **nie trafiają do Git** — zostają tylko na urządzeniu.

## Zgłoszenie problemu

Jeśli w historii commitów pojawiły się wrażliwe dane, usuń je z historii i unieważnij token w Home Assistant.
