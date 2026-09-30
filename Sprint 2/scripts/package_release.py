"""Build a source-only archive from a reviewed allowlist, never from the worktree wholesale."""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import tempfile
import zipfile
from pathlib import Path, PurePosixPath

ROOT = Path(__file__).resolve().parents[2]
MANIFEST = 'DELIVERY_MANIFEST.sha256'
ROOT_FILES = (
    '.env.example', '.gitignore', 'README.md', 'MAMP_MYSQL_SETUP.md', 'RELEASE_NOTES.md',
    'package.json', 'package-lock.json', 'Sprint 2/.htaccess', 'Sprint 2/README.md',
    'Sprint 2/src/README.md', 'Sprint 2/database/sprint3_schema.sql',
    'Sprint 2/database/schema.sql', 'Sprint 2/database/seed.sql', 'Sprint 2/database/build_seed.py',
)
TREES = {
    'Sprint 2/api': {'.php'},
    'Sprint 2/config': {'.json'},
    'Sprint 2/data/contracts': {'.json', '.md'},
    'Sprint 2/database/migrations': {'.sql'},
    'Sprint 2/scripts': {'.py', '.ps1', '.mjs', '.php'},
    'Sprint 2/src/app': {'.html', '.css', '.js'},
    'Sprint 2/src/pipeline': {'.py'},
    'Sprint 2/tests': {'.py', '.php', '.mjs', '.csv', '.json'},
    'docs/architecture': {'.md', '.mmd'},
    'docs/handover': {'.md'},
    'docs/sprint3': {'.md'},
}
HISTORIC_TEST_DOCS = ('source_matrix.md', 'decision_log_W4.md', 'backlog_sprint3.md')
FORBIDDEN_PARTS = {'.git', '.work', '__pycache__', 'node_modules', 'output', 'output_sprint3',
                   'test-results', 'playwright-report', 'backups', 'data_YvY', '.env', 'config.php'}
PATTERNS = (
    re.compile(r'BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY'),
    re.compile(r'\b(?:gh[pousr]_|github_pat_|sk-)[A-Za-z0-9_-]{20,}\b'),
    re.compile(r'\b\d{2}\.\d{3}\.\d{3}/\d{4}-\d{2}\b'),
    re.compile(r'\b[A-Z]{2}[A-Z0-9]{9}[0-9]\b'),
    re.compile(r'[A-Z]:[\\/]Users[\\/][^<\\/\s]+', re.I),
    re.compile(r'(?:DB_PASSWORD|MYSQL_PWD)\s*=\s*[\"\x27](?!CHANGE_ME|<|\$|[\"\x27])[^\"\x27]+[\"\x27]', re.I),
)


def safe_name(name):
    path = PurePosixPath(name)
    if path.is_absolute() or '..' in path.parts or '\\' in name or ':' in name:
        raise ValueError('Unsafe archive path')
    if any(part in FORBIDDEN_PARTS for part in path.parts):
        raise ValueError('Forbidden archive path')
    return path


def scan(name, content):
    safe_name(name)
    allowed = name in ROOT_FILES or name in {'Sprint 2/docs/' + item for item in HISTORIC_TEST_DOCS}
    allowed = allowed or any(name.startswith(directory + '/') and PurePosixPath(name).suffix in extensions
                             for directory, extensions in TREES.items())
    if not allowed:
        raise ValueError('Path is not in the release allowlist: ' + name)
    if len(content) > 10 * 1024 * 1024:
        raise ValueError('Oversized release file: ' + name)
    text = content.decode('utf-8-sig')
    for pattern in PATTERNS:
        if pattern.search(text):
            raise ValueError('Potential secret/private identifier/personal path in: ' + name)


def collect(root):
    root = root.resolve()
    names = set(ROOT_FILES) | {'Sprint 2/docs/' + name for name in HISTORIC_TEST_DOCS}
    for directory, extensions in TREES.items():
        folder = root / directory
        if not folder.is_dir():
            raise ValueError('Required release directory missing: ' + directory)
        for file in folder.rglob('*'):
            name = file.relative_to(root).as_posix()
            if any(part in FORBIDDEN_PARTS for part in PurePosixPath(name).parts):
                continue
            if file.is_file() and file.suffix in extensions:
                names.add(name)
    contents = {}
    for name in sorted(names):
        file = root / name
        if not file.is_file() or file.is_symlink() or not file.resolve().is_relative_to(root):
            raise ValueError('Missing or unsafe release file: ' + name)
        content = file.read_bytes()
        scan(name, content)
        contents[name] = content
    return contents


def verify(archive):
    with zipfile.ZipFile(archive) as handle:
        names = handle.namelist()
        if len(names) > 1000 or sum(item.file_size for item in handle.infolist()) > 100 * 1024 * 1024:
            raise ValueError('Archive exceeds release size limits')
        if len(names) != len(set(names)) or MANIFEST not in names:
            raise ValueError('Duplicate entries or missing manifest')
        for name in names:
            safe_name(name)
            if handle.getinfo(name).file_size > 10 * 1024 * 1024:
                raise ValueError('Oversized archive entry')
        entries = {}
        for line in handle.read(MANIFEST).decode('utf-8').splitlines():
            digest, name = line.split('  ', 1)
            if not re.fullmatch('[a-f0-9]{64}', digest) or name in entries:
                raise ValueError('Invalid manifest')
            entries[name] = digest
        if set(entries) != set(names) - {MANIFEST}:
            raise ValueError('Manifest file set mismatch')
        for name, digest in entries.items():
            data = handle.read(name)
            scan(name, data)
            if hashlib.sha256(data).hexdigest() != digest:
                raise ValueError('Manifest hash mismatch: ' + name)
    return len(names)


def build(root, destination):
    contents = collect(root)
    lines = [hashlib.sha256(data).hexdigest() + '  ' + name for name, data in contents.items()]
    contents[MANIFEST] = ('\n'.join(lines) + '\n').encode()
    destination.parent.mkdir(parents=True, exist_ok=True)
    descriptor, temporary = tempfile.mkstemp(suffix='.zip', dir=destination.parent)
    os.close(descriptor)
    try:
        with zipfile.ZipFile(temporary, 'w', compression=zipfile.ZIP_DEFLATED) as handle:
            for name, data in contents.items():
                info = zipfile.ZipInfo(name, date_time=(2026, 1, 1, 0, 0, 0))
                info.compress_type = zipfile.ZIP_DEFLATED
                handle.writestr(info, data)
        count = verify(temporary)
        os.replace(temporary, destination)
    finally:
        Path(temporary).unlink(missing_ok=True)
    digest = hashlib.sha256(destination.read_bytes()).hexdigest()
    destination.with_suffix('.zip.sha256').write_text(digest + '  ' + destination.name + '\n', encoding='utf-8')
    return {'files': count, 'bytes': destination.stat().st_size, 'sha256': digest}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--name', default='YvY_Capital_Funds_Manager_Final_Release.zip')
    args = parser.parse_args()
    if not re.fullmatch(r'[A-Za-z0-9_-]+\.zip', args.name):
        parser.error('Use a simple ZIP filename; output stays inside delivery/')
    result = build(ROOT, ROOT / 'delivery' / args.name)
    print(json.dumps({'archive': 'delivery/' + args.name, **result}))


if __name__ == '__main__':
    main()
