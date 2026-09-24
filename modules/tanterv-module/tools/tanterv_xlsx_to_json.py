#!/usr/bin/env python3
"""Convert the SZTE curriculum spreadsheet (e.g. umi_bprof_20250825.xlsx) into curriculum_data/*.json for js/tanterv.js.

Usage: python3 tools/tanterv_xlsx_to_json.py umi_bprof_20250825.xlsx curriculum_data/umi_bprof.json
Standard library only."""
import zipfile, re, sys, xml.etree.ElementTree as ET
NS={'m':'http://schemas.openxmlformats.org/spreadsheetml/2006/main','r':'http://schemas.openxmlformats.org/officeDocument/2006/relationships'}
def col(ref):
    c=re.match(r'[A-Z]+',ref).group(); n=0
    for ch in c: n=n*26+ord(ch)-64
    return n-1
def read(path):
    z=zipfile.ZipFile(path)
    ss=[]
    if 'xl/sharedStrings.xml' in z.namelist():
        for si in ET.fromstring(z.read('xl/sharedStrings.xml')).findall('m:si',NS):
            ss.append(''.join(t.text or '' for t in si.iter('{%s}t'%NS['m'])))
    wb=ET.fromstring(z.read('xl/workbook.xml'))
    rels=ET.fromstring(z.read('xl/_rels/workbook.xml.rels'))
    rmap={r.get('Id'):r.get('Target') for r in rels}
    out={}
    for s in wb.find('m:sheets',NS):
        t=rmap[s.get('{%s}id'%NS['r'])]; t=t.lstrip('/'); t=t if t.startswith('xl/') else 'xl/'+t
        rows=[]
        for row in ET.fromstring(z.read(t)).iter('{%s}row'%NS['m']):
            r={}
            for c in row.findall('m:c',NS):
                v=c.find('m:v',NS); typ=c.get('t')
                if typ=='s' and v is not None: val=ss[int(v.text)]
                elif typ=='inlineStr': val=''.join(x.text or '' for x in c.iter('{%s}t'%NS['m']))
                else: val=v.text if v is not None else ''
                if val not in ('',None): r[col(c.get('r'))]=val.strip()
            if r: rows.append([r.get(i,'') for i in range(max(r)+1)])
        out[s.get('name')]=rows
    return out
import json
SRC, OUT = sys.argv[1:3]
wb = read(SRC)
def num(v):
    try: return int(float(v))
    except: return 0
ok = lambda v: v and v.strip() not in ('-', '')

halo = {}
for r in wb['Tantervi háló']:
    r = r + [''] * (12 - len(r))
    parent, code, name, sem, kr, bes, ora, typ, ert, fel = r[:10]
    if not ert and typ not in ('Előadás', 'Gyakorlat'): continue
    base = re.sub(r'\s+gy\.?$', '', name.strip())
    h = halo.setdefault(base, {'codes': [], 'evals': [], 'teachers': []})
    for k, v in (('codes', code), ('evals', ert), ('teachers', fel)):
        if ok(v) and v.strip() not in h[k]: h[k].append(v.strip())

courses = {}
def add_course(r):
    name, eak, gyk, eao, gyo, note = [x.strip() for x in r[:6]]
    note = re.sub(r'\s*\n\s*', ' / ', note)
    if name not in courses:
        c = {'n': name, 'ea': num(eak), 'gy': num(gyk), 'eao': num(eao), 'gyo': num(gyo), 'note': note}
        c.update(halo.get(name, {'codes': [], 'evals': [], 'teachers': []}))
        courses[name] = c
    return name

def parse(rows):
    sems = {}; pools = []; cur = None; cat = None
    for r in rows:
        r = r + [''] * (6 - len(r)); f = r[0].strip()
        m = re.match(r'^(\d)\. félév$', f)
        if m: cur = ('sem', int(m.group(1))); sems[cur[1]] = []; cat = None; continue
        if f.startswith('Választható tárgyak, félév'):
            t = f.split('félév', 1)[1].strip(' .:')
            cur = ('pool', {'ősz': 'ősz', 'tavasz': 'tavasz', 'mindkettő': 'mindkettő'}.get(t, 'bármikor'))
            pools.append({'term': cur[1], 'items': []}); continue
        if cur is None or f == 'Tárgy neve' or f.startswith('Összesen'): continue
        if not any(r[1:6]): cat = f; continue
        n = add_course(r)
        if cur[0] == 'sem':
            c = (cat or '').lower()
            kind = 'opt' if 'választható' in c else ('spec' if 'specializáció' in c else 'req')
            sems[cur[1]].append({'n': n, 'k': kind})
        else:
            pools[-1]['items'].append(n)
    return sems, pools

labels = {'Tanterv': 'Nincs specializáció', 'Back-Umi': 'Backend fejlesztő', 'Front-Umi': 'Frontend fejlesztő',
          'Test-Umi': 'Szoftvertesztelő', 'IoT-Umi': 'IoT fejlesztő', 'DevOps-Umi': 'DevOps',
          'AI-Umi': 'Mesterséges intelligencia', 'Automotive-Umi': 'Járműipari'}
plans = []
for sheet in wb:
    if sheet == 'Tantervi háló': continue
    sems, pools = parse(wb[sheet])
    plans.append({'id': sheet, 'label': labels.get(sheet, sheet), 'sems': sems, 'pools': pools})

# prerequisites: known course names mentioned in the note
names = sorted(courses, key=len, reverse=True)
for c in courses.values():
    txt = c['note']; found = []
    for n in names:
        if n == c['n']: continue
        pat = re.escape(n) + r'(?![A-Za-zÀ-žI])'
        if re.search(pat, txt):
            found.append(n); txt = re.sub(pat, ' ', txt)
    c['pre'] = found
    c['crit'] = bool(re.search(r'kritikus', c['note'], re.I))

m = re.match(r'(.*?),\s*szakfelelős:\s*(.*)', wb['Tanterv'][0][0])
data = {
    'version': 1,
    'source': SRC.split('/')[-1],
    'program': {'name': 'Üzemmérnök-informatikus BProf', 'institution': 'SZTE', 'semesters': 6, 'credits': 180,
                'lead': m.group(2).strip() if m else ''},
    'courses': courses,
    'plans': plans,
}
json.dump(data, open(OUT, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print(len(courses), 'courses,', len(plans), 'plans ->', OUT)
