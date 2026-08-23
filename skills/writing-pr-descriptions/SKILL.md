---
name: writing-pr-descriptions
description: Use when opening a pull request or merge request, writing or revising a PR description, filling in a repository's PR template, sampling recent PRs because no template exists, offering a PR template, running gh pr create / glab mr create, or when a multi-commit branch tempts a timeline-style description.
license: MIT
---

# Writing PR Descriptions

## Overview

A PR description is a **reviewer aid**. The reviewer is about to read the code. Anything the diff already shows, or that a typical engineer working in this stack already knows, is a tax they pay before the hard part.

**Core principle: the diff shows what changed. The description carries what the diff cannot** — why it exists, what could go wrong, where to look, what happens at rollout. It also outlives the review, so it should still make sense to someone who never opens the diff.

**Density:** as brief as the change allows. Every sentence must be load-bearing. The description should feel like a relief to read, not a second spec.

**Plain language:** write so a tired reviewer cannot misread it.

- One idea per sentence. Keep sentences short.
- Active voice. Name who does the thing.
- One word per meaning. Use the same term for the same thing; pick the plainer word when two words mean the same.
- If a clause is only there to sound careful, cut it.

## When to Use

Opening or revising a pull request or merge request; filling a repo template; no template and you need to infer what helps from recent PRs; asked to create or improve `PULL_REQUEST_TEMPLATE.md`.

**Skip when:** the user asked only for a commit message — use writing-commits.

## Inspect First

Do this before writing a word:

1. **The change.** Branch, merge base, and the real diff — not memory of the conversation.
2. **The commits.** `git log <base>..HEAD`. Recover why, and any approach you dropped. The description is the net change versus the base, not a timeline of the branch.
3. **A template.** Look for `.github/PULL_REQUEST_TEMPLATE.md`, `.github/PULL_REQUEST_TEMPLATE/*.md`, `PULL_REQUEST_TEMPLATE.md`, `.gitlab/merge_request_templates/`. Template sections win.
4. **No template.** Sample 5–8 recently merged PRs (`gh pr list --state merged --limit 8` then `gh pr view`; or `glab`). Keep the patterns that actually help a reviewer. Drop file lists, library primers, and repeated CI recap. Write *this* description to that shape.

Do not invent a house style from first principles when history is one command away.

## The Recipe

Cover these four. They are a **checklist, not a schema**. A repo template usually has more sections; those still get filled in.

**1. Orientation — 1–3 sentences.** What the change makes possible or fixes, and why it exists. Enough that someone who never reads the diff understands the point.

**2. Review guidance.** What reviewers need and descriptions almost always omit:

- **Risk:** what could go wrong, and what bounds it
- **Decisions:** choices the ticket did not dictate
- **Uncertainty:** what you could not verify — *after* resolving whatever was cheap to check
- **Scope:** anything beyond the ticket, offered for cutting
- **Where to look hardest**, and why

If nothing here is genuinely contentious, say so in a line. Do not manufacture controversy, and do not invent alternatives you never weighed.

**3. Verification.** What a human should do to believe it works. Follow the template; absent any, prefer steps a reviewer can perform over restating check results the review UI already shows.

**4. Rollout, when it applies.** Migrations, backfills, flags, config, compatibility windows, what to watch, how to undo. Skip the section when none apply.

**Visual changes:** include before/after screenshots or a screencast when the diff cannot show the effect.

**WIP:** open as a draft. Say what feedback you want, and what is not ready.

### Mapping onto a repo template

Put each item in the section that owns it. When nothing fits — an index-performance worry under a security heading — put it under the opening summary rather than inventing a heading.

Leave sections you have nothing for exactly as the template prescribes, including unchecked boxes. Deleting options you did not pick is editing the template, not filling it in.

### Common knowledge is inventory

Do not explain how a library, protocol, or language feature works if a typical engineer on this stack already knows it. JWT `exp`, Faraday middleware, TLS `VERIFY_PEER`, retry-on-reset — name the *decision or risk*, not the textbook.

"Write it for a new hire" and "be thorough" still mean this recipe. Thoroughness is pointing at what can go wrong, not teaching the stack or narrating every file.

## Open the PR

After the description exists:

1. Push *this* branch if the remote does not have it. Never force-push. Never push other branches.
2. Create with `gh pr create` or `glab mr create`, title plus body. Prefer `--body-file` or a heredoc so wrapping survives. Open as `--draft` when the work is not ready for review.
3. Do not invent URLs. Link only what you have verified opens for the reviewer.

```bash
gh pr create --title "<title>" --body-file - <<'EOF'
<description>
EOF
```

## If There Was No Template

After this PR is written, offer a `.github/PULL_REQUEST_TEMPLATE.md` distilled from the useful sampled PRs plus this recipe — short section headings a future author can fill, not an essay.

Write the file only if the user says yes. Do not sneak it into the same PR unless they ask.

## The Anti-Inventory Check

Every sentence after orientation should answer one of these:

- why a choice was made
- what can fail, and what limits it
- what needs reviewer judgment
- what evidence shows it behaves correctly
- what has to happen safely at rollout

A sentence answering none of them is inventory — cut it. **Group by concern, never file-by-file or commit-by-commit.** A "Changes:" list enumerating files is the diff with extra steps. A "First I… then I…" recap is the branch diary.

Concrete values stay when they *define* the risk or the contract — a default, a cap, an expiry. Cut the ones that merely narrate.

**Authority to pad is not a reason to pad.** "Make it complete," "educational," "for a new hire," "longer is more careful" — still cut.

## Core Pattern

Same change, both ~45 words.

**Inventory — what the reviewer is about to read anyway:**

> `ApiKey` now tracks a `key_version` (current/previous); `verifyRequest` accepts either version, and the previous key expires after a configurable window (default 72h, clamped 1–168h via `API_KEY_ROTATION_WINDOW_HOURS`). A second rotation drops the oldest key.

**Reviewer aid — where to aim:**

> Rotation gets a grace window, so integrators no longer need a coordinated cutover.
>
> The risk: a rotated key keeps working — 72h by default, 168h at the outside. That ceiling is the line worth reading closely, since without it a bad env value means "never expires". Rotating twice drops the old key early, which is how we'd handle a leak.

Both name the same numbers. The second explains which one is load-bearing.

For complete descriptions across different change shapes, see [examples.md](examples.md).

## Quick Reference

| Mistake | Instead |
|---|---|
| Listing what each file or function does | Why this approach, and what it costs |
| Narrating the commit timeline | The net change versus the base |
| Teaching the library or protocol | The decision or risk that is *not* in the docs |
| Mechanism under a security heading | What could go wrong, and what bounds it |
| The same facts in two sections | Say it once, in the section that owns it |
| Restating CI results | Steps a human can follow |
| Linking a doc for the reasoning | The sentence that mattered, inline |
| A ticket URL you assumed | The bare ticket ID, unlinked |
| Every choice presented as settled | The two you'd like challenged |
| Unrequested work, unmentioned | Name it, and offer to cut it |
| Flagging what you could have checked | Resolve the cheap ones, flag the rest |
| Long sentences, passives, synonym-hopping | One idea, active voice, one word per thing |
| Padding a template to look thorough | The template's own answer for an empty section |
| Skipping past PRs because there is no template | Sample them, then offer a template |
| Writing the description and stopping | Open the PR |

## Red Flags — Stop and Cut

- File-by-file or function-by-function narration
- "First I… then I… finally I…"
- A primer on a library the team already uses
- "Complete" meaning long
- A sentence that needs to be read twice
- Past PRs unread when no template exists
- Description written, PR not opened
- A template file added without being asked
