import { buildCookie, makeToken, safeEqual, send } from './_lib/security.js'

export default function handler(req, res) {
  if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed' })

  let body = req.body
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body)
    } catch {
      body = {}
    }
  }
  body = body || {}

  const expected = process.env.ACCESS_PASSWORD || ''
  if (expected && safeEqual(body.password || '', expected)) {
    return send(res, 200, { ok: true }, { 'set-cookie': buildCookie(makeToken()) })
  }
  return send(res, 401, { error: 'Wrong password' })
}
