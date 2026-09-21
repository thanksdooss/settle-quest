/**
 * 서식에 채운 값. 여권 이미지가 아니라 사용자가 확인한 텍스트만 남긴다.
 * 이미지는 판독이 끝나면 메모리에서 버리고 어디에도 저장하지 않는다.
 */
import { useStorage } from './useStorage'

export interface DocumentDraft {
  surname: string
  givenNames: string
  passportNumber: string
  nationality: string
  birthDate: string
  sex: string
  expiryDate: string
  /** 한글 성명은 자동으로 만들지 않는다. 음차가 틀리면 서류가 반려되기 때문이다. */
  koreanName: string
  savedAt: string | null
}

export const emptyDraft = (): DocumentDraft => ({
  surname: '',
  givenNames: '',
  passportNumber: '',
  nationality: '',
  birthDate: '',
  sex: '',
  expiryDate: '',
  koreanName: '',
  savedAt: null,
})

const draft = useStorage<DocumentDraft>('document-draft', emptyDraft())

export function useDocumentDraft() {
  return {
    draft,
    save() {
      draft.value = { ...draft.value, savedAt: new Date().toISOString() }
    },
    clear() {
      draft.value = emptyDraft()
    },
    exportJson() {
      const blob = new Blob([JSON.stringify(draft.value, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'settle-quest-document.json'
      a.click()
      URL.revokeObjectURL(url)
    },
  }
}
