// 규칙 검토 커버리지 — 전체 출처 중 90일 이내에 사람이 확인한 비율.
// 이 숫자가 낮아지면 제품이 스스로 그 사실을 드러낸다. 그게 목적이다.
import { readFileSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import yaml from 'js-yaml'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const FRESH_DAYS = 90
const today = new Date().toISOString().slice(0, 10)
const daysBetween = (a, b) => Math.floor((Date.parse(b) - Date.parse(a)) / 86_400_000)

const sources = []
for (const file of readdirSync(join(root, 'rules')).filter((f) => f.endsWith('.yaml'))) {
  const doc = yaml.load(readFileSync(join(root, 'rules', file), 'utf8'), { schema: yaml.CORE_SCHEMA })
  for (const s of doc?.sources ?? []) sources.push({ ...s, rule: doc.id ?? doc.kind })
}

const state = (s) => {
  if (s.changed_at && s.changed_at > s.checked_on) return 'changed'
  if (daysBetween(s.next_check_on, today) > 0) return 'stale'
  if (daysBetween(s.checked_on, today) > FRESH_DAYS) return 'aging'
  return 'verified'
}

const counts = { verified: 0, aging: 0, stale: 0, changed: 0 }
for (const s of sources) counts[state(s)]++
const ratio = sources.length === 0 ? 0 : Math.round((counts.verified / sources.length) * 100)

// 배지 색은 정직하게. 낮으면 낮다고 보이는 편이 낫다.
const color = ratio >= 90 ? 'brightgreen' : ratio >= 70 ? 'yellow' : ratio >= 40 ? 'orange' : 'red'
mkdirSync(join(root, 'public'), { recursive: true })
writeFileSync(
  join(root, 'public', 'coverage.json'),
  JSON.stringify({ schemaVersion: 1, label: '90일 이내 확인', message: `${ratio}%`, color }, null, 2) + '\n',
)

// README 배지 줄을 갱신한다.
const readmePath = join(root, 'README.md')
try {
  const readme = readFileSync(readmePath, 'utf8')
  const badge = `![규칙 검토 커버리지](https://img.shields.io/badge/90일_이내_확인-${ratio}%25-${color})`
  const next = readme.replace(/!\[규칙 검토 커버리지\]\([^)]*\)/, badge)
  if (next !== readme) writeFileSync(readmePath, next)
} catch {
  // README가 아직 없으면 넘어간다.
}

console.log(`출처 ${sources.length}건 — 확인됨 ${counts.verified}, 오래됨 ${counts.aging}, 기한지남 ${counts.stale}, 원문변경 ${counts.changed}`)
console.log(`90일 이내 확인 비율: ${ratio}%`)
if (counts.stale + counts.changed > 0) {
  console.log('확인 필요:')
  for (const s of sources) {
    const st = state(s)
    if (st === 'stale' || st === 'changed') console.log(`  - ${s.rule}/${s.id} (${st}) ${s.url}`)
  }
}
