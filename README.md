# 연말 절세 체크리스트 · 똑재TV

12월 31일이 지나면 되돌릴 수 없는 절세 4가지를 내 숫자로 점검하는 체크리스트.

- 사이트: https://ttokjaetv.github.io/yearend-tax/
- 항목
  1. 연금저축·IRP 세액공제 남은 한도 — 연금저축·IRP 세액공제 계산기 엔진(`pension-credit@43e57b3…/src/engine.js`, jsDelivr 커밋 고정)으로 계산, 같은 값으로 그 계산기를 여는 링크
  2. 해외주식 손익 정리 — 허브 calc-v2 `overseasStock.tax`(원 단위 반올림). 세금이 있으면 손실 종목 상계, 없으면 남은 공제(+올해 손실)만큼 이익 실현 후 재매수(취득가 올림)로 나중에 줄어드는 세금. 손실은 다음 해로 넘어가지 않음
  3. 금융소득 연 2,000만원(종합과세)·연 1,000만원(건보료 반영) — fin-income-tax로 합계(do) 넘김
  4. 연금계좌 인출 연 1,500만원(사적연금 분리과세 기준)
- 제도 숫자는 허브 `rules/v2026.2/rules.js`, 문구 숫자는 `fill-v1.js`(`data-rule`).

## 수정하는 법
`src/`를 고친 뒤 `python src/build.py` → `index.html`. 시험 `node src/test.js`(기대값은 법령 손계산). 연금저축·IRP 세액공제 엔진이 바뀌면 template.html의 커밋 번호를 올린다.
