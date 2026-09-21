/**
 * 여권 MRZ(TD3) 파서.
 *
 * 왜 얼굴면 전체 OCR이 아니라 MRZ만 읽는가:
 * MRZ에는 체크디지트가 들어 있어서 판독 결과를 스스로 검증할 수 있다.
 * 일반 OCR은 틀려도 그럴듯한 글자를 내놓지만, MRZ는 체크디지트가 어긋나면
 * "틀렸다"고 확정할 수 있다. 확실하지 않으면 확실하지 않다고 말한다는 이 제품의 원칙과 같다.
 *
 * TD3 = 44자 × 2줄 (일반 여권)
 */

export interface MrzField<T = string> {
  value: T
  /** 이 값이 체크디지트로 검증되었는가. false면 화면에서 사용자에게 확인을 요구한다. */
  verified: boolean
}

export interface MrzResult {
  ok: boolean
  /** 읽지 못한 이유. ok가 false일 때만 채워진다. */
  reason?: 'no-mrz-lines' | 'bad-length' | 'not-passport' | 'checksum-failed'
  surname: MrzField
  givenNames: MrzField
  passportNumber: MrzField
  nationality: MrzField
  birthDate: MrzField
  sex: MrzField<'M' | 'F' | 'X'>
  expiryDate: MrzField
  /**
   * 고쳐 읽으면 검증을 통과하는 후보. **자동으로 적용하지 않는다.**
   * 화면에 "이렇게 읽었을 수도 있습니다"로 띄우고, 사용자가 눌러야 반영된다.
   */
  suggestions: { field: string; index: number; from: string; to: string; value: string }[]
  /** 판독한 원문 두 줄. 사용자가 직접 대조할 수 있게 그대로 둔다. */
  lines: [string, string]
}

const FILLER = '<'

/** MRZ 문자값: 숫자는 그대로, 알파벳은 A=10…Z=35, 채움문자는 0. */
function charValue(c: string): number {
  if (c >= '0' && c <= '9') return c.charCodeAt(0) - 48
  if (c >= 'A' && c <= 'Z') return c.charCodeAt(0) - 55
  if (c === FILLER) return 0
  return -1
}

/** ICAO 9303 체크디지트: 가중치 7,3,1을 돌려 곱한 합의 10의 나머지. */
export function checkDigit(input: string): number {
  const weights = [7, 3, 1]
  let sum = 0
  for (let i = 0; i < input.length; i++) {
    const v = charValue(input[i])
    if (v < 0) return -1
    sum += v * weights[i % 3]
  }
  return sum % 10
}

/** OCR이 자주 헷갈리는 짝. 고쳐 본 뒤 검증을 통과할 때만 받아들인다. */
const CONFUSIONS: Record<string, string[]> = {
  O: ['0'], '0': ['O'],
  I: ['1'], '1': ['I'],
  S: ['5'], '5': ['S'],
  B: ['8'], '8': ['B'],
  Z: ['2'], '2': ['Z'],
  G: ['6'], '6': ['G'],
  D: ['0'], Q: ['0'],
}

/** 2번 줄에서 체크디지트가 지키는 구간들. */
const GUARDED = [
  { name: 'passportNumber', from: 0, to: 9, check: 9 },
  { name: 'birthDate', from: 13, to: 19, check: 19 },
  { name: 'expiryDate', from: 21, to: 27, check: 27 },
] as const

/** 2번 줄 전체를 덮는 합계 체크디지트. 각 칸의 체크디지트와 독립적인 두 번째 검증이다. */
function compositeOk(line: string): boolean {
  const composite = line.slice(0, 10) + line.slice(13, 20) + line.slice(21, 43)
  return checkDigit(composite) === Number(line[43])
}

function fieldOk(line: string, g: (typeof GUARDED)[number]): boolean {
  return checkDigit(line.slice(g.from, g.to)) === Number(line[g.check])
}

function allChecksPass(line: string): boolean {
  return GUARDED.every((g) => fieldOk(line, g)) && compositeOk(line)
}

/**
 * 한 글자만 바꾸면 검증을 통과하는 후보를 찾는다. **찾기만 하고 적용하지는 않는다.**
 *
 * 처음에는 칸별 체크디지트가 맞으면 자동으로 고치게 만들었다. 그런데 이 저장소의 테스트가
 * 잘못된 수정이 통과하는 경우를 잡아냈다. 체크디지트는 10으로 나눈 나머지라 엉뚱한 글자도
 * 10분의 1 확률로 통과하고, 후보가 열 개쯤 되면 잘못된 수정이 살아남을 확률이 70%에 가깝다.
 *
 * 그래서 줄 전체의 합계 체크디지트를 두 번째 검증으로 걸어 보았는데, 여권번호 구간에서는
 * 이게 소용이 없었다. 합계 체크디지트는 줄 앞에서부터 같은 가중치(7,3,1)를 돌리기 때문에
 * 여권번호 구간의 가중치가 칸별 체크디지트와 **완전히 같다.** 두 검증이 독립이 아니라
 * 한 검증을 두 번 하는 셈이었다. 실제로 견본에서 한 글자를 잘못 읽은 값이 둘 다 통과했다.
 *
 * 결론: 기계가 스스로 확신할 방법이 없다. 그래서 고치지 않고 **사람에게 물어본다.**
 * 틀린 값을 조용히 채워 넣는 것보다, 모르겠다고 말하고 후보를 보여 주는 편이 낫다.
 */
/** 어느 칸이 후보의 대상인지 이름을 붙인다. 사용자에게 "여기를 이렇게 읽을 수도 있다"고 보여 주기 위해서다. */
function fieldNameAt(index: number): string {
  return GUARDED.find((g) => index >= g.from && index <= g.check)?.name ?? 'line2'
}

function suggestRepairs(line: string): MrzResult['suggestions'] {
  const found: MrzResult['suggestions'] = []
  for (let i = 0; i < line.length; i++) {
    for (const alt of CONFUSIONS[line[i]] ?? []) {
      const fixed = line.slice(0, i) + alt + line.slice(i + 1)
      if (allChecksPass(fixed)) {
        found.push({ field: fieldNameAt(i), index: i, from: line[i], to: alt, value: fixed })
      }
    }
  }
  return found
}

/** MRZ가 쓰는 YYMMDD를 ISO 날짜로. 두 자리 연도는 만료일인지 생년월일인지에 따라 다르게 편다. */
export function toIsoDate(yymmdd: string, kind: 'birth' | 'expiry', today = new Date()): string {
  if (!/^\d{6}$/.test(yymmdd)) return ''
  const yy = Number(yymmdd.slice(0, 2))
  const mm = yymmdd.slice(2, 4)
  const dd = yymmdd.slice(4, 6)
  const currentYY = today.getFullYear() % 100
  // 생년월일은 과거, 만료일은 대체로 미래다. 이 차이로 세기를 정한다.
  const century = kind === 'birth' ? (yy > currentYY ? 1900 : 2000) : yy < currentYY - 50 ? 2100 : 2000
  return `${century + yy}-${mm}-${dd}`
}

/** OCR 결과에서 MRZ 두 줄을 찾아낸다. 주변 잡음(얼굴면 글자, 줄바꿈)은 버린다. */
export function extractLines(text: string): [string, string] | null {
  const candidates = text
    .toUpperCase()
    .split(/[\r\n]+/)
    .map((l) => l.replace(/[^A-Z0-9<]/g, ''))
    .filter((l) => l.length >= 40)

  for (let i = 0; i < candidates.length - 1; i++) {
    // 첫 줄은 문서 종류로 시작한다. 여권은 P.
    if (candidates[i].startsWith('P')) return [candidates[i].slice(0, 44), candidates[i + 1].slice(0, 44)]
  }
  return candidates.length >= 2
    ? [candidates[0].slice(0, 44), candidates[1].slice(0, 44)]
    : null
}

export function parseMrz(text: string): MrzResult {
  const empty = (): MrzField => ({ value: '', verified: false })
  const base: MrzResult = {
    ok: false,
    surname: empty(),
    givenNames: empty(),
    passportNumber: empty(),
    nationality: empty(),
    birthDate: empty(),
    sex: { value: 'X', verified: false },
    expiryDate: empty(),
    suggestions: [],
    lines: ['', ''],
  }

  const lines = extractLines(text)
  if (!lines) return { ...base, reason: 'no-mrz-lines' }
  base.lines = lines

  const [l1, rawL2] = lines
  if (l1.length !== 44 || rawL2.length !== 44) return { ...base, reason: 'bad-length' }
  if (l1[0] !== 'P') return { ...base, reason: 'not-passport' }

  // 검증에 걸려도 값을 고치지 않는다. 고칠 수 있는 후보만 찾아 사용자에게 넘긴다.
  const l2 = rawL2
  const suggestions = allChecksPass(l2) ? [] : suggestRepairs(l2)

  const composite = compositeOk(l2)
  const strip = (s: string) => s.replace(/</g, '')
  const verifiedField = (g: (typeof GUARDED)[number]) => fieldOk(l2, g) && composite

  // 1번 줄: 이름. 성과 이름은 << 로 나뉜다. 이름 칸에는 자기 체크디지트가 없다.
  const [surnameRaw = '', givenRaw = ''] = l1.slice(5).split('<<')
  const tidy = (s: string) => s.replace(/</g, ' ').trim().replace(/\s+/g, ' ')

  const birthRaw = l2.slice(13, 19)
  const expiryRaw = l2.slice(21, 27)
  const sexChar = l2[20]
  const ok = allChecksPass(l2)

  return {
    ...base,
    ok,
    reason: ok ? undefined : 'checksum-failed',
    // 이름·국적·성별은 자기 체크디지트가 없어 합계 체크디지트에 기댄다.
    surname: { value: tidy(surnameRaw), verified: composite },
    givenNames: { value: tidy(givenRaw), verified: composite },
    passportNumber: { value: strip(l2.slice(0, 9)), verified: verifiedField(GUARDED[0]) },
    nationality: { value: strip(l2.slice(10, 13)), verified: composite },
    birthDate: { value: toIsoDate(birthRaw, 'birth'), verified: verifiedField(GUARDED[1]) },
    sex: {
      value: sexChar === 'M' || sexChar === 'F' ? sexChar : 'X',
      verified: composite && (sexChar === 'M' || sexChar === 'F'),
    },
    expiryDate: { value: toIsoDate(expiryRaw, 'expiry'), verified: verifiedField(GUARDED[2]) },
    suggestions,
  }
}
