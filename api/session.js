import { getSession, send } from './_lib/security.js'

export default function handler(req, res) {
  return getSession(req) ? send(res, 200, { authed: true }) : send(res, 401, { authed: false })
}
