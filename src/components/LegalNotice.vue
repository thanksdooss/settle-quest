<script setup lang="ts">
import { useI18n } from 'vue-i18n'
defineProps<{ long?: boolean }>()
const { t } = useI18n()
</script>

<template>
  <p class="notice">{{ long ? t('legal.long') : t('legal.short') }}</p>
</template>
