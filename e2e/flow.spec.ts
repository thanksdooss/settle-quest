import { expect, test } from '@playwright/test'

/** 프로필 입력 → 절차 목록 → 서류 자동 채움까지, 사용자가 실제로 지나가는 길. */

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => localStorage.clear())
  await page.reload()
})

type Page = import('@playwright/test').Page

/** 절차 카드를 연다. 제목 텍스트는 "지금 할 일" 줄에도 나오므로 링크 주소로 집는다. */
function questCard(page: Page, id: string) {
  return page.locator(`a[href="#/quests/${id}"]`)
}

async function fillProfile(page: Page) {
  await page.getByLabel('국적').fill('베트남')
  await page.getByLabel('입국일').fill('2026-09-01')
  await page.getByRole('button', { name: '내 절차 목록 만들기' }).click()
}

test('프로필을 넣으면 개인화된 절차 목록이 나온다', async ({ page }) => {
  await fillProfile(page)
  await expect(page.getByRole('heading', { name: '내 정착 절차' })).toBeVisible()
  await expect(page.getByText('0 / 7 완료')).toBeVisible()
  await expect(page.getByText('지금 할 일 — 외국인등록')).toBeVisible()
})

test('막힌 절차는 사라지지 않고 무엇이 먼저인지 함께 보여 준다', async ({ page }) => {
  await fillProfile(page)
  await expect(page.getByText('먼저 끝내야 합니다: 외국인등록').first()).toBeVisible()
  // 은행·통신은 막히지 않지만 먼저 하면 좋다는 안내가 붙는다.
  await expect(page.getByText('먼저 하면 선택지가 넓어집니다: 외국인등록').first()).toBeVisible()
})

test('모든 안내에 출처와 마지막 확인일이 보인다', async ({ page }) => {
  await fillProfile(page)
  await questCard(page, 'alien-registration').click()

  await expect(page.getByRole('heading', { name: '출처' })).toBeVisible()
  await expect(page.getByText(/\d{4}-\d{2}-\d{2} 확인/).first()).toBeVisible()
  await expect(page.getByText(/다음 점검 \d{4}-\d{2}-\d{2}/).first()).toBeVisible()
  // 우리가 확인한 날과 원문이 마지막으로 고쳐진 날은 다른 값이고, 둘 다 보여야 한다.
  await expect(page.getByText('원문 최종수정 2013-01-01')).toBeVisible()
})

test('법적 효력 없음 고지가 화면에 있다', async ({ page }) => {
  await fillProfile(page)
  await expect(page.getByText('행정 정보 안내이며 법적 효력이 없습니다.')).toBeVisible()
})

test('절차를 완료하면 막혔던 절차가 풀린다', async ({ page }) => {
  await fillProfile(page)
  await questCard(page, 'alien-registration').click()
  await page.getByRole('button', { name: '완료로 표시' }).click()
  await page.getByRole('link', { name: '← 뒤로' }).click()

  await expect(page.getByText('1 / 7 완료')).toBeVisible()
  await expect(page.getByText('먼저 끝내야 합니다: 외국인등록')).toHaveCount(0)
})

test('서류 값은 이 기기에만 저장되고 지울 수 있다', async ({ page }) => {
  await fillProfile(page)
  await page.getByRole('link', { name: '서류' }).click()

  await page.getByLabel(/여권번호/).fill('L898902C3')
  await page.getByLabel(/한글 성명/).fill('응우옌')
  await page.getByRole('button', { name: '이 기기에 저장' }).click()
  await expect(page.getByText('저장했습니다')).toBeVisible()

  // 새로고침해도 이 기기에 남아 있다
  await page.reload()
  await expect(page.getByLabel(/여권번호/)).toHaveValue('L898902C3')

  // 한글 성명은 자동 생성하지 않는다는 안내가 화면에 있다
  await expect(page.getByText(/음차가 틀리면 서류가 반려되기 때문입니다/)).toBeVisible()

  page.on('dialog', (d) => d.accept())
  await page.getByRole('button', { name: '저장된 값 삭제' }).click()
  await expect(page.getByLabel(/여권번호/)).toHaveValue('')
})

test('공공 지원 창구만 보여 주고 전문가 알선은 하지 않는다', async ({ page }) => {
  await fillProfile(page)
  await page.getByRole('link', { name: '지원 창구' }).click()
  await expect(page.getByText('외국인 종합안내센터', { exact: true })).toBeVisible()
  await expect(page.getByText(/중개 수수료를 받지 않습니다/)).toBeVisible()
})

test('언어를 바꾸면 행정 용어는 원문 병기로 남는다', async ({ page }) => {
  await fillProfile(page)
  await questCard(page, 'alien-registration').click()
  await page.getByRole('combobox', { name: '언어' }).selectOption('en')

  await expect(page.getByRole('heading', { name: 'Alien Registration' })).toBeVisible()
  await expect(page.getByText('외국인등록증 · Alien Registration Card (ARC)')).toBeVisible()
})

test('물어보기: 규칙 안 질문에는 출처와 확인일을 달아 답한다', async ({ page }) => {
  await fillProfile(page)
  await page.getByRole('link', { name: '물어보기' }).click()

  await page.getByRole('textbox', { name: '물어보기' }).fill('알바하려면 허가 받아야 하나요')
  await page.getByRole('button', { name: '찾기' }).click()

  await expect(page.getByText('규칙에서 찾은 내용')).toBeVisible()
  await expect(page.getByRole('heading', { name: '시간제 취업 허가 (아르바이트)' })).toBeVisible()
  // 답에도 출처와 확인일이 따라붙어야 한다
  await expect(page.getByText(/\d{4}-\d{2}-\d{2} 확인/).first()).toBeVisible()
  await expect(page.getByText('행정 정보 안내이며 법적 효력이 없습니다.')).toBeVisible()
})

test('물어보기: 근거가 없으면 지어내지 않고 모른다고 말한다', async ({ page }) => {
  await fillProfile(page)
  await page.getByRole('link', { name: '물어보기' }).click()

  await page.getByRole('textbox', { name: '물어보기' }).fill('오늘 날씨 어때요')
  await page.getByRole('button', { name: '찾기' }).click()

  await expect(page.getByText('이 질문에는 답할 수 없습니다')).toBeVisible()
  await expect(page.getByText(/지어내지 않고 모른다고 말합니다/)).toBeVisible()
})

test('물어보기: 애매하면 확신하는 대신 "비슷한 내용"이라고 말한다', async ({ page }) => {
  await fillProfile(page)
  await page.getByRole('link', { name: '물어보기' }).click()

  await page.getByRole('textbox', { name: '물어보기' }).fill('집주인이 보증금을 안 돌려줘요 소송하려면')
  await page.getByRole('button', { name: '찾기' }).click()

  await expect(page.getByText('비슷한 내용은 있습니다')).toBeVisible()
  await expect(page.getByText(/직접적인 답인지는 확실하지 않습니다/)).toBeVisible()
})
