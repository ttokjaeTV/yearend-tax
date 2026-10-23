/* 연말 절세 체크 — 12월 31일 전에 할 수 있는 일 4가지를 판정한다. 금액 원.
 * 제도 숫자는 rules.js(R), 법정 계산은 calc-v2.js(C = TTOKJAE_CALC.bind(R)), 연금계좌 세액공제는 연금저축·IRP 세액공제 계산기 엔진(pcCalc)을 쓴다.
 */

/* 1. 연금저축·IRP 세액공제: 지금 넣은 돈으로 받는 환급, 한도까지 더 넣으면 더 받는 환급 */
function ytCredit(o, R) {
  const now = pcCalc(o, R);
  const toPs = Math.min(now.roomAny, now.roomPs), toIrp = Math.max(0, now.roomAny - toPs);
  const full = pcCalc({ ...o, ps: now.ps + toPs, irp: now.irp + toIrp }, R);
  return { now, toPs, toIrp, room: now.roomAny, gain: Math.max(0, full.total - now.total), full,
    status: now.roomAny <= 0 ? 'done' : full.total > now.total ? 'todo' : 'capped' };
}

/* 2. 해외주식 손익 정리 (양도소득 기본공제는 해마다 새로 생기고, 손실은 다음 해로 넘어가지 않는다)
 *   realized: 올해 이미 판 해외주식 손익 합계(손실이면 음수), openLoss: 지금 손실 중인 종목을 팔면 생길 손실(양수),
 *   openGain: 지금 이익 중인 종목을 팔면 생길 이익(양수) */
function ytOverseas(o, R, C) {
  const ded = R.OVERSEAS_STOCK.basicDeduction, rate = R.OVERSEAS_STOCK.rate;
  const n = v => Math.max(0, +v || 0);
  const realized = +o.realized || 0, openLoss = n(o.openLoss), openGain = n(o.openGain);
  const tax = g => C.overseasStock.tax(g, { roundWon: true }).tax;
  const t0 = tax(realized);
  // (가) 세금이 있으면: 손실 종목을 팔아 상계. 세금을 0으로 만드는 데 필요한 손실과, 가진 손실을 다 쓸 때 줄어드는 세금
  const needLoss = Math.max(0, realized - ded);
  const useLoss = Math.min(openLoss, needLoss);
  const t1 = tax(realized - useLoss);
  // (나) 공제가 남으면: 이익 종목을 공제 한도만큼 팔았다가 다시 사서 취득가를 올림 → 지금 세금 0, 나중에 팔 때 그만큼 세금이 줄어듦
  const room = Math.max(0, ded - realized);   // 올해 손실이 있으면 그만큼 더 (손실은 다음 해로 넘어가지 않음)
  const harvest = Math.min(openGain, room);
  return { realized, t0, needLoss, useLoss, t1, saveNow: t0 - t1, room, harvest, saveLater: Math.floor(harvest * rate),
    status: t0 > 0 ? (useLoss > 0 ? 'todo' : 'info') : harvest > 0 ? 'todo' : 'done' };
}

/* 3. 금융소득: 올해 이자·배당(일반계좌, 세전)이 연 2,000만원을 넘으면 종합과세, 1,000만원을 넘으면 건보료에 반영 */
function ytFin(o, R) {
  const total = Math.max(0, +o.received || 0) + Math.max(0, +o.more || 0);
  const comp = R.FIN_INCOME.threshold, nh = R.NHIS.finIncomeThreshold;
  return { total, comp, nh, overComp: Math.max(0, total - comp), roomComp: Math.max(0, comp - total), overNh: total > nh,
    status: total > comp ? 'warn' : total > nh ? 'info' : 'done' };
}

/* 4. 연금계좌 인출: 사적연금(세액공제 받은 원금·운용수익)이 연 1,500만원 이하면 연금소득세(저율) 분리과세 */
function ytPension(o, R) {
  const w = Math.max(0, +o.withdrawn || 0), lim = R.PENSION.separateLimit;
  return { w, lim, room: Math.max(0, lim - w), over: Math.max(0, w - lim), status: w > lim ? 'warn' : w > 0 ? 'info' : 'skip' };
}

if (typeof module !== 'undefined') module.exports = { ytCredit, ytOverseas, ytFin, ytPension };
