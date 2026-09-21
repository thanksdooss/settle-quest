<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { FreshnessState } from '../core/freshness'

const props = defineProps<{ state: FreshnessState }>()
const { t } = useI18n()

const mark = computed(() => ({ verified: '✓', aging: '·', stale: '!', changed: '!' })[props.state])
</script>

<template>
  <span class="badge" :class="state">{{ mark }} {{ t(`freshness.${state}`) }}</span>
</template>
