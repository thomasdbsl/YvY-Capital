import { readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { resolvePhpRuntime } from "../../scripts/php_runtime.mjs";

const filePath = fileURLToPath(import.meta.url);
const sprintRoot = path.resolve(path.dirname(filePath), "../..");
const runtime = resolvePhpRuntime();
function phpFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) return phpFiles(target);
    return entry.isFile() && entry.name.endsWith(".php") ? [target] : [];
  });
}

const files = [path.join(sprintRoot, "api"), path.join(sprintRoot, "scripts"), path.join(sprintRoot, "tests", "api")]
  .flatMap(phpFiles)
  .sort();

for (const name of files) {
  const args = [];
  if (runtime.ini) args.push("-c", runtime.ini);
  args.push("-l", name);
  const result = spawnSync(runtime.executable, args, { encoding: "utf8", windowsHide: true });
  if (result.status !== 0) {
    process.stderr.write(result.stdout || "");
    process.stderr.write(result.stderr || "");
    process.exit(result.status || 1);
  }
}

process.stdout.write(`PHP lint passed for ${files.length} API and CLI files.\n`);
