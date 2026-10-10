import type { NextFunction, Request, Response } from 'express'
import jwt from 'jsonwebtoken'

export type Role = 'customer' | 'staff' | 'admin'
export type AuthRequest = Request & { user?: { id: string; role: Role } }

export function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  const token = req.header('authorization')?.replace(/^Bearer\s+/i, '')
  if (!token) return res.status(401).json({ error: 'Authentication required.' })
  try {
    const secret = process.env.JWT_SECRET
    if (!secret) throw new Error('JWT_SECRET is not configured')
    const payload = jwt.verify(token, secret) as jwt.JwtPayload
    if (typeof payload.sub !== 'string' || !['customer', 'staff', 'admin'].includes(String(payload.role))) throw new Error('Invalid token claims')
    req.user = { id: payload.sub, role: payload.role as Role }
    next()
  } catch {
    res.status(401).json({ error: 'Invalid or expired token.' })
  }
}

export function allowRoles(...roles: Role[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) return res.status(403).json({ error: 'Insufficient permissions.' })
    next()
  }
}
