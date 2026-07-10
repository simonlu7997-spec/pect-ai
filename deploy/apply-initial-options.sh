#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CONFIG_FILE="${CONFIG_FILE:-$ROOT_DIR/deploy/initial-options.json}"
BASE_URL="${BASE_URL:-https://ai.pect-dapp.io}"
USDT_NETWORK="${USDT_NETWORK:-TRC20}"
USDT_ADDRESS="${USDT_ADDRESS:-}"

if [[ -z "${NEW_API_ADMIN_COOKIE:-}" ]]; then
  echo "Missing NEW_API_ADMIN_COOKIE. Log in as root in the browser and pass the Cookie header value." >&2
  echo "Example: NEW_API_ADMIN_COOKIE='session=...' $0" >&2
  exit 1
fi

if [[ ! -f "$CONFIG_FILE" ]]; then
  echo "Config file not found: $CONFIG_FILE" >&2
  exit 1
fi

if [[ -n "$USDT_ADDRESS" ]]; then
  USDT_ENABLED="${USDT_ENABLED:-true}"
else
  USDT_ENABLED="${USDT_ENABLED:-false}"
fi
export USDT_ENABLED USDT_NETWORK USDT_ADDRESS

python3 - "$CONFIG_FILE" <<'PY' |
import json
import os
import sys

config_path = sys.argv[1]
with open(config_path, "r", encoding="utf-8") as f:
    config = json.load(f)

for section, items in config.items():
    for item in items:
        key = item["key"]
        value = item["value"]
        for env_key in ("USDT_ENABLED", "USDT_NETWORK", "USDT_ADDRESS"):
            value = value.replace("${" + env_key + "}", os.environ.get(env_key, ""))
        if key == "UsdtAddress" and not value:
            continue
        print(json.dumps({"key": key, "value": value}, ensure_ascii=False))
PY
while IFS= read -r payload; do
  key="$(python3 -c 'import json,sys; print(json.loads(sys.stdin.read())["key"])' <<<"$payload")"
  printf 'Applying %s... ' "$key"
  response="$(curl -fsS -X PUT "$BASE_URL/api/option/" \
    -H "Content-Type: application/json" \
    -H "Cookie: $NEW_API_ADMIN_COOKIE" \
    --data "$payload")"
  success="$(python3 -c 'import json,sys; print(json.loads(sys.stdin.read()).get("success"))' <<<"$response")"
  if [[ "$success" != "True" && "$success" != "true" ]]; then
    echo
    echo "Failed payload: $payload" >&2
    echo "Response: $response" >&2
    exit 1
  fi
  echo "ok"
done

curl -fsS "$BASE_URL/api/status" >/dev/null
echo "Initial options applied to $BASE_URL"
