# SkyVane — Website

Quelle von <https://skyvane.app/> (GitHub Pages aus `SkyVaneApp/skyvaneapp.github.io`, Ordner `docs/` im Branch `main`).
Je App `/<app>-app/` (Support) und `/<app>-privacy/` (Datenschutz), Startseite `index.html`.

- Seiten einer App übernehmen/aktualisieren: `tools/seiten.sh <pfad-zum-app-repo>` — kopiert dessen
  `appstore/pages/<name>/`, schreibt Mail und Adressen auf SkyVane um, veröffentlicht.
- Umschreiben allein: `tools/umschreiben.py docs/<name>` (Mail → info@skyvane.app, deepskyplan.github.io → skyvane.app, Fußzeile).
- Die alten Seiten unter `deepskyplan.github.io` bleiben stehen: ausgelieferte App-Fassungen verlinken sie.
