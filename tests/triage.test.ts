import { describe, expect, it } from 'vitest'
// @ts-expect-error — 배치 스크립트와 같은 코드를 쓰기 위해 JS 모듈을 그대로 가져온다
import { classifyChange, diffLines } from '../scripts/lib/triage.mjs'
import bundle from '../src/generated/rules.json'

const rule = (id: string) => bundle.rules.find((r) => r.id === id)

describe('무엇이 바뀌었는지 찾기', () => {
  it('들어온 줄과 빠진 줄을 가려낸다', () => {
    const d = diffLines('가\n나\n다', '가\n라\n다')
    expect(d.added).toEqual(['라'])
    expect(d.removed).toEqual(['나'])
  })

  it('순서만 바뀐 것은 변경으로 보지 않는다', () => {
    const d = diffLines('가\n나\n다', '다\n가\n나')
    expect(d.added).toEqual([])
    expect(d.removed).toEqual([])
  })
})

describe('심각도 판별', () => {
  it('기한이 바뀌면 높음 — 절차 자체가 달라진다', () => {
    const r = classifyChange({ added: ['전입한 날부터 30일 이내에 신고하여야 합니다'], removed: ['전입한 날부터 15일 이내에 신고하여야 합니다'] }, rule('residence-report'))
    expect(r.severity).toBe('high')
    expect(r.reasons).toContain('기간·기한')
  })

  it('제재 문구가 바뀌면 높음', () => {
    const r = classifyChange({ added: ['200만 원 이하의 벌금이 부과됩니다'], removed: ['100만 원 이하의 벌금이 부과됩니다'] }, rule('residence-report'))
    expect(r.severity).toBe('high')
  })

  it('제출 서류가 바뀌면 높음', () => {
    const r = classifyChange({ added: ['제출 서류에 체류지 입증서류가 추가되었습니다'], removed: [] }, rule('alien-registration'))
    expect(r.severity).toBe('high')
  })

  it('공지 배너와 날짜만 바뀌면 낮음 — 이걸로 사람을 부르면 큐를 아무도 안 본다', () => {
    const r = classifyChange({
      added: ['공지사항 하이코리아 시스템 점검 안내', '조회수 12831', '2026-09-26'],
      removed: ['공지사항 추석 연휴 민원실 운영 안내', '조회수 12002', '2026-09-19'],
    }, rule('alien-registration'))
    expect(r.severity).toBe('low')
  })

  it('규칙에 적힌 내용과 겹치면 중간, 그리고 어느 칸이 영향받는지 말해 준다', () => {
    const r = classifyChange({ added: ['컬러사진 1매 (3.5cm × 4.5cm) 규격이 조정될 수 있습니다'], removed: [] }, rule('alien-registration'))
    expect(r.severity).toBe('medium')
    expect(r.fields).toContain('documents')
  })

  it('바뀐 줄을 그대로 보여 준다 — 사람이 큐에서 바로 판단할 수 있어야 한다', () => {
    const r = classifyChange({ added: ['전입한 날부터 30일 이내'], removed: [] }, rule('residence-report'))
    expect(r.samples[0]).toContain('30일')
  })

  it('규칙을 고치지 않는다 — 판별 결과에 수정 제안이 들어 있지 않다', () => {
    const r = classifyChange({ added: ['전입한 날부터 30일 이내'], removed: [] }, rule('residence-report'))
    expect(Object.keys(r).sort()).toEqual(['fields', 'reasons', 'samples', 'severity'])
  })
})
