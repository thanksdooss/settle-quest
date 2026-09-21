<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import type { Profile, VisaCode } from '../core/types'
import { useProfile } from '../composables/useProfile'
import LegalNotice from '../components/LegalNotice.vue'

const { t } = useI18n()
const router = useRouter()
const { profile, save } = useProfile()

const form = ref<Profile>(
  profile.value ?? {
    nationality: '',
    visa: 'D-2' as VisaCode,
    entryDate: new Date().toISOString().slice(0, 10),
    registrationDate: undefined,
    hasArc: false,
  },
)

function submit() {
  save({ ...form.value, registrationDate: form.value.registrationDate || undefined })
  router.push('/quests')
}
</script>

<template>
  <h1>{{ t('onboarding.title') }}</h1>
  <p class="muted">{{ t('onboarding.why') }}</p>

  <form class="card" @submit.prevent="submit">
    <div class="field">
      <label for="nationality">{{ t('onboarding.nationality') }}</label>
      <input
        id="nationality"
        v-model="form.nationality"
        required
        :placeholder="t('onboarding.nationalityPlaceholder')"
      />
    </div>

    <div class="field">
      <label for="visa">{{ t('onboarding.visa') }}</label>
      <select id="visa" v-model="form.visa">
        <option value="D-2">D-2 — 유학 / Study</option>
        <option value="D-4">D-4 — 일반연수 / General training</option>
      </select>
    </div>

    <div class="field">
      <label for="entry">{{ t('onboarding.entryDate') }}</label>
      <input id="entry" v-model="form.entryDate" type="date" required />
    </div>

    <div class="field">
      <label for="reg">{{ t('onboarding.registrationDate') }}</label>
      <input id="reg" v-model="form.registrationDate" type="date" />
      <p class="muted" style="margin: 4px 0 0">{{ t('onboarding.registrationHint') }}</p>
    </div>

    <button class="primary" type="submit">{{ t('onboarding.submit') }}</button>
  </form>

  <LegalNotice long />
</template>
