#!/bin/bash
set -euo pipefail

CONFIG=~/.v23cc/config.json

show_status() {
  if [ ! -f "$CONFIG" ]; then
    echo "Atlassian: not configured"
    echo ""
    echo "Run: /v23cc:atlassian init"
    return
  fi
  V23CC_CONFIG="$CONFIG" python3 -c "
import json, os
config = os.environ['V23CC_CONFIG']
d = json.load(open(config))
atlassian = d.get('atlassian')
if not atlassian:
    print('Atlassian: not configured')
    print()
    print('Run: /v23cc:atlassian init')
else:
    token = atlassian.get('token', '')
    masked = token[:4] + '****' + token[-4:] if len(token) > 8 else '****'
    print('Atlassian: configured')
    print()
    print(f'  domain : {atlassian.get(\"domain\", \"-\")}.atlassian.net')
    print(f'  email  : {atlassian.get(\"email\", \"-\")}')
    print(f'  token  : {masked}')
"
}

CMD="${1:-}"

case "$CMD" in
  "" | status)
    show_status
    ;;

  init)
    DOMAIN="${2:-}"
    EMAIL="${3:-}"
    TOKEN="${4:-}"
    if [ -z "$DOMAIN" ] || [ -z "$EMAIL" ] || [ -z "$TOKEN" ]; then
      echo "Usage: /v23cc:atlassian init <domain> <email> <token>"
      echo ""
      echo "  domain  — Atlassian subdomain (e.g. mycompany for mycompany.atlassian.net)"
      echo "  email   — your Atlassian account email"
      echo "  token   — API token from https://id.atlassian.com/manage-profile/security/api-tokens"
      exit 1
    fi

    echo "Verifying credentials..."
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
      -u "${EMAIL}:${TOKEN}" \
      -H "Accept: application/json" \
      "https://${DOMAIN}.atlassian.net/rest/api/3/myself")

    if [ "$HTTP_CODE" != "200" ]; then
      echo "Error: authentication failed (HTTP ${HTTP_CODE})"
      echo "Check your domain, email, and API token."
      exit 1
    fi

    mkdir -p ~/.v23cc
    V23CC_CONFIG="$CONFIG" V23CC_DOMAIN="$DOMAIN" V23CC_EMAIL="$EMAIL" V23CC_TOKEN="$TOKEN" python3 -c "
import json, os
config = os.environ['V23CC_CONFIG']
domain = os.environ['V23CC_DOMAIN']
email = os.environ['V23CC_EMAIL']
token = os.environ['V23CC_TOKEN']
d = json.load(open(config)) if os.path.exists(config) else {}
d['atlassian'] = {'domain': domain, 'email': email, 'token': token}
json.dump(d, open(config, 'w'), indent=2)
print(f'Connected: {domain}.atlassian.net ({email})')
print('Credentials saved to ~/.v23cc/config.json')
"
    echo ""
    echo "Jira and Confluence are ready. Try:"
    echo "  \"search jira for <query>\""
    echo "  \"search confluence for <query>\""
    ;;

  *)
    echo "Unknown command: $CMD"
    echo "Usage: /v23cc:atlassian [status | init <domain> <email> <token>]"
    exit 1
    ;;
esac
