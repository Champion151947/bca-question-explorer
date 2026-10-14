// Shared crypto/session helpers for the Vercel serverless gate.
// Pure Node — no filesystem, so it bundles cleanly into the functions.
import crypto from 'node:crypto'

export const SESSION_TTL_S = 60 * 60 * 8 // 8 hours
export const COOKIE_NAME = 'bca_session'

export function sessionSecret() {
  return process.env.SESSION_SECRET || process.env.ACCESS_PASSWORD || 'insecure-dev-secret'
}

export function safeEqual(a, b) {
  const ab = Buffer.from(String(a))
  const bb = Buffer.from(String(b))
  if (ab.length !== bb.length) return false
  return crypto.timingSafeEqual(ab, bb)
}

function sign(payload) {
  return crypto.createHmac('sha256', sessionSecret()).update(payload).digest('hex')
}

export function makeToken() {
  const exp = Date.now() + SESSION_TTL_S * 1000
  return `${exp}.${sign(String(exp))}`
}

export function verifyToken(token) {
  if (!token || typeof token !== 'string') return false
  const i = token.lastIndexOf('.')
  if (i < 0) return false
  const payload = token.slice(0, i)
  const a = Buffer.from(token.slice(i + 1))
  const b = Buffer.from(sign(payload))
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return false
  const exp = Number(payload)
  return Number.isFinite(exp) && Date.now() < exp
}

export function parseCookies(header) {
  const out = {}
  for (const part of String(header || '').split(';')) {
    const i = part.indexOf('=')
    if (i > -1) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim())
  }
  return out
}

export function getSession(req) {
  return verifyToken(parseCookies(req.headers.cookie)[COOKIE_NAME])
}

export function buildCookie(token) {
  const secure = process.env.COOKIE_SECURE !== 'false'
  return [
    `${COOKIE_NAME}=${token}`,
    'HttpOnly',
    'Path=/',
    'SameSite=Lax',
    `Max-Age=${SESSION_TTL_S}`,
    secure ? 'Secure' : '',
  ]
    .filter(Boolean)
    .join('; ')
}

export function clearCookie() {
  return `${COOKIE_NAME}=; HttpOnly; Path=/; Max-Age=0`
}

/** Decrypt an AES-256-GCM base64 blob produced by scripts/encrypt-data.mjs. */
export function decryptBlob(b64, key) {
  const raw = Buffer.from(b64, 'base64')
  const iv = raw.subarray(0, 12)
  const tag = raw.subarray(12, 28)
  const ct = raw.subarray(28)
  const keyBuf = crypto.createHash('sha256').update(String(key)).digest()
  const d = crypto.createDecipheriv('aes-256-gcm', keyBuf, iv)
  d.setAuthTag(tag)
  return Buffer.concat([d.update(ct), d.final()])
}

export function send(res, code, obj, headers = {}) {
  res.statusCode = code
  res.setHeader('content-type', 'application/json; charset=utf-8')
  res.setHeader('cache-control', 'no-store')
  res.setHeader('x-content-type-options', 'nosniff')
  for (const [k, v] of Object.entries(headers)) res.setHeader(k, v)
  res.end(JSON.stringify(obj))
}
