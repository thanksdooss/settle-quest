<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { useRules } from '../composables/useRules'
import { useProfile } from '../composables/useProfile'
import { useProgress } from '../composables/useProgress'
import { documentsFor } from '../core/engine'
import type { Lang } from '../core/types'
import FreshnessBadge from '../components/FreshnessBadge.vue'
import FreshnessWarning from '../components/FreshnessWarning.vue'
import SourceList from '../components/SourceList.vue'
import LegalNotice from '../components/LegalNotice.vue'

const { t, locale } = useI18n()
const route = useRoute()
const router = useRouter()
const { tasks, stateOf } = useRules()
const { profile } = useProfile()
const { isDone, toggle } = useProgress()

const lang = computed(() => locale.value as Lang)
const task = computed(() => tasks.value.find((x) => x.rule.id === route.params.id))
const docs = computed(() =>
  task.value && profile.value ? documentsFor(task.value.rule, profile.value) : [],
)

if (!profile.value) router.replace('/')
</script>

<template>
  <template v-if="task">
    <p><RouterLink to="/quests">← {{ t('common.back') }}</RouterLink></p>

    <div class="spread">
      <h1 style="margin-top: 8px">{{ task.rule.title[lang] }}</h1>
      <FreshnessBadge :state="stateOf(task.rule)" />
    </div>

    <FreshnessWarning :state="stateOf(task.rule)" />

    <p>{{ task.rule.summary[lang] }}</p>

    <div v-if="task.status === 'blocked'" class="notice">
      {{ t('quest.blockedBy') }}:
      <RouterLink
        v-for="blocker in task.blockedBy"
        :key="blocker.id"
        :to="`/quests/${blocker.id}`"
      >{{ blocker.title[lang] }}</RouterLink>
    </div>
    <div v-else-if="task.softBlockedBy.length && task.rule.requires_note" class="notice">
      {{ task.rule.requires_note[lang] }}
    </div>

    <div v-if="task.dueDate" class="card">
      <strong>{{ t('quest.deadline') }}</strong> — {{ task.dueDate }}
      ({{
        (task.daysLeft ?? 0) >= 0
          ? t('quest.daysLeft', { days: task.daysLeft })
          : t('quest.overdue', { days: -(task.daysLeft ?? 0) })
      }})
      <p v-if="task.rule.deadline?.note" class="muted" style="margin: 6px 0 0">
        {{ task.rule.deadline.note[lang] }}
      </p>
    </div>
    <p v-else-if="task.rule.deadline?.note" class="muted">{{ task.rule.deadline.note[lang] }}</p>

    <h2>{{ t('quest.steps') }}</h2>
    <ol>
      <li v-for="(step, i) in task.rule.steps" :key="i">{{ step[lang] }}</li>
    </ol>

    <h2>{{ t('quest.documents') }}</h2>
    <ul>
      <li v-for="(doc, i) in docs" :key="i">{{ doc[lang] }}</li>
    </ul>

    <template v-if="task.rule.cautions?.length">
      <h2>{{ t('quest.cautions') }}</h2>
      <ul>
        <li v-for="(caution, i) in task.rule.cautions" :key="i">{{ caution[lang] }}</li>
      </ul>
    </template>

    <template v-if="task.rule.contacts?.length">
      <h2>{{ t('quest.contacts') }}</h2>
      <ul>
        <li v-for="(contact, i) in task.rule.contacts" :key="i">{{ contact[lang] }}</li>
      </ul>
    </template>

    <h2>{{ t('quest.terms') }}</h2>
    <!-- 행정 용어는 원문 병기가 원칙이다. 번역만 남기면 창구에서 말이 통하지 않는다. -->
    <p v-for="(term, i) in task.rule.terms" :key="i" class="term">
      <b>{{ term.ko }}</b> · {{ term.en }}<template v-if="lang === 'vi'"> · {{ term.vi }}</template>
    </p>

    <SourceList :sources="task.rule.sources" />

    <LegalNotice long />

    <button
      class="primary"
      style="width: 100%; margin-top: 8px"
      @click="toggle(task.rule.id)"
    >
      {{ isDone(task.rule.id) ? t('quest.markUndone') : t('quest.markDone') }}
    </button>
  </template>
</template>
