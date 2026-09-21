/**
 * 신선도 계산.
 *
 * 이 파일이 이 제품의 핵심이다. 상태를 데이터에 적어 두지 않고 날짜에서 계산한다.
 * 그래서 아무도 손대지 않으면 상태는 저절로 나빠지고, 화면에 "확인 필요"가 뜬다.
 * 인터뷰에서 나온 "작년 정보인 것 같아 불안했다"를 코드로 막는 장치다.
 */
import type { Rule, Source } from './types'

/** 이 일수 안에 확인된 것만 verified로 본다. 커버리지 지표의 기준이기도 하다. */
export const FRESH_DAYS = 90

export type FreshnessState =
  /** 최근에 사람이 원문을 확인했다. */
  | 'verified'
  /** 확인한 지 오래됐지만 아직 점검 기한은 남았다. */
  | 'aging'
  /** 점검 기한이 지났다. 화면에 "확인 필요"가 붙는다. */
  | 'stale'
  /** 원문이 바뀐 것을 배치가 감지했다. 사람이 볼 때까지 믿지 않는다. */
  | 'changed'

const DAY = 86_400_000

export function daysBetween(from: string, to: string): number {
  return Math.floor((Date.parse(to) - Date.parse(from)) / DAY)
}

export function addDays(date: string, days: number): string {
  return new Date(Date.parse(date) + days * DAY).toISOString().slice(0, 10)
}

export function sourceState(source: Source, today: string): FreshnessState {
  // 원문이 바뀐 것이 확인되면 다른 무엇보다 먼저다. 확인일이 아무리 최근이어도 소용없다.
  if (source.changed_at && source.changed_at > source.checked_on) return 'changed'
  if (daysBetween(source.next_check_on, today) > 0) return 'stale'
  if (daysBetween(source.checked_on, today) > FRESH_DAYS) return 'aging'
  return 'verified'
}

const SEVERITY: Record<FreshnessState, number> = {
  verified: 0,
  aging: 1,
  stale: 2,
  changed: 3,
}

/** 규칙의 상태는 그 규칙이 기대는 출처 중 가장 나쁜 것을 따른다. 하나라도 낡으면 규칙 전체가 낡은 것이다. */
export function ruleState(rule: Rule, today: string): FreshnessState {
  return rule.sources.reduce<FreshnessState>((worst, s) => {
    const state = sourceState(s, today)
    return SEVERITY[state] > SEVERITY[worst] ? state : worst
  }, 'verified')
}

/** 사용자에게 경고를 띄워야 하는 상태인가. */
export function needsWarning(state: FreshnessState): boolean {
  return state === 'stale' || state === 'changed'
}

export interface Coverage {
  total: number
  verified: number
  /** 90일 이내에 확인된 출처의 비율(%). README 배지와 대시보드에 쓴다. */
  ratio: number
}

/** 커버리지는 규칙이 아니라 출처 단위로 센다. 규칙 하나가 출처 세 개를 기대면 셋 다 세어야 정직하다. */
export function coverage(rules: Rule[], today: string): Coverage {
  const sources = rules.flatMap((r) => r.sources)
  const verified = sources.filter((s) => sourceState(s, today) === 'verified').length
  const total = sources.length
  return { total, verified, ratio: total === 0 ? 0 : Math.round((verified / total) * 100) }
}
