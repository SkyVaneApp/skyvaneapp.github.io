-- D1-Datenbank „skyvane-stats“ (Bindung DB im Worker).
CREATE TABLE IF NOT EXISTS events (
  ts INTEGER NOT NULL,          -- Millisekunden seit 1970
  kind TEXT NOT NULL,           -- 'download' | 'start'
  app TEXT NOT NULL,            -- z. B. 'flightcoach-android'
  uid TEXT,                     -- zufällige Kennung je Installation (nur bei 'start')
  version TEXT                  -- „0.6 (6)“
);
CREATE INDEX IF NOT EXISTS events_app_ts ON events (app, ts);
CREATE INDEX IF NOT EXISTS events_uid ON events (uid);
