// PWA 아이콘을 코드로 그린다. 외부 이미지 의존성 없이 저장소 안에서 재생산할 수 있게 한다.
// 체크 표시를 고른 이유: 이 제품이 파는 것이 "확인됨"이라는 상태이기 때문이다.
import { writeFileSync } from 'node:fs'
import { deflateSync } from 'node:zlib'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const outDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'public')
const BG = [28, 93, 153] // --accent
const FG = [255, 255, 255]

function crc32(buf) {
  let c, table = []
  for (let n = 0; n < 256; n++) {
    c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c >>> 0
  }
  let crc = 0xffffffff
  for (const byte of buf) crc = table[(crc ^ byte) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}

/** 점과 선분 사이 거리. 체크 표시를 두 개의 굵은 선분으로 그린다. */
function distToSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy)))
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy))
}

function render(size) {
  const r = size * 0.22 // 모서리 반경
  const stroke = size * 0.085
  // 체크의 세 꼭짓점
  const a = [size * 0.28, size * 0.52]
  const b = [size * 0.44, size * 0.68]
  const c = [size * 0.73, size * 0.34]

  const rows = []
  for (let y = 0; y < size; y++) {
    const row = Buffer.alloc(1 + size * 4)
    row[0] = 0 // 필터 없음
    for (let x = 0; x < size; x++) {
      // 둥근 모서리: 사각형 안쪽으로 반경만큼 들어간 사각형과의 거리로 판정
      const cx = Math.min(Math.max(x, r), size - r)
      const cy = Math.min(Math.max(y, r), size - r)
      const inside = Math.hypot(x - cx, y - cy) <= r

      const d = Math.min(
        distToSegment(x, y, a[0], a[1], b[0], b[1]),
        distToSegment(x, y, b[0], b[1], c[0], c[1]),
      )
      const onCheck = d <= stroke / 2

      const [rr, gg, bb] = onCheck ? FG : BG
      const i = 1 + x * 4
      row[i] = rr; row[i + 1] = gg; row[i + 2] = bb; row[i + 3] = inside ? 255 : 0
    }
    rows.push(row)
  }

  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8   // bit depth
  ihdr[9] = 6   // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(Buffer.concat(rows), { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

for (const size of [192, 512]) {
  writeFileSync(join(outDir, `icon-${size}.png`), render(size))
  console.log(`public/icon-${size}.png`)
}
