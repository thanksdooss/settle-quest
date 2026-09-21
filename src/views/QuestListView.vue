<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { useRules } from '../composables/useRules'
import { useProfile } from '../composables/useProfile'
import FreshnessBadge from '../components/FreshnessBadge.vue'
import LegalNotice from '../components/LegalNotice.vue'
import type { Lang } from '../core/types'

const { t, locale } = useI18n()
const router = useRouter()
const { tasks, stateOf } = useRules()
const { hasProfile, reset } = useProfile()

if (!hasProfile.value) router.replace('/')

const lang = computed(() => locale.value as Lang)
const doneCount = computed(() => tasks.value.filter((x) => x.status === 'done').length)
const percent = computed(() =>
  tasks.value.length ? Math.round((doneCount.value / tasks.value.length) * 100) : 0,
)
const next = computed(() => tasks.value.find((x) => x.status === 'available'))

function resetProfile() {
  reset()
  router.push('/')
}
</script>

<template>
  <h1>{{ t('quest.listTitle') }}</h1>

  <div class="card">
    <div class="spread">
      <strong>{{ t('quest.progress', { done: doneCount, total: tasks.length }) }}</strong>
      <button style="padding: 4px 10px; font-size: 0.8rem" @click="resetProfile">
        {{ t('common.reset') }}
      </button>
    </div>
    <div class="progress-bar"><span :style="{ width: percent + '%' }" /></div>
    <p v-if="next" class="muted" style="margin: 12px 0 0">
      {{ t('quest.next') }} — <strong>{{ next.rule.title[lang] }}</strong>
    </p>
  </div>

  <LegalNotice />

  <p v-if="!tasks.length" class="muted">{{ t('quest.empty') }}</p>

  <RouterLink
    v-for="task in tasks"
    :key="task.rule.id"
    :to="`/quests/${task.rule.id}`"
    class="card"
    style="display: block; text-decoration: none; color: inherit"
  >
    <div class="spread">
      <strong :style="{ opacity: task.status === 'done' ? 0.55 : 1 }">
        {{ task.status === 'done' ? '✓ ' : '' }}{{ task.rule.title[lang] }}
      </strong>
      <FreshnessBadge :state="stateOf(task.rule)" />
    </div>

    <p class="muted" style="margin: 6px 0 0">{{ task.rule.summary[lang] }}</p>

    <p v-if="task.status === 'blocked'" class="muted" style="margin: 8px 0 0">
      ⤷ {{ t('quest.blockedBy') }}: {{ task.blockedBy.map((r) => r.title[lang]).join(', ') }}
    </p>
    <p v-else-if="task.softBlockedBy.length" class="muted" style="margin: 8px 0 0">
      ⤷ {{ t('quest.softNote') }}: {{ task.softBlockedBy.map((r) => r.title[lang]).join(', ') }}
    </p>

    <p v-if="task.dueDate" class="muted" style="margin: 6px 0 0">
      {{ t('quest.deadline') }} {{ task.dueDate }} ·
      <span :style="{ color: (task.daysLeft ?? 0) < 14 ? 'var(--danger)' : 'inherit' }">
        {{
          (task.daysLeft ?? 0) >= 0
            ? t('quest.daysLeft', { days: task.daysLeft })
            : t('quest.overdue', { days: -(task.daysLeft ?? 0) })
        }}
      </span>
    </p>
  </RouterLink>
</template>
