"""src/ → index.html 빌드:  python src/build.py"""
from pathlib import Path
S = Path(__file__).parent
t = (S / 'template.html').read_text(encoding='utf-8')
y = (S / 'yearend.js').read_text(encoding='utf-8').replace("if (typeof module !== 'undefined') module.exports = { ytCredit, ytOverseas, ytFin, ytPension };\n", '')
t = t.replace('/*__BASE_CSS__*/\n', (S / 'base.css').read_text(encoding='utf-8'))
t = t.replace('/*__YEAREND__*/', y)
assert '/*__' not in t and 'module.exports' not in t
(S.parent / 'index.html').write_text(t, encoding='utf-8')
print('index.html', len(t))
