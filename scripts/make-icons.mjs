// Generates the app/PWA icons as PNGs — no external dependencies.
// Draws a rounded indigo tile with a white "B". Run: node scripts/make-icons.mjs
import { writeFileSync } from 'node:fs'
import { deflateSync } from 'node:zlib'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const outDir = join(here, '..', 'public')

const crcTable = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()

function crc32(buf) {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length, 0)
  const typeBuf = Buffer.from(type, 'ascii')
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0)
  return Buffer.concat([len, typeBuf, data, crc])
}

function encodePng(size, pixels) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8
  ihdr[9] = 6
  const stride = size * 4
  const raw = Buffer.alloc((stride + 1) * size)
  for (let y = 0; y < size; y++) {
    raw[y * (stride + 1)] = 0
    pixels.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride)
  }
  const idat = deflateSync(raw, { level: 9 })
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))])
}

const GLYPH = [
  '1111100',
  '1000010',
  '1000010',
  '1000010',
  '1111100',
  '1000010',
  '1000010',
  '1000010',
  '1000010',
  '1111100',
]

function draw(size) {
  const px = Buffer.alloc(size * size * 4)
  const set = (x, y, r, g, b, a = 255) => {
    const i = (y * size + x) * 4
    px[i] = r
    px[i + 1] = g
    px[i + 2] = b
    px[i + 3] = a
  }

  const radius = Math.round(size * 0.22)
  const [br, bg, bb] = [99, 102, 241]
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const cx = x < radius ? radius : x >= size - radius ? size - 1 - radius : x
      const cy = y < radius ? radius : y >= size - radius ? size - 1 - radius : y
      const dx = x - cx
      const dy = y - cy
      if (dx * dx + dy * dy <= radius * radius) set(x, y, br, bg, bb)
    }
  }

  const rows = GLYPH.length
  const cols = GLYPH[0].length
  const glyphH = Math.round(size * 0.52)
  const cell = Math.max(1, Math.floor(glyphH / rows))
  const gw = cell * cols
  const gh = cell * rows
  const ox = Math.round((size - gw) / 2)
  const oy = Math.round((size - gh) / 2)

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (GLYPH[r][c] !== '1') continue
      for (let y = 0; y < cell; y++) {
        for (let x = 0; x < cell; x++) {
          set(ox + c * cell + x, oy + r * cell + y, 255, 255, 255)
        }
      }
    }
  }
  return px
}

for (const size of [192, 512, 180]) {
  const name = size === 180 ? 'apple-touch-icon.png' : `pwa-${size}.png`
  writeFileSync(join(outDir, name), encodePng(size, draw(size)))
  console.log('wrote', name)
}
