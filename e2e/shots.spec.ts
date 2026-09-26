// 포트폴리오용 화면 캡처. 테스트가 아니라 결과물 생성용이라 기본 실행에서 제외한다.
// 실행: npx playwright test e2e/shots.spec.ts --grep-invert "^$"
import { test } from '@playwright/test'

const OUT = 'shots'

test('화면 캡처', async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => localStorage.clear())
  await page.reload()
  await page.screenshot({ path: `${OUT}/01-onboarding.png`, fullPage: true })

  await page.getByLabel('국적').fill('베트남')
  await page.getByLabel('입국일').fill('2026-09-01')
  await page.getByRole('button', { name: '내 절차 목록 만들기' }).click()
  await page.screenshot({ path: `${OUT}/02-quests.png`, fullPage: true })

  await page.locator('a[href="#/quests/alien-registration"]').click()
  await page.screenshot({ path: `${OUT}/03-detail.png`, fullPage: true })

  await page.getByRole('link', { name: '정보 신선도' }).click()
  await page.screenshot({ path: `${OUT}/04-freshness.png`, fullPage: true })

  await page.getByRole('link', { name: '서류' }).click()
  await page.screenshot({ path: `${OUT}/05-documents.png`, fullPage: true })

  await page.getByRole('link', { name: '지원 창구' }).click()
  await page.screenshot({ path: `${OUT}/06-support.png`, fullPage: true })

  await page.getByRole('link', { name: '물어보기' }).click()
  await page.getByRole('textbox', { name: '물어보기' }).fill('알바하려면 허가 받아야 하나요')
  await page.getByRole('button', { name: '찾기' }).click()
  await page.screenshot({ path: `${OUT}/07-ask.png`, fullPage: true })

  await page.getByRole('textbox', { name: '물어보기' }).fill('집주인이 보증금을 안 돌려줘요 소송하려면')
  await page.getByRole('button', { name: '찾기' }).click()
  await page.screenshot({ path: `${OUT}/08-ask-uncertain.png`, fullPage: true })
})
