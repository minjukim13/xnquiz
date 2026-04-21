// JWT 발급 / 검증 공통 유틸
import jwt, { type JwtPayload, type SignOptions } from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import type { VercelRequest } from '@vercel/node'
import type { UserRole } from '@prisma/client'

const JWT_SECRET = process.env.JWT_SECRET
const JWT_EXPIRES_IN = (process.env.JWT_EXPIRES_IN ?? '7d') as SignOptions['expiresIn']

if (!JWT_SECRET) {
  // 런타임 체크 — 환경 변수 누락 시 즉시 알림
  // eslint-disable-next-line no-console
  console.warn('[auth] JWT_SECRET is not set')
}

export type AuthPayload = {
  userId: string
  role: UserRole
  email: string
}

export function signToken(payload: AuthPayload): string {
  return jwt.sign(payload, JWT_SECRET!, { expiresIn: JWT_EXPIRES_IN })
}

export function verifyToken(token: string): AuthPayload {
  const decoded = jwt.verify(token, JWT_SECRET!) as JwtPayload & AuthPayload
  return { userId: decoded.userId, role: decoded.role, email: decoded.email }
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10)
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash)
}

// 요청에서 Bearer 토큰 추출 → AuthPayload 반환 (검증 실패 시 null)
export function getAuthFromRequest(req: VercelRequest): AuthPayload | null {
  const header = req.headers.authorization ?? ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) return null
  try {
    return verifyToken(token)
  } catch {
    return null
  }
}
