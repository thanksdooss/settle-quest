import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  // 화면 캡처는 결과물 생성용이라 기본 실행에서 뺀다.
  // 캡처가 필요할 때만: SHOTS=1 npx playwright test e2e/shots.spec.ts
  testIgnore: process.env.SHOTS ? [] : ['**/shots.spec.ts'],
  use: { baseURL: 'http://localhost:4173', locale: 'ko-KR' },
  projects: [{ name: 'mobile', use: { ...devices['Pixel 7'] } }],
  webServer: {
    // 빌드 결과물로 돌린다. 규칙 번들 생성과 타입 검사까지 거친 상태를 확인하기 위해서다.
    command: 'npm run build && npx vite preview --port 4173',
    port: 4173,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
