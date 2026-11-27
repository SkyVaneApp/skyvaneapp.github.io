// Zähler für die Testseiten der Apps (zuerst FlightCoach Android): Downloads und App-Starts.
// Cloudflare Worker mit D1-Datenbank (Bindung DB) und dem Geheimnis STATS_KEY für die verborgene Auswertung.
//   POST /dl              Download (die Testseite meldet den Klick per sendBeacon)
//   GET  /count?app=…     {"downloads": n} — für die Anzeige auf der Testseite
//   POST /ping            App-Start: {"app":"flightcoach-android","id":"<zufällige Kennung>","v":"0.6 (6)"}
//   GET  /s/<STATS_KEY>   Auswertung: Downloads und Starts je Tag als Graph, Starts je Kennung
// Gespeichert wird nur: Zeit, Art, App, zufällige Kennung (keine IP, kein Standort, keine Flugdaten).

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { "Content-Type": "application/json", ...CORS } });
const clean = (s, n) => String(s ?? "").replace(/[^\w .()\-]/g, "").slice(0, n);

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
    const now = Date.now();

    if (url.pathname === "/dl" && req.method === "POST") {
      const app = clean(url.searchParams.get("app") || "flightcoach-android", 40);
      await env.DB.prepare("INSERT INTO events (ts, kind, app, uid, version) VALUES (?, 'download', ?, NULL, NULL)").bind(now, app).run();
      return new Response(null, { status: 204, headers: CORS });
    }

    if (url.pathname === "/count") {
      const app = clean(url.searchParams.get("app") || "flightcoach-android", 40);
      const r = await env.DB.prepare("SELECT COUNT(*) AS n FROM events WHERE kind = 'download' AND app = ?").bind(app).first();
      return json({ downloads: r?.n ?? 0 });
    }

    if (url.pathname === "/ping" && req.method === "POST") {
      let b = {};
      try { b = await req.json(); } catch (_) { return json({ ok: false }, 400); }
      const id = clean(b.id, 40);
      if (id.length < 8) return json({ ok: false }, 400);
      await env.DB.prepare("INSERT INTO events (ts, kind, app, uid, version) VALUES (?, 'start', ?, ?, ?)")
        .bind(now, clean(b.app || "flightcoach-android", 40), id, clean(b.v, 20)).run();
      return json({ ok: true });
    }

    const m = url.pathname.match(/^\/s\/([\w-]+)$/);
    if (m && env.STATS_KEY && m[1] === env.STATS_KEY) return dashboard(env, url.searchParams.get("app") || "flightcoach-android");

    return new Response("FlightCoach", { status: 404 });
  },
};

async function dashboard(env, app) {
  const day = "strftime('%Y-%m-%d', ts / 1000, 'unixepoch')";
  const perDay = (await env.DB.prepare(
    `SELECT ${day} AS d,
            SUM(kind = 'download') AS dl,
            SUM(kind = 'start') AS st,
            COUNT(DISTINCT CASE WHEN kind = 'start' THEN uid END) AS uq
       FROM events WHERE app = ? AND ts > ? GROUP BY d ORDER BY d`).bind(app, Date.now() - 90 * 864e5).all()).results;
  const perId = (await env.DB.prepare(
    `SELECT uid, COUNT(*) AS n, MIN(ts) AS first, MAX(ts) AS last, MAX(version) AS v
       FROM events WHERE app = ? AND kind = 'start' GROUP BY uid ORDER BY last DESC LIMIT 500`).bind(app).all()).results;
  const tot = await env.DB.prepare(
    `SELECT SUM(kind = 'download') AS dl, SUM(kind = 'start') AS st, COUNT(DISTINCT uid) AS uq FROM events WHERE app = ?`).bind(app).first();

  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const date = (t) => new Date(t).toISOString().slice(0, 16).replace("T", " ");
  const W = 760, H = 220, P = 34;
  const max = Math.max(1, ...perDay.map((r) => Math.max(r.dl, r.st)));
  const x = (i) => P + (perDay.length < 2 ? (W - 2 * P) / 2 : (i * (W - 2 * P)) / (perDay.length - 1));
  const y = (v) => H - P - (v * (H - 2 * P)) / max;
  const line = (k) => perDay.map((r, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(r[k]).toFixed(1)}`).join(" ");
  const dots = (k, c) => perDay.map((r, i) => `<circle cx="${x(i).toFixed(1)}" cy="${y(r[k]).toFixed(1)}" r="3" fill="${c}"><title>${esc(r.d)}: ${r[k]}</title></circle>`).join("");
  const ticks = [0, Math.round(max / 2), max].map((v) => `<text x="4" y="${y(v) + 4}" class="t">${v}</text><line x1="${P}" x2="${W - P}" y1="${y(v)}" y2="${y(v)}" class="g"/>`).join("");
  const labels = perDay.filter((_, i) => i === 0 || i === perDay.length - 1 || i % Math.ceil(perDay.length / 6) === 0)
    .map((r) => `<text x="${x(perDay.indexOf(r))}" y="${H - 8}" class="t" text-anchor="middle">${esc(r.d.slice(5))}</text>`).join("");
  const maxN = Math.max(1, ...perId.map((r) => r.n));
  const rows = perId.map((r) => `<tr><td><code>${esc(r.uid.slice(0, 8))}</code></td><td class="n">${r.n}</td>
      <td><div class="bar" style="width:${((r.n / maxN) * 100).toFixed(1)}%"></div></td><td>${esc(r.v)}</td>
      <td>${date(r.first)}</td><td>${date(r.last)}</td></tr>`).join("");

  const html = `<!DOCTYPE html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex"><title>Zähler ${esc(app)}</title><style>
body{font:15px/1.5 -apple-system,system-ui,sans-serif;max-width:820px;margin:28px auto;padding:0 16px;background:#0d1220;color:#e8e6e1}
h1{font-size:1.4rem;margin:0 0 4px}.k{display:flex;gap:12px;flex-wrap:wrap;margin:16px 0}.k div{background:#151b2c;border-radius:12px;padding:10px 14px}
.k b{display:block;font-size:1.6rem}svg{width:100%;height:auto;background:#151b2c;border-radius:12px}.t{fill:#9aa3b2;font-size:11px}.g{stroke:#252c3c}
table{border-collapse:collapse;width:100%;font-size:13px;margin-top:10px}td,th{padding:5px 6px;border-bottom:1px solid #252c3c;text-align:left}
.n{text-align:right}.bar{height:8px;border-radius:4px;background:#5bd37a;min-width:2px}.dim{color:#9aa3b2}.lg span{margin-right:14px}
</style></head><body><h1>${esc(app)}</h1><div class="dim">Letzte 90 Tage · Stand ${date(Date.now())} UTC</div>
<div class="k"><div><b>${tot?.dl ?? 0}</b>Downloads</div><div><b>${tot?.st ?? 0}</b>App-Starts</div><div><b>${tot?.uq ?? 0}</b>Geräte (Kennungen)</div></div>
<div class="lg dim"><span style="color:#6aa8ff">● Downloads</span><span style="color:#5bd37a">● Starts</span><span style="color:#ffb347">● Geräte je Tag</span></div>
<svg viewBox="0 0 ${W} ${H}">${ticks}${labels}
<path d="${line("dl")}" fill="none" stroke="#6aa8ff" stroke-width="2"/><path d="${line("st")}" fill="none" stroke="#5bd37a" stroke-width="2"/>
<path d="${line("uq")}" fill="none" stroke="#ffb347" stroke-width="2" stroke-dasharray="4 3"/>${dots("dl", "#6aa8ff")}${dots("st", "#5bd37a")}</svg>
<h2 style="font-size:1.1rem;margin-top:22px">Starts je Kennung</h2><table><tr><th>Kennung</th><th class="n">Starts</th><th style="width:30%"></th><th>Fassung</th><th>erster</th><th>letzter</th></tr>${rows}</table>
</body></html>`;
  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });
}
