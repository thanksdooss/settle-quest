/**
 * 브라우저에만 두는 저장소.
 *
 * 이 제품에는 서버가 없다. 프로필도, 진행 상황도, 서식에 채운 값도 전부 이 기기 안에 있다.
 * 여권 이미지를 서버에 보내지 않는 것이 절대 규칙이라, 보낼 곳 자체를 만들지 않았다.
 * 대신 사용자가 언제든 내보내고 지울 수 있어야 한다.
 */
import { ref, watch, type Ref } from 'vue'

const PREFIX = 'settle-quest:'

export function useStorage<T>(key: string, initial: T): Ref<T> {
  const full = PREFIX + key
  let start = initial
  try {
    const saved = localStorage.getItem(full)
    if (saved) start = JSON.parse(saved) as T
  } catch {
    // 사생활 보호 모드나 저장소가 막힌 브라우저에서도 앱은 동작해야 한다.
  }

  const state = ref(start) as Ref<T>
  watch(
    state,
    (value) => {
      try {
        localStorage.setItem(full, JSON.stringify(value))
      } catch {
        /* 저장하지 못해도 화면은 계속 동작한다 */
      }
    },
    { deep: true },
  )
  return state
}

/** 이 앱이 이 기기에 남긴 것을 전부 지운다. 설정 화면의 "삭제" 버튼이 부르는 함수다. */
export function clearAllStorage() {
  for (const key of Object.keys(localStorage)) {
    if (key.startsWith(PREFIX)) localStorage.removeItem(key)
  }
}
