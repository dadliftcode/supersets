---
name: writing-architecture-decision-records
description: Use when documenting an architectural decision (technology choice, structural pattern, auth/data approach, deployment topology), when revisiting or superseding an Accepted ADR, when creating files in docs/adr or doc/adr, or when asked to write an ADR for a decision whose architectural significance is unclear. Also covers ADRs, decision records, design records.
license: MIT
---

# Writing Architecture Decision Records

## Overview

An ADR is a one-page record of **one** architectural decision: the forces that demanded a choice, the choice itself, the alternatives that lost, and the trade-offs the team now lives with. It exists so future engineers can answer "why is it like this?" without an archaeology dig.

**Core principle:** the act of writing the ADR clarifies the decision. If it doesn't clarify, it isn't earning its keep — and a ceremonial or work-planning ADR pollutes the directory and trains readers to skim past the real ones.

**Stylistic frame:** Michael Nygard recommends writing each ADR as **"a conversation with a future developer."** That audience-orientation drives every other rule below — full sentences, active voice, value-neutral context, honest consequences.

References: Martin Fowler, [Architecture Decision Record](https://martinfowler.com/bliki/ArchitectureDecisionRecord.html); Michael Nygard, [Documenting Architecture Decisions](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions) (the canonical primary source; Fowler: "better than pretty much everything else written on the topic"); endorsed exemplars: [npryce/adr-tools/doc/adr](https://github.com/npryce/adr-tools/tree/master/doc/adr).

## When a Decision Is ADR-Worthy

ALL must be true:

- A real choice between **viable alternatives** existed
- The decision is **hard or expensive to reverse** later
- A future engineer will need rationale that **the code does not show**
- It is **architecturally significant in Nygard's sense:** affects the **structure, non-functional characteristics, dependencies, interfaces, or construction techniques** of the system

**Examples:** database engine, framework, adapter/registry pattern vs branching, auth approach, queue system, sync vs eventual consistency, encryption scope, primary-key strategy, public API shape.

## When NOT to Write One — Push Back

If asked to write an ADR for any of these, decline:

- A choice already mandated by an existing ADR, policy, or upstream tooling default
- Code style, naming, formatting, linting, or pure refactor
- Anything reversible in an afternoon by one engineer
- A description of what the code already shows
- **A decision about how to slice or sequence work** — that's a planning artifact, not architecture
- **A standard design principle being applied** ("we'll separate concerns", "we'll use composition over inheritance") — captured by your team's coding standards, not an ADR

Phrase: *"This isn't an architectural decision — it's [enforced by tool / a standard practice / a work-planning call]. An ADR would be ceremonial; a one-line note in CONTRIBUTING.md, the PR description, or the issue tracker is the right home."* Wait for confirmation before proceeding.

## Discover Project Conventions First

1. Find `docs/adr/` or `doc/adr/`. If none exists, ask before creating a directory.
2. Read `template.md` if present — section names, status enum, link format. Match exactly.
3. Open the **two most recent ADRs**. Match their tone, depth, and length.
4. Use the next sequential number. Don't backfill gaps unless the user asks.
5. If the status enum includes `Superseded by [ADR-NNN]`, the project enforces the immutability rule below.
6. **Date.** If the template lacks a `Date:` line, add one anyway (`Date: YYYY-MM-DD`). Joel Henderson, Rowse & Shepherd, and the canonical adr-tools exemplars all include it; Nygard's original implies it via numbering. A date defends against confusion when an ADR is read decades later.

## The Four Rules

### 1. One decision per ADR

"While we're at it" is a smell. Split related-but-separate decisions into separate ADRs. Bundling hides each decision's alternatives and makes the supersede chain unreadable.

### 2. Decision ≠ implementation plan AND Decision ≠ work schedule

The Decision section captures **what is now true** about the system. It does not enumerate gem additions, config edits, migration scripts, or which PR ships what. Implementation belongs in the PR description; sequencing belongs in the issue tracker.

**Voice:** Nygard prescribes **full sentences, active voice, "We will…" form.** *"We will use PostgreSQL as the primary database"* — not *"PostgreSQL is the primary database."* The team is making a choice; the prose should show that. Third-person factual is grammatically clean but loses the team-as-agent framing and reads as describing a state of nature rather than recording a decision.

❌ **Bad — implementation plan masquerading as decision:**
> - Add `sidekiq` to the Gemfile
> - Set `config.active_job.queue_adapter = :sidekiq`
> - Add a `redis` Kamal accessory
> - Mount `Sidekiq::Web` at `/sidekiq` behind admin auth

❌ **Bad — work schedule masquerading as decision:**
> - The omniauth gems, initializer, callback controller, and token columns all ship together with the connect-account UI — currently tracked under issue `gnk.5`.

❌ **Weaker — third-person factual, no agent:**
> Sidekiq, backed by Redis, is the ActiveJob queue adapter for all environments above `test`.

✅ **Best — Nygard's prescribed form:**
> We will use Sidekiq, backed by Redis, as the ActiveJob queue adapter in all environments above `test`. Recurring jobs will use `sidekiq-cron`.

### 3. Single page — match the project's existing length, lead with the surprising

Inverted pyramid: most important first. Harmel-Law sharpens this — *"prioritise things in your writing which people would find non-intuitive or surprising."* Boilerplate context first and surprising fact last is the wrong order; lead with the fact a future reader would not predict.

Aim for the length of recent ADRs in the project. Nygard's own exemplars (the adr-tools repo) run **60–100 words**; most projects run 200–400. Crossing 500 means you are restating implementation, bundling decisions, padding context, or smuggling work-planning into the document. Cut.

### 4. Never edit an Accepted ADR; supersede it

When circumstances change, write a new ADR. In the old one, change **only** the `Status` line to `Superseded by [ADR-NNN](NNNN-title.md)`. Leave the body intact — it is a historical record, not a wiki page. The new ADR's Context explicitly cites what changed since the old decision.

## Section-by-Section

**Context — forces in tension, value-neutral language.** Name the constraints, conflicts, and pressures that demanded a choice. Not the feature being built, not the refactor that motivated the cleanup. Nygard: *"The language in this section is value-neutral."* Describe forces, don't editorialize — the Decision section is where opinion enters; the Context just sets the stage. A reader should be able to roughly predict the decision because the forces narrow the option space. Avoid ephemeral references (issue IDs, sprint names, PR numbers) — they go stale.

**Decision — the choice, in active voice.** One paragraph in full sentences, "We will…" form (see Rule 2). What is now true about the system. Nothing about gems added, files edited, or which PR realizes which part. Default to prose. Bullets are acceptable for visual rhythm when items are genuinely parallel — but Nygard is firm: *"Bullets are acceptable only for visual style, not as an excuse for writing sentence fragments."*

**Alternatives Considered — the road not taken, including dissents.** For each real alternative: one sentence naming it, one trade-off, why it lost. Skip strawmen. **If the project's template lacks this section, add it anyway as an H2** — templates specify minimums, not maximums. If you are going against received advice or a previous ADR's pattern, **state how and why explicitly** (Harmel-Law) — future readers benefit most from understanding the dissents. An ADR without alternatives hides the option space and is the most common Fowler violation in the wild.

**Consequences — all of them, Easier and Harder.** Nygard: *"All consequences should be listed here, not just the 'positive' ones."* Both halves are required. If you only see "Easier", you have not found the cost yet. Honest "Harder" consequences make the ADR trustworthy and pre-warn future engineers. Architectural consequences only — not "this PR is now smaller."

## Status Lifecycle

- **Proposed** — written but not realized. Open a PR with the ADR + the code that realizes it.
- **Accepted** — flip Proposed → Accepted **in the same PR** that lands the realising code. An Accepted ADR matches reality.
- **Superseded by [ADR-NNN]** — the only edit ever permitted to the body of an Accepted ADR is updating its Status line to this. The new ADR's Context cites what changed.
- **Deprecated** — decision no longer applies, no successor (rare). Note why in a footer line.

## Quality Checklist (run before saving)

- [ ] One decision, not two
- [ ] Date line present (`Date: YYYY-MM-DD`)
- [ ] Context language is value-neutral — names forces, doesn't editorialize
- [ ] Context leads with the surprising, not boilerplate
- [ ] Decision is in active voice, "We will…" form, full sentences (not fragments masquerading as bullets)
- [ ] Decision is the architectural choice, not a change set or work plan
- [ ] Alternatives Considered section exists with real options + why each lost; dissents are explicit
- [ ] Consequences include both Easier **and** Harder, both architectural (not project management)
- [ ] No ephemeral references (issue IDs, PR numbers, sprint names)
- [ ] Total length matches the project's existing ADRs (typically <500 words; Nygard exemplars run 60–100)
- [ ] Status, numbering, and link format match `template.md`
- [ ] If superseding: old ADR's Status updated, body untouched; new ADR's Context cites what changed

## Red Flags — STOP

| Symptom | What it means | Fix |
|---------|---------------|-----|
| Decision section is a list of file changes | You're writing an implementation plan | Move to PR description; restate as architectural choice |
| Decision references "ships in PR N", "tracked under issue X" | You're documenting a work plan | Remove sequencing; durable record only |
| Issue IDs, PR numbers, sprint names in the body | Ephemeral references will go stale | Strip them; refer only to other ADRs |
| Decision is in third-person factual ("X is now Y") | You're describing a state of nature, not a choice | Rewrite as "We will…" |
| Bullets in Decision are sentence fragments | Nygard: bullets aren't an excuse to skip writing | Convert to full sentences or merge into prose |
| Context paragraph editorializes ("modest fan-out", "obvious bottleneck") | Value-laden context smuggles the conclusion in early | Rewrite neutrally; let Decision make the call |
| Boring context first, surprising fact buried | Inverted-pyramid violation | Lead with what would surprise a future reader |
| No `Date:` line | Missing canonical metadata; ambiguous when read in 5 years | Add `Date: YYYY-MM-DD` |
| ADR is >500 words | Padding, bundling, or restating impl | Cut |
| No alternatives listed but real ones existed | You hid the option space | Add Alternatives Considered |
| About to edit an Accepted ADR's body | Immutability violation | Stop. Supersede instead |
| "But the user asked me to write this" for a non-decision | Ceremonial trap | Push back |
| "While we're at it" or "we are also moving X" | Bundling | Split into separate ADRs |
| Easier consequences only | Not yet honest about cost | Find the Harder half before saving |
| Consequences mention review velocity / PR size | Project-management masquerade | Remove; architectural consequences only |

## Common Rationalizations

| Excuse | Reality |
|--------|---------|
| "User asked, so I document" | An ADR for a non-decision documents nothing and dilutes the directory. Push back. |
| "Listing every config change makes the ADR concrete" | The git diff is concrete. The ADR records the choice. |
| "Easier to put related changes in one ADR" | Easier to write, harder to read in two years. Split. |
| "I'll add a paragraph to the existing ADR" | Editing accepted ADRs erases history. Supersede. |
| "Alternatives are obvious" | Obvious to you today. Not to a new engineer in three years. |
| "The template doesn't have an Alternatives section" | Add one. Templates specify minimums. |
| "The decision included a PR plan, that's how it was made" | Architecture and planning happened together; only the architecture goes in the ADR. |
| "The issue ID gives traceability" | It gives stale traceability. Reference only other ADRs in the body. |
| "Third-person factual sounds more objective than 'We will…'" | Nygard's prescription is active voice precisely because the team is making a choice. Factual prose hides the agency. |
| "Bullets are more scannable than prose" | Nygard: bullets that are sentence fragments are bullets-instead-of-thinking. Use prose; reserve bullets for genuinely parallel items. |
| "The Context should explain why this matters to the project" | Context names forces neutrally. Don't editorialize — that's Decision's job. |

## Worked Example — Strong ADR

A complete, properly-bounded ADR following all rules above:

> # ADR-007: PostgreSQL as primary database
>
> Date: 2024-11-04
>
> ## Status
> Accepted (supersedes [ADR-003](0003-sqlite-primary-database.md))
>
> ## Context
> SQLite's single-writer model now serializes calendar-sync workers, producing `SQLITE_BUSY` errors under the fan-out the new adapter design produces. Two further forces have appeared since ADR-003: the product surface now requires full-text search across event content and `LISTEN/NOTIFY` for low-latency Turbo broadcasts, neither of which SQLite supports natively. The "no external service" constraint that originally favored SQLite no longer holds — we already operate a separate cache service in production.
>
> ## Decision
> We will use PostgreSQL as the primary application database in development, test, and production. We will implement full-text search with `tsvector` columns and GIN indexes, and live broadcasts with `LISTEN/NOTIFY`.
>
> ## Alternatives Considered
> - **Stay on SQLite, extract search to Meilisearch.** Rejected: introduces a second store to keep in sync, and does not solve the write-concurrency problem at all.
> - **MariaDB or MySQL.** Comparable on writes, but weaker on full-text and lacking a `LISTEN/NOTIFY` equivalent. We have no existing MySQL operational experience to amortize the switch against.
> - **DynamoDB single-table.** Over-rotates for the workload and forfeits Rails ergonomics.
>
> ## Consequences
> Concurrent writes will scale with the connection pool rather than serializing on a single writer. Full-text search and `jsonb` become available without a second datastore, and standard streaming-replication tooling becomes available when needed.
>
> One more service must be operated and monitored; baseline RAM rises by roughly 150–250 MB. The one-time data migration from SQLite must be rehearsed against a production snapshot before cutover. Test assumptions that quietly relied on SQLite semantics (case-insensitive `LIKE`, lax type affinity) must be flushed out.

~240 words. Has a Date line. Context leads with the surprising fact (`SQLITE_BUSY` errors), uses neutral language. Decision is in active voice, "We will…" form, prose not fragment-bullets. Alternatives explicit with why each lost. Consequences as prose, both halves present, all architectural.

### Minimal form — Nygard's own exemplar

The canonical [adr-tools ADR-001](https://github.com/npryce/adr-tools/blob/master/doc/adr/0001-record-architecture-decisions.md), written by the tool's author:

> # 1. Record architecture decisions
>
> Date: 2016-02-12
>
> ## Status
> Accepted
>
> ## Context
> We need to record the architectural decisions made on this project.
>
> ## Decision
> We will use Architecture Decision Records, as described by Michael Nygard in this article: http://thinkrelevance.com/blog/2011/11/15/documenting-architecture-decisions
>
> ## Consequences
> See Michael Nygard's article, linked above.

**~50 words.** Date line. Active-voice "We will…". No padding. Fowler endorses these as "a good example of the form." Match your project's conventional length, but don't add words just to look thorough.

## Anti-Example — What NOT to Do

A subtle failure: looks like an ADR but is actually a PR-sequencing rationale.

> # ADR-NNN: Auth flow is in a separate PR from the API client
>
> ## Decision
> - The API client takes an already-credentialed source.
> - The auth gems, initializer, callback controller, and token columns ship together with the connect-account UI — currently tracked under issue `proj.5`.
> - Two PRs ship before the feature reaches users: scaffolding (this one, `proj.1`) → auth flow (`proj.5`) → real client (`proj.1.next`).
>
> ## Consequences
> **Easier:** Each PR is small and reviewable.
> **Harder:** Two PRs ship before any real event reaches the display. Acceptable trade for reviewability.

**Why this fails:**

1. The "decision" is *how to slice work across PRs*, not how to shape the system.
2. References ephemeral issue IDs (`proj.1`, `proj.5`, `proj.1.next`) that go stale.
3. Consequences are about review velocity, not architecture.
4. No alternatives section.
5. The actual architectural insight ("client takes credentials at construction; doesn't run the auth handshake") would be one line in a different ADR — or, more likely, just a class-level comment, since "separate the auth flow from the API client" is a standard design principle, not an architectural choice unique to this system.

**The fix:** delete this ADR. Put the PR sequencing in the epic issue. Put the design principle in a class-level comment. Write an ADR only if there's a real architectural choice with viable alternatives — e.g., *"Where do refreshed access tokens live: in the client, in a broker service, or in the credential row?"* — and then write *that* ADR.
