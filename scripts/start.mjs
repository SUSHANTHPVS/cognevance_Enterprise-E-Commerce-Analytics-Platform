import { spawn } from 'node:child_process'
import { resolve } from 'node:path'

const server = resolve(import.meta.dirname, '..', 'server')
const child = spawn(process.execPath, ['dist/index.js'], { cwd: server, stdio: 'inherit' })
child.on('exit', code => { process.exitCode = code ?? 1 })