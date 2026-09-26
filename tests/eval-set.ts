/**
 * 검색 평가셋. 인터뷰에서 실제로 나온 질문 유형과, 언어를 섞은 질문, 그리고
 * "규칙 안에 답이 없는 질문"을 함께 둔다. 마지막 것이 가장 중요하다 —
 * 모르는 것에 답하지 않는지가 이 제품의 값이기 때문이다.
 */
export const IN_SCOPE: { q: string; rule: string }[] = [
  // 한국어
  { q: '외국인등록 언제까지 해야 하나요', rule: 'alien-registration' },
  { q: '외국인등록증 만들려면 무슨 서류가 필요해요?', rule: 'alien-registration' },
  { q: '유학생인데 재학증명서도 내야 하나요', rule: 'alien-registration' },
  { q: '이사했는데 신고해야 하나요', rule: 'residence-report' },
  { q: '주소 바뀌면 며칠 안에 신고해요', rule: 'residence-report' },
  { q: '외국인등록증 없이 휴대폰 개통할 수 있나요', rule: 'mobile-phone' },
  { q: '선불 유심 사려면 뭐가 필요해요', rule: 'mobile-phone' },
  { q: '은행 계좌 만들 때 필요한 서류', rule: 'bank-account' },
  { q: '본국에서 송금 받으려면 어떻게 해요', rule: 'bank-account' },
  { q: '건강보험 자동으로 가입되나요', rule: 'health-insurance' },
  { q: '건강보험료 얼마나 내나요 유학생 할인 있어요', rule: 'health-insurance' },
  { q: '아르바이트 하려면 허가 받아야 하나요', rule: 'part-time-work' },
  { q: '유학생 주당 몇 시간 일할 수 있어요', rule: 'part-time-work' },
  { q: '토픽 몇 급 있어야 알바 가능해요', rule: 'part-time-work' },
  { q: '외국인등록증 잃어버렸어요', rule: 'arc-reissue' },
  { q: '등록증 재발급 받으려면', rule: 'arc-reissue' },
  // 영어
  { q: 'when do I need to register as a foreigner', rule: 'alien-registration' },
  { q: 'can I open a bank account without an ARC', rule: 'bank-account' },
  { q: 'do I need permission to work part time', rule: 'part-time-work' },
  { q: 'I lost my alien registration card', rule: 'arc-reissue' },
  { q: 'prepaid sim card documents', rule: 'mobile-phone' },
  { q: 'health insurance for D-2 students', rule: 'health-insurance' },
  { q: 'I moved to a new address, what should I do', rule: 'residence-report' },
  // 베트남어
  { q: 'đăng ký người nước ngoài trong bao nhiêu ngày', rule: 'alien-registration' },
  { q: 'mở tài khoản ngân hàng cần giấy tờ gì', rule: 'bank-account' },
  { q: 'làm thêm có cần giấy phép không', rule: 'part-time-work' },
  { q: 'tôi bị mất thẻ ARC', rule: 'arc-reissue' },
]

/** 규칙 안에 답이 없는 질문. 전부 "모르겠다"로 떨어져야 한다. */
export const OUT_OF_SCOPE = [
  '서울에서 맛집 추천해 주세요',
  '오늘 날씨 어때요',
  '집주인이 보증금을 안 돌려줘요 소송하려면',
  '비자 연장이 거절되면 어떻게 항소하나요',
  '한국어능력시험 접수는 어디서 하나요',
  '운전면허 어떻게 따요',
  'how do I apply for permanent residency',
  'which university should I choose',
  'tôi muốn tìm việc làm toàn thời gian sau khi tốt nghiệp',
]

