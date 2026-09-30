from __future__ import annotations

import hashlib
import importlib.util
import tempfile
import unittest
import zipfile
from pathlib import Path

SCRIPT = Path(__file__).resolve().parents[1] / 'scripts' / 'package_release.py'
spec = importlib.util.spec_from_file_location('release_package', SCRIPT)
package = importlib.util.module_from_spec(spec)
spec.loader.exec_module(package)


class ReleasePackageTests(unittest.TestCase):
    def test_real_allowlist_contains_migrations_and_excludes_local_artifacts(self):
        contents = package.collect(package.ROOT)
        self.assertIn('Sprint 2/.htaccess', contents)
        self.assertIn('Sprint 2/database/migrations/009_pipeline_attempts.sql', contents)
        self.assertIn('docs/handover/DEPLOYMENT_GUIDE.md', contents)
        for name in ['migrate_sprint4.php', 'provision_user.php', 'dev_router.php']:
            self.assertIn('Sprint 2/scripts/' + name, contents)
        for name in contents:
            self.assertFalse(name.endswith(('.pdf', '.pptx', '.docx', '.zip', '.pyc')))
            self.assertNotIn('data_YvY/', name)
            self.assertNotIn('/output/', name)
            self.assertNotEqual(name, '.env')
            self.assertFalse(name.endswith('/config.php'))

    def test_reproducible_zip_and_manifest_verification(self):
        with tempfile.TemporaryDirectory() as temporary:
            first, second = (Path(temporary) / name for name in ['first.zip', 'second.zip'])
            a = package.build(package.ROOT, first)
            b = package.build(package.ROOT, second)
            self.assertEqual(a['sha256'], b['sha256'])
            self.assertEqual(package.verify(first), a['files'])
            with zipfile.ZipFile(first) as archive:
                self.assertIn('.env.example', archive.namelist())

    def test_traversal_and_disallowed_files_are_rejected(self):
        for name in ['../README.md', '/README.md', 'C:/README.md', 'docs/private.pdf', '.env',
                     'Sprint 2/api/config.php', 'data_YvY/source.csv']:
            with self.subTest(name=name), self.assertRaises(ValueError):
                package.scan(name, b'safe content')

    def test_secrets_and_oversized_content_are_rejected(self):
        for content in [('ghp_' + 'a' * 30).encode(), ('BEGIN ' + 'PRIVATE KEY').encode(),
                        b'x' * (10 * 1024 * 1024 + 1)]:
            with self.assertRaises(ValueError):
                package.scan('README.md', content)

    def test_tampered_manifest_is_rejected(self):
        with tempfile.TemporaryDirectory() as temporary:
            archive = Path(temporary) / 'tampered.zip'
            with zipfile.ZipFile(archive, 'w') as handle:
                handle.writestr('README.md', b'changed')
                handle.writestr(package.MANIFEST, hashlib.sha256(b'original').hexdigest() + '  README.md\n')
            with self.assertRaisesRegex(ValueError, 'hash mismatch'):
                package.verify(archive)

    def test_unmanifested_entry_is_rejected(self):
        with tempfile.TemporaryDirectory() as temporary:
            archive = Path(temporary) / 'extra.zip'
            with zipfile.ZipFile(archive, 'w') as handle:
                handle.writestr('README.md', b'content')
                handle.writestr(package.MANIFEST, '')
            with self.assertRaisesRegex(ValueError, 'file set mismatch'):
                package.verify(archive)


if __name__ == '__main__':
    unittest.main()
