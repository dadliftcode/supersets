---
name: writing-commits
description: Use when running git commit, drafting or amending a commit message, writing a commit body, squashing commits, or asked to commit changes.
license: MIT
---

# Writing Git Commit Messages

## Overview

A commit message is communication with future humans — yourself in six months, `git blame`, and reviewers bisecting a regression. Source: Chris Beams, *How to Write a Git Commit Message* — https://chris.beams.io/git-commit/.

## When to Use

- About to run `git commit`, `git commit --amend`, or `git rebase -i` (reword/squash).
- Asked to draft, revise, or review a commit message.
- Producing a squash-merge title/body.

**Skip when:** the user explicitly asks for a different convention (e.g. Conventional Commits like `feat:` / `fix:`). Follow their instruction; this skill is the default, not a mandate. The Co-Authored-By footer requirement (below) still applies even when the prefix style differs.

## The Seven Rules

1. **Separate subject from body with a blank line.** Tools rely on it.
2. **Limit the subject to 50 characters.** Hard cap at 72; aim for 50. *Count it.* Do not assert "this is 50 chars" without measuring.
3. **Capitalize the subject line.** "Refactor X", not "refactor X".
4. **Do not end the subject with a period.** It's a title, not a sentence.
5. **Use the imperative mood in the subject.** Test: *"If applied, this commit will ____."* → "Add login redirect" passes; "Added login redirect" fails.
6. **Wrap the body at 72 characters.** Git does not wrap for you.
7. **Use the body to explain *what* and *why*, not *how*.** The diff already shows *how*.

## Ticket Prefix

When the change has a ticket, prefix the subject with the ticket ID in square brackets:

```
[lore-r9v] Document install options
```

The prefix counts toward the 50-character target, so keep the description tight. Omit it only when there is genuinely no ticket.

## Required Footer

Every commit ends with a co-author trailer (one blank line above it):

```
Co-Authored-By: <model name> <attribution email>
```

Fill **both** fields from your own harness instructions — not from the examples in this file:

- **`<model name>`** — the model name your harness specifies. Use *your* model identity, whatever it is; do not copy a name shown in the examples below.
- **`<attribution email>`** — the attribution address your harness specifies. Claude Code uses `noreply@anthropic.com`, OpenAI Codex uses `noreply@openai.com`; other tools use their own. If your harness defines no co-author convention, omit the footer rather than borrow another vendor's address.

Match the capitalization your harness gives — GitHub uses the trailer for attribution.

The footer is **independent** of any other style choice. Include it even when:
- The repo uses Conventional Commits or another prefix style.
- Recent commits in the log don't show a footer.
- The change is a one-line typo fix.
- The user said "just need a message" or "we're rushing."

## Committing the Message

Hand the message to git in a way that preserves your exact line breaks, blank lines, and 72-char wrapping. Reliable options:

```bash
# Heredoc — quote the delimiter so the shell leaves $, backticks,
# and quotes in your message untouched:
git commit -F - <<'EOF'
<subject>

<body wrapped at 72>

Co-Authored-By: <model name> <attribution email>
EOF

# Or write the message to a file first:
git commit -F message.txt
```

**Avoid `-m` for anything past a one-line subject.** Each `-m` is a *separate paragraph* joined by a blank line, and git never wraps the text inside one — so `-m`-per-line turns a wrapped paragraph into a stack of one-liners. A double-quoted `-m "…"` also lets the shell expand `$` and run backtick substitutions inside your message. If you must use `-m`, use one per paragraph, single-quoted, and accept no hard-wrapping.

## Worked Example

```
[lore-r9v] Document install options

Point users at go install and the GitHub Releases page now that
releases publish prebuilt archives. Homebrew is deferred until the
release pipeline has proven itself.

Co-Authored-By: <Your-Model-Name> <your-attribution-email>
```

Subject: 35 chars including the `[lore-r9v]` ticket prefix, imperative, capitalized, no period. Body: wrapped at 72, *why* not *how* (the diff shows the scope change; the message explains the regression it prevents). Footer: present — substitute your own model name and attribution email from your harness; the placeholders above are not literal values to copy.

## Common Mistakes

| Mistake | Fix |
|---|---|
| "Added X" / "Fixed Y" / "Updates Z" | Imperative: "Add X" / "Fix Y" / "Update Z" |
| Subject "feels short" but is 53 chars | Count it. 50 is a target, 72 is a hard cap. |
| Trailing period on subject | Delete it. |
| One-line message for a non-trivial change | Add a body explaining *why*. |
| Body restates the diff (*how*) | Replace with *why* — motivation, constraints, alternatives rejected. |
| Footer skipped because "the repo doesn't use them" | Footer is required regardless of repo style. |
| Footer skipped because "user just wanted a message" | Still required. |

## Red Flags — Stop and Rewrite

- Past tense slipping in ("Updated", "Refactored", "Hardened" used as past participle).
- Asserting subject length without counting characters.
- Reasoning like "this repo doesn't use footers" → footer still required.
- "It's a tiny fix, no body needed" → still add a one-line *why* if non-obvious.
- "I'll skip the footer this once" → don't.

## Quick Reference

```
<Imperative subject ≤50 chars, capitalized, no period>
<blank line>
<Body wrapped at 72 chars — what & why, not how.
 Multiple paragraphs allowed, separated by blank lines.>
<blank line>
Co-Authored-By: <model name> <attribution email>
```
