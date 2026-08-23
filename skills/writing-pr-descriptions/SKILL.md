---
name: writing-pr-descriptions
description: Use when opening or revising a pull request or merge request, writing a PR description, filling a repository PR template, or when a description is drifting into a file list, library primer, or commit timeline.
license: MIT
---

# Writing PR Descriptions

## Overview

A PR description is a **reviewer aid**. The reviewer is about to read the code. Anything the diff already shows, or that a typical engineer on this stack already knows, is a tax.

**Core principle: the diff shows what changed. The description carries what the diff cannot** — why it exists, what could go wrong, what happens at rollout. It should still make sense to someone who never opens the diff.

**Density:** as brief as the change allows. Every sentence must be load-bearing.

**Plain language:** one idea per sentence; active voice; one word per meaning; cut clauses that only sound careful.

## Inspect First

Do this before writing a word:

1. **The change.** Branch, merge base, and the real diff — not memory of the conversation.
2. **The commits.** `git log <base>..HEAD`. Recover why, and any approach you dropped. The description is the net change versus the base, not a timeline of the branch.
3. **A template.** `.github/PULL_REQUEST_TEMPLATE.md`, `.github/PULL_REQUEST_TEMPLATE/*.md`, `PULL_REQUEST_TEMPLATE.md`, `.gitlab/merge_request_templates/`. Template sections win.
4. **No template.** Sample 5–8 recently merged PRs (`gh pr list --state merged --limit 8` then `gh pr view`; or `glab`). Keep the patterns that help a reviewer. Drop file lists, primers, and CI recap. Write *this* description to that shape.

## The Recipe

Cover these four. They are a **checklist, not a schema**. A repo template usually has more sections; those still get filled in. Put each item in the section that owns it. Leave empty template sections exactly as prescribed — `none` or an unchecked box, not a padded paragraph. Do not invent headings. Do not replace the template's headings with this recipe's four. Do not point at file paths; the review UI already lists them.

**1. Orientation — 1–3 sentences.** What the change makes possible or fixes, and why.

**2. Review guidance.** Risk (what could go wrong, and what bounds it). Decisions the ticket did not dictate. Uncertainty you could not cheaply check. Scope beyond the ticket, offered for cutting. If nothing is contentious, say so in a line. Do not manufacture controversy.

**3. Verification.** Follow the template. No template: commands you already ran, and what each one did. Sampled PRs can override this the same way a template does. Do not assign the reviewer homework the review UI or CI already covers.

**4. Rollout, when it applies.** Migrations, backfills, flags, config, compatibility windows, what to watch, how to undo. Skip when none apply — or write `none` if the template has the heading.

**Visual changes:** before/after when the diff cannot show the effect.

**WIP:** say what feedback you want, and what is not ready. Mark draft only if you are opening the PR.

Do not explain how a library or protocol works if a typical engineer on this stack already knows it. Name the decision or risk, not the textbook.

## Open the PR

Open the PR only when the user asked to open or create one. Otherwise stop after the description.

When opening:

1. Push *this* branch if the remote does not have it. Never force-push. Never push other branches.
2. `gh pr create` or `glab mr create`, title plus body. Prefer `--body-file` or a heredoc. `--draft` when the work is not ready.
3. Do not invent URLs.

```bash
gh pr create --title "<title>" --body-file - <<'EOF'
<description>
EOF
```

## If There Was No Template

After this description is written, offer a `.github/PULL_REQUEST_TEMPLATE.md` distilled from the useful sampled PRs plus this recipe — short section headings a future author can fill, not an essay.

Write the file only if the user says yes. Do not sneak it into the same PR unless they ask.

## Core Pattern

Same change, both ~45 words.

**Inventory — what the reviewer is about to read anyway:**

> `ApiKey` now tracks a `key_version` (current/previous); `verifyRequest` accepts either version, and the previous key expires after a configurable window (default 72h, clamped 1–168h via `API_KEY_ROTATION_WINDOW_HOURS`). A second rotation drops the oldest key.

**Reviewer aid — which number is load-bearing:**

> Rotation gets a grace window, so integrators no longer need a coordinated cutover.
>
> The risk: a rotated key keeps working — 72h by default, 168h at the outside. That ceiling is the line worth reading closely, since without it a bad env value means "never expires". Rotating twice drops the old key early, which is how we'd handle a leak.

For complete descriptions across different change shapes, see [examples.md](examples.md).

## Quick Reference

| Mistake | Instead |
|---|---|
| Listing what each file does | Why this approach, and what it costs |
| Narrating the commit timeline | The net change versus the base |
| Teaching the library | The decision or risk that is not in the docs |
| Reviewer homework or CI recap | Commands you already ran, and what they did |
| Opening the PR unasked | Open only if asked to open or create |

## Red Flags — Stop and Cut

- File-by-file narration or "First I… then I…"
- A primer on a library the team already uses
- A sentence that needs to be read twice
- Past PRs unread when no template exists
- `gh pr create` / `glab mr create` when the user did not ask to open
- A template file added without being asked
