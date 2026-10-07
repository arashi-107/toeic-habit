// アプリのアイコン（PNG）を生成する。外部ライブラリなしで動くように PNG を直接書き出す
import { writeFileSync, mkdirSync } from 'node:fs'
import { deflateSync } from 'node:zlib'

const BG = [79, 70, 229] // indigo-600
const FG = [255, 255, 255]

// 5×7 のドット文字
const GLYPHS = {
  6: ['.###.', '#....', '#....', '####.', '#...#', '#...#', '.###.'],
  0: ['.###.', '#...#', '#..##', '#.#.#', '##..#', '#...#', '.###.'],
}

function crc32(buf) {
  let c
  const table = crc32.table ??= Array.from({ length: 256 }, (_, n) => {
    c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    return c >>> 0
  })
  let crc = 0xffffffff
  for (const b of buf) crc = table[(crc ^ b) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const td = Buffer.concat([Buffer.from(type), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(td))
  return Buffer.concat([len, td, crc])
}

function png(size, pixel) {
  const raw = Buffer.alloc((size * 4 + 1) * size)
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = pixel(x, y)
      const i = y * (size * 4 + 1) + 1 + x * 4
      raw[i] = r
      raw[i + 1] = g
      raw[i + 2] = b
      raw[i + 3] = a
    }
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

/** 「600」を中央に描く。rounded = 角を丸めて外側を透明にする */
function icon(size, { rounded, textScale }) {
  const text = '600'
  const cols = text.length * 5 + (text.length - 1)
  const cell = Math.floor((size * textScale) / cols)
  const left = Math.floor((size - cols * cell) / 2)
  const top = Math.floor((size - 7 * cell) / 2)
  const radius = size * 0.22

  return png(size, (x, y) => {
    if (rounded) {
      const cx = Math.min(Math.max(x, radius), size - 1 - radius)
      const cy = Math.min(Math.max(y, radius), size - 1 - radius)
      if ((x - cx) ** 2 + (y - cy) ** 2 > radius ** 2) return [0, 0, 0, 0]
    }
    const gx = Math.floor((x - left) / cell)
    const gy = Math.floor((y - top) / cell)
    if (x >= left && y >= top && gy < 7 && gx < cols) {
      const ch = Math.floor(gx / 6)
      const col = gx % 6
      if (col < 5 && GLYPHS[text[ch]][gy][col] === '#') return [...FG, 255]
    }
    return [...BG, 255]
  })
}

mkdirSync('public', { recursive: true })
writeFileSync('public/apple-touch-icon.png', icon(180, { rounded: false, textScale: 0.62 }))
writeFileSync('public/icon-192.png', icon(192, { rounded: true, textScale: 0.62 }))
writeFileSync('public/icon-512.png', icon(512, { rounded: true, textScale: 0.62 }))
writeFileSync('public/icon-maskable-512.png', icon(512, { rounded: false, textScale: 0.5 }))
console.log('public/ にアイコンを書き出しました')
