#!/bin/zsh
# Support- und Datenschutzseiten einer App nach skyvane.app übernehmen und veröffentlichen.
# Aufruf: tools/seiten.sh <app-repo> — nimmt jeden Ordner unter <app-repo>/appstore/pages/ (außer Skripten).
set -eu
root="${0:A:h:h}"
src="${1:?Pfad zum App-Repo}/appstore/pages"
[[ -d $src ]] || { echo "kein $src" >&2; exit 1; }
for d in "$src"/*(/); do
  name=${d:t}
  rsync -a --delete "$d"/ "$root/docs/$name"/
  python3 -I "$root/tools/umschreiben.py" "$root/docs/$name"
  echo "→ https://skyvane.app/$name/"
done
cd "$root"
git add -A docs
if git diff --cached --quiet; then echo "(nichts geändert)"; else git commit -qm "Seiten aus ${1:t} $(date +%F)" && git push -q; fi
echo "Pages braucht 1–2 min. Neue App? Kachel in docs/index.html ergänzen."
