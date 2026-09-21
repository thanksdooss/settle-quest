import { describe, expect, it } from 'vitest'
import { documentsFor, dueDateFor, nextTask, personalize } from '../src/core/engine'
import type { Profile, Rule } from '../src/core/types'
import bundle from '../src/generated/rules.json'

const rules = bundle.rules as unknown as Rule[]
const TODAY = '2026-09-21'

const profile = (over: Partial<Profile> = {}): Profile => ({
  nationality: 'VN',
  visa: 'D-2',
  entryDate: '2026-09-01',
  hasArc: false,
  ...over,
})

const ids = (tasks: { rule: Rule }[]) => tasks.map((t) => t.rule.id)

describe('프로필 조합별 절차 목록', () => {
  it('유학(D-2) 신입생은 7개 절차를 모두 받는다', () => {
    const tasks = personalize({ rules, profile: profile(), done: [], today: TODAY })
    expect(tasks).toHaveLength(7)
  })

  it('아무것도 끝내지 않았으면 외국인등록이 가장 먼저다', () => {
    const tasks = personalize({ rules, profile: profile(), done: [], today: TODAY })
    expect(nextTask(tasks)?.rule.id).toBe('alien-registration')
  })

  it('외국인등록 전에는 건강보험·체류지신고·아르바이트가 막혀 있다', () => {
    const tasks = personalize({ rules, profile: profile(), done: [], today: TODAY })
    const blocked = tasks.filter((t) => t.status === 'blocked').map((t) => t.rule.id)
    expect(blocked).toContain('health-insurance')
    expect(blocked).toContain('residence-report')
    expect(blocked).toContain('part-time-work')
  })

  it('막힌 절차는 목록에서 사라지지 않고 무엇 때문에 막혔는지 함께 온다', () => {
    const tasks = personalize({ rules, profile: profile(), done: [], today: TODAY })
    const insurance = tasks.find((t) => t.rule.id === 'health-insurance')!
    expect(insurance.status).toBe('blocked')
    expect(ids(insurance.blockedBy.map((rule) => ({ rule })))).toEqual(['alien-registration'])
  })

  it('은행과 통신은 외국인등록 없이도 할 수 있다 — 다만 선택지가 줄어든다고 알려 준다', () => {
    const tasks = personalize({ rules, profile: profile(), done: [], today: TODAY })
    for (const id of ['bank-account', 'mobile-phone']) {
      const task = tasks.find((t) => t.rule.id === id)!
      expect(task.status).toBe('available')
      expect(task.softBlockedBy.map((r) => r.id)).toContain('alien-registration')
    }
  })

  it('외국인등록을 끝내면 막혔던 절차가 풀린다', () => {
    const tasks = personalize({ rules, profile: profile(), done: ['alien-registration'], today: TODAY })
    const blocked = tasks.filter((t) => t.status === 'blocked')
    expect(blocked).toHaveLength(0)
    expect(tasks.filter((t) => t.status === 'done').map((t) => t.rule.id)).toEqual(['alien-registration'])
  })

  it('끝낸 절차는 목록 맨 아래로 내려간다', () => {
    const tasks = personalize({ rules, profile: profile(), done: ['alien-registration'], today: TODAY })
    expect(tasks[tasks.length - 1].rule.id).toBe('alien-registration')
  })
})

describe('기한 계산', () => {
  it('외국인등록은 입국일부터 90일', () => {
    const rule = rules.find((r) => r.id === 'alien-registration')!
    expect(dueDateFor(rule, profile({ entryDate: '2026-09-01' }))).toBe('2026-11-30')
  })

  it('9월 1일 입국이면 9월 21일에 70일이 남는다', () => {
    const tasks = personalize({ rules, profile: profile(), done: [], today: TODAY })
    expect(tasks.find((t) => t.rule.id === 'alien-registration')!.daysLeft).toBe(70)
  })

  it('기준 날짜를 모르면 기한을 지어내지 않고 null 을 돌려준다', () => {
    const rule = rules.find((r) => r.id === 'health-insurance')!
    expect(dueDateFor(rule, profile())).toBeNull()
  })

  it('외국인등록일을 입력하면 건강보험 가입일이 그날로 계산된다', () => {
    const rule = rules.find((r) => r.id === 'health-insurance')!
    expect(dueDateFor(rule, profile({ registrationDate: '2026-10-05' }))).toBe('2026-10-05')
  })

  it('시간제 취업은 기한이 아니라 순서의 문제라 마감일이 없다', () => {
    const rule = rules.find((r) => r.id === 'part-time-work')!
    expect(rule.deadline?.days).toBeNull()
    expect(dueDateFor(rule, profile())).toBeNull()
  })
})

describe('비자별 서류 분기', () => {
  it('D-2에게는 재학증명서가 나오고 D-4 전용 서류는 빠진다', () => {
    const rule = rules.find((r) => r.id === 'alien-registration')!
    const docs = documentsFor(rule, profile({ visa: 'D-2' })).map((d) => d.ko)
    expect(docs.some((d) => d.includes('유학(D-2)인 경우 재학증명서'))).toBe(true)
    expect(docs.some((d) => d.includes('일반연수(D-4)'))).toBe(false)
  })

  it('D-4에게는 반대로 나온다', () => {
    const rule = rules.find((r) => r.id === 'alien-registration')!
    const docs = documentsFor(rule, profile({ visa: 'D-4' })).map((d) => d.ko)
    expect(docs.some((d) => d.includes('일반연수(D-4)'))).toBe(true)
    expect(docs.some((d) => d.includes('유학(D-2)인 경우 재학증명서'))).toBe(false)
  })

  it('조건 없는 공통 서류는 두 비자 모두에게 나온다', () => {
    const rule = rules.find((r) => r.id === 'alien-registration')!
    for (const visa of ['D-2', 'D-4'] as const) {
      expect(documentsFor(rule, profile({ visa })).map((d) => d.ko)).toContain('신청서')
    }
  })
})

describe('규칙 데이터가 지켜야 할 것', () => {
  it('모든 절차에 출처가 하나 이상 있다', () => {
    for (const rule of rules) expect(rule.sources.length).toBeGreaterThan(0)
  })

  it('모든 출처에 확인일과 다음 점검일이 있다', () => {
    for (const rule of rules) {
      for (const s of rule.sources) {
        expect(s.checked_on).toMatch(/^\d{4}-\d{2}-\d{2}$/)
        expect(s.next_check_on > s.checked_on).toBe(true)
      }
    }
  })

  it('상태는 데이터에 적혀 있지 않다 — 날짜에서 계산해야 한다', () => {
    for (const rule of rules) {
      for (const s of rule.sources) expect(s).not.toHaveProperty('status')
    }
  })
})
