# 원문 변경 검토 큐

자동 생성 — 2026-10-12. `node scripts/check-sources.mjs --write` 가 만든다.

출처 12건 · 변경 5 · 접근 불가 0 · 동일 7 · 최초 기록 0

| 심각도 | 절차 | 출처 | 상태 | 원문 |
|---|---|---|---|---|
| 높음 · 절차가 달라질 수 있음 | bank-account | easylaw-bank | 원문 변경됨 | [외국인유학생 > 국내 생활 > 금융 거래 > 은행 이용 등](https://www.easylaw.go.kr/CSP/CnpClsMain.laf?popMenu=ov&csmSeq=2853&ccfNo=3&cciNo=2&cnpClsNo=1) |
| 높음 · 절차가 달라질 수 있음 | health-insurance | easylaw-nhis | 원문 변경됨 | [외국인유학생 > 국내 생활 > 의료 > 국민건강보험 가입](https://www.easylaw.go.kr/CSP/CnpClsMain.laf?popMenu=ov&csmSeq=2853&ccfNo=3&cciNo=5&cnpClsNo=1) |
| 높음 · 절차가 달라질 수 있음 | mobile-phone | easylaw-phone | 원문 변경됨 | [외국인유학생 > 국내 생활 > 통신 및 우편 > 휴대전화 등 가입](https://www.easylaw.go.kr/CSP/CnpClsMain.laf?popMenu=ov&csmSeq=2853&ccfNo=3&cciNo=4&cnpClsNo=1) |
| 높음 · 절차가 달라질 수 있음 | part-time-work | easylaw-parttime | 원문 변경됨 | [외국인유학생 > 국내 생활 > 유학 중 아르바이트 > 시간제 취업(아르바이트)](https://www.easylaw.go.kr/CSP/CnpClsMain.laf?popMenu=ov&csmSeq=2853&ccfNo=3&cciNo=6&cnpClsNo=1) |
| 높음 · 절차가 달라질 수 있음 | support-desks | easylaw-nhis-contacts | 원문 변경됨 | [외국인유학생 > 국내 생활 > 의료 > 국민건강보험 가입](https://www.easylaw.go.kr/CSP/CnpClsMain.laf?popMenu=ov&csmSeq=2853&ccfNo=3&cciNo=5&cnpClsNo=1) |

### bank-account / easylaw-bank

- 판단 근거: 기간·기한
- 실제로 바뀐 줄:
  - `이 정보는 2026년 9월 15일 기준으로 작성된 것입니다.`
  - `이 정보는 2026년 8월 15일 기준으로 작성된 것입니다.`

### health-insurance / easylaw-nhis

- 판단 근거: 기간·기한
- 실제로 바뀐 줄:
  - `이 정보는 2026년 9월 15일 기준으로 작성된 것입니다.`
  - `이 정보는 2026년 8월 15일 기준으로 작성된 것입니다.`

### mobile-phone / easylaw-phone

- 판단 근거: 기간·기한
- 실제로 바뀐 줄:
  - `이 정보는 2026년 9월 15일 기준으로 작성된 것입니다.`
  - `이 정보는 2026년 8월 15일 기준으로 작성된 것입니다.`

### part-time-work / easylaw-parttime

- 판단 근거: 기간·기한
- 실제로 바뀐 줄:
  - `유학(D-2) 또는 일반연수(D-4)의 체류자격을 가진 외국인유학생이 시간제 취업(아르바이트)을 하려면 일정 수준의 한국어 능력을 보유하고 유학 본연의 활동에 전념하며, 학교 유학생 담당자의 확인을 받은 사람이어야 합니다(법무부 출입국·외국인정책본부, 『체류자격별 통합 안내 매뉴얼』, …`
  - `이 정보는 2026년 9월 15일 기준으로 작성된 것입니다.`
  - `유학(D-2) 또는 일반연수(D-4)의 체류자격을 가진 외국인유학생이 시간제 취업(아르바이트)을 하려면 일정 수준의 한국어 능력을 보유하고 유학 본연의 활동에 전념하며, 학교 유학생 담당자의 확인을 받은 사람이어야 합니다(법무부 출입국·외국인정책본부, 『체류자격별 통합 안내 매뉴얼』, …`
  - `이 정보는 2026년 8월 15일 기준으로 작성된 것입니다.`

### support-desks / easylaw-nhis-contacts

- 판단 근거: 기간·기한
- 실제로 바뀐 줄:
  - `이 정보는 2026년 9월 15일 기준으로 작성된 것입니다.`
  - `이 정보는 2026년 8월 15일 기준으로 작성된 것입니다.`

## 검토하는 법

1. 원문을 열어 무엇이 바뀌었는지 확인한다.
2. 규칙 YAML의 내용을 고친다.
3. 그 출처의 `checked_on` 을 오늘로, `next_check_on` 을 90일 뒤로 바꾸고 `changed_at` 을 지운다.
4. `changed_at` 을 지우지 않으면 화면에 계속 "확인 필요"가 남는다. 그게 의도한 동작이다.
