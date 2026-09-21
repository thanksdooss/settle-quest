<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { LOCALES, setLocale, type LocaleCode } from './i18n'

const { t, locale } = useI18n()

function onLocale(event: Event) {
  setLocale((event.target as HTMLSelectElement).value as LocaleCode)
}
</script>

<template>
  <header class="bar">
    <div>
      <strong>{{ t('app.name') }}</strong>
      <div class="muted" style="font-size: 0.78rem">{{ t('app.tagline') }}</div>
    </div>
    <select :value="locale" :aria-label="t('common.language')" @change="onLocale">
      <option v-for="l in LOCALES" :key="l.code" :value="l.code">{{ l.label }}</option>
    </select>
  </header>

  <main><RouterView /></main>

  <nav class="tabs">
    <RouterLink to="/quests">{{ t('nav.quests') }}</RouterLink>
    <RouterLink to="/documents">{{ t('nav.documents') }}</RouterLink>
    <RouterLink to="/support">{{ t('nav.support') }}</RouterLink>
    <RouterLink to="/freshness">{{ t('nav.freshness') }}</RouterLink>
  </nav>
</template>
