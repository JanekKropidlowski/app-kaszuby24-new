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
if [ -n "$(git status --porcelain app.json)" ]; then
  echo "app.json ma niezacommitowane zmiany – przerwane" >&2
  exit 1
fi
trap 'git checkout -- app.json' EXIT

for RV in 1.1.2 1.1.1; do
  python3 - "$RV" <<'PY'
import json, sys
d = json.load(open('app.json'))
d['expo']['platforms'] = ['ios', 'android']
d['expo']['runtimeVersion'] = sys.argv[1]
open('app.json', 'w').write(json.dumps(d, indent=2, ensure_ascii=False) + '\n')
PY
  echo "== OTA runtimeVersion $RV"
  eas update --branch production --non-interactive --message "$OPIS"
done

echo "Gotowe: OTA dla 1.1.2 i 1.1.1. Telefony pobiorą ją przy najbliższym uruchomieniu apki."
