import hashlib
import importlib.util
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

SCRIPT = Path(__file__).resolve().parents[1] / "scripts" / "database_backup.py"
spec = importlib.util.spec_from_file_location("database_backup", SCRIPT)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class BackupSafetyTests(unittest.TestCase):
    def test_backup_does_not_overwrite_existing_file(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "backup.sql"
            path.write_text("keep")
            with self.assertRaises(ValueError):
                module.backup(None, path)
            self.assertEqual(path.read_text(), "keep")

    def test_restore_rejects_invalid_checksum_before_database_access(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "backup.sql"
            path.write_text("SELECT 1;")
            path.with_suffix(".sql.sha256").write_text("incorrect")
            with patch.object(module, "run_mysql") as mysql:
                with self.assertRaises(ValueError):
                    module.restore(None, path)
                mysql.assert_not_called()

    def test_restore_rejects_existing_database(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "backup.sql"
            path.write_text("SELECT 1;")
            path.with_suffix(".sql.sha256").write_text(hashlib.sha256(path.read_bytes()).hexdigest())
            config = module.DatabaseConfig.from_environment("restore_safety_qa")
            with patch.object(module, "run_mysql", return_value="1") as mysql:
                with self.assertRaises(ValueError):
                    module.restore(config, path)
                self.assertEqual(mysql.call_count, 1)
