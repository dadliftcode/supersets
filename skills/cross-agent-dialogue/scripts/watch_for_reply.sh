#!/usr/bin/env bash
# Watch a drop-box directory for new or changed files.
# Usage: watch_for_reply.sh <chat-directory> [poll-seconds] [file-pattern]
# Flags: --once   exit after the first change
#        --exclude GLOB   omit matching basenames from the snapshot
set -euo pipefail

usage() {
  printf 'usage: %s <chat-directory> [poll-seconds] [file-pattern] [--once] [--exclude GLOB]\n' \
    "$(basename "$0")" >&2
  exit 2
}

ONCE=0
EXCLUDE=""
POSITIONAL=()

while [[ $# -gt 0 ]]; do
  case "$1" in
    --once) ONCE=1; shift ;;
    --exclude)
      [[ $# -ge 2 ]] || usage
      EXCLUDE="$2"
      shift 2
      ;;
    --help|-h) usage ;;
    --*) usage ;;
    *) POSITIONAL+=("$1"); shift ;;
  esac
done

[[ ${#POSITIONAL[@]} -ge 1 ]] || usage

DIR="${POSITIONAL[0]}"
POLL="${POSITIONAL[1]:-15}"
PATTERN="${POSITIONAL[2]:-*.md}"

[[ -d "$DIR" ]] || { printf 'not a directory: %s\n' "$DIR" >&2; exit 1; }
[[ -r "$DIR" ]] || { printf 'not readable: %s\n' "$DIR" >&2; exit 1; }
[[ "$POLL" =~ ^[0-9]+$ && "$POLL" -ge 1 ]] || {
  printf 'poll-seconds must be a positive integer: %s\n' "$POLL" >&2
  exit 1
}

sig() {
  stat -c '%n %Y %s' "$1" 2>/dev/null || stat -f '%N %m %z' "$1"
}

snap() {
  local f
  while IFS= read -r -d '' f; do
    sig "$f"
  done < <(
    if [[ -n "$EXCLUDE" ]]; then
      find "$DIR" -maxdepth 1 -type f -name "$PATTERN" ! -name "$EXCLUDE" -print0
    else
      find "$DIR" -maxdepth 1 -type f -name "$PATTERN" -print0
    fi
  ) | LC_ALL=C sort
}

prev="$(snap)"
printf 'watching %s every %ss (pattern=%s exclude=%s once=%s)\n' \
  "$DIR" "$POLL" "$PATTERN" "${EXCLUDE:-none}" "$ONCE"

while true; do
  sleep "$POLL"
  cur="$(snap)"
  added="$(comm -13 <(printf '%s\n' "$prev" | grep -v '^$') <(printf '%s\n' "$cur" | grep -v '^$') || true)"
  if [[ -n "$added" ]]; then
    printf '%s\n' "$added"
    if [[ "$ONCE" -eq 1 ]]; then
      exit 0
    fi
  fi
  prev="$cur"
done
