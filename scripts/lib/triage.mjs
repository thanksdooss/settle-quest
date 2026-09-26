/**
 * 원문이 바뀌었을 때 "무엇이 어떻게 바뀌었는지"를 판별한다.
 *
 * 지금까지는 해시가 1바이트만 달라도 사람을 불렀다. 공지 배너 문구가 바뀐 것과
 * "신고 기한 15일 → 30일"이 바뀐 것이 같은 무게로 큐에 쌓이면, 큐는 곧 아무도 안 보게 된다.
 *
 * **규칙을 고치지는 않는다.** 사람이 볼 큐의 순서를 매길 뿐이다. 고치는 것은 여전히 사람의 일이다.
 */

/** 줄 단위 최장 공통 부분수열로 무엇이 빠지고 무엇이 들어왔는지 찾는다. */
export function diffLines(oldText, newText) {
  const a = oldText.split('\n').map((l) => l.trim()).filter(Boolean)
  const b = newText.split('\n').map((l) => l.trim()).filter(Boolean)

  // 두 쪽 모두에 있는 줄은 그대로 둔다. 순서가 바뀐 것까지 잡을 필요는 없다.
  const inB = new Map()
  for (const line of b) inB.set(line, (inB.get(line) ?? 0) + 1)
  const inA = new Map()
  for (const line of a) inA.set(line, (inA.get(line) ?? 0) + 1)

  const removed = a.filter((line) => (inB.get(line) ?? 0) === 0)
  const added = b.filter((line) => (inA.get(line) ?? 0) === 0)
  return { added, removed }
}

/**
 * 규칙의 내용과 상관없이 늘 흔들리는 것들. 이게 바뀌었다고 사람을 부르면 안 된다.
 * 공지 배너, 방문자 수, 접속 시각 같은 것들이다.
 */
const NOISE = [
  /공지사항|공지|알림|배너|팝업/,
  /조회수|방문자|접속자|오늘|누적/,
  /\d{4}[-.]\d{1,2}[-.]\d{1,2}\s*(일시|기준)?$/,
  /copyright|all rights reserved/i,
  /이전\s*글|다음\s*글|목록으로/,
]

/** 이 말이 바뀌면 절차 자체가 달라진 것이다. */
const CRITICAL = [
  { pattern: /(\d+)\s*(일|개월|년|시간)\s*(이내|안에|이상|미만|까지)?/, reason: '기간·기한' },
  { pattern: /기한|마감|이내에|까지\s*(신고|신청|제출)/, reason: '기한' },
  { pattern: /(과태료|벌금|징역|강제퇴거|제재)/, reason: '제재' },
  { pattern: /(수수료|비용|요금|원\b|만\s*원)/, reason: '비용' },
  { pattern: /(제출\s*서류|구비\s*서류|필요\s*서류|첨부\s*서류)/, reason: '제출 서류' },
  { pattern: /(폐지|신설|변경|개정|시행)\s*(됩니다|되었|예정|안내)?/, reason: '제도 변경' },
]

const stripNoise = (lines) => lines.filter((l) => !NOISE.some((re) => re.test(l)))

/**
 * 바뀐 줄이 이 규칙의 어느 칸과 관련 있는지 본다.
 * 규칙에 이미 적혀 있는 말이 바뀐 줄에 들어 있으면, 그 칸이 영향을 받는다고 본다.
 */
function affectedFields(lines, rule) {
  if (!rule) return []
  const text = lines.join(' ')
  const fields = new Set()
  const touches = (value) => value && value.length > 3 && text.includes(value)

  for (const doc of rule.documents ?? []) if (touches(doc.ko)) fields.add('documents')
  for (const step of rule.steps ?? []) if (touches(step.ko)) fields.add('steps')
  for (const caution of rule.cautions ?? []) if (touches(caution.ko)) fields.add('cautions')
  for (const term of rule.terms ?? []) if (touches(term.ko)) fields.add('terms')
  if (rule.deadline?.days != null && new RegExp(`${rule.deadline.days}\\s*일`).test(text)) {
    fields.add('deadline')
  }
  return [...fields]
}

/**
 * 심각도를 매긴다.
 *
 *   high   — 기한·제재·비용·서류처럼 절차 자체가 달라질 수 있는 말이 바뀌었다
 *   medium — 규칙에 적힌 내용과 겹치는 말이 바뀌었다
 *   low    — 공지 배너나 날짜 스탬프처럼 늘 흔들리는 것만 바뀌었다
 */
export function classifyChange({ added, removed }, rule) {
  const meaningful = stripNoise([...added, ...removed])

  if (meaningful.length === 0) {
    return { severity: 'low', reasons: ['공지·날짜 등 늘 바뀌는 부분만 달라졌습니다'], fields: [], samples: [] }
  }

  const reasons = []
  for (const { pattern, reason } of CRITICAL) {
    if (meaningful.some((l) => pattern.test(l)) && !reasons.includes(reason)) reasons.push(reason)
  }

  const fields = affectedFields(meaningful, rule)
  // 사람이 큐에서 바로 판단할 수 있도록 실제로 바뀐 줄을 함께 남긴다
  const samples = meaningful.slice(0, 5).map((l) => (l.length > 160 ? l.slice(0, 160) + '…' : l))

  if (reasons.length > 0) return { severity: 'high', reasons, fields, samples }
  if (fields.length > 0) return { severity: 'medium', reasons: ['규칙에 적힌 내용과 겹치는 부분이 바뀌었습니다'], fields, samples }
  return { severity: 'medium', reasons: ['본문이 바뀌었습니다'], fields, samples }
}

export const SEVERITY_ORDER = { high: 0, medium: 1, low: 2 }
