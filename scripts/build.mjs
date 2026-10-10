import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const steps = [
  ['node_modules/typescript/bin/tsc', ['--noEmit', '-p', 'client/tsconfig.json']],
  ['node_modules/vite/bin/vite.js', ['build', 'client', '--config', 'client/vite.config.ts']],
  ['node_modules/typescript/bin/tsc', ['-p', 'server/tsconfig.json']],
]

for (const [script, args] of steps) {
  const result = spawnSync(process.execPath, [resolve(root, script), ...args], { cwd: root, stdio: 'inherit' })
  if (result.status !== 0) process.exit(result.status ?? 1)
}