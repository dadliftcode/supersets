#!/usr/bin/env bash
# Watch a drop-box directory for new or changed files.
# Usage: watch_for_reply.sh <chat-directory> [poll-seconds] \
#          --thread SLUG --author NAME [--once]
set -euo pipefail

usage() {
  printf 'usage: %s <chat-directory> [poll-seconds] --thread SLUG --author NAME [--once]\n' \
    "$(basename "$0")" >&2
  exit 2
}

ONCE=0 THREAD="" AUTHOR=""
POSITIONAL=()

while [[ $# -gt 0 ]]; do
  case "$1" in
    --once) ONCE=1; shift ;;
    --thread)
      [[ $# -ge 2 ]] || usage
      THREAD="$2"
      shift 2
      ;;
    --author)
      [[ $# -ge 2 ]] || usage
      AUTHOR="$2"
      shift 2
      ;;
    --help|-h) usage ;;
    --*) usage ;;
    *) POSITIONAL+=("$1"); shift ;;
  esac
done

[[ ${#POSITIONAL[@]} -ge 1 && ${#POSITIONAL[@]} -le 2 ]] || usage
[[ -n "$THREAD" && -n "$AUTHOR" ]] || usage

DIR="${POSITIONAL[0]}"
POLL="${POSITIONAL[1]:-15}"

[[ -d "$DIR" ]] || { printf 'not a directory: %s\n' "$DIR" >&2; exit 1; }
[[ -r "$DIR" ]] || { printf 'not readable: %s\n' "$DIR" >&2; exit 1; }
[[ "$POLL" =~ ^[0-9]+$ && "$POLL" -ge 1 ]] || {
  printf 'poll-seconds must be a positive integer: %s\n' "$POLL" >&2
  exit 1
}
SLUG_RE='^[a-z0-9][a-z0-9-]*$'
[[ "$THREAD" =~ $SLUG_RE ]] || { printf 'thread must be lowercase letters, digits, hyphens: %s\n' "$THREAD" >&2; exit 1; }
[[ "$AUTHOR" =~ $SLUG_RE ]] || { printf 'author must be lowercase letters, digits, hyphens: %s\n' "$AUTHOR" >&2; exit 1; }

sig() {
  stat -c '%n %Y %s' "$1" 2>/dev/null || stat -f '%N %m %z' "$1"
}

matches_reply() {
  local file="$1"
  awk -v target_thread="$THREAD" -v local_author="$AUTHOR" '
    NR == 1 {
      if ($0 != "---") {
        invalid = 1
        exit 1
      }
      in_frontmatter = 1
      next
    }
    in_frontmatter && $0 == "---" {
      closed = 1
      in_frontmatter = 0
      exit
    }
    in_frontmatter {
      if ($0 ~ /^[ \t]*$/ || $0 ~ /^[ \t]*#/) next
      separator = index($0, ":")
      field = substr($0, 1, separator - 1)
      remainder = substr($0, separator + 1)
      if (separator <= 1 || field !~ /^[A-Za-z_][A-Za-z0-9_-]*$/ ||
          (remainder != "" && remainder !~ /^[ \t]/)) {
        invalid = 1
        next
      }
      seen[field]++
      if (seen[field] > 1) invalid = 1
      value = remainder
      sub(/^[ \t]+/, "", value)
      if (field == "thread_slug") {
        thread = value
        thread_count++
      } else if (field == "from") {
        author = value
        author_count++
      }
    }
    END {
      if (invalid || !closed || thread_count != 1 || author_count != 1 || author == "") exit 1
      if (thread != target_thread || author == local_author) exit 1
    }
  ' "$file"
}

snap() {
  local f
  while IFS= read -r -d '' f; do
    if matches_reply "$f"; then
      sig "$f"
    fi
  done < <(find "$DIR" -maxdepth 1 -type f -name '*.md' -print0) | LC_ALL=C sort
}

prev="$(snap)"
printf 'watching %s every %ss (thread=%s author=%s once=%s)\n' \
  "$DIR" "$POLL" "$THREAD" "$AUTHOR" "$ONCE"

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
