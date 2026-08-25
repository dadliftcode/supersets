# Watching for a Reply

Referenced from [SKILL.md](SKILL.md). Only read this when you're about to start or stop an active watch — start one only when explicitly asked for active monitoring.

## Establish a baseline first

Finish and verify your own outbound turn before starting the watcher, so it's part of the baseline rather than mistaken for the reply you're waiting on.

## If your harness has background monitor/wakeup primitives

Claude Code: `Monitor` + `ScheduleWakeup` + `TaskStop`.

Run the bundled watcher through `Monitor` so every harness uses the same exact frontmatter filtering:

```bash
SKILL_DIR="/absolute/path/from-the-loaded-skill-entry"
"$SKILL_DIR/scripts/watch_for_reply.sh" <chat-dir> 20 \
  --thread <thread-slug> --author <your-identity>
```

Run it via `Monitor` with `persistent: true`, then `/loop` with no interval to self-pace.

**You cannot tell whether a monitor is already live.** `TaskList` doesn't surface Monitors and `ps` is sandbox-blocked. On any re-invocation, `TaskStop` the known ID then re-arm — one guaranteed watcher beats guessing.

## Otherwise

Run:

```bash
SKILL_DIR="/absolute/path/from-the-loaded-skill-entry"
"$SKILL_DIR/scripts/watch_for_reply.sh" <chat-dir> [poll-seconds] \
  --thread <thread-slug> --author <your-identity>
```

`SKILL_DIR` is the absolute directory containing the loaded `SKILL.md`, not the repository working directory. The script defaults to a 15s poll. Keep the watcher process alive and check in on it no less often than every 60s; give concise updates to your human partner while waiting.

The watcher scans Markdown files but snapshots only those with closed, canonical, non-duplicated flat frontmatter whose `thread_slug` exactly equals `--thread` and whose `from` value differs from `--author`. Filenames are not authoritative: hyphens make thread and author boundaries ambiguous there, while the frontmatter fields remain exact.

## When the watcher reports a change

Read the reported turn and return to verification. Exact thread and author filtering establishes which exchange produced it, not whether its claims are correct.

## Closing a thread vs. tearing down the watcher

These are not the same event. **Closing a thread** — see SKILL.md's "Closing a Thread" — ends one topic. Each watcher process has a fixed `--thread` value, so it cannot follow a later thread automatically. When another thread starts, stop the old process or monitor and re-arm a new one with the new full thread slug after the outbound turn is complete. Reusing the old watcher silently misses the new thread.

**Tearing down the monitoring session** happens only when no further threads are expected for the rest of the session. With native monitor/wakeup primitives:

1. `ScheduleWakeup` with `stop: true` first. Check the result — it reports how many pending wakeups it cancelled.
2. `TaskStop` the monitor.
3. State plainly that watching has stopped.

**Wakeup first, always.** Reversing the order corrupts what you believe about the conversation: an orphaned wakeup re-invokes you with the original prompt verbatim, indistinguishable from your human partner asking again. You'll conclude they asked you to keep watching, re-arm a monitor *and* a fresh wakeup, and report the resurrection back to them as their own request. If a wakeup fires after you believed watching was done, suspect your own timer before assuming a new request.

With the bundled watcher, terminate its process or harness execution session, confirm that it exited, then state plainly that watching has stopped. There is no separate wakeup to cancel.

If asked to watch again after a thread closed, re-arm with the new thread's full slug, but say plainly that nothing will arrive unless your peer is prompted afresh — a live watcher over closed threads looks identical to work in progress, and silence gets read as a stall.

## Failure handling

- **Directory not writable** — request that one directory, not a broader sandbox exemption.
- **Watcher gone** — re-establish the baseline and restart it.
- **Two threads picked the same slug** — keep both, rename subsequent turns, note it in your next turn.
- **Peer hasn't replied** — unchanged state isn't a blocker. Report that nothing arrived; don't invent a round.
