# Bezpieczeństwo

- Long-Lived Access Token przechowywany wyłącznie w `localStorage` iPada.
- Nie commituj tokenów, URL z danymi osobowymi ani `configuration.yaml` z sekretami.
- Po wycieku tokena: profil HA → **Long-Lived Access Tokens** → usuń i wygeneruj nowy.
