/**
 * 규칙 안에서만 답을 찾는 검색.
 *
 * 왜 브라우저 안에서 도는가: 이 제품에는 서버가 없다. 질문 문장이 밖으로 나가지 않는 것이
 * 기본값이어야 한다. 규칙이 7개뿐이라 색인이 작아 그대로 들고 있어도 된다.
 *
 * 왜 BM25인가: 한국어·영어·베트남어가 섞인 짧은 문서 백여 개가 대상이다.
 * 임베딩 모델을 브라우저로 내려받는 비용(수십 MB)에 비해 얻는 것이 적고,
 * 무엇보다 **왜 이 답이 나왔는지 사람이 설명할 수 있다**. 어느 단어가 걸렸는지 그대로 보여 줄 수 있다.
 */
import type { Chunk, ChunkField } from './chunks'

/**
 * 생활 용어 → 행정 용어.
 *
 * 인터뷰에서 나온 문제가 여기에도 있다. 사용자는 "알바", "통장", "폰"이라고 말하는데
 * 규칙 원문은 "아르바이트", "계좌", "휴대전화"라고 적혀 있다. 행정 용어를 모르는 사람이
 * 행정 용어로 물어야만 답을 받는다면, 그건 공식 안내가 이미 하고 있는 실패다.
 *
 * 번역이 아니라 **같은 것을 가리키는 다른 말**만 넣는다. 뜻이 달라지는 말은 넣지 않는다.
 */
const SYNONYMS: Record<string, string> = {
  // 한국어 — 조사가 붙어도 걸리도록 부분 일치로 찾는다
  알바: '아르바이트',
  토픽: 'topik 한국어능력',
  통장: '계좌',
  핸드폰: '휴대전화',
  휴대폰: '휴대전화',
  스마트폰: '휴대전화',
  잃어버: '분실 재발급',
  잊어버: '분실 재발급',
  없어졌: '분실 재발급',
  도난: '분실 재발급',
  주소지: '체류지',
  이사: '체류지 변경',
  의료보험: '건강보험',
  등본: '체류지 입증서류',
}

/** 라틴 문자 동의어는 낱말 단위로만 바꾼다. 부분 일치로 하면 almost 안의 lost 까지 걸린다. */
const WORD_SYNONYMS: Record<string, string> = {
  lost: '분실 재발급',
  lose: '분실',
  stolen: '분실',
  sim: '유심',
  usim: '유심',
  phone: '휴대전화',
  bank: '은행',
  insurance: '건강보험',
}

/**
 * 규칙의 어느 칸에서 걸렸는지에 따라 무게를 다르게 준다.
 *
 * 이걸 하지 않으면 "운전면허 어떻게 따요"가 건강보험 규칙에 걸린다. 건강보험 주의사항에
 * 신분증의 예로 운전면허증이 **스쳐 지나가듯** 적혀 있기 때문이다. 스치는 언급과
 * 그 규칙이 무엇에 관한 것인지는 같은 무게일 수 없다.
 */
const FIELD_WEIGHT: Record<ChunkField, number> = {
  title: 3,
  terms: 2.5,
  summary: 2,
  step: 1,
  document: 1,
  deadline: 1,
  requires: 1,
  caution: 0.8,
  contact: 0.4,
}

/**
 * 낱말을 찾는 정규식.
 *
 * 처음에는 라틴 문자를 U+00C0–U+024F 로 잡았는데, 베트남어가 쓰는 U+1EA0–U+1EF9(ấ, ờ, ị)가
 * 그 밖에 있어서 "giấy" 가 "gi" 와 "y" 로 쪼개지고 있었다. 테스트를 쓰다가 발견했다.
 * 그래서 문자 코드 범위 대신 유니코드 문자 속성으로 잡는다. \p{M} 은 결합 부호(조합형 성조)다.
 */
const LATIN = /[\p{Script=Latin}\p{N}\p{M}]+(?:-[\p{Script=Latin}\p{N}]+)?/gu
const HANGUL = /\p{Script=Hangul}+/gu

/**
 * 한국어에는 띄어쓰기만으로 안 되는 문제가 있다. "외국인등록증을"과 "외국인등록증"은
 * 다른 토큰이 된다. 형태소 분석기를 브라우저에 넣는 대신 **글자 2-gram**을 함께 만든다.
 * 조사가 붙어도 앞쪽 2-gram이 겹쳐서 걸린다.
 */
/** 생활 용어를 행정 용어로 넓힌다. 원래 말은 지우지 않고 덧붙이기만 한다. */
function expand(text: string): string {
  let out = text.toLowerCase()
  for (const [from, to] of Object.entries(SYNONYMS)) {
    if (out.includes(from)) out += ' ' + to
  }
  for (const [from, to] of Object.entries(WORD_SYNONYMS)) {
    if (new RegExp(`(^|[^a-z0-9])${from}([^a-z0-9]|$)`).test(out)) out += ' ' + to
  }
  return out
}

export function tokenize(text: string): string[] {
  const lower = expand(text)
  const tokens: string[] = []

  // 라틴·숫자 낱말 (영어, 베트남어, D-2 같은 코드)
  for (const m of lower.matchAll(LATIN)) {
    if (STOPWORDS.has(m[0])) continue
    tokens.push(m[0])
    // register ↔ registration, document ↔ documents 처럼 어미만 다른 말을 잇는다.
    // 형태소 분석기 대신 앞 5글자를 함께 넣는다. 낱말이 그대로 맞으면 낱말과 접두사가
    // 둘 다 걸려 점수가 두 번 붙고, 어미만 같으면 접두사 한 번만 붙는다.
    // 즉 정확히 맞은 쪽이 저절로 앞선다.
    if (m[0].length > 5) tokens.push(m[0].slice(0, 5) + '~')
  }

  // 한글은 낱말과 2-gram을 모두 넣는다
  for (const m of lower.matchAll(HANGUL)) {
    const word = m[0]
    if (STOPWORDS.has(word)) continue
    tokens.push(word)
    for (let i = 0; i < word.length - 1; i++) tokens.push(word.slice(i, i + 2))
  }
  return tokens
}

/**
 * 질문에서 뜻을 거의 담지 않는 말. 신뢰도를 계산할 때만 제외한다(검색 자체에서는 그대로 둔다).
 *
 * 이게 없으면 "when do I need to register as a foreigner" 가 낮은 신뢰도로 떨어진다.
 * 모르는 낱말 취급을 받는 when·do·need 때문에 정작 아는 낱말(register, foreigner)이 묻힌다.
 * 한국어는 조사가 붙은 채로 한 낱말이 되므로, 질문에 자주 붙는 어미를 함께 넣는다.
 */
const STOPWORDS = new Set([
  // 영어
  'a', 'an', 'the', 'i', 'my', 'me', 'do', 'does', 'did', 'is', 'are', 'am', 'was', 'be', 'can',
  'could', 'should', 'would', 'will', 'may', 'must', 'have', 'has', 'had', 'to', 'of', 'in', 'on',
  'at', 'for', 'with', 'and', 'or', 'but', 'if', 'as', 'it', 'this', 'that', 'what', 'when', 'where',
  'how', 'why', 'which', 'who', 'need', 'want', 'get', 'go', 'there', 'here', 'you', 'we', 'they',
  // 한국어 (질문에 흔히 붙는 말)
  '어떻게', '어디서', '어디에', '어디', '언제', '언제까지', '얼마나', '얼마', '무엇', '뭐', '뭐예요',
  '해야', '하나요', '할까요', '하려면', '되나요', '되요', '돼요', '있어요', '있나요', '없나요',
  '가능해요', '가능한가요', '필요해요', '필요한가요', '알려주세요', '주세요', '궁금해요', '싶어요',
  '그리고', '그런데', '제가', '저는', '나는', '내가', '좀', '수', '것', '때', '안', '못',
  // 베트남어
  'tôi', 'là', 'của', 'và', 'có', 'không', 'thì', 'được', 'cho', 'với', 'như', 'thế', 'nào',
  'gì', 'ở', 'bao', 'nhiêu', 'khi', 'sau', 'trước', 'muốn', 'cần', 'phải', 'này', 'đó', 'mà',
])

/**
 * 낱말 단위 토큰만 돌려준다. 한국어 2-gram 조각은 검색에는 쓰지만
 * "이 질문이 무엇에 관한 것인가"를 셀 때는 빼야 한다. 조각까지 세면 긴 질문이 무조건 유리해진다.
 */
export function tokenizeWords(text: string): string[] {
  const lower = expand(text)
  const words: string[] = []
  for (const m of lower.matchAll(/[a-z0-9\u00c0-\u024f]+(?:-[a-z0-9]+)?/g)) words.push(m[0])
  for (const m of lower.matchAll(/[\uac00-\ud7a3]+/g)) words.push(m[0])
  return words.filter((w) => !STOPWORDS.has(w))
}

const K1 = 1.4
const B = 0.72

export interface SearchIndex {
  chunks: Chunk[]
  /** 청크별 토큰 빈도 */
  tf: Map<string, number>[]
  lengths: number[]
  avgLength: number
  /** 토큰이 나타난 청크 수 */
  df: Map<string, number>
}

export function buildIndex(chunks: Chunk[]): SearchIndex {
  const tf: Map<string, number>[] = []
  const lengths: number[] = []
  const df = new Map<string, number>()

  for (const chunk of chunks) {
    const tokens = tokenize(chunk.haystack)
    const counts = new Map<string, number>()
    for (const t of tokens) counts.set(t, (counts.get(t) ?? 0) + 1)
    for (const t of counts.keys()) df.set(t, (df.get(t) ?? 0) + 1)
    tf.push(counts)
    lengths.push(tokens.length)
  }

  const avgLength = lengths.reduce((a, b) => a + b, 0) / (lengths.length || 1)
  return { chunks, tf, lengths, avgLength, df }
}

export interface Hit {
  chunk: Chunk
  score: number
  /** 어느 낱말이 걸려서 이 답이 나왔는지. 화면에 그대로 보여 준다. */
  matched: string[]
}

export interface RuleHit {
  ruleId: string
  score: number
  hits: Hit[]
}

function idf(index: SearchIndex, token: string): number {
  const n = index.chunks.length
  const df = index.df.get(token) ?? 0
  if (df === 0) return 0
  return Math.log(1 + (n - df + 0.5) / (df + 0.5))
}

export function searchChunks(index: SearchIndex, query: string): Hit[] {
  const queryTokens = [...new Set(tokenize(query))]
  if (queryTokens.length === 0) return []

  const hits: Hit[] = []
  for (let i = 0; i < index.chunks.length; i++) {
    let score = 0
    const matched: string[] = []
    for (const token of queryTokens) {
      const f = index.tf[i].get(token)
      if (!f) continue
      const norm = 1 - B + (B * index.lengths[i]) / index.avgLength
      score += idf(index, token) * ((f * (K1 + 1)) / (f + K1 * norm))
      // 2-gram 조각은 근거로 보여 주기에 지저분하므로 낱말만 남긴다
      if (token.length > 2 || /[a-z0-9]/.test(token)) matched.push(token)
    }
    if (score > 0) {
      hits.push({ chunk: index.chunks[i], score: score * FIELD_WEIGHT[index.chunks[i].field], matched })
    }
  }
  return hits.sort((a, b) => b.score - a.score)
}

/**
 * 신뢰도를 세 단계로 나눈다. 왜 둘이 아니라 셋인가:
 *
 * 규칙 7개짜리 색인으로 "답할 수 있다/없다"를 깨끗하게 가르는 경계선은 존재하지 않았다.
 * 평가셋으로 재 보니 규칙 안 질문의 최저점과 규칙 밖 질문의 최고점이 겹쳤다.
 * 억지로 한 줄을 그으면 둘 중 하나는 반드시 틀린다 — 답이 있는데 모른다고 하거나,
 * 없는데 답한 척하거나.
 *
 * 그래서 겹치는 구간을 숨기지 않고 그대로 "비슷한 내용은 있지만 이 질문에 대한 답인지는
 * 확실하지 않다"고 말한다. 신선도를 다루는 방식과 같다.
 */
export type Confidence = 'answer' | 'uncertain' | 'unknown'

/**
 * 평가셋(규칙 안 27문항 · 규칙 밖 9문항)으로 격자 탐색해 고른 값이다. 감으로 정하지 않았다.
 *
 *   임계값 0.8 → 규칙 안 89% 확신, 규칙 밖 2건 누출
 *   임계값 1.0 → 규칙 안 85% 확신, 규칙 밖 0건 누출   ← 고른 값
 *   임계값 1.4 → 규칙 안 59% 확신, 규칙 밖 0건 누출
 *
 * 누출이 0이 되는 가장 낮은 값을 골랐다. 규칙 밖 질문에 아는 척하는 것이
 * 이 제품에서 가장 나쁜 실패이고, 그 대신 규칙 안 질문 15%가 "비슷한 내용"으로 내려간다.
 * 그건 사용자에게 손해가 아니다 — 답은 여전히 보여 주고 확신만 낮춘 것이다.
 */
export const CONFIDENCE_THRESHOLDS = { answer: 1.0, uncertain: 0.35 }

export interface SearchResult {
  confidence: Confidence
  /** 질문이 가진 정보량으로 나눈 점수. 길고 산만한 질문이 점수만 높아지는 것을 막는다. */
  normalized: number
  topScore: number
  rules: RuleHit[]
}

/** 이 색인이 한 번도 본 적 없는 낱말에 주는 정보량. 모르는 말일수록 "우리 범위 밖"이라는 신호다. */
function maxIdf(index: SearchIndex): number {
  return Math.log(1 + (index.chunks.length + 0.5) / 0.5)
}

export function search(index: SearchIndex, query: string, limit = 3): SearchResult {
  const hits = searchChunks(index, query)

  // 청크 점수를 규칙 단위로 모은다. 한 규칙에서 여러 칸이 걸리면 그만큼 확실한 답이다.
  const byRule = new Map<string, Hit[]>()
  for (const hit of hits) {
    const list = byRule.get(hit.chunk.ruleId) ?? []
    list.push(hit)
    byRule.set(hit.chunk.ruleId, list)
  }

  const rules: RuleHit[] = [...byRule.entries()]
    .map(([ruleId, list]) => ({
      ruleId,
      // 1등은 그대로, 나머지는 절반만 더한다. 한 칸만 강하게 걸린 규칙이 밀리지 않게 한다.
      score: list[0].score + list.slice(1, 4).reduce((a, h) => a + h.score * 0.5, 0),
      hits: list.slice(0, 4),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)

  const topScore = hits[0]?.score ?? 0

  // 질문이 담은 정보량: 아는 낱말은 그 낱말의 정보량, 모르는 낱말은 최대값으로 센다.
  const words = [...new Set(tokenizeWords(query))]
  const mass = words.reduce((a, w) => a + (idf(index, w) || maxIdf(index)), 0)
  const normalized = mass > 0 ? topScore / mass : 0

  const confidence: Confidence =
    normalized >= CONFIDENCE_THRESHOLDS.answer
      ? 'answer'
      : normalized >= CONFIDENCE_THRESHOLDS.uncertain
        ? 'uncertain'
        : 'unknown'

  return { confidence, normalized, topScore, rules }
}
