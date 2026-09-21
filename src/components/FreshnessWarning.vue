<script setup lang="ts">
/** stale/changed 인 절차 위에 붙는 경고. 절차를 목록에서 숨기는 대신 이 경고를 붙인다. */
import { useI18n } from 'vue-i18n'
import { needsWarning, type FreshnessState } from '../core/freshness'

defineProps<{ state: FreshnessState }>()
const { t } = useI18n()
</script>

<template>
  <p v-if="needsWarning(state)" class="notice danger">
    {{ state === 'changed' ? t('freshness.changedWarning') : t('freshness.warning') }}
  </p>
</template>
