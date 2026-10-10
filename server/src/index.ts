import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import mongoose from 'mongoose'
import { api } from './routes.js'

const app = express()
app.disable('x-powered-by')
app.use(helmet())
app.use(cors({ origin: process.env.CLIENT_ORIGIN?.split(',').map(origin => origin.trim()) ?? 'http://localhost:5173' }))
app.use(express.json({ limit: '1mb' }))
app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: 'draft-7', legacyHeaders: false }))
app.get('/api/health', (_req, res) => {
  const connected = mongoose.connection.readyState === 1
  const database = connected ? 'connected' : process.env.MONGODB_URI ? 'disconnected' : 'not configured'
  res.status(process.env.MONGODB_URI && !connected ? 503 : 200).json({ status: database === 'disconnected' ? 'unavailable' : 'ok', database })
})
app.use('/api', api)
app.use((_req, res) => res.status(404).json({ error: 'Not found.' }))
app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(error)
  res.status(500).json({ error: 'An unexpected server error occurred.' })
})

async function start() {
  if (process.env.MONGODB_URI) await mongoose.connect(process.env.MONGODB_URI)
  else if (process.env.NODE_ENV === 'production') throw new Error('MONGODB_URI is required in production.')
  const port = Number(process.env.PORT ?? 4000)
  app.listen(port, () => console.log(`Commerce API listening on port ${port}`))
}

start().catch(error => {
  console.error('API startup failed:', error instanceof Error ? error.message : error)
  process.exit(1)
})
