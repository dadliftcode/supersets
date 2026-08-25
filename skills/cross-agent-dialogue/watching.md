# Watching for a Reply

Referenced from [SKILL.md](SKILL.md). Only read this when you're about to start or stop an active watch — start one only when explicitly asked for active monitoring.

## Establish a baseline first

Finish and verify your own outbound turn before starting the watcher, so it's part of the baseline rather than mistaken for the reply you're waiting on.

## If your harness has background monitor/wakeup primitives

Claude Code: `Monitor` + `ScheduleWakeup` + `TaskStop`.

```bash
d=<chat-dir>
sig()  { stat -f '%N %m %z' "$1" 2>/dev/null || stat -c '%n %Y %s' "$1"; }   # BSD, then GNU
snap() { while IFS= read -r -d '' f; do sig "$f"; done \
           < <(find "$d" -maxdepth 1 -type f -name '*-<thread-slug>-*.md' \
               -not -name '*-<your-identity>.md' -print0) | LC_ALL=C sort; }
prev=$(snap)
while true; do sleep 20; cur=$(snap)
  comm -13 <(printf '%s\n' "$prev" | grep -v '^$') <(printf '%s\n' "$cur" | grep -v '^$'); prev="$cur"; done
```

Run it via `Monitor` with `persistent: true`, then `/loop` with no interval to self-pace.

Two things that bite:
- **Scope the `find` pattern to your thread slug**, and exclude your own filename suffix (`-<your-identity>.md`) — without both, the monitor wakes on every turn in the drop-box, including your own writes and unrelated threads.
- **You cannot tell whether a monitor is already live.** `TaskList` doesn't surface Monitors and `ps` is sandbox-blocked. On any re-invocation, `TaskStop` the known ID then re-arm — one guaranteed watcher beats guessing.

A third thing bites specifically in a drop-box transitioning between naming conventions: **a watcher already running with an old exclude pattern won't automatically pick up the new one.** If the directory has prior turns in a different shape (e.g. `*-from-<identity>.md` instead of this skill's `*-<identity>.md`), a watcher started under the old convention keeps its old exclude glob — it will self-wake on your own new-convention reply the instant you mint it. Check the running watcher's exclude pattern against your own filename's actual shape before minting your first turn, or restart it with the updated pattern.

## Otherwise

Run:

```bash
scripts/watch_for_reply.sh <chat-dir> [poll-seconds] '*-<thread-slug>-*.md' --exclude '*-<your-identity>.md'
```

Defaults to a 15s poll. Keep the watcher process alive and check in on it no less often than every 60s; give concise updates to your human partner while waiting. Always scope the pattern to your full thread slug, not a generic word — a shared, org-wide drop-box is the common case, not the exception, and an unscoped or under-scoped pattern wakes on every unrelated project's turns too.

## When the watcher reports a change

Inspect it. If it's unrelated to your thread, or self-authored, re-establish the baseline and keep watching. If it's your peer's reply, read it and return to verification.

## Closing a thread vs. tearing down the watcher

These are not the same event. **Closing a thread** — see SKILL.md's "Closing a Thread" — ends one topic. A long session can run many threads in sequence on one still-live watcher: closing thread 3 cleanly and opening thread 4 right after, on the same watcher, without tearing anything down, is normal and correct.

**Tearing down the watcher** happens only when no further threads are expected for the rest of the session:

1. `ScheduleWakeup` with `stop: true` first. Check the result — it reports how many pending wakeups it cancelled.
2. `TaskStop` the monitor.
3. State plainly that watching has stopped.

**Wakeup first, always.** Reversing the order corrupts what you believe about the conversation: an orphaned wakeup re-invokes you with the original prompt verbatim, indistinguishable from your human partner asking again. You'll conclude they asked you to keep watching, re-arm a monitor *and* a fresh wakeup, and report the resurrection back to them as their own request. If a wakeup fires after you believed watching was done, suspect your own timer before assuming a new request.

If asked to watch again after a thread closed, re-arm, but say plainly that nothing will arrive unless your peer is prompted afresh — a live watcher over closed threads looks identical to work in progress, and silence gets read as a stall.

## Failure handling

- **Directory not writable** — request that one directory, not a broader sandbox exemption.
- **Watcher gone** — re-establish the baseline and restart it.
- **Two threads picked the same slug** — keep both, rename subsequent turns, note it in your next turn.
- **Peer hasn't replied** — unchanged state isn't a blocker. Report that nothing arrived; don't invent a round.
