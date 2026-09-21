// 원문이 바뀌었는지 주기적으로 확인한다.
//
// 바뀐 것을 발견해도 규칙 내용을 고치지 않는다. 고치는 것은 사람의 일이다.
// 이 스크립트가 하는 일은 딱 둘이다: (1) 바뀐 항목에 changed_at 을 찍어 화면에 "확인 필요"가 뜨게 하고,
// (2) 사람이 볼 검토 큐를 만든다.
//
// 사용: node scripts/check-sources.mjs [--write] [--queue docs/review-queue.md]
import { readFileSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'
import yaml from 'js-yaml'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const rulesDir = join(root, 'rules')
const args = process.argv.slice(2)
const write = args.includes('--write')
const queueAt = args.indexOf('--queue')
const queuePath = join(root, queueAt >= 0 ? args[queueAt + 1] : 'docs/review-queue.md')
const today = new Date().toISOString().slice(0, 10)

/**
 * 페이지에서 비교할 본문만 남긴다.
 * 스크립트·스타일·태그를 걷어내고, 매번 달라지는 값(세션 토큰, 방문자 수, 오늘 날짜)을 지운다.
 * 이걸 하지 않으면 내용이 그대로인데도 매주 "바뀌었다"고 알리게 된다.
 */
export function normalize(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    // 요청마다 달라지는 값들
    .replace(/[?&](jsessionid|csrf|_csrf|token|timestamp|t)=[^\s&"']*/gi, '')
    .replace(/\d{4}[-.]\d{1,2}[-.]\d{1,2}\s*\d{1,2}:\d{2}(:\d{2})?/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function hash(text) {
  return 'sha256:' + createHash('sha256').update(text).digest('hex').slice(0, 32)
}

/**
 * YAML 파일을 통째로 다시 쓰지 않고 해당 출처 블록의 줄만 고친다.
 * 규칙 파일은 사람이 읽고 고치는 문서라 주석과 순서를 잃으면 안 된다.
 */
export function patchSource(text, sourceId, fields) {
  const lines = text.split('\n')
  const start = lines.findIndex((l) => l.trim() === `- id: ${sourceId}`)
  if (start < 0) return { text, patched: false }

  const indent = ' '.repeat(lines[start].indexOf('-') + 2)
  let end = start + 1
  while (end < lines.length && (lines[end].startsWith(indent + ' ') || lines[end].startsWith(indent)) && !lines[end].trim().startsWith('- ')) {
    end++
  }

  const block = lines.slice(start, end)
  for (const [key, value] of Object.entries(fields)) {
    const rendered = `${indent}${key}: ${value === null ? 'null' : value}`
    const at = block.findIndex((l) => l.trim().startsWith(`${key}:`))
    if (at >= 0) block[at] = rendered
    else block.push(rendered)
  }
  return { text: [...lines.slice(0, start), ...block, ...lines.slice(end)].join('\n'), patched: true }
}

async function fetchText(url) {
  const res = await fetch(url, {
    headers: { 'user-agent': 'settle-quest-source-check/0.1 (+rules freshness batch)' },
    redirect: 'follow',
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return await res.text()
}

const results = []

for (const file of readdirSync(rulesDir).filter((f) => f.endsWith('.yaml')).sort()) {
  const path = join(rulesDir, file)
  let text = readFileSync(path, 'utf8')
  const doc = yaml.load(text, { schema: yaml.CORE_SCHEMA })
  const sources = doc?.sources ?? []
  const ruleId = doc?.id ?? doc?.kind ?? file

  for (const source of sources) {
    const entry = { file, ruleId, sourceId: source.id, url: source.url, title: source.title }
    try {
      const fresh = hash(normalize(await fetchText(source.url)))
      if (!source.content_hash) {
        entry.state = 'baseline'
        if (write) ({ text } = patchSource(text, source.id, { content_hash: fresh }))
      } else if (source.content_hash === fresh) {
        entry.state = 'same'
      } else {
        // 해시만 갱신하고 끝내면 변경을 소리 없이 삼키게 된다. changed_at 을 찍어 두어야
        // 사람이 확인할 때까지 화면에 "확인 필요"가 남는다.
        entry.state = 'changed'
        if (write) ({ text } = patchSource(text, source.id, { content_hash: fresh, changed_at: today }))
      }
    } catch (e) {
      // 못 읽은 것도 사건이다. 조용히 넘어가면 "확인했다"는 거짓이 남는다.
      entry.state = 'unreachable'
      entry.error = e.message
      if (write) ({ text } = patchSource(text, source.id, { changed_at: today }))
    }
    results.push(entry)
  }

  if (write) writeFileSync(path, text)
}

const by = (state) => results.filter((r) => r.state === state)
const needsReview = [...by('changed'), ...by('unreachable')]

const lines = [
  '# 원문 변경 검토 큐',
  '',
  `자동 생성 — ${today}. \`node scripts/check-sources.mjs --write\` 가 만든다.`,
  '',
  `출처 ${results.length}건 · 변경 ${by('changed').length} · 접근 불가 ${by('unreachable').length} · 동일 ${by('same').length} · 최초 기록 ${by('baseline').length}`,
  '',
]

if (needsReview.length === 0) {
  lines.push('검토할 항목이 없습니다.')
} else {
  lines.push('| 절차 | 출처 | 상태 | 원문 |', '|---|---|---|---|')
  for (const r of needsReview) {
    const state = r.state === 'changed' ? '원문 변경됨' : `접근 불가 (${r.error})`
    lines.push(`| ${r.ruleId} | ${r.sourceId} | ${state} | [${r.title}](${r.url}) |`)
  }
  lines.push(
    '',
    '## 검토하는 법',
    '',
    '1. 원문을 열어 무엇이 바뀌었는지 확인한다.',
    '2. 규칙 YAML의 내용을 고친다.',
    '3. 그 출처의 `checked_on` 을 오늘로, `next_check_on` 을 90일 뒤로 바꾸고 `changed_at` 을 지운다.',
    '4. `changed_at` 을 지우지 않으면 화면에 계속 "확인 필요"가 남는다. 그게 의도한 동작이다.',
  )
}

mkdirSync(dirname(queuePath), { recursive: true })
writeFileSync(queuePath, lines.join('\n') + '\n')

console.log(`출처 ${results.length}건 검사 — 변경 ${by('changed').length}, 접근 불가 ${by('unreachable').length}, 동일 ${by('same').length}, 최초 기록 ${by('baseline').length}`)
for (const r of needsReview) console.log(`  ! ${r.ruleId}/${r.sourceId} — ${r.state}${r.error ? ' (' + r.error + ')' : ''}`)
console.log(`검토 큐 → ${queuePath.replace(root + '/', '')}`)

// 변경이 있으면 종료 코드 1. CI가 이걸 보고 이슈를 연다.
process.exit(needsReview.length > 0 ? 1 : 0)
