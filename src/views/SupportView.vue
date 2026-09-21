<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRules } from '../composables/useRules'
import type { Lang } from '../core/types'
import SourceList from '../components/SourceList.vue'
import LegalNotice from '../components/LegalNotice.vue'

const { t, locale } = useI18n()
const { desks, deskSources } = useRules()
const lang = computed(() => locale.value as Lang)
</script>

<template>
  <h1>{{ t('support.title') }}</h1>
  <!-- 원기획에는 전문가 매칭과 중개 수수료가 있었다. 금전 중개는 법적 검토가 필요해 제품에서 뺐다. -->
  <p class="muted">{{ t('support.why') }}</p>

  <div v-for="desk in desks" :key="desk.id" class="card">
    <div class="spread">
      <strong>{{ desk.name[lang] }}</strong>
      <a :href="`tel:${desk.phone.split(' ')[0]}`">{{ desk.phone }}</a>
    </div>
    <p class="muted" style="margin: 6px 0 0">{{ desk.scope[lang] }}</p>
  </div>

  <SourceList :sources="deskSources" />
  <LegalNotice long />
</template>
