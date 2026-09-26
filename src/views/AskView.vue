<script setup lang="ts">
/**
 * 규칙 안에서만 답하는 질의응답.
 *
 * 생성 모델을 쓰지 않는다. 답은 규칙 데이터에서 그대로 꺼내 온다.
 * 그래서 지어낸 문장이 나올 자리가 없고, 문장마다 어느 규칙의 어느 칸에서 왔는지 말할 수 있다.
 * 검색도 이 기기 안에서 돌기 때문에 질문이 밖으로 나가지 않는다.
 */
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import bundle from '../generated/rules.json'
import { allChunks } from '../core/chunks'
import { buildIndex, search, type SearchResult } from '../core/search'
import type { Lang, RuleBundle } from '../core/types'
import { useRules } from '../composables/useRules'
import FreshnessBadge from '../components/FreshnessBadge.vue'
import FreshnessWarning from '../components/FreshnessWarning.vue'
import SourceList from '../components/SourceList.vue'
import LegalNotice from '../components/LegalNotice.vue'

const { t, locale } = useI18n()
const { find, stateOf } = useRules()
const lang = computed(() => locale.value as Lang)

// 색인은 한 번만 만든다. 규칙 7개라 즉시 끝난다.
const index = buildIndex(allChunks(bundle as unknown as RuleBundle))

const query = ref('')
const result = ref<SearchResult | null>(null)

const EXAMPLES: Record<Lang, string[]> = {
  ko: ['외국인등록 언제까지 해야 하나요?', '알바하려면 허가 받아야 하나요?', '외국인등록증 없이 휴대폰 개통되나요?'],
  en: ['When do I have to register?', 'Do I need permission to work part time?', 'Can I get a phone without an ARC?'],
  vi: ['Phải đăng ký trong bao lâu?', 'Làm thêm có cần giấy phép không?', 'Mở tài khoản cần giấy tờ gì?'],
}

function ask(q?: string) {
  if (q) query.value = q
  result.value = query.value.trim() ? search(index, query.value, 3) : null
}

const top = computed(() => {
  const hit = result.value?.rules[0]
  const rule = hit && find(hit.ruleId)
  return hit && rule ? { hit, rule } : null
})

/** 답으로 보여 줄 문장들. 점수 순이 아니라 규칙 안에서의 원래 순서로 보여 준다. */
const ORDER = ['summary', 'deadline', 'step', 'document', 'requires', 'caution', 'terms', 'contact', 'title']
const answerLines = computed(() => {
  if (!top.value) return []
  return [...top.value.hit.hits].sort((a, b) => ORDER.indexOf(a.chunk.field) - ORDER.indexOf(b.chunk.field))
})

const matchedWords = computed(() =>
  [...new Set(top.value?.hit.hits.flatMap((h) => h.matched) ?? [])].slice(0, 8),
)
</script>

<template>
  <h1>{{ t('ask.title') }}</h1>
  <p class="muted">{{ t('ask.why') }}</p>

  <form class="card" @submit.prevent="ask()">
    <div class="field">
      <input v-model="query" :placeholder="t('ask.placeholder')" :aria-label="t('ask.title')" />
    </div>
    <button class="primary" type="submit">{{ t('ask.submit') }}</button>
  </form>

  <template v-if="!result">
    <h3>{{ t('ask.examples') }}</h3>
    <p v-for="ex in EXAMPLES[lang]" :key="ex">
      <button style="text-align: left; font-size: 0.9rem" @click="ask(ex)">{{ ex }}</button>
    </p>
  </template>

  <!-- 근거를 못 찾으면 지어내지 않는다. 이 화면이 이 기능의 핵심이다. -->
  <div v-else-if="result.confidence === 'unknown' || !top" class="card">
    <strong>{{ t('ask.unknownTitle') }}</strong>
    <p class="muted" style="margin: 8px 0 0">{{ t('ask.unknownNote') }}</p>
    <p style="margin: 10px 0 0"><RouterLink to="/support">{{ t('nav.support') }} →</RouterLink></p>
  </div>

  <template v-else>
    <div class="card">
      <div class="spread">
        <strong>
          {{ result.confidence === 'answer' ? t('ask.answerTitle') : t('ask.uncertainTitle') }}
        </strong>
        <FreshnessBadge :state="stateOf(top.rule)" />
      </div>

      <p v-if="result.confidence === 'uncertain'" class="notice" style="margin: 10px 0 0">
        {{ t('ask.uncertainNote') }}
      </p>

      <h2 style="margin: 14px 0 6px">{{ top.rule.title[lang] }}</h2>

      <!-- 답이 낡은 규칙에서 나왔다면 그 경고가 답에도 따라붙어야 한다 -->
      <FreshnessWarning :state="stateOf(top.rule)" />

      <p v-for="line in answerLines" :key="line.chunk.id" style="margin: 0 0 10px">
        {{ line.chunk.text[lang] }}
        <span class="muted" style="font-size: 0.78rem">
          — {{ t(`ask.fields.${line.chunk.field}`) }}
        </span>
      </p>

      <p v-if="matchedWords.length" class="muted" style="margin: 12px 0 0">
        {{ t('ask.matched') }}: {{ matchedWords.join(', ') }}
      </p>

      <p style="margin: 12px 0 0">
        <RouterLink :to="`/quests/${top.rule.id}`">{{ t('ask.openRule') }} →</RouterLink>
      </p>
    </div>

    <template v-if="result.rules.length > 1">
      <h3>{{ t('ask.alsoSee') }}</h3>
      <p v-for="other in result.rules.slice(1)" :key="other.ruleId">
        <RouterLink :to="`/quests/${other.ruleId}`">{{ find(other.ruleId)?.title[lang] }}</RouterLink>
      </p>
    </template>

    <SourceList :sources="top.rule.sources" />
    <LegalNotice long />
  </template>
</template>
