# Home Assistant Dashboard for iPad 4 (iOS 10.3.3)

**Aktualna wersja:** `v11.11.3` — plik [`ipad.html`](ipad.html) · [CHANGELOG](CHANGELOG.md)

[Wersja polska](#wersja-polska) | [English Version](#english-version)

---

## Wersja Polska

### O Projekcie
Ten projekt to lekki, responsywny i wysoce zoptymalizowany pulpit nawigacyjny (Dashboard) przeznaczony dla systemu **Home Assistant**, stworzony specjalnie z myślą o starszych urządzeniach, takich jak **iPad 4 pracujący na systemie iOS 10.3.3**.

Nowoczesne panele Home Assistant (Lovelace) oraz oficjalna aplikacja wymagają nowszych wersji silników przeglądarek (WebKit/Chromium) i często nie ładują się lub działają bardzo wolno na starszych urządzeniach. Ten projekt rozwiązuje ten problem, wykorzystując czysty kod **HTML5, CSS3 oraz waniliowy JavaScript (ES5)**, który jest w pełni kompatybilny ze starszymi wersjami przeglądarki Safari.

### Główne Funkcje
* **Wysoka wydajność:** Brak ciężkich frameworków (React, Vue, itp.) – błyskawiczne działanie na procesorach Apple A6X.
* **Kompatybilność z iOS 10:** Kod dostosowany do starszych specyfikacji CSS/JS, zapobiegający crashom i błędom renderowania.
* **Pełna integracja z API Home Assistant:** Komunikacja za pomocą REST API do pobierania stanów encji oraz sterowania urządzeniami.
* **Automatyczne wybudzanie i przyciemnianie ekranu:** Wykorzystanie czujnika ruchu z Home Assistant (np. Zigbee) do rozjaśniania ekranu i automatycznego jego wygaszania (dimming) po określonym czasie bezruchu.
* **Interfejs dopasowany do iPada:** Obsługa trybu pełnoekranowego (`apple-mobile-web-app-capable`) ukrywającego paski przeglądarki Safari.
* **Odświeżanie kamer live:** Obsługa cyklicznego odświeżania obrazu z kamer monitoringu.
* **Bezpieczeństwo danych:** Adres URL oraz token Long-Lived Access Token są przechowywane lokalnie w pamięci przeglądarki urządzenia (`localStorage`) i nie są wpisane na stałe w kodzie źródłowym.

### Instalacja i Konfiguracja
1. Skopiuj plik **`ipad.html`** (najnowszy) lub `ipad-v10.5.html` (starszy stabilny) na swój serwer (folder `www/` w Home Assistant, NAS lub inny hosting).
2. Otwórz stronę na iPadzie w przeglądarce Safari.
3. Kliknij ikonę konfiguracji, wprowadź adres IP swojego Home Assistant oraz wygenerowany w profilu użytkownika **Długoterminowy token dostępu (Long-Lived Access Token)**.
4. Wybierz encję czujnika ruchu, który ma odpowiadać za wybudzanie ekranu.
5. Zapisz konfigurację. Dane zostaną bezpiecznie zapisane w pamięci `localStorage` Twojego iPada.
6. Dodaj stronę do ekranu głównego ("Dodaj do ekranu początkowego"), aby uruchamiać ją w trybie pełnoekranowym bez pasków adresu.

Te wartości zapisują się w `localStorage` iPadu — **nie trafiają do Git**. Szczegóły: [SECURITY.md](SECURITY.md).

### Auto-aktualizacja (Git → HA → iPad)

**Jednorazowo na HA** (Terminal & SSH):

```bash
cd /config/www
git clone https://github.com/amaremusica/home-assistant-legacy-ipad-dashboard-.git dashboard
bash /config/www/dashboard/scripts/ha-first-time-setup.sh
```

**Krok 2** — wklej do `configuration.yaml` ([`ha/configuration.fragment.yaml`](ha/configuration.fragment.yaml)):

```yaml
shell_command:
  update_ipad_panel: bash /config/www/dashboard/scripts/ha-update-panel.sh
```

Restart HA.

**Potem:** `git push` → iPad co ~30 min sam robi `git pull` na HA i przeładowuje się gdy wersja nowsza.

Skrót: `http://IP:8123/local/ipad.html?v=11.11.3`

**Encje w ☰ (localStorage):** Spotify, TV, śmieci, ruch, łóżka, sceny.

---

## English Version

### About The Project
This project is a lightweight, responsive, and highly optimized web dashboard for **Home Assistant**, specifically tailored for legacy devices like the **iPad 4 running iOS 10.3.3**.

Modern Home Assistant frontend dashboards (Lovelace) and the official app require up-to-date browser engines (WebKit/Chromium) and often fail to load or lag heavily on older tablets. This project solves this constraint by using clean **HTML5, CSS3, and vanilla JavaScript (ES5)**, ensuring 100% compatibility with older Safari versions.

### Key Features
* **High Performance:** Zero heavy frameworks (React, Vue, etc.) – lightning-fast execution on Apple A6X processors.
* **iOS 10 Compatibility:** Code adapted to older CSS/JS specifications to prevent rendering bugs and crashes.
* **Full Home Assistant API Integration:** Communicates via REST API to fetch entity states and trigger services.
* **Smart Motion Wake & Dimming:** Uses a Home Assistant motion sensor (e.g., Zigbee) to automatically wake up/brighten the screen upon motion and dim it after a period of inactivity.
* **iPad-Tailored UI:** Supports full-screen web app mode (`apple-mobile-web-app-capable`) to completely hide Safari's address bar and navigation controls.
* **Live Camera Refresh:** Periodically refreshes surveillance camera snapshots.
* **Privacy & Security:** Your Home Assistant URL and Long-Lived Access Token are saved locally on the device via `localStorage` and are never hardcoded into the source file.

### Installation & Configuration
1. Host **`ipad.html`** (latest) or `ipad-v10.5.html` (older stable) on any local server (e.g., the `www/` directory of your Home Assistant instance, a local NAS, or any web server).
2. Open the page on your legacy iPad using Safari.
3. Access the configuration modal and enter your Home Assistant URL and a **Long-Lived Access Token** (generated from your Home Assistant user profile).
4. Specify the motion sensor entity ID to handle screen waking functionality.
5. Save the configuration. All credentials will be securely retained in the iPad's browser `localStorage`.
6. Tap the "Share" button in Safari and select **"Add to Home Screen"** to launch the dashboard as a standalone, borderless web application.