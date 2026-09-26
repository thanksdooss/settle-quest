import { describe, expect, it } from 'vitest'
import bundle from '../src/generated/rules.json'
import { allChunks } from '../src/core/chunks'
import { buildIndex, search, tokenize } from '../src/core/search'
import type { RuleBundle } from '../src/core/types'
import { IN_SCOPE, OUT_OF_SCOPE } from './eval-set'

const index = buildIndex(allChunks(bundle as unknown as RuleBundle))

describe('토큰 만들기', () => {
  it('한국어는 낱말과 2-gram을 함께 만든다 — 조사가 붙어도 걸리게', () => {
    const tokens = tokenize('외국인등록증을')
    expect(tokens).toContain('외국인등록증을')
    expect(tokens).toContain('외국')
    expect(tokens).toContain('등록')
  })

  it('비자 코드와 베트남어를 잃지 않는다', () => {
    expect(tokenize('D-2 학생')).toContain('d-2')
    // 베트남어는 U+1EA0~U+1EF9 를 쓴다. 이걸 빠뜨려 "giấy"가 "gi"와 "y"로 쪼개진 적이 있다.
    expect(tokenize('giấy tờ')).toEqual(expect.arrayContaining(['giấy', 'tờ']))
    expect(tokenize('thẻ đăng ký')).toEqual(expect.arrayContaining(['thẻ', 'đăng']))
  })
})

describe('규칙 안에서 답 찾기', () => {
  it.each(IN_SCOPE)('$q → $rule', ({ q, rule }) => {
    const result = search(index, q)
    // 확신하든 "비슷한 내용"이든, 1순위 규칙은 맞아야 한다
    expect(result.confidence).not.toBe('unknown')
    expect(result.rules[0].ruleId).toBe(rule)
  })

  it('세 언어 질문의 1순위 정확도가 100%다', () => {
    const correct = IN_SCOPE.filter((c) => search(index, c.q).rules[0]?.ruleId === c.rule).length
    expect(correct / IN_SCOPE.length).toBe(1)
  })

  it('85% 이상은 "확실한 답"으로 분류된다', () => {
    const confident = IN_SCOPE.filter((c) => search(index, c.q).confidence === 'answer').length
    expect(confident / IN_SCOPE.length).toBeGreaterThanOrEqual(0.85)
  })

  it('답의 근거가 된 낱말을 함께 돌려준다 — 왜 이 답인지 보여 주기 위해', () => {
    const result = search(index, '아르바이트 허가')
    expect(result.rules[0].hits[0].matched.length).toBeGreaterThan(0)
  })

  it('생활 용어로 물어도 행정 용어를 찾아 준다', () => {
    // 사용자는 "알바"라고 하고 규칙은 "아르바이트"라고 적혀 있다
    expect(search(index, '알바 몇 시간').rules[0].ruleId).toBe('part-time-work')
    expect(search(index, '통장 만들기').rules[0].ruleId).toBe('bank-account')
    expect(search(index, '핸드폰 개통').rules[0].ruleId).toBe('mobile-phone')
  })
})

describe('모르는 것에 답하지 않는다', () => {
  it.each(OUT_OF_SCOPE)('%s → 확신하지 않음', (q) => {
    // 규칙 밖 질문이 "확실한 답"으로 넘어가는 것이 이 제품에서 가장 나쁜 실패다
    expect(search(index, q).confidence).not.toBe('answer')
  })

  it('빈 질문에는 답하지 않는다', () => {
    expect(search(index, '   ').confidence).toBe('unknown')
  })

  it('규칙 밖 질문은 하나도 답으로 넘어가지 않는다', () => {
    const leaked = OUT_OF_SCOPE.filter((q) => search(index, q).confidence === 'answer')
    expect(leaked).toEqual([])
  })
})

describe('스쳐 지나가는 언급에 끌려가지 않는다', () => {
  it('건강보험 주의사항에 운전면허증이 적혀 있어도 운전면허 질문에 확신하지 않는다', () => {
    expect(search(index, '운전면허 어떻게 따요').confidence).not.toBe('answer')
  })
})
