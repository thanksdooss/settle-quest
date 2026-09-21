import { describe, expect, it } from 'vitest'
import { coverage, needsWarning, ruleState, sourceState } from '../src/core/freshness'
import type { Rule, Source } from '../src/core/types'

const source = (over: Partial<Source> = {}): Source => ({
  id: 's',
  publisher: '기관',
  title: '제목',
  url: 'https://example.go.kr/a',
  source_updated_on: null,
  checked_by: 'maintainer',
  checked_on: '2026-09-01',
  next_check_on: '2026-11-30',
  ...over,
})

describe('출처 신선도', () => {
  it('최근에 확인했으면 verified', () => {
    expect(sourceState(source(), '2026-09-21')).toBe('verified')
  })

  it('90일이 지나면 aging — 점검 기한은 아직 남아 있다', () => {
    const s = source({ checked_on: '2026-06-01', next_check_on: '2026-12-31' })
    expect(sourceState(s, '2026-09-21')).toBe('aging')
  })

  it('점검 기한이 지나면 stale', () => {
    const s = source({ checked_on: '2026-01-01', next_check_on: '2026-04-01' })
    expect(sourceState(s, '2026-09-21')).toBe('stale')
  })

  it('원문이 바뀌면 방금 확인했더라도 changed — 확인일보다 변경이 우선한다', () => {
    const s = source({ checked_on: '2026-09-20', changed_at: '2026-09-21' })
    expect(sourceState(s, '2026-09-21')).toBe('changed')
  })

  it('사람이 다시 확인해 checked_on 을 올리면 changed 가 풀린다', () => {
    const s = source({ changed_at: '2026-09-10', checked_on: '2026-09-21' })
    expect(sourceState(s, '2026-09-21')).toBe('verified')
  })

  it('아무도 손대지 않으면 시간이 흘러 저절로 stale 이 된다', () => {
    const s = source({ checked_on: '2026-09-21', next_check_on: '2026-12-20' })
    expect(sourceState(s, '2026-09-21')).toBe('verified')
    expect(sourceState(s, '2026-12-21')).toBe('stale')
  })
})

describe('규칙 신선도', () => {
  const rule = (sources: Source[]) => ({ sources } as Rule)

  it('출처 중 가장 나쁜 상태를 따른다', () => {
    const r = rule([
      source({ id: 'a' }),
      source({ id: 'b', checked_on: '2026-01-01', next_check_on: '2026-04-01' }),
    ])
    expect(ruleState(r, '2026-09-21')).toBe('stale')
  })

  it('stale 과 changed 만 사용자에게 경고를 띄운다', () => {
    expect(needsWarning('verified')).toBe(false)
    expect(needsWarning('aging')).toBe(false)
    expect(needsWarning('stale')).toBe(true)
    expect(needsWarning('changed')).toBe(true)
  })
})

describe('커버리지', () => {
  it('규칙이 아니라 출처 단위로 센다', () => {
    const rules = [
      rule([source({ id: 'a' }), source({ id: 'b', checked_on: '2026-01-01', next_check_on: '2026-04-01' })]),
      rule([source({ id: 'c' })]),
    ]
    expect(coverage(rules, '2026-09-21')).toEqual({ total: 3, verified: 2, ratio: 67 })
  })

  function rule(sources: Source[]) {
    return { sources } as Rule
  }
})
