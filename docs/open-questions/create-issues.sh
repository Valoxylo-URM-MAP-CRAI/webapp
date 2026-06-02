#!/usr/bin/env bash
# Create the drafted open-question issues on GitHub.
# Dry-run by default; pass --confirm to actually create them.
set -euo pipefail
REPO="Valoxylo-URM-MAP-CRAI/webapp"
LABEL="question"
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIRM=0
[ "${1:-}" = "--confirm" ] && CONFIRM=1

while IFS=$'\t' read -r rank file title; do
  [ -z "$file" ] && continue
  if [ "$CONFIRM" = "1" ]; then
    url=$(gh issue create --repo "$REPO" --title "$title" --label "$LABEL" --body-file "$DIR/$file")
    echo "created  #$rank  $url"
  else
    echo "[dry-run] would create: [$LABEL] $title  (body: $file)"
  fi
done < "$DIR/manifest.tsv"

[ "$CONFIRM" = "1" ] || echo $'\nDry-run only. Re-run with --confirm to create the issues.'
