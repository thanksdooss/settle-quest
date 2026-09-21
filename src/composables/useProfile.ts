import { computed } from 'vue'
import type { Profile } from '../core/types'
import { useStorage } from './useStorage'

const profile = useStorage<Profile | null>('profile', null)

export function useProfile() {
  return {
    profile,
    hasProfile: computed(() => profile.value !== null),
    save(next: Profile) {
      profile.value = next
    },
    reset() {
      profile.value = null
    },
  }
}
