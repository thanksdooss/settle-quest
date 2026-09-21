import { computed } from 'vue'
import { useStorage } from './useStorage'

const done = useStorage<string[]>('progress', [])

export function useProgress() {
  return {
    done,
    isDone: (id: string) => done.value.includes(id),
    toggle(id: string) {
      done.value = done.value.includes(id)
        ? done.value.filter((x) => x !== id)
        : [...done.value, id]
    },
    count: computed(() => done.value.length),
  }
}
