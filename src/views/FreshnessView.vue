<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRules, today } from '../composables/useRules'
import { sourceState } from '../core/freshness'
import type { Lang } from '../core/types'
import FreshnessBadge from '../components/FreshnessBadge.vue'

const { t, locale } = useI18n()
const { rules, coverage, bundle } = useRules()
const lang = computed(() => locale.value as Lang)

const rows = computed(() =>
  rules.flatMap((rule) =>
    rule.sources.map((source) => ({
      rule,
      source,
      state: sourceState(source, today()),
    })),
  ),
)
</script>

<template>
  <h1>{{ t('freshness.dashboardTitle') }}</h1>

  <div class="card">
    <div class="spread">
      <strong>{{ t('freshness.coverage') }}</strong>
      <span style="font-size: 1.5rem; font-weight: 700">{{ coverage.ratio }}%</span>
    </div>
    <div class="progress-bar"><span :style="{ width: coverage.ratio + '%' }" /></div>
    <p class="muted" style="margin: 10px 0 0">
      {{ coverage.verified }} / {{ coverage.total }} · {{ t('freshness.coverageWhy') }}
    </p>
    <p class="muted" style="margin: 4px 0 0">
      {{ t('freshness.builtOn', { date: bundle.builtOn }) }}
    </p>
  </div>

  <div v-for="row in rows" :key="row.rule.id + row.source.id" class="card">
    <div class="spread">
      <RouterLink :to="`/quests/${row.rule.id}`">{{ row.rule.title[lang] }}</RouterLink>
      <FreshnessBadge :state="row.state" />
    </div>
    <p class="muted" style="margin: 6px 0 0">{{ row.source.title }} · {{ row.source.publisher }}</p>
    <p class="muted" style="margin: 2px 0 0">
      {{ t('freshness.checkedOn', { date: row.source.checked_on }) }} ·
      {{ t('freshness.nextCheck', { date: row.source.next_check_on }) }} ·
      {{
        row.source.source_updated_on
          ? t('freshness.sourceUpdatedOn', { date: row.source.source_updated_on })
          : t('freshness.sourceUpdatedUnknown')
      }}
    </p>
  </div>
</template>
