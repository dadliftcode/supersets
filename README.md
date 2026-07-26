# Supersets

Battle-tested agent skills for strong software engineering.

## Included skills

- [`writing-architecture-decision-records`](skills/writing-architecture-decision-records/SKILL.md) decides whether an architectural choice warrants an ADR, writes it, and preserves history when an accepted decision is superseded.
- [`writing-commits`](skills/writing-commits/SKILL.md) writes clear Git commit messages for future readers.

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

## Development

Supersets is a source-only plugin, so there is no build step. Validate the
source directly:

```bash
ruby -rjson -e 'ARGV.each { |file| JSON.parse(File.read(file)) }' \
  .codex-plugin/plugin.json \
  .claude-plugin/plugin.json \
  .agents/plugins/marketplace.json \
  .claude-plugin/marketplace.json

claude plugin validate . --strict

python3 "${CODEX_HOME:-$HOME/.codex}/skills/.system/plugin-creator/scripts/validate_plugin.py" .
```

## Releases

Supersets follows [Semantic Versioning](https://semver.org/). The release
version appears in both plugin manifests and must match; marketplace entries
do not duplicate it.

For each release, update both manifests in the same commit, run the validation
commands above, tag that commit as `vX.Y.Z`, and publish matching GitHub release
notes. The repository tree is the release artifact; do not generate or commit
a separate build.

## License

Supersets is available under the [MIT License](LICENSE).
