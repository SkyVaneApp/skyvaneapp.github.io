#!/usr/bin/env python3
"""Seiten einer App auf SkyVane umschreiben: Mail, Adressen, Fußzeile. Mehrfach aufrufbar (idempotent).
Aufruf: umschreiben.py <ordner> [...]"""
import re, sys, pathlib

FOOT = ('<p class="skyvane" style="margin-top:3em;font-size:.85rem;opacity:.7">'
        '<a href="https://skyvane.app/">SkyVane</a> · Apps für Himmel und Unterwegs · '
        '<a href="mailto:info@skyvane.app">info@skyvane.app</a></p>')

def rewrite(p: pathlib.Path):
    s = p.read_text(encoding="utf-8")
    t = s.replace("deepframe.support@gmail.com", "info@skyvane.app")
    t = re.sub(r"https?://deepskyplan\.github\.io/", "https://skyvane.app/", t)
    if 'class="skyvane"' not in t and "</body>" in t:
        t = t.replace("</body>", FOOT + "\n</body>", 1)
    if t != s:
        p.write_text(t, encoding="utf-8")
        print("  umgeschrieben:", p)

for d in sys.argv[1:]:
    for p in pathlib.Path(d).rglob("*.html"):
        rewrite(p)
