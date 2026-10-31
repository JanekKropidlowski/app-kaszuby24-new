#!/usr/bin/env bash
# OTA na produkcję dla obu binarek w sklepach (runtimeVersion 1.1.2 i 1.1.1),
# wg procedury z README: web się nie buduje, więc na czas publikacji
# platforms = ios + android. app.json wraca do stanu z repo także przy błędzie.
#
# Użycie: scripts/ota.sh "co się zmienia"
# Cofnięcie: eas update:list --branch production, potem
#            eas update:republish --group <id poprzedniej grupy> (dla obu runtime'ów)
set -euo pipefail
cd "$(dirname "$0")/.."

OPIS="${1:?Podaj opis: scripts/ota.sh \"co się zmienia\"}"
# eas update pakuje katalog roboczy, nie commit: niezacommitowany kod (np. innej sesji) poszedłby na telefony.
if [ -n "$(git status --porcelain --untracked-files=no)" ]; then
  echo "Są niezacommitowane zmiany – przerwane:" >&2
  git status --short --untracked-files=no >&2
  exit 1
fi
trap 'git checkout -- app.json' EXIT
# runtimeVersion jest stały (1.1.2/1.1.1), więc fingerprint projektu (kilka minut) niczemu nie służy;
# CI=1 zamiast --non-interactive dla expo-cli (ostrzeżenie przy eksporcie).
export EAS_SKIP_AUTO_FINGERPRINT=1 CI=1

for RV in 1.1.2 1.1.1; do
  python3 - "$RV" <<'PY'
import json, sys
d = json.load(open('app.json'))
d['expo']['platforms'] = ['ios', 'android']
d['expo']['runtimeVersion'] = sys.argv[1]
open('app.json', 'w').write(json.dumps(d, indent=2, ensure_ascii=False) + '\n')
PY
  echo "== OTA runtimeVersion $RV"
  eas update --branch production --non-interactive --message "$OPIS" \
    || { echo "BŁĄD przy runtimeVersion $RV – wcześniejsze wersje z tej pętli już poszły" >&2; exit 1; }
done

echo "Gotowe: OTA dla 1.1.2 i 1.1.1. Telefony pobiorą ją przy najbliższym uruchomieniu apki."
