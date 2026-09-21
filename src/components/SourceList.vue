<script setup lang="ts">
/**
 * 출처를 보여 준다. 이 제품의 약속이 "모든 안내에 출처와 마지막 확인일이 붙는다"이므로
 * 이 컴포넌트는 절차 화면에서 접히거나 생략되지 않는다.
 *
 * 확인일과 원문 최종수정일을 나란히 보여 주는 것이 핵심이다.
 * "우리가 2026년에 봤다"와 "원문은 2013년에 쓰였다"는 전혀 다른 말이고, 둘 다 사용자가 알아야 한다.
 */
import { useI18n } from 'vue-i18n'
import type { Source } from '../core/types'
import { sourceState } from '../core/freshness'
import { today } from '../composables/useRules'
import FreshnessBadge from './FreshnessBadge.vue'

defineProps<{ sources: Source[] }>()
const { t, locale } = useI18n()
</script>

<template>
  <h3>{{ t('freshness.sources') }}</h3>
  <div v-for="source in sources" :key="source.id" class="card">
    <div class="spread">
      <a :href="source.url" target="_blank" rel="noopener">{{ source.title }}</a>
      <FreshnessBadge :state="sourceState(source, today())" />
    </div>
    <p class="muted" style="margin: 6px 0 0">{{ source.publisher }}</p>
    <p class="muted" style="margin: 4px 0 0">
      {{ t('freshness.checkedOn', { date: source.checked_on }) }} ·
      {{ t('freshness.nextCheck', { date: source.next_check_on }) }}
    </p>
    <p class="muted" style="margin: 2px 0 0">
      {{
        source.source_updated_on
          ? t('freshness.sourceUpdatedOn', { date: source.source_updated_on })
          : t('freshness.sourceUpdatedUnknown')
      }}
      <template v-if="source.cites"> · {{ source.cites }}</template>
    </p>
    <p v-if="source.note" class="notice" style="margin: 10px 0 0">
      {{ source.note[locale as 'ko' | 'en' | 'vi'] }}
    </p>
  </div>
</template>
