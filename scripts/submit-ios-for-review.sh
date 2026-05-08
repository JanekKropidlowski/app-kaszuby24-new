#!/bin/bash
# submit-ios-for-review.sh
#
# `eas submit` dla iOS uploaduje .ipa do TestFlight, ale NIE wysyła do
# App Store review automatycznie. Apple ASC API wymaga 3 osobnych kroków:
#   1. Utworzyć AppStoreVersion linkując do builda
#   2. Skopiować "What's New" lokalizacje (lub z poprzedniej wersji)
#   3. Stworzyć reviewSubmission + dodać item + PATCH submitted=true
#
# Ten skrypt robi to automatycznie dla najnowszego buildu w TestFlight.
#
# Wymaga:
#   - jq, python3 z PyJWT, cryptography
#   - ASC API key (.p8) w env ASC_KEY_PATH lub stdin
#   - env: ASC_KEY_ID, ASC_ISSUER_ID, ASC_APP_ID
#   - opcjonalnie: WHATS_NEW_PL (multi-line release notes po polsku)
#
# Użycie:
#   ./scripts/submit-ios-for-review.sh                        # automat z latest build
#   ASC_BUILD_VERSION=16 ./scripts/submit-ios-for-review.sh   # konkretny build
#   ./scripts/submit-ios-for-review.sh --version=1.0.45       # konkretna versionString

set -euo pipefail

# ── Defaults ──────────────────────────────────────────────────────────────────
: "${ASC_KEY_ID:=35K7XF4DXG}"
: "${ASC_ISSUER_ID:=cd9081b9-6083-4869-9916-60884aa8dfe9}"
: "${ASC_APP_ID:=6748219988}"
: "${ASC_KEY_PATH:=}"
: "${ASC_BUILD_VERSION:=}"

# Default release notes po polsku — można nadpisać env WHATS_NEW_PL.
# Jeśli nie podano i poprzednia wersja miała pl_PL whatsNew, weźmiemy stamtąd.
: "${WHATS_NEW_PL:=}"

# Parse --version flag
VERSION_STRING=""
for arg in "$@"; do
    case "$arg" in
        --version=*) VERSION_STRING="${arg#--version=}" ;;
    esac
done

# Pobierz key z EAS jeśli ASC_KEY_PATH nie ustawione
if [ -z "$ASC_KEY_PATH" ]; then
    if [ -z "${EAS_SESSION_SECRET:-}" ]; then
        echo "❌ Ustaw EAS_SESSION_SECRET albo ASC_KEY_PATH" >&2
        exit 1
    fi
    ASC_KEY_PATH=$(mktemp)
    chmod 600 "$ASC_KEY_PATH"
    PROJECT_ID="${EAS_PROJECT_ID:-4aced4e9-da53-4734-83d7-fa5fe9870884}"
    QUERY='query($appId:String!){app{byId(appId:$appId){iosAppCredentials{appStoreConnectApiKeyForSubmissions{keyP8}}}}}'
    curl -s -X POST "https://api.expo.dev/graphql" \
        -H "Content-Type: application/json" -H "Expo-Session: $EAS_SESSION_SECRET" \
        --data-binary "$(jq -nc --arg q "$QUERY" --arg id "$PROJECT_ID" '{query:$q, variables:{appId:$id}}')" \
        | jq -r '.data.app.byId.iosAppCredentials[0].appStoreConnectApiKeyForSubmissions.keyP8' > "$ASC_KEY_PATH"
fi

# ── Python heavy lifting (JWT + ASC API calls) ────────────────────────────────
export ASC_KEY_PATH ASC_KEY_ID ASC_ISSUER_ID ASC_APP_ID ASC_BUILD_VERSION VERSION_STRING WHATS_NEW_PL

python3 - <<'PYEOF'
import jwt, time, urllib.request, urllib.error, json, os, sys

KEY_PATH = os.environ['ASC_KEY_PATH']
KEY_ID = os.environ['ASC_KEY_ID']
ISSUER_ID = os.environ['ASC_ISSUER_ID']
ASC_APP_ID = os.environ['ASC_APP_ID']
TARGET_BUILD = os.environ.get('ASC_BUILD_VERSION') or None
TARGET_VERSION = os.environ.get('VERSION_STRING') or None
WHATS_NEW = os.environ.get('WHATS_NEW_PL') or None

with open(KEY_PATH) as f:
    private_key = f.read()

def tok():
    return jwt.encode({"iss": ISSUER_ID, "iat": int(time.time()), "exp": int(time.time())+1200,
                       "aud": "appstoreconnect-v1"}, private_key,
                      algorithm="ES256", headers={"kid": KEY_ID, "typ": "JWT"})

def asc(m, p, body=None):
    req = urllib.request.Request(f"https://api.appstoreconnect.apple.com{p}",
        data=json.dumps(body).encode() if body else None, method=m,
        headers={"Authorization": f"Bearer {tok()}", "Content-Type": "application/json"})
    try:
        r = urllib.request.urlopen(req, timeout=30)
        b = r.read()
        return r.status, json.loads(b) if b else {}
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read() or b'{}')

# 1. Pick latest VALID build (lub specified)
filter_q = f"&filter[version]={TARGET_BUILD}" if TARGET_BUILD else ""
s, d = asc("GET", f"/v1/builds?filter[app]={ASC_APP_ID}{filter_q}&filter[processingState]=VALID&limit=5&sort=-uploadedDate&fields[builds]=version,uploadedDate,preReleaseVersion&include=preReleaseVersion")
builds = d.get('data', [])
if not builds:
    print("❌ No VALID build found", file=sys.stderr)
    sys.exit(1)
build = builds[0]
BUILD_ID = build['id']
BUILD_VER = build['attributes']['version']
# Wyciągnij CFBundleShortVersionString z preReleaseVersion
prv = next((i for i in d.get('included',[]) if i['type']=='preReleaseVersions'), None)
SHORT_VER = (prv['attributes']['version'] if prv else TARGET_VERSION) or "1.0.0"
print(f"📦 Build: {BUILD_VER} (ID: {BUILD_ID}, short: {SHORT_VER})")

# 2. Sprawdź czy AppStoreVersion z tym versionString już istnieje
final_ver = TARGET_VERSION or SHORT_VER
s, d = asc("GET", f"/v1/apps/{ASC_APP_ID}/appStoreVersions?filter[versionString]={final_ver}&filter[platform]=IOS&limit=1")
if d.get('data'):
    VERSION_ID = d['data'][0]['id']
    state = d['data'][0]['attributes']['appStoreState']
    print(f"📋 Istniejąca AppStoreVersion {final_ver}: state={state}")
    if state in ('READY_FOR_SALE', 'IN_REVIEW', 'WAITING_FOR_REVIEW', 'PENDING_DEVELOPER_RELEASE'):
        print(f"   Już w pipeline / live → skip")
        sys.exit(0)
else:
    # 3. Stwórz nową
    body = {"data": {"type": "appStoreVersions",
        "attributes": {"versionString": final_ver, "platform": "IOS",
                      "releaseType": "AFTER_APPROVAL", "copyright": "© 2026 Kaszuby24"},
        "relationships": {"app": {"data": {"type": "apps", "id": ASC_APP_ID}},
                         "build": {"data": {"type": "builds", "id": BUILD_ID}}}}}
    s, d = asc("POST", "/v1/appStoreVersions", body)
    if s not in (200, 201):
        print(f"❌ Create version failed: {json.dumps(d, indent=2)[:400]}", file=sys.stderr); sys.exit(1)
    VERSION_ID = d['data']['id']
    print(f"✅ Stworzono AppStoreVersion {final_ver} (ID: {VERSION_ID})")

# 4. Update pl whatsNew jeśli podano
if WHATS_NEW:
    s, d = asc("GET", f"/v1/appStoreVersions/{VERSION_ID}/appStoreVersionLocalizations")
    pl = next((l for l in d.get('data',[]) if l['attributes']['locale'] == 'pl'), None)
    if pl:
        body = {"data": {"type": "appStoreVersionLocalizations", "id": pl['id'],
                "attributes": {"whatsNew": WHATS_NEW}}}
        s, _ = asc("PATCH", f"/v1/appStoreVersionLocalizations/{pl['id']}", body)
        print(f"📝 Update pl whatsNew: HTTP {s}")

# 5. Stwórz reviewSubmission + add item + submit
body = {"data": {"type": "reviewSubmissions", "attributes": {"platform": "IOS"},
        "relationships": {"app": {"data": {"type": "apps", "id": ASC_APP_ID}}}}}
s, d = asc("POST", "/v1/reviewSubmissions", body)
if s not in (200, 201):
    err = json.dumps(d)[:400]
    if 'already' in err.lower() or 'in_progress' in err.lower():
        print(f"⚠️  Active submission exists (continuing)")
        # Get existing
        s, d = asc("GET", f"/v1/apps/{ASC_APP_ID}/reviewSubmissions?filter[state]=READY_FOR_REVIEW,WAITING_FOR_REVIEW&limit=1")
        if not d.get('data'):
            print("❌ Cannot find active submission", file=sys.stderr); sys.exit(1)
        SUB_ID = d['data'][0]['id']
    else:
        print(f"❌ Create submission failed: {err}", file=sys.stderr); sys.exit(1)
else:
    SUB_ID = d['data']['id']
    print(f"📤 ReviewSubmission ID: {SUB_ID}")

body = {"data": {"type": "reviewSubmissionItems",
        "relationships": {"reviewSubmission": {"data": {"type": "reviewSubmissions", "id": SUB_ID}},
                         "appStoreVersion": {"data": {"type": "appStoreVersions", "id": VERSION_ID}}}}}
s, d = asc("POST", "/v1/reviewSubmissionItems", body)
print(f"📎 Add item: HTTP {s}")
if s not in (200, 201):
    print(json.dumps(d, indent=2)[:600], file=sys.stderr)

body = {"data": {"type": "reviewSubmissions", "id": SUB_ID, "attributes": {"submitted": True}}}
s, d = asc("PATCH", f"/v1/reviewSubmissions/{SUB_ID}", body)
print(f"🚀 Submit: HTTP {s}")

# Final state
s, d = asc("GET", f"/v1/appStoreVersions/{VERSION_ID}?fields[appStoreVersions]=versionString,appStoreState")
print(f"✅ Final: {d['data']['attributes']['versionString']} → {d['data']['attributes']['appStoreState']}")
PYEOF

# Cleanup tmp key jeśli sami pobraliśmy
if [ -n "${EAS_SESSION_SECRET:-}" ] && [ -f "$ASC_KEY_PATH" ]; then
    rm -f "$ASC_KEY_PATH"
fi
