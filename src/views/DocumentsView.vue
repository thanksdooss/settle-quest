<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { scanPassport } from '../mrz/scan'
import { parseMrz, type MrzResult } from '../mrz/parse'
import { useDocumentDraft } from '../composables/useDocumentDraft'
import LegalNotice from '../components/LegalNotice.vue'

const { t } = useI18n()
const { draft, save, clear, exportJson } = useDocumentDraft()

const scanning = ref(false)
const result = ref<MrzResult | null>(null)
const savedNote = ref(false)

/** 판독 결과를 초안에 넣는다. 검증 실패한 값도 넣되, 화면에서 "확인해 주세요"로 표시한다. */
function apply(mrz: MrzResult) {
  result.value = mrz
  draft.value = {
    ...draft.value,
    surname: mrz.surname.value,
    givenNames: mrz.givenNames.value,
    passportNumber: mrz.passportNumber.value,
    nationality: mrz.nationality.value,
    birthDate: mrz.birthDate.value,
    sex: mrz.sex.value,
    expiryDate: mrz.expiryDate.value,
  }
}

async function onPick(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  scanning.value = true
  try {
    apply(await scanPassport(file))
  } finally {
    scanning.value = false
    // 같은 파일을 다시 고를 수 있게 비우고, 파일 참조도 남기지 않는다.
    ;(event.target as HTMLInputElement).value = ''
  }
}

/** 제안을 사용자가 눌렀을 때만 적용한다. 기계가 혼자 고치지 않는다. */
function useSuggestion(line2: string) {
  if (!result.value) return
  apply(parseMrz(`${result.value.lines[0]}\n${line2}`))
}

function onSave() {
  save()
  savedNote.value = true
  setTimeout(() => (savedNote.value = false), 2000)
}

function onClear() {
  if (confirm(t('documents.clearConfirm'))) {
    clear()
    result.value = null
  }
}

const FIELDS = [
  'surname',
  'givenNames',
  'passportNumber',
  'nationality',
  'birthDate',
  'sex',
  'expiryDate',
] as const

function verified(field: (typeof FIELDS)[number]): boolean | null {
  const r = result.value
  if (!r) return null
  return r[field].verified
}
</script>

<template>
  <h1>{{ t('documents.title') }}</h1>
  <p class="muted">{{ t('documents.why') }}</p>

  <div class="card">
    <label class="btn" for="passport" style="display: inline-block">{{ t('documents.pick') }}</label>
    <input
      id="passport"
      type="file"
      accept="image/*"
      capture="environment"
      style="position: absolute; width: 1px; height: 1px; opacity: 0"
      @change="onPick"
    />
    <p v-if="scanning" class="muted" style="margin: 10px 0 0">{{ t('documents.scanning') }}</p>
    <p v-else-if="result && !result.ok" class="notice danger" style="margin: 10px 0 0">
      {{ t('documents.failed') }}
    </p>
  </div>

  <div v-if="result?.suggestions.length" class="card">
    <strong>{{ t('documents.suggestions') }}</strong>
    <p v-for="(s, i) in result.suggestions" :key="i" class="row" style="margin: 8px 0 0">
      <span class="mono">{{ s.field }}: {{ s.from }} → {{ s.to }}</span>
      <button style="padding: 4px 10px; font-size: 0.8rem" @click="useSuggestion(s.value)">
        {{ t('documents.applySuggestion') }}
      </button>
    </p>
  </div>

  <div v-if="result?.lines[0]" class="card">
    <strong>{{ t('documents.rawLines') }}</strong>
    <p class="mono" style="margin: 8px 0 0">{{ result.lines[0] }}<br />{{ result.lines[1] }}</p>
  </div>

  <div class="card">
    <div v-for="field in FIELDS" :key="field" class="field">
      <label :for="field">
        {{ t(`documents.fields.${field}`) }}
        <span
          v-if="verified(field) !== null"
          class="badge"
          :class="verified(field) ? 'verified' : 'stale'"
          style="margin-left: 6px"
        >
          {{ verified(field) ? t('documents.verified') : t('documents.unverified') }}
        </span>
      </label>
      <input :id="field" v-model="draft[field]" />
    </div>

    <div class="field">
      <label for="koreanName">{{ t('documents.fields.koreanName') }}</label>
      <input id="koreanName" v-model="draft.koreanName" />
      <!-- 한글 음차를 자동 생성하지 않는 이유를 화면에서 밝힌다. 이건 기능 누락이 아니라 결정이다. -->
      <p class="muted" style="margin: 4px 0 0">{{ t('documents.koreanNameHint') }}</p>
    </div>

    <div class="row">
      <button class="primary" @click="onSave">{{ t('documents.save') }}</button>
      <button @click="exportJson">{{ t('documents.export') }}</button>
      <button @click="onClear">{{ t('documents.clear') }}</button>
    </div>
    <p v-if="savedNote" class="muted" style="margin: 8px 0 0">{{ t('documents.saved') }}</p>
    <p class="muted" style="margin: 8px 0 0">{{ t('documents.storageNote') }}</p>
  </div>

  <LegalNotice long />
</template>
