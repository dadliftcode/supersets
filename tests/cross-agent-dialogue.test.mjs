import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawn, spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const newTurn = path.join(
  repoRoot,
  'skills/cross-agent-dialogue/scripts/new_turn.sh',
)
const watchForReply = path.join(
  repoRoot,
  'skills/cross-agent-dialogue/scripts/watch_for_reply.sh',
)
const openAiMetadata = path.join(
  repoRoot,
  'skills/cross-agent-dialogue/agents/openai.yaml',
)

function chatDirectory(t) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'cross-agent-dialogue-'))
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }))
  return directory
}

function writeBody(directory, name, content) {
  const body = path.join(directory, name)
  fs.writeFileSync(body, content)
  return body
}

function runTurn(args, options = {}) {
  return spawnSync(newTurn, args, {
    cwd: repoRoot,
    encoding: 'utf8',
    ...options,
  })
}

function initialArgs(directory, body, overrides = {}) {
  const values = {
    thread: 'supersets-atomic-turns',
    author: 'codex-review-825',
    kind: 'ask',
    title: 'Review atomic publication',
    ...overrides,
  }

  return [
    '--dir', directory,
    '--thread', values.thread,
    '--author', values.author,
    '--kind', values.kind,
    '--initial',
    '--title', values.title,
    '--body-file', body,
  ]
}

function markdownFiles(directory) {
  return fs.readdirSync(directory).filter((name) => name.endsWith('.md'))
}

function waitForDirectoryEntry(directory, child, timeoutMs = 2000) {
  return new Promise((resolve, reject) => {
    const deadline = Date.now() + timeoutMs
    const check = () => {
      const entries = fs.readdirSync(directory)
      if (entries.length > 0 || child.exitCode !== null) {
        resolve(entries)
      } else if (Date.now() >= deadline) {
        reject(new Error('turn process produced no observable state'))
      } else {
        setTimeout(check, 10)
      }
    }
    check()
  })
}

function waitForExit(child, timeoutMs = 3000) {
  return new Promise((resolve, reject) => {
    if (child.exitCode !== null) {
      resolve(child.exitCode)
      return
    }
    const timeout = setTimeout(() => {
      reject(new Error('child process did not exit'))
    }, timeoutMs)
    child.once('close', (code) => {
      clearTimeout(timeout)
      resolve(code)
    })
  })
}

function waitForOutput(child, readOutput, pattern, timeoutMs = 2000) {
  return new Promise((resolve, reject) => {
    const deadline = Date.now() + timeoutMs
    const check = () => {
      const output = readOutput()
      if (pattern.test(output)) {
        resolve(output)
      } else if (child.exitCode !== null) {
        reject(new Error(`child exited before matching ${pattern}: ${output}`))
      } else if (Date.now() >= deadline) {
        reject(new Error(`child produced no output matching ${pattern}: ${output}`))
      } else {
        setTimeout(check, 10)
      }
    }
    check()
  })
}

test('keeps the Codex short description within its schema bounds', () => {
  const metadata = fs.readFileSync(openAiMetadata, 'utf8')
  const match = metadata.match(/^  short_description: "([^"]+)"$/m)

  assert.ok(match, 'missing quoted interface.short_description')
  assert.ok(
    match[1].length >= 25 && match[1].length <= 64,
    `short_description must be 25-64 characters; got ${match[1].length}`,
  )
})

test('requires a complete body before publishing a turn', (t) => {
  const directory = chatDirectory(t)
  const result = runTurn(initialArgs(directory, '').slice(0, -2))

  assert.notEqual(result.status, 0)
  assert.match(result.stderr, /--body-file is required/)
  assert.deepEqual(markdownFiles(directory), [])
})

test('publishes frontmatter, protocol, and supplied body together', (t) => {
  const directory = chatDirectory(t)
  const body = writeBody(
    directory,
    'body.txt',
    'verified: app/search.rb:12 — the query is bounded.\n\nWhat would change my mind: a wider query plan.\n',
  )

  const result = runTurn(initialArgs(directory, body))

  assert.equal(result.status, 0, result.stderr)
  const filename = path.basename(result.stdout.trim())
  assert.deepEqual(markdownFiles(directory), [filename])
  assert.equal(
    fs.readFileSync(path.join(directory, filename), 'utf8'),
    `---
from: codex-review-825
turn_kind: ask
thread_slug: supersets-atomic-turns
---
# Review atomic publication

Reply with a new timestamped file in this directory whose \`responding_to\`
frontmatter names \`${filename}\`.

verified: app/search.rb:12 — the query is bounded.

What would change my mind: a wider query plan.
`,
  )
  assert.equal(
    fs.statSync(path.join(directory, filename)).mode & 0o777,
    0o666 & ~process.umask(),
  )
})

test('does not publish while a stdin body remains open', async (t) => {
  const directory = chatDirectory(t)
  const child = spawn(newTurn, initialArgs(directory, '-'), {
    cwd: repoRoot,
    stdio: ['pipe', 'pipe', 'pipe'],
  })
  let stdout = ''
  let stderr = ''
  child.stdout.setEncoding('utf8')
  child.stderr.setEncoding('utf8')
  child.stdin.on('error', () => {})
  child.stdout.on('data', (chunk) => { stdout += chunk })
  child.stderr.on('data', (chunk) => { stderr += chunk })

  child.stdin.write('Question and verified evidence.\n')
  const entriesWhileOpen = await waitForDirectoryEntry(directory, child)

  assert.equal(child.exitCode, null, stderr)
  assert.deepEqual(entriesWhileOpen.filter((name) => name.endsWith('.md')), [])

  child.stdin.end('\nWhat would change my mind: contradictory evidence.\n')
  const exitCode = await waitForExit(child)

  assert.equal(exitCode, 0, stderr)
  const filename = path.basename(stdout.trim())
  assert.deepEqual(fs.readdirSync(directory), [filename])
  assert.match(
    fs.readFileSync(path.join(directory, filename), 'utf8'),
    /Question and verified evidence\.[\s\S]*contradictory evidence\./,
  )
})

test('refuses to overwrite a turn with the same filename', (t) => {
  const directory = chatDirectory(t)
  const bin = path.join(directory, 'bin')
  fs.mkdirSync(bin)
  const fakeDate = path.join(bin, 'date')
  fs.writeFileSync(fakeDate, '#!/usr/bin/env bash\nprintf "2026-08-25-120000\\n"\n')
  fs.chmodSync(fakeDate, 0o755)
  const firstBody = writeBody(directory, 'first.txt', 'First complete body.\n')
  const secondBody = writeBody(directory, 'second.txt', 'Second complete body.\n')
  const env = { ...process.env, PATH: `${bin}:${process.env.PATH}` }

  const first = runTurn(initialArgs(directory, firstBody), { env })
  const second = runTurn(initialArgs(directory, secondBody), { env })

  assert.equal(first.status, 0, first.stderr)
  assert.notEqual(second.status, 0)
  assert.match(second.stderr, /already exists/)
  const content = fs.readFileSync(first.stdout.trim(), 'utf8')
  assert.match(content, /First complete body\./)
  assert.doesNotMatch(content, /Second complete body\./)
})

test('rejects a response to a different thread', (t) => {
  const directory = chatDirectory(t)
  const initialBody = writeBody(directory, 'initial.txt', 'Initial question.\n')
  const responseBody = writeBody(directory, 'response.txt', 'Response.\n')
  const initial = runTurn(initialArgs(directory, initialBody))
  assert.equal(initial.status, 0, initial.stderr)

  const response = runTurn([
    '--dir', directory,
    '--thread', 'other-project-topic',
    '--author', 'claude-review-442',
    '--kind', 'answer',
    '--responding-to', initial.stdout.trim(),
    '--title', 'Cross-thread response',
    '--body-file', responseBody,
  ])

  assert.notEqual(response.status, 0)
  assert.match(response.stderr, /thread_slug does not match --thread/)
})

test('rejects a referenced turn with a noncanonical filename', (t) => {
  const directory = chatDirectory(t)
  const reference = writeBody(
    directory,
    'not-a-turn\ninjected: true.md',
    `---
from: claude-review-442
turn_kind: answer
thread_slug: supersets-atomic-turns
---
# Malicious filename
`,
  )
  const body = writeBody(directory, 'response.txt', 'Response.\n')

  const response = runTurn([
    '--dir', directory,
    '--thread', 'supersets-atomic-turns',
    '--author', 'codex-review-825',
    '--kind', 'answer',
    '--responding-to', reference,
    '--title', 'Reject unsafe reference filename',
    '--body-file', body,
  ])

  assert.notEqual(response.status, 0)
  assert.match(response.stderr, /not a canonical timestamped turn filename/)
  assert.deepEqual(markdownFiles(directory), [path.basename(reference)])
})

test('rejects a symlinked turn reference', (t) => {
  const root = chatDirectory(t)
  const directory = path.join(root, 'drop-box')
  fs.mkdirSync(directory)
  const target = writeBody(
    root,
    '2026-08-25-120000-supersets-atomic-turns-claude-review-442.md',
    `---
from: claude-review-442
turn_kind: answer
thread_slug: supersets-atomic-turns
---
# Outside the drop-box
`,
  )
  const reference = path.join(directory, path.basename(target))
  fs.symlinkSync(target, reference)
  const body = writeBody(root, 'response.txt', 'Response.\n')

  const response = runTurn([
    '--dir', directory,
    '--thread', 'supersets-atomic-turns',
    '--author', 'codex-review-825',
    '--kind', 'answer',
    '--responding-to', reference,
    '--title', 'Reject symlinked reference',
    '--body-file', body,
  ])

  assert.notEqual(response.status, 0)
  assert.match(response.stderr, /referenced turn must not be a symlink/)
  assert.deepEqual(markdownFiles(directory), [path.basename(reference)])
})

test('rejects a response to a turn with no author identity', (t) => {
  const directory = chatDirectory(t)
  const reference = writeBody(
    directory,
    '2026-08-25-120000-supersets-atomic-turns-claude-review-442.md',
    `---
turn_kind: answer
thread_slug: supersets-atomic-turns
---
# Missing author
`,
  )
  const body = writeBody(directory, 'response.txt', 'Response.\n')

  const response = runTurn([
    '--dir', directory,
    '--thread', 'supersets-atomic-turns',
    '--author', 'codex-review-825',
    '--kind', 'answer',
    '--responding-to', reference,
    '--title', 'Reject missing response author',
    '--body-file', body,
  ])

  assert.notEqual(response.status, 0)
  assert.match(response.stderr, /invalid or missing from identity/)
  assert.deepEqual(markdownFiles(directory), [path.basename(reference)])
})

test('rejects a response to a turn with an empty author identity', (t) => {
  const directory = chatDirectory(t)
  const reference = writeBody(
    directory,
    '2026-08-25-120000-supersets-atomic-turns-claude-review-442.md',
    `---
from:
turn_kind: answer
thread_slug: supersets-atomic-turns
---
# Empty author
`,
  )
  const body = writeBody(directory, 'response.txt', 'Response.\n')

  const response = runTurn([
    '--dir', directory,
    '--thread', 'supersets-atomic-turns',
    '--author', 'codex-review-825',
    '--kind', 'answer',
    '--responding-to', reference,
    '--title', 'Reject empty response author',
    '--body-file', body,
  ])

  assert.notEqual(response.status, 0)
  assert.match(response.stderr, /invalid from identity/)
  assert.deepEqual(markdownFiles(directory), [path.basename(reference)])
})

test('rejects a response to a turn with a malformed author identity', (t) => {
  const directory = chatDirectory(t)
  const reference = writeBody(
    directory,
    '2026-08-25-120000-supersets-atomic-turns-claude-review-442.md',
    `---
from: claude review 442
turn_kind: answer
thread_slug: supersets-atomic-turns
---
# Malformed author
`,
  )
  const body = writeBody(directory, 'response.txt', 'Response.\n')

  const response = runTurn([
    '--dir', directory,
    '--thread', 'supersets-atomic-turns',
    '--author', 'codex-review-825',
    '--kind', 'answer',
    '--responding-to', reference,
    '--title', 'Reject malformed response author',
    '--body-file', body,
  ])

  assert.notEqual(response.status, 0)
  assert.match(response.stderr, /invalid from identity/)
  assert.deepEqual(markdownFiles(directory), [path.basename(reference)])
})

test('rejects a response to the same author\'s turn', (t) => {
  const directory = chatDirectory(t)
  const reference = writeBody(
    directory,
    '2026-08-25-120000-supersets-atomic-turns-codex-review-825.md',
    `---
from: codex-review-825
turn_kind: finding
thread_slug: supersets-atomic-turns
---
# Prior finding
`,
  )
  const body = writeBody(directory, 'response.txt', 'Response.\n')

  const response = runTurn([
    '--dir', directory,
    '--thread', 'supersets-atomic-turns',
    '--author', 'codex-review-825',
    '--kind', 'answer',
    '--responding-to', reference,
    '--title', 'Reject self-response',
    '--body-file', body,
  ])

  assert.notEqual(response.status, 0)
  assert.match(response.stderr, /response must reference a turn from a different author/)
  assert.deepEqual(markdownFiles(directory), [path.basename(reference)])
})

test('rejects a referenced turn with unterminated frontmatter', (t) => {
  const directory = chatDirectory(t)
  const reference = writeBody(
    directory,
    '2026-08-25-120000-supersets-atomic-turns-claude-review-442.md',
    `---
from: claude-review-442
turn_kind: answer
thread_slug: supersets-atomic-turns
# Missing closing delimiter
`,
  )
  const body = writeBody(directory, 'response.txt', 'Response.\n')

  const response = runTurn([
    '--dir', directory,
    '--thread', 'supersets-atomic-turns',
    '--author', 'codex-review-825',
    '--kind', 'answer',
    '--responding-to', reference,
    '--title', 'Reject malformed reference',
    '--body-file', body,
  ])

  assert.notEqual(response.status, 0)
  assert.match(response.stderr, /invalid or missing thread_slug/)
  assert.deepEqual(markdownFiles(directory), [path.basename(reference)])
})

test('rejects duplicate keys anywhere in referenced frontmatter', (t) => {
  const directory = chatDirectory(t)
  const reference = writeBody(
    directory,
    '2026-08-25-120000-supersets-atomic-turns-claude-review-442.md',
    `---
from:
from: review-claude-442
turn_kind: answer
thread_slug: supersets-atomic-turns
---
# Ambiguous author
`,
  )
  const body = writeBody(directory, 'response.txt', 'Response.\n')

  const response = runTurn([
    '--dir', directory,
    '--thread', 'supersets-atomic-turns',
    '--author', 'codex-review-825',
    '--kind', 'answer',
    '--responding-to', reference,
    '--title', 'Reject duplicate reference keys',
    '--body-file', body,
  ])

  assert.notEqual(response.status, 0)
  assert.match(response.stderr, /invalid or missing thread_slug/)
  assert.deepEqual(markdownFiles(directory), [path.basename(reference)])
})

test('rejects YAML-equivalent duplicate keys with separation whitespace', (t) => {
  const directory = chatDirectory(t)
  const reference = writeBody(
    directory,
    '2026-08-25-120000-supersets-atomic-turns-claude-review-442.md',
    `---
from : claude-review-442
from: review-claude-442
turn_kind: answer
thread_slug: supersets-atomic-turns
---
# Ambiguous author
`,
  )
  const body = writeBody(directory, 'response.txt', 'Response.\n')

  const response = runTurn([
    '--dir', directory,
    '--thread', 'supersets-atomic-turns',
    '--author', 'codex-review-825',
    '--kind', 'answer',
    '--responding-to', reference,
    '--title', 'Reject noncanonical reference keys',
    '--body-file', body,
  ])

  assert.notEqual(response.status, 0)
  assert.match(response.stderr, /invalid or missing thread_slug/)
  assert.deepEqual(markdownFiles(directory), [path.basename(reference)])
})

test('rejects an addendum attributed to another author', (t) => {
  const directory = chatDirectory(t)
  const initialBody = writeBody(directory, 'initial.txt', 'Initial question.\n')
  const addendumBody = writeBody(directory, 'addendum.txt', 'Additional evidence.\n')
  const initial = runTurn(initialArgs(directory, initialBody))
  assert.equal(initial.status, 0, initial.stderr)

  const addendum = runTurn([
    '--dir', directory,
    '--thread', 'supersets-atomic-turns',
    '--author', 'claude-review-442',
    '--kind', 'finding',
    '--addendum-to', initial.stdout.trim(),
    '--title', 'Misattributed addendum',
    '--body-file', addendumBody,
  ])

  assert.notEqual(addendum.status, 0)
  assert.match(addendum.stderr, /from does not match --author/)
})

test('watches exact frontmatter values despite hyphenated filename collisions', async (t) => {
  const directory = chatDirectory(t)
  const child = spawn(watchForReply, [
    directory,
    '1',
    '--thread', 'supersets-review',
    '--author', 'claude-4412',
    '--once',
  ], {
    cwd: repoRoot,
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  let stdout = ''
  let stderr = ''
  child.stdout.setEncoding('utf8')
  child.stderr.setEncoding('utf8')
  child.stdout.on('data', (chunk) => { stdout += chunk })
  child.stderr.on('data', (chunk) => { stderr += chunk })
  t.after(() => {
    if (child.exitCode === null) child.kill('SIGTERM')
  })
  const exit = waitForExit(child)

  await waitForOutput(child, () => stdout, /^watching /)

  const selfAuthored = writeBody(
    directory,
    '2026-08-25-120000-supersets-review-claude-4412.md',
    '---\nfrom: claude-4412\nturn_kind: finding\nthread_slug: supersets-review\n---\n',
  )
  const prefixRelated = writeBody(
    directory,
    '2026-08-25-120001-supersets-review-followup-peer.md',
    '---\nfrom: peer\nturn_kind: finding\nthread_slug: supersets-review-followup\n---\n',
  )
  const emptyValuedDuplicate = writeBody(
    directory,
    '2026-08-25-120002-supersets-review-duplicate-peer.md',
    '---\nfrom:\nfrom: duplicate-peer\nturn_kind: finding\nthread_slug: supersets-review\n---\n',
  )
  const noncanonicalDuplicate = writeBody(
    directory,
    '2026-08-25-120003-supersets-review-spaced-peer.md',
    '---\nfrom : spaced-peer\nfrom: noncanonical-peer\nturn_kind: finding\nthread_slug: supersets-review\n---\n',
  )
  const distinctPeer = writeBody(
    directory,
    '2026-08-25-120004-supersets-review-review-claude-4412.md',
    '---\nfrom: review-claude-4412\nturn_kind: finding\nthread_slug: supersets-review\n---\n',
  )

  assert.equal(await exit, 0, stderr)
  assert.equal(stdout.includes(path.basename(selfAuthored)), false)
  assert.equal(stdout.includes(path.basename(prefixRelated)), false)
  assert.equal(stdout.includes(path.basename(emptyValuedDuplicate)), false)
  assert.equal(stdout.includes(path.basename(noncanonicalDuplicate)), false)
  assert.equal(stdout.includes(path.basename(distinctPeer)), true)
})

test('prints a body template without touching the drop-box', (t) => {
  const directory = chatDirectory(t)
  const result = runTurn(['--print-body-template', '--kind', 'finding'])

  assert.equal(result.status, 0, result.stderr)
  assert.match(result.stdout, /Verdict: accepted \/ rejected \/ accepted-with-correction/)
  assert.match(result.stdout, /Authority checked/)
  assert.doesNotMatch(result.stdout, /^---/)
  assert.deepEqual(markdownFiles(directory), [])
})

test('requires --kind for --print-body-template', (t) => {
  const result = runTurn(['--print-body-template'])

  assert.notEqual(result.status, 0)
  assert.match(result.stderr, /--kind is required with --print-body-template/)
})

test('appends the mode-neutral closure sentence', (t) => {
  const directory = chatDirectory(t)
  const body = writeBody(directory, 'closure.txt', 'All findings are resolved. Tests pass.\n')
  const result = runTurn([
    '--dir', directory,
    '--thread', 'supersets-atomic-turns',
    '--author', 'codex-review-825',
    '--kind', 'closure',
    '--initial',
    '--closes', 'supersets-atomic-turns',
    '--title', 'Close atomic publication review',
    '--body-file', body,
  ])

  assert.equal(result.status, 0, result.stderr)
  assert.match(
    fs.readFileSync(result.stdout.trim(), 'utf8'),
    /All findings are resolved\. Tests pass\.\n\nThis closes the thread; no further response is needed\.\n$/,
  )
})
