# Zähler für die Testseiten (Cloudflare Worker + D1)

Zählt Downloads der Test-APK und App-Starts (zufällige Kennung je Installation). Auswertung als Graph auf einer
verborgenen Seite. Gespeichert: Zeit, Art, App, Kennung, Fassung — keine IP, kein Standort, keine Flugdaten.

## Einrichten (einmal, im Cloudflare-Dashboard, Konto mit skyvane.app)

1. **D1 anlegen:** Workers & Pages → D1 → *Create* → Name `skyvane-stats` → Reiter *Console* → Inhalt von
   `schema.sql` einfügen → *Execute*.
2. **Worker anlegen:** Workers & Pages → *Create* → *Worker* → Name `skyvane-stats` → *Deploy* → *Edit code* →
   Inhalt von `worker.js` einfügen → *Deploy*.
3. **Bindungen:** Worker → Settings → *Bindings* → *Add* → D1 database → Variable `DB` → `skyvane-stats`.
   Settings → *Variables and Secrets* → *Add* → Typ *Secret*, Name `STATS_KEY`, Wert = der Schlüssel aus dem Chat.
4. **Adresse:** Worker → Settings → *Domains & Routes* → *Add* → *Custom domain* → `stats.skyvane.app`.

Danach:
- Testseite zeigt „… Downloads“ unter dem Knopf, jeder Klick zählt.
- Die App (ab 0.6) meldet jeden Start an `https://stats.skyvane.app/ping` (abschaltbar in den Einstellungen).
- Auswertung: `https://stats.skyvane.app/s/<STATS_KEY>` (nur mit dem Schlüssel; `?app=…` für andere Apps).

Prüfen: `curl -s https://stats.skyvane.app/count` → `{"downloads":…}`.
