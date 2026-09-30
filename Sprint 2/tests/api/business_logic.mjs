import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { resolvePhpRuntime } from "../../scripts/php_runtime.mjs";

const filePath = fileURLToPath(import.meta.url);
const runtime = resolvePhpRuntime();
for (const filename of ["business_logic.php", "error_handling.php", "release_configuration.php"]) {
const testFile = path.join(path.dirname(filePath), filename);
const args = [];
if (runtime.ini) args.push("-c", runtime.ini);
args.push(testFile);
const result = spawnSync(runtime.executable, args, { encoding: "utf8", windowsHide: true });
if (result.status !== 0) {
  process.stderr.write(result.stdout || "");
  process.stderr.write(result.stderr || result.error?.message || "");
  process.exit(result.status || 1);
}
process.stdout.write(result.stdout);
}
