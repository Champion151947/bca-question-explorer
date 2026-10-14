// Minimal zero-dependency static + gated-data server.
//
//   ACCESS_PASSWORD   required — the shared access code users must enter
//   SESSION_SECRET    optional — HMAC key for session cookies (random per boot if unset)
//   PORT              optional — default 8080
//   DATA_DIR          optional — default public/data   (gitignored, NOT in the build)
//   DIST_DIR          optional — default dist
//   COOKIE_SECURE     optional — set "false" for plain-http local testing
//
// It serves the built app from DIST_DIR and hands out question-paper JSON only
// to clients that first POST the correct password to /api/login.

import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')

const PORT = Number(process.env.PORT || 8080)
const PASSWORD = process.env.ACCESS_PASSWORD || ''
const DIST_DIR = path.resolve(ROOT, process.env.DIST_DIR || 'dist')
const DATA_DIR = path.resolve(ROOT, process.env.DATA_DIR || 'public/data')
const SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex')
const SECURE_COOKIE = process.env.COOKIE_SECURE !== 'false'
const MAX_AGE_S = 60 * 60 * 8 // 8 hours

if (!PASSWORD) {
  console.error('[serve] ACCESS_PASSWORD is not set. Refusing to start without a gate.')
  console.error('[serve] Example:  $env:ACCESS_PASSWORD="secret"; node server/serve.mjs')
  process.exit(1)
}
if (!fs.existsSync(DIST_DIR)) {
  console.warn(`[serve] WARNING: ${DIST_DIR} not found — run "npm run build" first.`)
}

const sign = (payload) => crypto.createHmac('sha256', SECRET).update(payload).digest('hex')

function makeToken() {
  const exp = Date.now() + MAX_AGE_S * 1000
  return `${exp}.${sign(String(exp))}`
}

function verifyToken(token) {
  if (!token || typeof token !== 'string') return false
  const i = token.lastIndexOf('.')
  if (i < 0) return false
  const payload = token.slice(0, i)
  const sig = token.slice(i + 1)
  const expected = sign(payload)
  const a = Buffer.from(sig)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return false
  const exp = Number(payload)
  return Number.isFinite(exp) && Date.now() < exp
}

function safeEqual(a, b) {
  const ab = Buffer.from(String(a))
  const bb = Buffer.from(String(b))
  if (ab.length !== bb.length) return false
  return crypto.timingSafeEqual(ab, bb)
}

function parseCookies(req) {
  const out = {}
  for (const part of (req.headers.cookie || '').split(';')) {
    const i = part.indexOf('=')
    if (i > -1) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim())
  }
  return out
}

const isAuthed = (req) => verifyToken(parseCookies(req).bca_session)

function json(res, code, obj, headers = {}) {
  res.writeHead(code, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
    ...headers,
  })
  res.end(JSON.stringify(obj))
}

function readBody(req, limit = 4096) {
  return new Promise((resolve, reject) => {
    let data = ''
    req.on('data', (chunk) => {
      data += chunk
      if (data.length > limit) {
        reject(new Error('payload too large'))
        req.destroy()
      }
    })
    req.on('end', () => resolve(data))
    req.on('error', reject)
  })
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
}

function serveFile(res, file, immutable = false) {
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) {
      res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' })
      res.end('Not found')
      return
    }
    res.writeHead(200, {
      'content-type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream',
      'x-content-type-options': 'nosniff',
      'cache-control': immutable ? 'public, max-age=31536000, immutable' : 'no-cache',
    })
    fs.createReadStream(file).pipe(res)
  })
}

const attempts = new Map()
function rateLimited(ip) {
  const now = Date.now()
  const rec = attempts.get(ip)
  if (!rec || now - rec.ts > 15 * 60 * 1000) return false
  return rec.count >= 10
}
function noteAttempt(ip) {
  const now = Date.now()
  const rec = attempts.get(ip)
  if (!rec || now - rec.ts > 15 * 60 * 1000) attempts.set(ip, { count: 1, ts: now })
  else {
    rec.count += 1
    rec.ts = now
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`)
  const p = url.pathname
  const ip = req.socket.remoteAddress || 'x'

  if (p === '/api/login' && req.method === 'POST') {
    if (rateLimited(ip)) return json(res, 429, { error: 'Too many attempts. Try again later.' })
    let body
    try {
      body = JSON.parse((await readBody(req)) || '{}')
    } catch {
      return json(res, 400, { error: 'Bad request' })
    }
    if (safeEqual(body.password || '', PASSWORD)) {
      attempts.delete(ip)
      const cookie = [
        `bca_session=${makeToken()}`,
        'HttpOnly',
        'Path=/',
        'SameSite=Lax',
        `Max-Age=${MAX_AGE_S}`,
        SECURE_COOKIE ? 'Secure' : '',
      ]
        .filter(Boolean)
        .join('; ')
      return json(res, 200, { ok: true }, { 'set-cookie': cookie })
    }
    noteAttempt(ip)
    return json(res, 401, { error: 'Wrong password' })
  }

  if (p === '/api/logout' && req.method === 'POST') {
    return json(res, 200, { ok: true }, { 'set-cookie': 'bca_session=; HttpOnly; Path=/; Max-Age=0' })
  }

  if (p === '/api/session') {
    return isAuthed(req) ? json(res, 200, { authed: true }) : json(res, 401, { authed: false })
  }

  if (p.startsWith('/api/data/')) {
    if (!isAuthed(req)) return json(res, 401, { error: 'Authentication required' })
    const name = decodeURIComponent(p.slice('/api/data/'.length))
    if (!/^[a-z0-9._-]+\.json$/i.test(name)) return json(res, 400, { error: 'Bad file name' })
    const file = path.resolve(DATA_DIR, name)
    if (file !== path.join(DATA_DIR, name)) return json(res, 400, { error: 'Bad path' })
    return serveFile(res, file)
  }

  if (p.startsWith('/api/')) return json(res, 404, { error: 'Not found' })

  // Static app
  let file = path.resolve(DIST_DIR, p.replace(/^\/+/, '') || 'index.html')
  if (file !== DIST_DIR && !file.startsWith(DIST_DIR + path.sep)) {
    res.writeHead(400, { 'content-type': 'text/plain; charset=utf-8' })
    return res.end('Bad path')
  }
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) return serveFile(res, path.join(DIST_DIR, 'index.html'))
    serveFile(res, file, p.startsWith('/assets/'))
  })
})

server.listen(PORT, () => {
  console.log(`[serve] app:  http://localhost:${PORT}`)
  console.log(`[serve] data: ${DATA_DIR}`)
  console.log(`[serve] gate: ${PASSWORD ? 'ON' : 'OFF'}`)
})
