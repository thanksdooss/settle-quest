# 원문 변경 검토 큐

자동 생성 — 2026-09-21. `node scripts/check-sources.mjs --write` 가 만든다.

출처 12건 · 변경 0 · 접근 불가 12 · 동일 0 · 최초 기록 0

| 절차 | 출처 | 상태 | 원문 |
|---|---|---|---|
| alien-registration | hikorea-176 | 접근 불가 (fetch failed) | [외국인등록 대상 및 시기](https://www.hikorea.go.kr/info/InfoDatail.pt?CAT_SEQ=176&PARENT_ID=139) |
| alien-registration | hikorea-177 | 접근 불가 (fetch failed) | [외국인등록시 제출서류](https://www.hikorea.go.kr/info/InfoDatail.pt?CAT_SEQ=177&PARENT_ID=139) |
| alien-registration | hikorea-178 | 접근 불가 (fetch failed) | [외국인등록증 발급/재발급/교부](https://www.hikorea.go.kr/info/InfoDatail.pt?CAT_SEQ=178&PARENT_ID=139) |
| arc-reissue | hikorea-178b | 접근 불가 (fetch failed) | [외국인등록증 발급/재발급/교부](https://www.hikorea.go.kr/info/InfoDatail.pt?CAT_SEQ=178&PARENT_ID=139) |
| arc-reissue | hikorea-196 | 접근 불가 (fetch failed) | [외국인등록사항 변경 신고의무](https://www.hikorea.go.kr/info/InfoDatail.pt?CAT_SEQ=196&PARENT_ID=146) |
| bank-account | easylaw-bank | 접근 불가 (fetch failed) | [외국인유학생 > 국내 생활 > 금융 거래 > 은행 이용 등](https://www.easylaw.go.kr/CSP/CnpClsMain.laf?popMenu=ov&csmSeq=2853&ccfNo=3&cciNo=2&cnpClsNo=1) |
| health-insurance | easylaw-nhis | 접근 불가 (fetch failed) | [외국인유학생 > 국내 생활 > 의료 > 국민건강보험 가입](https://www.easylaw.go.kr/CSP/CnpClsMain.laf?popMenu=ov&csmSeq=2853&ccfNo=3&cciNo=5&cnpClsNo=1) |
| mobile-phone | easylaw-phone | 접근 불가 (fetch failed) | [외국인유학생 > 국내 생활 > 통신 및 우편 > 휴대전화 등 가입](https://www.easylaw.go.kr/CSP/CnpClsMain.laf?popMenu=ov&csmSeq=2853&ccfNo=3&cciNo=4&cnpClsNo=1) |
| part-time-work | easylaw-parttime | 접근 불가 (fetch failed) | [외국인유학생 > 국내 생활 > 유학 중 아르바이트 > 시간제 취업(아르바이트)](https://www.easylaw.go.kr/CSP/CnpClsMain.laf?popMenu=ov&csmSeq=2853&ccfNo=3&cciNo=6&cnpClsNo=1) |
| part-time-work | hikorea-187 | 접근 불가 (fetch failed) | [체류자격외활동허가 절차/방법](https://www.hikorea.go.kr/info/InfoDatail.pt?CAT_SEQ=187&PARENT_ID=142) |
| residence-report | hikorea-197 | 접근 불가 (fetch failed) | [체류지변경 신고의무](https://www.hikorea.go.kr/info/InfoDatail.pt?CAT_SEQ=197&PARENT_ID=146) |
| support-desks | easylaw-nhis-contacts | 접근 불가 (fetch failed) | [외국인유학생 > 국내 생활 > 의료 > 국민건강보험 가입](https://www.easylaw.go.kr/CSP/CnpClsMain.laf?popMenu=ov&csmSeq=2853&ccfNo=3&cciNo=5&cnpClsNo=1) |

## 검토하는 법

1. 원문을 열어 무엇이 바뀌었는지 확인한다.
2. 규칙 YAML의 내용을 고친다.
3. 그 출처의 `checked_on` 을 오늘로, `next_check_on` 을 90일 뒤로 바꾸고 `changed_at` 을 지운다.
4. `changed_at` 을 지우지 않으면 화면에 계속 "확인 필요"가 남는다. 그게 의도한 동작이다.
