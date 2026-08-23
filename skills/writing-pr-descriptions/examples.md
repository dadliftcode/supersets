# Worked PR Descriptions

Four complete descriptions across different change shapes. Read the one closest to what you're opening.

## Contents

- **Small bug fix** — how short a description is allowed to be
- **Migration and backfill** — carrying the rollout section
- **Pure refactor** — saying "nothing here is contentious" without padding
- **Dependency upgrade with a breaking change** — compatibility and blast radius

Each assumes a repo template with Summary / Type of Change / Security Considerations / Test Plan. Adapt to whatever template you're given.

---

## Small bug fix

Most changes are this size. Resist inflating them.

> # BUG-4412
>
> Timestamps on exported reports were rendering in the server's timezone instead of the viewer's, so anyone outside UTC saw rows dated a day off near midnight.
>
> ## Type of Change
> - [x] Bug Fix
>
> ## Security Considerations
> N/A
>
> ## Test Plan
> - [ ] Set your profile timezone to UTC-8, export a report containing a row created at 23:30 UTC, confirm the row shows the previous local date
> - [ ] Confirm a viewer in UTC still sees the original date

No risk section, no rollout, no "where to look". Nothing was contentious, so nothing is claimed to be.

---

## Migration and backfill

The rollout section earns its place here.

> # DATA-880
>
> Splits `users.full_name` into `given_name` and `surname` so we stop guessing at name order for non-Western names in correspondence.
>
> The backfill splits on the first space, which is wrong for a minority of existing rows — mononyms land in `given_name` with `surname` empty, and multi-word surnames get truncated into the given name. That's deliberate: there is no correct automated split, and the alternative is leaving the column null and forcing every read path to handle both shapes. Users can correct their own record in settings.
>
> ## Type of Change
> - [x] Refactor
>
> ## Security Considerations
> N/A — no change to who can read or write these fields.
>
> ## Rollout
> `0091_split_name.sql` adds both columns nullable and backfills in batches of 5,000; expect ~40 minutes on prod. The app reads `full_name` until the follow-up PR flips it, so this deploys safely on its own and is revertible by dropping the two columns. Watch for write paths that set `full_name` directly — I believe I caught them all, but that's the thing most likely to be wrong here.
>
> ## Test Plan
> - [ ] Run the migration against a prod-shaped dump; confirm row count is unchanged and no row has both new columns empty
> - [ ] Confirm a mononym row ("Prince") lands in `given_name` with `surname` empty rather than erroring
> - [ ] Update a name in settings and confirm both columns change together

Note the risk is stated as a *deliberate tradeoff with its alternative*, not hidden.

---

## Pure refactor

The temptation is to narrate the restructuring. Don't.

> # PLAT-3301
>
> Extracts the retry logic duplicated across the three queue consumers into one wrapper. No behavior change intended — same backoff curve, same jitter, same give-up threshold.
>
> The one thing worth checking: the old `email` consumer used 4 retries where the other two used 3. I standardized on 3. That's a real behavior change for email, and if 4 was deliberate rather than drift, this is wrong and I should special-case it.
>
> ## Type of Change
> - [x] Refactor
>
> ## Security Considerations
> N/A
>
> ## Test Plan
> - [ ] Force a transient failure in each of the three consumers and confirm the retry timing matches the previous behavior
> - [ ] Confirm a permanently failing job still lands in the dead-letter queue rather than looping

A refactor description is mostly one line — plus the one place it isn't actually a refactor.

---

## Dependency upgrade with a breaking change

Blast radius is the whole story. Do not teach the library.

> # SEC-1207
>
> Upgrades the HTTP client from 2.x to 4.x to pick up the fix for the request-smuggling advisory. 3.x was skipped; it's already unsupported.
>
> 4.x drops implicit retries on connection reset — 2.x retried these silently, so anything relying on that now surfaces the error. I found four call sites and made retries explicit; the risk is a fifth I missed, which would show up as a new intermittent error rather than a test failure. The integration clients are the place to look hardest.
>
> ## Type of Change
> - [x] Maintenance
>
> ## Security Considerations
> Closes the advisory. The library's TLS verification defaults are unchanged between 2.x and 4.x — I checked, because that would be the easy thing for an upgrade like this to silently loosen.
>
> ## Rollout
> No migration or flag. Revert is a straight dependency pin back to 2.x; nothing persists in a 4.x-only format. Worth watching connection-reset error rates for a day after deploy.
>
> ## Test Plan
> - [ ] Point a client at an endpoint that resets the connection mid-response; confirm the error surfaces rather than hanging
> - [ ] Confirm an ordinary request against each integration still succeeds
