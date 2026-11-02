// Generates the placeholder app icons without any image dependency.
// Replace with the real brand mark when design supplies one.
import { deflateSync } from 'node:zlib'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

const crcTable = new Uint32Array(256)
for (let n = 0; n < 256; n += 1) {
  let c = n
  for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  crcTable[n] = c >>> 0
}

function crc32(buffer) {
  let c = 0xffffffff
  for (const byte of buffer) c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length)
  const typeBuffer = Buffer.from(type, 'ascii')
  const crcBuffer = Buffer.alloc(4)
  crcBuffer.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])))
  return Buffer.concat([length, typeBuffer, data, crcBuffer])
}

function makeIcon(size) {
  const raw = Buffer.alloc(size * (size * 4 + 1))
  const centre = size / 2
  const outer = size * 0.36
  const inner = size * 0.235
  const core = size * 0.09

  for (let y = 0; y < size; y += 1) {
    const rowStart = y * (size * 4 + 1)
    raw[rowStart] = 0
    for (let x = 0; x < size; x += 1) {
      const dx = x - centre
      const dy = y - centre
      const distance = Math.sqrt(dx * dx + dy * dy)
      let r = 0x35
      let g = 0x4e
      let b = 0x26
      let a = 255

      if (distance <= outer) {
        r = 0xf6
        g = 0xf7
        b = 0xf4
      }
      if (distance <= inner) {
        r = 0x4b
        g = 0x6b
        b = 0x36
      }
      if (distance <= core) {
        r = 0xf6
        g = 0xf7
        b = 0xf4
      }

      const offset = rowStart + 1 + x * 4
      raw[offset] = r
      raw[offset + 1] = g
      raw[offset + 2] = b
      raw[offset + 3] = a
    }
  }

  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8
  ihdr[9] = 6
  ihdr[10] = 0
  ihdr[11] = 0
  ihdr[12] = 0

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0))
  ])
}

const outDir = resolve(root, 'public/icons')
mkdirSync(outDir, { recursive: true })
for (const size of [192, 512]) {
  const file = resolve(outDir, `icon-${size}.png`)
  writeFileSync(file, makeIcon(size))
  console.log(`wrote ${file}`)
}
