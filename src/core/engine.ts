/**
 * 개인화 엔진.
 *
 * 프로필을 받아 해당되는 절차만, 선행 조건 순서대로 돌려준다.
 * 막힌 절차는 목록에서 빼지 않는다. "무엇이 먼저인지"를 같이 보여 주는 것이 이 제품의 값이다.
 */
import type { DocumentItem, Profile, Rule, Task } from './types'
import { addDays } from './freshness'

/** 이 프로필에 이 절차가 해당되는가. */
export function applies(rule: Rule, profile: Profile): boolean {
  const { visa, stay_over_days } = rule.applies_to
  if (visa && !visa.includes(profile.visa)) return false
  // 체류 예정일수 조건은 지금 프로필에 없다. 유학 비자는 모두 90일을 넘기므로 통과시킨다.
  if (stay_over_days !== undefined && stay_over_days > 365) return false
  return true
}

/** 이 프로필에 실제로 필요한 서류만 남긴다. */
export function documentsFor(rule: Rule, profile: Profile): DocumentItem[] {
  return rule.documents.filter(
    (d) => !d.condition?.visa || d.condition.visa.includes(profile.visa),
  )
}

/**
 * 마감일을 계산한다. 기준 날짜가 프로필에 없으면 null을 돌려준다.
 * 모르는 날짜를 오늘로 대신 채우면 없는 기한을 지어내게 된다.
 */
export function dueDateFor(rule: Rule, profile: Profile): string | null {
  const d = rule.deadline
  if (!d || d.days === null) return null
  const basis: Record<string, string | undefined> = {
    entry_date: profile.entryDate,
    registration_date: profile.registrationDate,
    move_in_date: profile.moveInDate,
    change_date: undefined, // 변경 사유가 생긴 날은 사용자가 그때 입력한다.
  }
  const from = basis[d.from]
  if (!from) return null
  return addDays(from, d.days)
}

export interface PersonalizeInput {
  rules: Rule[]
  profile: Profile
  /** 사용자가 끝냈다고 체크한 절차 id. 브라우저에만 저장된다. */
  done: string[]
  today: string
}

/**
 * 정렬 규칙:
 *   1. 아직 안 끝난 것이 먼저, 끝낸 것은 아래로
 *   2. 바로 할 수 있는 것이 막힌 것보다 먼저
 *   3. 마감이 빠른 것이 먼저, 마감 없는 것은 그 뒤
 *   4. 같으면 규칙 파일의 order
 */
export function personalize({ rules, profile, done, today }: PersonalizeInput): Task[] {
  const applicable = rules.filter((r) => applies(r, profile))
  const byId = new Map(applicable.map((r) => [r.id, r]))
  const doneSet = new Set(done)

  const tasks: Task[] = applicable.map((rule) => {
    const blockedBy = rule.requires
      .filter((id) => !doneSet.has(id))
      .map((id) => byId.get(id))
      .filter((r): r is Rule => Boolean(r))

    const softBlockedBy = (rule.requires_soft ?? [])
      .filter((id) => !doneSet.has(id))
      .map((id) => byId.get(id))
      .filter((r): r is Rule => Boolean(r))

    const dueDate = dueDateFor(rule, profile)

    return {
      rule,
      status: doneSet.has(rule.id) ? 'done' : blockedBy.length > 0 ? 'blocked' : 'available',
      blockedBy,
      softBlockedBy,
      dueDate,
      daysLeft: dueDate ? Math.floor((Date.parse(dueDate) - Date.parse(today)) / 86_400_000) : null,
    }
  })

  const rank = { available: 0, blocked: 1, done: 2 } as const
  return tasks.sort((a, b) => {
    if (rank[a.status] !== rank[b.status]) return rank[a.status] - rank[b.status]
    if (a.dueDate !== b.dueDate) {
      if (a.dueDate === null) return 1
      if (b.dueDate === null) return -1
      return a.dueDate < b.dueDate ? -1 : 1
    }
    return a.rule.order - b.rule.order
  })
}

/** 지금 당장 해야 할 하나. 홈 화면의 "다음 할 일"이 된다. */
export function nextTask(tasks: Task[]): Task | null {
  return tasks.find((t) => t.status === 'available') ?? null
}
