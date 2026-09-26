import { describe, expect, it } from 'vitest'
import bundle from '../src/generated/rules.json'
import { allChunks } from '../src/core/chunks'
import { buildIndex, search, CONFIDENCE_THRESHOLDS } from '../src/core/search'
import type { RuleBundle } from '../src/core/types'
import { IN_SCOPE, OUT_OF_SCOPE } from './eval-set'

const index = buildIndex(allChunks(bundle as unknown as RuleBundle))
const inside = () => IN_SCOPE.map((c) => search(index, c.q).normalized)
const outside = () => OUT_OF_SCOPE.map((q) => search(index, q).normalized)
const leaksAt = (t: number) => outside().filter((n) => n >= t).length
const confidentAt = (t: number) => inside().filter((n) => n >= t).length / IN_SCOPE.length

/**
 * 임계값이 왜 이 값인지를 테스트로 고정한다.
 * 누가 "확신 비율을 높이자"며 값을 내리면, 규칙 밖 질문이 새기 시작하는 것을 여기서 잡는다.
 */
describe('신뢰도 임계값의 근거', () => {
  it('고른 값에서는 규칙 밖 질문이 하나도 새지 않는다', () => {
    expect(leaksAt(CONFIDENCE_THRESHOLDS.answer)).toBe(0)
  })

  it('이보다 낮추면 새기 시작한다 — 그래서 더 낮출 수 없다', () => {
    expect(leaksAt(0.8)).toBeGreaterThan(0)
  })

  it('이 값에서 규칙 안 질문의 85% 이상이 확신으로 분류된다', () => {
    expect(confidentAt(CONFIDENCE_THRESHOLDS.answer)).toBeGreaterThanOrEqual(0.85)
  })

  it('확신하지 못한 질문도 규칙은 맞게 찾는다 — 답을 감추지 않는다', () => {
    const unsure = IN_SCOPE.filter((c) => search(index, c.q).confidence === 'uncertain')
    for (const c of unsure) expect(search(index, c.q).rules[0].ruleId).toBe(c.rule)
  })
})
