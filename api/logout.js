import { clearCookie, send } from './_lib/security.js'

export default function handler(_req, res) {
  return send(res, 200, { ok: true }, { 'set-cookie': clearCookie() })
}
