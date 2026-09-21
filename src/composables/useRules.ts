import { computed } from 'vue'
import bundle from '../generated/rules.json'
import type { Rule, RuleBundle, Task } from '../core/types'
import { personalize } from '../core/engine'
import { coverage, ruleState } from '../core/freshness'
import { useProfile } from './useProfile'
import { useProgress } from './useProgress'

const data = bundle as unknown as RuleBundle

/** 오늘 날짜. 신선도 계산의 기준이라 한 곳에서만 만든다. */
export function today(): string {
  return new Date().toISOString().slice(0, 10)
}

export function useRules() {
  const { profile } = useProfile()
  const { done } = useProgress()

  const tasks = computed<Task[]>(() =>
    profile.value
      ? personalize({ rules: data.rules, profile: profile.value, done: done.value, today: today() })
      : [],
  )

  return {
    bundle: data,
    rules: data.rules,
    desks: data.desks,
    deskSources: data.deskSources,
    tasks,
    coverage: computed(() => coverage(data.rules, today())),
    stateOf: (rule: Rule) => ruleState(rule, today()),
    find: (id: string) => data.rules.find((r) => r.id === id),
  }
}
