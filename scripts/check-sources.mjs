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

/**
 * 오류의 진짜 원인까지 펼친다. fetch 는 DNS 실패도, TLS 실패도, 연결 거부도
 * 전부 "fetch failed" 한 줄로 덮고 진짜 원인을 cause 에 숨긴다.
 * 이걸 버리면 검토 큐에 "못 읽음"만 남아 원인을 영영 알 수 없다.
 */
export function explain(error) {
  const parts = []
  let e = error
  while (e) {
    parts.push([e.code, e.message].filter(Boolean).join(' '))
    e = e.cause
  }
  return parts.join(' ← ')
}

/**
 * 한 번 실패했다고 "못 읽었다"로 단정하지 않는다.
 *
 * 첫 운영 실행에서 출처 12건이 한꺼번에 실패한 적이 있다. 원인을 조사해 보니
 * 접속 차단이 아니라 일시적인 장애였고, 같은 환경에서 다시 돌리니 12건 모두 읽혔다.
 * 공공기관 사이트는 점검·장애가 잦다. 재시도 없이 한 번 실패를 사건으로 기록하면
 * 검토 큐가 헛경보로 차고, 그러면 아무도 큐를 보지 않게 된다.
 */
const ATTEMPTS = 3

async function fetchText(url) {
  let lastError
  for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { 'user-agent': 'settle-quest-source-check/0.1 (+rules freshness batch)' },
        redirect: 'follow',
        // 응답이 없을 때 무한정 기다리지 않는다. 기다리다 죽으면 원인을 못 남긴다.
        signal: AbortSignal.timeout(30_000),
      })
      // 5xx 는 서버가 잠시 힘든 것일 수 있으니 다시 물어본다. 4xx 는 다시 물어도 같다.
      if (res.status >= 500) throw new Error(`HTTP ${res.status}`)
      if (!res.ok) throw Object.assign(new Error(`HTTP ${res.status}`), { noRetry: true })
      return await res.text()
    } catch (e) {
      lastError = e
      if (e.noRetry || attempt === ATTEMPTS) break
      await new Promise((r) => setTimeout(r, 2000 * attempt))
    }
  }
  throw lastError
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
      // 못 읽은 것은 "원문이 바뀌었다"가 아니다. changed_at 을 찍으면 사용자 화면에
      // "원문 변경됨"이라는 사실이 아닌 말이 뜬다. 그래서 규칙 데이터는 건드리지 않고
      // 검토 큐에만 올린다. 아무도 확인하지 않으면 next_check_on 이 지나 저절로 "확인 필요"가 된다.
      entry.state = 'unreachable'
      entry.error = explain(e)
    }
    results.push(entry)
  }

  if (write) writeFileSync(path, text)
}

const by = (state) => results.filter((r) => r.state === state)
const needsReview = [...by('changed'), ...by('unreachable')]
// 전부 못 읽었다면 개별 원문 문제가 아니라 네트워크나 실행 환경 문제로 본다.
// 재시도까지 하고도 전부 실패했다면 출처 12곳이 동시에 바뀐 것보다 이쪽이 훨씬 그럴듯하다.
const environmentFailure = results.length > 0 && by('unreachable').length === results.length

const lines = [
  '# 원문 변경 검토 큐',
  '',
  `자동 생성 — ${today}. \`node scripts/check-sources.mjs --write\` 가 만든다.`,
  '',
  `출처 ${results.length}건 · 변경 ${by('changed').length} · 접근 불가 ${by('unreachable').length} · 동일 ${by('same').length} · 최초 기록 ${by('baseline').length}`,
  '',
]

if (environmentFailure) {
  lines.push(
    '**출처에 하나도 접속하지 못했습니다.** 원문이 바뀐 것이 아니라 네트워크 또는 실행 환경 문제입니다.',
    '`node scripts/diagnose-sources.mjs` 로 DNS·TLS·HTTP 중 어디서 막히는지 확인하십시오.',
    '',
    `첫 번째 오류: ${by('unreachable')[0].error}`,
  )
} else if (needsReview.length === 0) {
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

// 0: 이상 없음 · 1: 사람이 볼 것이 있음 · 2: 실행 환경이 출처에 닿지 못함
if (environmentFailure) {
  console.error('✗ 출처에 하나도 접속하지 못했습니다. node scripts/diagnose-sources.mjs 로 원인을 확인하십시오.')
  process.exit(2)
}
process.exit(needsReview.length > 0 ? 1 : 0)
