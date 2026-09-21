// rules/*.yaml 을 검증해서 앱이 읽는 번들 하나(src/generated/rules.json)로 만든다.
// 검증에서 걸리면 빌드를 세운다. 잘못된 절차 데이터를 배포하는 것보다 배포를 못 하는 편이 낫다.
import { readFileSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import yaml from 'js-yaml'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const rulesDir = join(root, 'rules')
const outDir = join(root, 'src', 'generated')

const LANGS = ['ko', 'en', 'vi']
const errors = []
const warnings = []

const fail = (where, msg) => errors.push(`${where}: ${msg}`)
const warn = (where, msg) => warnings.push(`${where}: ${msg}`)

const isIsoDate = (v) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)

function checkLocalized(where, value, field) {
  if (!value || typeof value !== 'object') return fail(where, `${field}가 없습니다`)
  for (const lang of LANGS) {
    if (typeof value[lang] !== 'string' || !value[lang].trim()) {
      fail(where, `${field}.${lang} 이 비어 있습니다`)
    }
  }
}

function checkSource(where, source) {
  for (const field of ['id', 'publisher', 'title', 'url', 'checked_by']) {
    if (!source[field]) fail(where, `출처의 ${field} 가 없습니다`)
  }
  if (!/^https?:\/\//.test(source.url ?? '')) fail(where, '출처 url 이 http(s) 주소가 아닙니다')
  for (const field of ['checked_on', 'next_check_on']) {
    if (!isIsoDate(source[field])) fail(where, `출처의 ${field} 가 YYYY-MM-DD 가 아닙니다`)
  }
  if (source.source_updated_on !== null && !isIsoDate(source.source_updated_on)) {
    fail(where, 'source_updated_on 은 날짜이거나 null 이어야 합니다')
  }
  if (isIsoDate(source.checked_on) && isIsoDate(source.next_check_on)) {
    if (source.next_check_on <= source.checked_on) {
      fail(where, 'next_check_on 이 checked_on 보다 뒤여야 합니다')
    }
  }
  // 상태는 사람이 적는 값이 아니다. 데이터에 들어 있으면 설계가 무너진 것이므로 막는다.
  if ('status' in source) fail(where, 'status 는 데이터에 적지 않습니다. 날짜에서 계산합니다')
}

const files = readdirSync(rulesDir).filter((f) => f.endsWith('.yaml')).sort()
const rules = []
let desks = []
let deskSources = []

for (const file of files) {
  const where = `rules/${file}`
  let doc
  try {
    // CORE_SCHEMA: 2026-09-21 같은 값을 Date 객체가 아니라 문자열로 읽는다.
    // 날짜는 원문에 적힌 그대로 비교하고 그대로 보여 주어야 한다.
    doc = yaml.load(readFileSync(join(rulesDir, file), 'utf8'), { schema: yaml.CORE_SCHEMA })
  } catch (e) {
    fail(where, `YAML 파싱 실패 — ${e.message}`)
    continue
  }

  if (doc?.kind === 'support-desks') {
    desks = doc.desks ?? []
    deskSources = doc.sources ?? []
    desks.forEach((d, i) => {
      checkLocalized(`${where} desks[${i}]`, d.name, 'name')
      checkLocalized(`${where} desks[${i}]`, d.scope, 'scope')
      if (!d.phone) fail(`${where} desks[${i}]`, 'phone 이 없습니다')
    })
    deskSources.forEach((s, i) => checkSource(`${where} sources[${i}]`, s))
    continue
  }

  if (!doc?.id) { fail(where, 'id 가 없습니다'); continue }
  if (typeof doc.order !== 'number') fail(where, 'order 가 숫자가 아닙니다')

  checkLocalized(where, doc.title, 'title')
  checkLocalized(where, doc.summary, 'summary')

  for (const field of ['terms', 'steps', 'documents']) {
    if (!Array.isArray(doc[field]) || doc[field].length === 0) {
      fail(where, `${field} 가 비어 있습니다`)
      continue
    }
    doc[field].forEach((item, i) => checkLocalized(`${where} ${field}[${i}]`, item, field))
  }
  for (const field of ['cautions', 'contacts']) {
    (doc[field] ?? []).forEach((item, i) => checkLocalized(`${where} ${field}[${i}]`, item, field))
  }
  if (doc.requires_note) checkLocalized(where, doc.requires_note, 'requires_note')
  if (doc.deadline?.note) checkLocalized(where, doc.deadline.note, 'deadline.note')

  if (!Array.isArray(doc.sources) || doc.sources.length === 0) {
    // 출처 없는 안내는 이 제품이 하지 않기로 한 것이다.
    fail(where, '출처가 하나도 없습니다')
  } else {
    doc.sources.forEach((s, i) => {
      checkSource(`${where} sources[${i}]`, s)
      if (s.note) checkLocalized(`${where} sources[${i}]`, s.note, 'note')
    })
  }

  doc.requires ??= []
  rules.push(doc)
}

// 선행 조건 그래프 검사: 없는 id를 가리키지 않는지, 순환하지 않는지.
const ids = new Set(rules.map((r) => r.id))
for (const rule of rules) {
  for (const field of ['requires', 'requires_soft']) {
    for (const dep of rule[field] ?? []) {
      if (!ids.has(dep)) fail(`rules/${rule.id}`, `${field} 가 없는 절차 "${dep}" 를 가리킵니다`)
    }
  }
}

const state = new Map()
function findCycle(id, trail) {
  if (state.get(id) === 'done') return null
  if (state.get(id) === 'visiting') return [...trail, id]
  state.set(id, 'visiting')
  const rule = rules.find((r) => r.id === id)
  for (const dep of rule?.requires ?? []) {
    const cycle = findCycle(dep, [...trail, id])
    if (cycle) return cycle
  }
  state.set(id, 'done')
  return null
}
for (const rule of rules) {
  const cycle = findCycle(rule.id, [])
  if (cycle) { fail('rules', `선행 조건이 순환합니다: ${cycle.join(' → ')}`); break }
}

// 오늘 기준으로 이미 점검 기한이 지난 출처는 경고한다. 빌드를 세우지는 않는다 —
// 낡았다는 사실을 숨기지 않고 배포하는 것이 이 제품의 원칙이기 때문이다.
const today = new Date().toISOString().slice(0, 10)
for (const rule of rules) {
  for (const s of rule.sources ?? []) {
    if (isIsoDate(s.next_check_on) && s.next_check_on < today) {
      warn(`rules/${rule.id}`, `출처 "${s.id}" 의 점검 기한이 지났습니다 (${s.next_check_on}) — 화면에 "확인 필요"로 표시됩니다`)
    }
  }
}

if (warnings.length) {
  console.warn('! 경고')
  warnings.forEach((w) => console.warn('  - ' + w))
}
if (errors.length) {
  console.error(`✗ 규칙 검증 실패 ${errors.length}건`)
  errors.forEach((e) => console.error('  - ' + e))
  process.exit(1)
}

rules.sort((a, b) => a.order - b.order)
mkdirSync(outDir, { recursive: true })
const bundle = { builtOn: today, rules, desks, deskSources }
writeFileSync(join(outDir, 'rules.json'), JSON.stringify(bundle, null, 2) + '\n')

const sourceCount = rules.reduce((n, r) => n + r.sources.length, 0)
console.log(`✓ 절차 ${rules.length}개, 출처 ${sourceCount}건, 지원 창구 ${desks.length}곳 → src/generated/rules.json`)
