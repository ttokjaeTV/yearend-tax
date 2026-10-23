// 연말 절세 체크 시험 — 기대값은 법령으로 손계산. 페이지가 부르는 rules.js·calc-v2.js·연금저축·IRP 세액공제 엔진(커밋 고정)을 같은 버전으로 불러 돌린다.
const fs = require('fs'), path = require('path'), vm = require('vm'), cp = require('child_process');
const page = fs.readFileSync(path.join(__dirname, 'template.html'), 'utf8');
const get = url => cp.execFileSync(process.execPath, ['-e',
  `fetch(${JSON.stringify(url)}).then(r => { if (!r.ok) throw new Error(r.status); return r.text(); }).then(t => process.stdout.write(t))`]).toString();
function local(repo, rel) {
  for (let d = __dirname, i = 0; i < 6; i++, d = path.dirname(d)) { const f = path.join(d, repo, rel); if (fs.existsSync(f)) return fs.readFileSync(f, 'utf8'); }
  return null;
}
const rulesRel = page.match(/rules\/v[\d.]+\/rules\.js/)[0], calcRel = page.match(/rules\/calc-v\d+\.js/)[0];
const pcM = page.match(/gh\/ttokjaeTV\/pension-credit@([0-9a-f]{40})\/src\/engine\.js/);
const ctx = { console }; vm.createContext(ctx);
const run = (src, name) => vm.runInContext(src, ctx, { filename: name });
const asModule = src => `(function(){ const module = { exports: {} }; ${src}\n; return module.exports; })()`;
ctx.TTOKJAE_RULES = run(asModule(local('ttokjaetv.github.io', rulesRel) || get('https://ttokjaetv.github.io/' + rulesRel)), 'rules');
ctx.TTOKJAE_CALC = run(asModule(local('ttokjaetv.github.io', calcRel) || get('https://ttokjaetv.github.io/' + calcRel)), 'calc');
let pc = null;
try { const d = path.join(__dirname, '..', '..', 'pension-credit');
  if (cp.execFileSync('git', ['-C', d, 'rev-parse', 'HEAD']).toString().trim() === pcM[1]) pc = fs.readFileSync(path.join(d, 'src', 'engine.js'), 'utf8'); } catch (e) {}
if (!pc) pc = get(`https://cdn.jsdelivr.net/gh/ttokjaeTV/pension-credit@${pcM[1]}/src/engine.js`);
run(pc.replace(/if \(typeof module[^\n]*\n/, ''), 'pc-engine');
run('var R = TTOKJAE_RULES, C = TTOKJAE_CALC.bind(R);', 'glue');
run(fs.readFileSync(path.join(__dirname, 'yearend.js'), 'utf8').replace(/if \(typeof module[^\n]*\n/, ''), 'yearend');
const X = s => vm.runInContext(s, ctx);
let fail = 0, n = 0;
const eq = (name, got, want) => { n++; if (got !== want) { fail++; console.log(`✗ ${name}: ${got} (기대 ${want})`); } };
const M = 1e4;

// 1. 세액공제: 총급여 5,000만 · 연금저축 300만 → 49.5만, 600만 더 넣으면 +99만
let a = X(`ytCredit({ kind: 'wage', income: 5000e4, ps: 300e4, irp: 0, isa: 0, isaTo: 'ps', isaPrev: 0, tax: null }, R)`);
eq('세액공제 지금', a.now.total, 495000); eq('남은 한도', a.room, 600 * M); eq('더 받는 돈', a.gain, 990000);
eq('연금저축으로', a.toPs, 300 * M); eq('IRP로', a.toIrp, 300 * M);
a = X(`ytCredit({ kind: 'wage', income: 5000e4, ps: 600e4, irp: 300e4, isa: 0, isaTo: 'ps', isaPrev: 0, tax: null }, R)`);
eq('한도 다 참', a.status, 'done'); eq('다 차면 더 받는 돈 0', a.gain, 0);

// 2. 해외주식: 이익 1,000만 → (1,000−250)×22% = 165만. 손실 300만 쓰면 (700−250)×22% = 99만 → 66만 아낌
let b = X(`ytOverseas({ realized: 1000e4, openLoss: 300e4, openGain: 0 }, R, C)`);
eq('양도세', b.t0, 1650000); eq('손실 쓴 뒤', b.t1, 990000); eq('아낀 세금', b.saveNow, 660000); eq('세금 0 되는 손실', b.needLoss, 750 * M);
b = X(`ytOverseas({ realized: 1000e4, openLoss: 2000e4, openGain: 0 }, R, C)`);
eq('필요한 만큼만 손실', b.useLoss, 750 * M); eq('세금 0', b.t1, 0);
// 이익 100만 → 공제 150만 남음, 이익 종목 500만 중 150만 실현 → 나중에 33만 덜 냄
b = X(`ytOverseas({ realized: 100e4, openLoss: 0, openGain: 500e4 }, R, C)`);
eq('양도세 0', b.t0, 0); eq('남은 공제', b.room, 150 * M); eq('공제 채우기', b.harvest, 150 * M); eq('나중에 덜 냄', b.saveLater, 330000);
b = X(`ytOverseas({ realized: -200e4, openLoss: 0, openGain: 1000e4 }, R, C)`);
eq('손실 200만 + 공제 250만', b.room, 450 * M); eq('손실 해 세금 0', b.t0, 0); eq('손실 해 나중에 덜 냄', b.saveLater, 990000);

// 3. 금융소득
let f = X(`ytFin({ received: 1800e4, more: 300e4 }, R)`);
eq('종합과세 초과', f.overComp, 100 * M); eq('종합과세 판정', f.status, 'warn');
eq('건보료 구간', X(`ytFin({ received: 1200e4, more: 0 }, R)`).status, 'info');
eq('1,000만 이하', X(`ytFin({ received: 1000e4, more: 0 }, R)`).status, 'done');

// 4. 연금 인출 1,500만
eq('1,500만 이하', X(`ytPension({ withdrawn: 1500e4 }, R)`).status, 'info');
eq('넘음', X(`ytPension({ withdrawn: 1600e4 }, R)`).over, 100 * M);

console.log(fail ? `실패 ${fail}/${n}` : `ALL PASS (${n}개)`);
process.exit(fail ? 1 : 0);
