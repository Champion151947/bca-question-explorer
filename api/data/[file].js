import { BLOB } from '../_lib/data.js'
import { decryptBlob, send } from '../_lib/security.js'

// Decrypt once and reuse across warm invocations.
let cache = null

function load() {
  if (cache) return cache
  if (!BLOB) throw new Error('Data not provisioned — run "npm run encrypt" with DATA_KEY set.')
  const json = decryptBlob(BLOB, process.env.DATA_KEY || '').toString('utf8')
  cache = JSON.parse(json)
  return cache
}

export default function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return send(res, 405, { error: 'Method not allowed' })
  }

  const file = String(req.query.file || '')
  if (!/^[a-z0-9._-]+\.json$/i.test(file)) return send(res, 400, { error: 'Bad file name' })

  let data
  try {
    data = load()[file]
  } catch (e) {
    return send(res, 500, { error: e.message })
  }
  if (!data) return send(res, 404, { error: 'Not found' })

  res.statusCode = 200
  res.setHeader('content-type', 'application/json; charset=utf-8')
  res.setHeader('cache-control', 'public, max-age=300')
  res.setHeader('x-content-type-options', 'nosniff')
  res.end(JSON.stringify(data))
}
