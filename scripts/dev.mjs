import { spawn } from 'node:child_process'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const processes = [
  spawn(process.execPath, [resolve(root, 'node_modules/vite/bin/vite.js'), resolve(root, 'client'), '--host', '0.0.0.0', '--config', resolve(root, 'client/vite.config.ts')], { cwd: root, stdio: 'inherit' }),
  spawn(process.execPath, [resolve(root, 'node_modules/tsx/dist/cli.mjs'), 'watch', 'src/index.ts'], { cwd: resolve(root, 'server'), stdio: 'inherit' }),
]

function stop() {
  for (const child of processes) if (!child.killed) child.kill()
}

process.on('SIGINT', stop)
process.on('SIGTERM', stop)
for (const child of processes) child.on('exit', code => { if (code && code !== 0) process.exitCode = code; stop() })