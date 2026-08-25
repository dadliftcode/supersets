# Supersets

Battle-tested agent skills for strong software engineering.

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="assets/supersets-logo-dark.png">
    <source media="(prefers-color-scheme: light)" srcset="assets/supersets-logo-light.png">
    <img
      alt="A coding robot bench-pressing a barbell above the Supersets wordmark"
      src="assets/supersets-logo-light.png"
      width="520"
    >
  </picture>
</p>

## Included skills

- [`cross-agent-dialogue`](skills/cross-agent-dialogue/SKILL.md) verifies and answers another agent's review feedback, or works through a design or debugging problem together, through auditable file-based turns.
- [`writing-architecture-decision-records`](skills/writing-architecture-decision-records/SKILL.md) decides whether an architectural choice warrants an ADR, writes it, and preserves history when an accepted decision is superseded.
- [`writing-commits`](skills/writing-commits/SKILL.md) writes clear Git commit messages for future readers.
- [`writing-pr-descriptions`](skills/writing-pr-descriptions/SKILL.md) writes reviewer-aid pull request descriptions and opens the PR.

## Install

### Codex

```bash
codex plugin marketplace add dadliftcode/supersets
codex plugin add supersets@dadliftcode
```

### Claude Code

```bash
claude plugin marketplace add dadliftcode/supersets
claude plugin install supersets@dadliftcode
```

### OpenCode

Add the plugin to `opencode.json` (global or project):

```json
{
  "plugin": ["supersets@git+https://github.com/dadliftcode/supersets.git"]
}
```

Quit and restart OpenCode. Config is not hot-reloaded.

## Development

Supersets is a source-only plugin, so there is no build step. Validate the
source directly:

```bash
ruby -rjson -e 'ARGV.each { |file| JSON.parse(File.read(file)) }' \
  .codex-plugin/plugin.json \
  .claude-plugin/plugin.json \
  .agents/plugins/marketplace.json \
  .claude-plugin/marketplace.json \
  package.json

ruby -rjson -e 'versions = ARGV.map { |file| JSON.parse(File.read(file)).fetch("version") }; abort "version mismatch: #{versions.join(" != ")}" unless versions.uniq.one?' \
  .codex-plugin/plugin.json \
  .claude-plugin/plugin.json \
  package.json

claude plugin validate . --strict

python3 "${CODEX_HOME:-$HOME/.codex}/skills/.system/plugin-creator/scripts/validate_plugin.py" .

node --test tests/opencode-plugin.test.mjs
```

Before tagging a release, smoke-test the checkout through both real hosts
and OpenCode:

1. Add this checkout as a local marketplace and install
   `supersets@dadliftcode` in Codex and Claude Code.
2. Point a user/global `plugin` entry at this checkout in OpenCode
   (`supersets@git+file://$PWD` or
   `file://$PWD/.opencode/plugins/supersets.js`). Do not commit
   `opencode.json`.
3. Start a fresh session in each host and confirm all included skills are
   discoverable.
4. In Codex and Claude Code, exercise the commit-writing skill on staged
   changes. Exercise the ADR skill on a consequential choice, a choice that
   does not warrant an ADR, and an accepted ADR that must be superseded
   without erasing history. Exercise the PR-description skill on a branch
   that is ready to open: with a repo template, and in a repo that has none
   (sample recent PRs, write this description, offer a template, do not
   write the template file unless asked).

## Releases

Supersets follows [Semantic Versioning](https://semver.org/). The release
version appears in both plugin manifests and `package.json` and must match;
marketplace entries do not duplicate it.

For each release, update both manifests and `package.json` in the same
commit, run the validation commands above, tag that commit as `vX.Y.Z`,
and publish matching GitHub release notes. The repository tree is the
release artifact; do not generate or commit a separate build.

## License

Supersets is available under the [MIT License](LICENSE).
