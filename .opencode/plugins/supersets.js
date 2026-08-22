import path from 'node:path'
import { fileURLToPath } from 'node:url'

const skillsDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../skills',
)

export const SupersetsPlugin = async () => {
  return {
    config: async (config) => {
      config.skills = config.skills || {}
      config.skills.paths = config.skills.paths || []
      if (!config.skills.paths.includes(skillsDir)) {
        config.skills.paths.push(skillsDir)
      }
    },
  }
}
