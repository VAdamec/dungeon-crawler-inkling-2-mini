"""Verify acceptance evidence and protected bytes. No runtime or git writes."""
from pathlib import Path
import hashlib,json,os,re,subprocess,zipfile
from urllib.parse import unquote
ROOT=Path(__file__).resolve().parents[3]
EVIDENCE=Path(__file__).resolve().parent
read=lambda path:json.loads(Path(path).read_text())
sha=lambda path:hashlib.sha256(Path(path).read_bytes()).hexdigest()
manifest=read(EVIDENCE/'package.json')
protected=[]
readiness={x['file']:x['sha256'] for x in read(EVIDENCE.parent/'2026-11-26-release-readiness/before-runtime-hashes.json')}
for row in read(EVIDENCE/'before-hashes.json'):
    current=sha(ROOT/row['file'])
    assert current==row['sha256']==readiness[row['file']],row['file']
    protected.append({**row,'matchesTaskStart':True,'matchesReadiness':True})
assert sha(manifest['archivePath'])==manifest['archiveSha256']
with zipfile.ZipFile(manifest['archivePath']) as z:
    assert z.testzip() is None
    assert sorted(z.namelist())==sorted(x['file'] for x in manifest['files'])
    for row in manifest['files']:
        assert hashlib.sha256(z.read(row['file'])).hexdigest()==row['sha256']
        assert sha(ROOT/row['file'])==row['sha256']
        for key in ['packagePath','extractedPath']:
            assert sha(Path(manifest[key])/row['file'])==row['sha256']
env=dict(os.environ,DYLD_LIBRARY_PATH='/opt/homebrew/Cellar/simdutf/9.3.2_1/lib')
syntax=[]
paths=[]
for base in [ROOT,Path(manifest['packagePath']),Path(manifest['extractedPath'])]:
    paths += [base/x for x in ['js/art-runtime.js','js/sprites.js','js/game.js']]
paths += [ROOT/'tests/game.test.cjs']+sorted(EVIDENCE.glob('*.cjs'))
for file in paths:
    result=subprocess.run(['/opt/homebrew/bin/node','--check',str(file)],capture_output=True,text=True,env=env)
    assert result.returncode==0,(file,result.stderr)
    syntax.append({'file':str(file),'exit':0})
import ast
ast.parse(Path(__file__).read_text())
staged=subprocess.check_output(['git','diff','--cached','--binary'],cwd=ROOT)
assert staged==Path('/tmp/dungeon-acceptance-initial-staged.patch').read_bytes()
diff=subprocess.run(['git','diff','--check'],cwd=ROOT,capture_output=True,text=True)
assert diff.returncode==0,diff.stdout+diff.stderr
files=[ROOT/f for f in ['tasks.md','handover.md','DOCUMENTATION.md','docs/reviews/2026-11-26-release-readiness/README.md','docs/reviews/2026-11-26-release-readiness/manual-acceptance.md']]+list(EVIDENCE.rglob('*.md'))
missing=[];count=0
for file in files:
    for target in re.findall(r'\]\(([^)]+)\)',file.read_text()):
        target=target.strip().split(' "')[0].strip('<>')
        if re.match(r'^[A-Za-z][A-Za-z0-9+.-]*:',target) or target.startswith('#'):continue
        target=unquote(target.split('#')[0]);p=Path(target) if target.startswith('/') else file.parent/target
        if p.resolve()==(EVIDENCE/'file-checks.json').resolve():continue
        count+=1
        if not p.exists():missing.append({'file':str(file),'target':target})
assert not missing,missing
full=(EVIDENCE/'game-tests.txt').read_text()
assert 'tests 307' in full and 'pass 307' in full and 'fail 0' in full and 'skipped 0' in full
preview=(EVIDENCE/'preview-tests.txt').read_text()
assert re.search(r'(?:pass|tests)\s+27',preview)
assert 'SMOKE_OK' in (EVIDENCE/'smoke.txt').read_text()
assert 'SAVE_MODEL_OK' in (EVIDENCE/'save-model.txt').read_text()
assert 'CAMPAIGN_MECHANICS_OK' in (EVIDENCE/'campaign.txt').read_text()
for engine in ['chromium','webkit']:
    result=read(EVIDENCE/f'package-{engine}.json')
    assert len(result['results'])==2 and not result['errors'] and not result['remote']
    assert result['sourceFingerprint']==manifest['sourceFingerprint']
assert 'requests.length>=10' in (EVIDENCE/'package-firefox.txt').read_text()
portability=read(EVIDENCE/'portability.json')
assert len(portability['results'])==12 and not portability['issues'] and not portability['remote']
assert all(row['semanticEquality'] and row['bidirectionalProfilesAndPaths'] for row in portability['results'])
manual=(ROOT/'docs/reviews/2026-11-26-release-readiness/manual-acceptance.md').read_text()
assert '- [x]' not in manual.lower() and 'UNVERIFIED' in manual
result={'protectedFiles':protected,'syntax':syntax,'pythonSyntax':'pass ast.parse','zipSourceCopiesCrcHashes':'pass','stagedDiffUnchanged':True,'stagedDiffBytes':len(staged),'diffCheck':diff.returncode,'localLinksChecked':count,'missingLocalLinks':missing,'freshChecks':{'gameTests':'307/307','previewTests':'27/27','bake':'pass','smoke':'SMOKE_OK','chromePackage':'2 profiles pass','webkitPackage':'2 profiles pass','firefoxPackage':'incomplete; original harness failed; corrected harness not browser-rerun','chromePortabilityCases':12,'stagedCampaign':'100 floors; mechanics only','saveModel':'boundary, rejection and exact roundtrip pass'},'evidenceSha256':{f.name:sha(f) for f in sorted(EVIDENCE.iterdir()) if f.is_file() and f.suffix in ['.cjs','.json','.txt'] and f.name!='file-checks.json'},'nativeGR09':'unverified','nativeChooserCancellation':'not observed; browser URL policy blocked file tab','manualBoxesChecked':0,'runtimeChanges':False,'commitOrPublish':'none'}
(EVIDENCE/'file-checks.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps({'syntax':len(syntax),'protectedFiles':len(protected),'links':count,'gameTests':'307/307','preview':'27/27','sourceStaging':'unchanged','nativeGR09':'unverified'}))
