"""Make a deterministic five-file review archive outside the repository. No git writes."""
from pathlib import Path
from html.parser import HTMLParser
import hashlib, json, shutil, subprocess, tempfile, zipfile, re
ROOT = Path(__file__).resolve().parents[3]
EVIDENCE = Path(__file__).resolve().parent
FILES = ('index.html', 'style.css', 'js/art-runtime.js', 'js/sprites.js', 'js/game.js')
class Dependencies(HTMLParser):
    def __init__(self):
        super().__init__(); self.paths = []; self.scripts = []
    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        attr = 'href' if tag == 'link' else 'data' if tag == 'object' else 'src'
        value = attrs.get(attr)
        if value and not value.startswith('#'):
            self.paths.append(value)
            if tag == 'script': self.scripts.append(value)
def digest(path): return hashlib.sha256(path.read_bytes()).hexdigest()
def main():
    parser = Dependencies(); parser.feed((ROOT / 'index.html').read_text())
    assert parser.scripts == list(FILES[2:]), parser.scripts
    assert set(parser.paths) <= set(FILES), parser.paths
    css_refs = re.findall(r'url\(\s*[\'"]?([^\)\'"\s]+)', (ROOT / 'style.css').read_text())
    assert all(ref.startswith(('data:', '#')) for ref in css_refs), css_refs
    work = Path(tempfile.mkdtemp(prefix='dungeon-release-readiness-'))
    package = work / 'clean runtime package'; package.mkdir()
    rows = []
    for name in FILES:
        source = ROOT / name
        assert source.is_file() and not source.is_symlink(), name
        target = package / name; target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(source, target)
        tracked = subprocess.run(['git', 'ls-files', '--error-unmatch', name], cwd=ROOT, capture_output=True).returncode == 0
        rows.append({'file':name,'bytes':source.stat().st_size,'sha256':digest(source),'tracked':tracked,'copyMatches':digest(target)==digest(source)})
    fingerprint = hashlib.sha256(json.dumps(rows, sort_keys=True).encode()).hexdigest()
    archive = work / ('dungeon-crawler-review-' + fingerprint[:12] + '.zip')
    with zipfile.ZipFile(archive, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=9) as z:
        for name in FILES:
            entry = zipfile.ZipInfo(name, (2026,11,26,0,0,0)); entry.external_attr = 0o100644 << 16
            entry.compress_type = zipfile.ZIP_DEFLATED; z.writestr(entry, (package/name).read_bytes(), compresslevel=9)
    relocated = work / 'relocated unzipped game'; relocated.mkdir()
    with zipfile.ZipFile(archive) as z:
        assert z.testzip() is None
        assert z.namelist() == list(FILES)
        assert all(not name.startswith('/') and '..' not in Path(name).parts for name in z.namelist())
        z.extractall(relocated)
    assert sorted(str(p.relative_to(relocated)) for p in relocated.rglob('*') if p.is_file()) == sorted(FILES)
    for row in rows: assert digest(relocated/row['file']) == row['sha256']
    result = {'status':'review artifact; not a release or publication','versionBranding':'2.0.0 unchanged; current unreleased worktree contents',
        'sourceRoot':str(ROOT),'packagePath':str(package),'extractedPath':str(relocated),'archivePath':str(archive),
        'archiveBytes':archive.stat().st_size,'archiveSha256':digest(archive),'sourceFingerprint':fingerprint,
        'runtimeBytes':sum(row['bytes'] for row in rows),'files':rows,'scriptOrder':parser.scripts,'htmlLocalDependencies':parser.paths,
        'cssReferences':css_refs,'zipCrcAndExtraction':True,'nativeGR09':'unverified'}
    (EVIDENCE/'package.json').write_text(json.dumps(result,indent=2)+'\n')
    print(json.dumps({'package':str(package),'extracted':str(relocated),'zip':str(archive),'zipBytes':archive.stat().st_size,'files':len(rows)}))
if __name__ == '__main__': main()
