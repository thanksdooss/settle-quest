import { createI18n } from 'vue-i18n'
import ko from './locales/ko.json'
import en from './locales/en.json'
import vi from './locales/vi.json'

const STORAGE_KEY = 'settle-quest:lang'

export const LOCALES = [
  { code: 'ko', label: '한국어' },
  { code: 'en', label: 'English' },
  { code: 'vi', label: 'Tiếng Việt' },
] as const

export type LocaleCode = (typeof LOCALES)[number]['code']

function initialLocale(): LocaleCode {
  const saved = localStorage.getItem(STORAGE_KEY) as LocaleCode | null
  if (saved && LOCALES.some((l) => l.code === saved)) return saved
  const browser = navigator.language.slice(0, 2)
  return LOCALES.some((l) => l.code === browser) ? (browser as LocaleCode) : 'en'
}

export const i18n = createI18n({
  legacy: false,
  locale: initialLocale(),
  // 번역이 빠진 자리는 영어로 떨어뜨린다. 한국어로 떨어뜨리면 못 읽는 사용자가 생긴다.
  fallbackLocale: 'en',
  messages: { ko, en, vi },
})

export function setLocale(code: LocaleCode) {
  i18n.global.locale.value = code
  localStorage.setItem(STORAGE_KEY, code)
  document.documentElement.lang = code
}
