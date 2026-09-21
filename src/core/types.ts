/** 절차 규칙의 타입. YAML 파일이 원본이고 이 타입은 그 모양을 그대로 옮긴 것이다. */

export type Lang = 'ko' | 'en' | 'vi'

/** 세 언어를 모두 가진 문자열. 행정 용어는 원문 병기가 원칙이라 한국어를 버리지 않는다. */
export type Localized = Record<Lang, string>

export type VisaCode = 'D-2' | 'D-4'

/** 기한을 세는 기준점. before_activity는 날짜가 아니라 순서의 문제다. */
export type DeadlineBasis =
  | 'entry_date'
  | 'registration_date'
  | 'move_in_date'
  | 'change_date'
  | 'before_activity'

export interface Deadline {
  from: DeadlineBasis
  /** null이면 "며칠 안에"가 아니라 "그 전에"라는 뜻이다. */
  days: number | null
  note?: Localized
}

/**
 * 규칙 하나가 기대는 원문. checked_on은 사람이 실제로 원문을 본 날이고,
 * source_updated_on은 그 원문이 스스로 밝힌 최종수정일이다. 둘은 다른 값이며 둘 다 화면에 보여 준다.
 */
export interface Source {
  id: string
  publisher: string
  title: string
  url: string
  /** 원문이 최종수정일을 밝히지 않으면 null. */
  source_updated_on: string | null
  /** 원문이 근거로 든 상위 문서(법령·매뉴얼). */
  cites?: string
  checked_by: string
  checked_on: string
  next_check_on: string
  /** 변경 감지 배치가 채운다. 처음 커밋될 때는 비어 있다. */
  content_hash?: string | null
  /** 원문이 마지막으로 바뀐 것을 배치가 감지한 날. 사람이 확인하면 지워진다. */
  changed_at?: string | null
  note?: Localized
}

export interface DocumentItem {
  ko: string
  en: string
  vi: string
  /** 특정 비자에만 필요한 서류. */
  condition?: { visa?: VisaCode[] }
}

export interface AppliesTo {
  visa?: VisaCode[]
  /** 이 일수를 넘겨 체류할 때만 해당된다. */
  stay_over_days?: number
  /** 외국인등록증이 있어야만 의미가 있는 절차. */
  requires_arc?: boolean
  agency?: string[]
}

export interface Rule {
  id: string
  order: number
  title: Localized
  summary: Localized
  terms: Localized[]
  applies_to: AppliesTo
  /** 반드시 먼저 끝나야 하는 절차. 그래프의 간선이다. */
  requires: string[]
  /** 없어도 되지만 없으면 선택지가 줄어드는 절차. 막지는 않고 알려만 준다. */
  requires_soft?: string[]
  requires_note?: Localized
  deadline?: Deadline
  steps: Localized[]
  documents: DocumentItem[]
  cautions?: Localized[]
  contacts?: Localized[]
  sources: Source[]
}

export interface SupportDesk {
  id: string
  name: Localized
  phone: string
  scope: Localized
}

export interface RuleBundle {
  /** 번들을 만든 날. 화면의 "기준일"이 된다. */
  builtOn: string
  rules: Rule[]
  desks: SupportDesk[]
  deskSources: Source[]
}

/** 사용자가 입력하는 것. 서버에 보내지 않고 브라우저에만 둔다. */
export interface Profile {
  nationality: string
  visa: VisaCode
  /** ISO 날짜. 기한 계산의 기준점이다. */
  entryDate: string
  registrationDate?: string
  moveInDate?: string
  hasArc: boolean
}

export type TaskStatus = 'available' | 'blocked' | 'done'

export interface Task {
  rule: Rule
  status: TaskStatus
  /** 막혀 있다면 무엇 때문에 막혔는지. 사용자가 다음에 무엇을 할지 알아야 한다. */
  blockedBy: Rule[]
  /** 있으면 좋은 선행 절차 중 아직 안 끝난 것. */
  softBlockedBy: Rule[]
  /** 계산된 마감일 (ISO). 기준 날짜가 프로필에 없으면 null. */
  dueDate: string | null
  /** 오늘 기준 남은 일수. 음수면 이미 지났다. */
  daysLeft: number | null
}
