#!/usr/bin/env bash
# Mint a new turn file in a cross-agent-dialogue drop-box: correct filename,
# correct frontmatter, and a complete caller-supplied body.
set -euo pipefail

usage() {
  cat >&2 <<'USAGE'
usage: new_turn.sh --dir DIR --thread SLUG --author NAME --kind KIND \
         (--initial | --responding-to FILE | --addendum-to FILE) \
         [--closes SLUG] --title TITLE --body-file FILE

  KIND is one of: ask, proposal, finding, answer, closure
  --closes SLUG is required when --kind closure, and disallowed otherwise
  --body-file is required; use - to read the body from stdin
  SLUG and NAME must be lowercase letters, digits, and hyphens
USAGE
  exit 2
}

DIR="" THREAD="" AUTHOR="" KIND="" TITLE="" CLOSES="" BODY_FILE=""
INITIAL=0
RESPONDING_TO="" ADDENDUM_TO=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dir) DIR="${2:?}"; shift 2 ;;
    --thread) THREAD="${2:?}"; shift 2 ;;
    --author) AUTHOR="${2:?}"; shift 2 ;;
    --kind) KIND="${2:?}"; shift 2 ;;
    --initial) INITIAL=1; shift ;;
    --responding-to) RESPONDING_TO="${2:?}"; shift 2 ;;
    --addendum-to) ADDENDUM_TO="${2:?}"; shift 2 ;;
    --closes) CLOSES="${2:?}"; shift 2 ;;
    --title) TITLE="${2:?}"; shift 2 ;;
    --body-file) BODY_FILE="${2:?}"; shift 2 ;;
    --help|-h) usage ;;
    *) usage ;;
  esac
done

[[ -n "$DIR" && -n "$THREAD" && -n "$AUTHOR" && -n "$KIND" && -n "$TITLE" ]] || usage
[[ -n "$BODY_FILE" ]] || { printf '%s\n' '--body-file is required' >&2; exit 1; }

case "$KIND" in
  ask|proposal|finding|answer|closure) ;;
  *) printf 'invalid --kind: %s\n' "$KIND" >&2; usage ;;
esac

SLUG_RE='^[a-z0-9][a-z0-9-]*$'
[[ "$THREAD" =~ $SLUG_RE ]] || { printf -- '--thread must be lowercase letters, digits, hyphens: %s\n' "$THREAD" >&2; exit 1; }
[[ "$AUTHOR" =~ $SLUG_RE ]] || { printf -- '--author must be lowercase letters, digits, hyphens: %s\n' "$AUTHOR" >&2; exit 1; }

reply_modes=0
[[ $INITIAL -eq 1 ]] && reply_modes=$((reply_modes + 1))
[[ -n "$RESPONDING_TO" ]] && reply_modes=$((reply_modes + 1))
[[ -n "$ADDENDUM_TO" ]] && reply_modes=$((reply_modes + 1))
[[ $reply_modes -eq 1 ]] || { printf 'exactly one of --initial, --responding-to, --addendum-to is required\n' >&2; exit 1; }

if [[ "$KIND" == closure ]]; then
  [[ -n "$CLOSES" ]] || { printf -- '--closes is required when --kind closure\n' >&2; exit 1; }
  [[ "$CLOSES" =~ $SLUG_RE ]] || { printf -- '--closes must be lowercase letters, digits, hyphens: %s\n' "$CLOSES" >&2; exit 1; }
  [[ "$CLOSES" == "$THREAD" ]] || { printf -- '--closes must match --thread (a closure closes its own thread): %s != %s\n' "$CLOSES" "$THREAD" >&2; exit 1; }
else
  [[ -z "$CLOSES" ]] || { printf -- '--closes is only valid when --kind closure\n' >&2; exit 1; }
fi

[[ -d "$DIR" ]] || { printf 'not a directory: %s\n' "$DIR" >&2; exit 1; }
[[ -w "$DIR" ]] || { printf 'not writable: %s\n' "$DIR" >&2; exit 1; }
if [[ "$BODY_FILE" != - ]]; then
  [[ -f "$BODY_FILE" ]] || { printf 'body file not found: %s\n' "$BODY_FILE" >&2; exit 1; }
  [[ -r "$BODY_FILE" ]] || { printf 'body file not readable: %s\n' "$BODY_FILE" >&2; exit 1; }
fi

# Resolve a --responding-to/--addendum-to reference to a basename that exists
# in DIR, whether the caller passed a bare filename or a full path. Always
# checks existence inside DIR specifically — a file that exists elsewhere on
# disk with the same basename must not satisfy the reference.
resolve_ref() {
  local ref="$1" candidate
  candidate="$DIR/$(basename "$ref")"
  [[ -f "$candidate" ]] || return 1
  basename "$ref"
}

frontmatter_field() {
  local file="$1" key="$2"
  awk -v key="$key" '
    NR == 1 {
      if ($0 != "---") exit 1
      in_frontmatter = 1
      next
    }
    in_frontmatter && $0 == "---" { exit }
    in_frontmatter && index($0, key ": ") == 1 {
      print substr($0, length(key) + 3)
      found = 1
      exit
    }
    END { if (!found) exit 1 }
  ' "$file"
}

validate_ref() {
  local filename="$1" relationship="$2" file ref_thread ref_author
  file="$DIR/$filename"
  ref_thread="$(frontmatter_field "$file" thread_slug)" \
    || { printf 'referenced file has no thread_slug: %s\n' "$filename" >&2; return 1; }
  [[ "$ref_thread" == "$THREAD" ]] \
    || { printf 'referenced thread_slug does not match --thread: %s != %s\n' "$ref_thread" "$THREAD" >&2; return 1; }

  if [[ "$relationship" == addendum ]]; then
    ref_author="$(frontmatter_field "$file" from)" \
      || { printf 'referenced file has no from identity: %s\n' "$filename" >&2; return 1; }
    [[ "$ref_author" == "$AUTHOR" ]] \
      || { printf 'referenced from does not match --author: %s != %s\n' "$ref_author" "$AUTHOR" >&2; return 1; }
  fi
}

if [[ -n "$RESPONDING_TO" ]]; then
  resolved="$(resolve_ref "$RESPONDING_TO")" \
    || { printf 'referenced file not found in %s: %s\n' "$DIR" "$RESPONDING_TO" >&2; exit 1; }
  validate_ref "$resolved" response || exit 1
  RESPONDING_TO="$resolved"
fi
if [[ -n "$ADDENDUM_TO" ]]; then
  resolved="$(resolve_ref "$ADDENDUM_TO")" \
    || { printf 'referenced file not found in %s: %s\n' "$DIR" "$ADDENDUM_TO" >&2; exit 1; }
  validate_ref "$resolved" addendum || exit 1
  ADDENDUM_TO="$resolved"
fi

TS="$(date +%Y-%m-%d-%H%M%S)"
FILE="$DIR/${TS}-${THREAD}-${AUTHOR}.md"
TMP=""

cleanup() {
  [[ -z "$TMP" || ! -e "$TMP" ]] || rm -f "$TMP"
}
trap cleanup EXIT HUP INT TERM

TMP="$(mktemp "$DIR/.new-turn.XXXXXX")"

{
  printf -- '---\n'
  printf 'from: %s\n' "$AUTHOR"
  printf 'turn_kind: %s\n' "$KIND"
  printf 'thread_slug: %s\n' "$THREAD"
  [[ -n "$RESPONDING_TO" ]] && printf 'responding_to: %s\n' "$RESPONDING_TO"
  [[ -n "$ADDENDUM_TO" ]] && printf 'addendum_to: %s\n' "$ADDENDUM_TO"
  [[ -n "$CLOSES" ]] && printf 'closes: %s\n' "$CLOSES"
  printf -- '---\n'
  printf '# %s\n\n' "$TITLE"
  if [[ $INITIAL -eq 1 ]]; then
    backtick='`'
    printf 'Reply with a new timestamped file in this directory whose %sresponding_to%s\n' "$backtick" "$backtick"
    printf 'frontmatter names %s%s%s.\n\n' "$backtick" "$(basename "$FILE")" "$backtick"
  fi
  if [[ "$BODY_FILE" == - ]]; then
    cat
  else
    cat "$BODY_FILE"
  fi
  if [[ "$KIND" == closure ]]; then
    printf '\nThis closes the review thread; no further response is needed.\n'
  fi
} > "$TMP"

turn_umask="$(umask)"
printf -v turn_mode '%o' "$((0666 & ~8#$turn_umask))"
chmod "$turn_mode" "$TMP"

if ! ln "$TMP" "$FILE"; then
  printf 'a turn already exists for this second, retry: %s\n' "$FILE" >&2
  exit 1
fi
rm -f "$TMP"
TMP=""

printf '%s\n' "$FILE"
