import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { SupersetsPlugin } from '../.opencode/plugins/supersets.js'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const skillsDir = path.join(repoRoot, 'skills')

test('appends the repo skills directory when paths are missing', async () => {
  const hooks = await SupersetsPlugin({})
  const config = {}
  await hooks.config(config)
  assert.deepEqual(config.skills.paths, [skillsDir])
})

test('does not duplicate the skills directory', async () => {
  const hooks = await SupersetsPlugin({})
  const config = { skills: { paths: [skillsDir] } }
  await hooks.config(config)
  assert.deepEqual(config.skills.paths, [skillsDir])
})

test('registers only the config hook', async () => {
  const hooks = await SupersetsPlugin({})
  assert.deepEqual(Object.keys(hooks), ['config'])
})

test('skills directory contains all shipped skills', () => {
  const shipped = [
    'writing-commits',
    'writing-architecture-decision-records',
    'writing-pr-descriptions',
  ]
  for (const skill of shipped) {
    assert.ok(
      fs.existsSync(path.join(skillsDir, skill, 'SKILL.md')),
      `missing skill: ${skill}`,
    )
  }
})
