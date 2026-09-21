import { describe, expect, it } from 'vitest'
import { checkDigit, extractLines, parseMrz, toIsoDate } from '../src/mrz/parse'

// ICAO 9303 문서의 TD3 예시. 실제 사람의 여권이 아니라 규격 문서의 견본이다.
const L1 = 'P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<'
const L2 = 'L898902C36UTO7408122F1204159ZE184226B<<<<<10'
const SAMPLE = `${L1}\n${L2}`

describe('체크디지트', () => {
  it('ICAO 예시의 여권번호 체크디지트를 계산한다', () => {
    expect(checkDigit('L898902C3')).toBe(6)
  })

  it('생년월일과 만료일도 맞는다', () => {
    expect(checkDigit('740812')).toBe(2)
    expect(checkDigit('120415')).toBe(9)
  })

  it('MRZ에 없는 문자가 섞이면 -1 을 돌려준다', () => {
    expect(checkDigit('L8989@2C3')).toBe(-1)
  })
})

describe('MRZ 판독', () => {
  it('규격 견본을 읽는다', () => {
    const r = parseMrz(SAMPLE)
    expect(r.ok).toBe(true)
    expect(r.surname.value).toBe('ERIKSSON')
    expect(r.givenNames.value).toBe('ANNA MARIA')
    expect(r.passportNumber.value).toBe('L898902C3')
    expect(r.nationality.value).toBe('UTO')
    expect(r.birthDate.value).toBe('1974-08-12')
    expect(r.sex.value).toBe('F')
    expect(r.expiryDate.value).toBe('2012-04-15')
  })

  it('판독한 원문 두 줄을 그대로 돌려준다 — 사용자가 직접 대조할 수 있어야 한다', () => {
    expect(parseMrz(SAMPLE).lines).toEqual([L1, L2])
  })

  it('얼굴면 글자가 섞여 들어와도 MRZ 두 줄만 골라낸다', () => {
    const noisy = `REPUBLIC OF UTOPIA\nPASSPORT\n${L1}\n${L2}\n`
    expect(parseMrz(noisy).ok).toBe(true)
  })

  it('MRZ가 없으면 실패를 실패로 확정한다', () => {
    const r = parseMrz('이 사진에는 기계판독영역이 없습니다')
    expect(r.ok).toBe(false)
    expect(r.reason).toBe('no-mrz-lines')
  })

  it('여권이 아닌 문서는 거절한다', () => {
    const r = parseMrz(`I<UTOERIKSSON<<ANNA<<<<<<<<<<<<<<<<<<<<<<<<<\n${L2}`)
    expect(r.reason).toBe('not-passport')
  })
})

describe('판독 오류를 기계가 마음대로 고치지 않는다', () => {
  // 견본의 여권번호 마지막 글자를 잘못 읽은 상황 (L898902C3 → L898902C9)
  const broken = L2.replace('L898902C3', 'L898902C9')
  const result = parseMrz(`${L1}\n${broken}`)

  it('검증에 실패하면 실패라고 말한다', () => {
    expect(result.ok).toBe(false)
    expect(result.reason).toBe('checksum-failed')
    expect(result.passportNumber.verified).toBe(false)
  })

  it('잘못 읽은 값을 버리지도, 몰래 고치지도 않고 그대로 돌려준다', () => {
    expect(result.passportNumber.value).toBe('L898902C9')
  })

  it('대신 고쳐 읽을 후보를 제안으로 내놓는다 — 적용은 사용자가 한다', () => {
    expect(result.suggestions.length).toBeGreaterThan(0)
    for (const s of result.suggestions) {
      expect(s.value).not.toBe(broken)
      expect(s.value.length).toBe(44)
    }
  })

  it('제안이 여러 개일 수 있다는 사실이 자동 적용을 막는 이유다', () => {
    // 체크디지트는 mod 10 이라 엉뚱한 글자도 통과한다.
    // 실제로 아래 후보는 검증을 통과하지만 정답(L898902C3)이 아니다.
    const values = result.suggestions.map((s) => s.value.slice(0, 9))
    expect(values).toContain('L8989O2C9')
    expect(values).not.toContain('L898902C3')
  })

  it('제대로 읽힌 MRZ에는 제안이 붙지 않는다', () => {
    expect(parseMrz(SAMPLE).suggestions).toHaveLength(0)
  })
})

describe('두 자리 연도 해석', () => {
  const today = new Date('2026-09-21')

  it('생년월일은 과거로 편다', () => {
    expect(toIsoDate('740812', 'birth', today)).toBe('1974-08-12')
    expect(toIsoDate('050101', 'birth', today)).toBe('2005-01-01')
  })

  it('만료일은 미래로 편다', () => {
    expect(toIsoDate('300415', 'expiry', today)).toBe('2030-04-15')
  })

  it('날짜 모양이 아니면 빈 값', () => {
    expect(toIsoDate('74081', 'birth', today)).toBe('')
  })
})

describe('줄 찾기', () => {
  it('40자 미만의 잡음 줄은 버린다', () => {
    expect(extractLines('SHORT\nALSO SHORT')).toBeNull()
  })
})
