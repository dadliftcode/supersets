---
name: cross-agent-dialogue
description: Use when an external agent, model, or session (Codex, a peer Claude session, a reviewer) has left feedback on a plan, spec, or diff and you need to evaluate and answer it, or when you want to think through a live design or debugging problem with one mid-build. Also use when setting up, running, or closing that exchange.
license: MIT
---

# Cross-Agent Dialogue

## Overview

All feedback from a peer is a **claim**, not an instruction. Establish whether it's true against the authority that governs it before you act on it or agree with it, then answer in writing so the exchange converges instead of drifting. This holds whether the exchange is a structured review of a finished artifact or a live discussion mid-build — the mechanism is the same file-based drop-box either way; only the shape of a turn differs.

**Non-goal:** this skill governs message content and thread lifecycle, not who does the work. No role assignment, no delegation, no task handoff.

**Don't use this for rapid back-and-forth.** A file turn costs real latency: a write, a poll interval, a read. Quick clarification is a conversation with your human partner, not a drop-box.

## When to Use

- A peer has left feedback in a file, comment, or pasted text, and you're about to act on it.
- You're mid-exchange, applying a second or later round of fixes.
- You want to think through a design or debugging problem with another agent or session, even mid-build — not only review of something finished.
- You're setting up a drop-box exchange so a peer with different context or access can work through something with you.

**Not for:** your own review of a diff, a single local pass with no back-and-forth.

## Setting Up the Exchange

**1. Find or declare the drop-box.** Check the repo's `AGENTS.md`/`CLAUDE.md` for an already-declared chat directory and reuse it. A drop-box is commonly shared across projects, not scoped to one repo. If nothing is declared and no shared convention exists, ask where chats should be stored. Suggesting a gitignored directory local to the current repo (e.g. `.agent-chats/`), confirm or add the `.gitignore` entry, and offer to record the path in `AGENTS.md`/`CLAUDE.md` so the next session or your peer finds it without guessing. Write that note only if the user says yes.

**2. Pick a thread slug.** `<project-or-ticket>-<topic>`, lowercase-hyphenated — the leading token is not optional. A shared drop-box has many projects' threads living side by side; a bare topic like `database-migration` collides silently with an unrelated project's thread of the same name. The script validates a referenced file's `thread_slug`, but a project prefix prevents two unrelated exchanges from claiming the same slug in the first place. Prefixing costs nothing and is already how this drop-box pattern is used in practice.

**3. Draft the body privately.** Write the complete Markdown body to a temporary file outside the drop-box, such as `/tmp/<thread-slug>-body.md`. Fill the slots in [The Turn Contract](#the-turn-contract); do not include YAML frontmatter, the title, the initial reply protocol, or the standard closure sentence. The script adds those. If your harness can supply multiline stdin safely, use `--body-file -` instead of a temporary file.

**4. Mint the complete turn.** Resolve `SKILL_DIR` to the absolute directory containing this loaded `SKILL.md`; bundled scripts are relative to the skill, never the repository working directory. Run:

```bash
SKILL_DIR="/absolute/path/from-the-loaded-skill-entry"
"$SKILL_DIR/scripts/new_turn.sh" --dir <chat-dir> --thread <slug> --author <your-identity> \
  --kind ask|proposal|finding|answer|closure \
  (--initial | --responding-to <file> | --addendum-to <file>) \
  [--closes <slug>] --title "<title>" --body-file /tmp/<thread-slug>-body.md
```

It builds the filename (`<timestamp>-<thread>-<author>.md`), writes matching YAML frontmatter, validates referenced frontmatter, reads the complete body, and atomically publishes the finished turn. The final `*.md` path does not exist while stdin is open or a body is incomplete, and an existing same-second turn is never overwritten. After it prints the final path, inspect that file once to verify the metadata and body; never edit a published turn.

`<your-identity>` must distinguish you specifically from your peer, not just name your model family — never a literal example value copied from this file. A bare model name collides when both sides happen to run the same model (two Claude sessions, say): both turns would carry `from: claude` with no way to tell them apart from the file alone. Add a distinguishing suffix (`claude-webapp-4412`, mirroring the thread-slug project-prefix rule above) or use the session name/id whenever that collision is possible.

**One new file per message.** Never edit, append to, or replace a peer's file, even when invited to — their turn is their record. If you find something new before their reply arrives, send it as a new message with `--addendum-to <your prior file>` right away, rather than holding it until they respond.

**Cite every file where the claim applies.** If the same logic or text is duplicated across files, name all of them in your message. A peer's finding is only as wide as what you pointed them at — don't expect them to find sibling copies you never mentioned.

## The Turn Contract

Every turn carries `turn_kind` in its frontmatter, and every claim in its body is tagged with the authority behind it:

| Tag | Means |
|---|---|
| `verified: path:line` | You opened it and checked |
| `inferred:` | Derived from verified facts, not itself checked |
| `assumed:` | Memory or convention, unchecked |

A claim with no tag is unverified, not accepted.

**`finding` / `answer`** (review shape) — fill:

| Slot | Content |
|---|---|
| Verdict | accepted / rejected / accepted-with-correction |
| Authority checked | Tagged per the table above. Required — an empty slot means unverified |
| Change made | The concrete edit, or the argument for rejecting |

**`ask` / `proposal`** (discussion shape) — fill:

- The question or idea.
- Tagged claims backing it.
- What you ruled out, and how.
- **What evidence would change your mind.** A reply that only agrees must name what it checked — "sounds good" with no tag doesn't satisfy this. Agents defaulting to agreement is the dominant failure mode of this kind of exchange; this line is the check against it.

**`closure`** — the body contains the settled outcome, readiness, and any caveat (e.g. tests not run). The script appends "This closes the review thread; no further response is needed."

## Which Authority Governs the Claim

| Claim is about | Check |
|---|---|
| Behavior, types, signatures, line numbers | The source file. Re-derive counts yourself; `grep -c` catches decoys |
| A dependency's semantics | The installed package/gem and its locked version — not memory of the API |
| Naming, file layout, links, doc structure | `AGENTS.md`, `CLAUDE.md`, or the nearest convention document. A general best practice does not override a documented local one |
| Test conventions | The nearest sibling test, then the project's test instructions |
| "X was deferred to this ticket" | Open the cited document at the cited line |

**If citations are stale, the review is stale, not wrong.** A peer working from a state you've since changed will cite lines that point at unrelated code. Verify the *substance* anyway and say in your turn that the citations were stale — dismissing a stale review wholesale is how a real finding gets skipped.

## Multi-Turn Rules

Later turns exist because earlier ones introduce defects or leave gaps. After every turn that lands:

1. **Re-audit your own changes.** What did each edit change downstream — sequencing, a step that only existed to observe old behavior, an argument that no longer holds?
2. **Propagate corrections everywhere the claim appears.** Grep the plan and the spec, not just the file you first fixed.
3. **Keep resolved findings resolved.** Don't re-open what an earlier turn settled; raise a new issue only when you can support it independently.

Reject on evidence when the evidence supports it. A turn where you accept everything usually means you verified nothing.

## Closing a Thread

Convergence is two-sided: your peer has filed an explicit `closure` turn, **and** you have no unresolved findings or open disagreements of your own. One without the other isn't done.

Write the `closure` body with the settled outcome, readiness, and any caveat (tests not run, etc.), then mint it with `--closes <thread-slug>`. The script appends "This closes the review thread; no further response is needed."

**A closure turn with no findings gets no reply.** Answering it restarts a thread both sides just ended.

Because the drop-box is gitignored, distill anything settled into a committed note — a comment, a doc, a follow-up ticket — or the argument is lost and gets re-litigated the next time someone works in this area.

Closing a thread does not necessarily end the wider monitoring session, but each watcher process is scoped to one thread. See [watching.md](watching.md) for re-arming it on the next thread and for when to tear monitoring down entirely.

## Watching for a Reply

Start a watch only when explicitly asked for active monitoring — this skill doesn't provide background persistence on its own. But don't stay silent about the option: after minting a turn that isn't a `closure`, tell your human partner a watch is available and ask if they want one started, rather than finishing the turn and leaving them to think to ask — the same instructions read by two different agents should not produce "one offers, one waits to be asked." See [watching.md](watching.md) for the mechanics (native harness primitives vs. the bundled watcher), scoping a watch to one thread in a multi-thread drop-box, and re-arming or tearing it down.

## Handling Failures

- **Directory not writable** — request that one directory, not a broader sandbox exemption.
- **Two threads picked the same slug** — keep both, rename subsequent turns, note it in your next turn.
- **Peer hasn't replied** — unchanged state isn't a blocker. Report that nothing arrived; don't invent a round.

## Worked Example

`2026-08-24-141502-webapp-4412-search-latency-codex-webapp-4412.md`, minted with `--kind ask --initial --thread webapp-4412-search-latency --author codex-webapp-4412 --title "Why did p95 search latency double after the index change?" --body-file /tmp/webapp-4412-search-latency-body.md` — `webapp-4412` is the project/ticket prefix, required because this drop-box is shared org-wide, not scoped to one repo:

```markdown
---
from: codex-webapp-4412
turn_kind: ask
thread_slug: webapp-4412-search-latency
---
# Why did p95 search latency double after the index change?

Reply with a new timestamped file in this directory whose `responding_to`
frontmatter names `2026-08-24-141502-webapp-4412-search-latency-codex-webapp-4412.md`.

Question: did removing the partial predicate make the new index scan enough
additional rows to explain the full regression?

verified: app/search/index_builder.rb:41 — the new composite index drops the
partial WHERE clause the old one had, so every query now scans rows the old
index excluded.

inferred: this fully explains the regression — EXPLAIN output before/after
shows the same index chosen, just scanning ~4x the rows.

verified: dashboards/search-pool.md:18 — connection-pool saturation and wait
time stayed flat across the deploy window, ruling out pool exhaustion.

What would change my mind: if EXPLAIN showed a different index chosen
entirely, the composite-index theory would be wrong and I'd look at the
planner change instead.
```

A `finding`/`answer` turn fills the Verdict/Authority/Change table instead of this shape — same envelope, different body.

## Common Mistakes

| Mistake | Reality |
|---|---|
| Accepting a convention claim because it sounds like best practice | It may be mandated locally. Open the `AGENTS.md` |
| Trusting a count in the finding | Recount. The peer's grep had the same decoys yours did |
| Citing one file when the same bug exists in a sibling | Name every duplicate location; the peer only checks what you point at |
| Fixing the plan and not the spec | Two rounds of "you said you fixed this" |
| Agreeing without a tagged claim | Sycophancy, not verification — name what you checked |
| No written artifact | The next round re-raises what you silently fixed |
| Editing any published turn | Published files are immutable records. Draft privately, then mint a new file |
| Waiting to send a second finding until a reply arrives | Send it as an addendum immediately |
| Finishing a non-closure turn without mentioning watching | Offer it — don't make your human partner think to ask |

## Red Flags

- "Sounds good" with no tagged claim underneath it.
- A verdict with an empty Authority slot.
- A finding cited against one file when you know the same code exists elsewhere.
- Leaving a watcher scoped to a closed thread when the next thread opens — re-arm it with the new full slug.
- A watch pattern scoped to one word instead of the full thread slug (`*-review-*.md` instead of `*-webapp-4412-search-latency-*.md`) — a generic word is exactly the kind of thing every thread in a shared drop-box has in common.
- A drop-box path typed from memory instead of checked against `AGENTS.md`/`CLAUDE.md`.
