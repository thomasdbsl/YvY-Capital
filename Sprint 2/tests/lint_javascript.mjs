import { readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const sprintRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function javascriptFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) return javascriptFiles(target);
    return entry.isFile() && /\.(?:js|mjs)$/.test(entry.name) ? [target] : [];
  });
}

const files = ["src/app/js", "scripts", "tests"]
  .flatMap((directory) => javascriptFiles(path.join(sprintRoot, directory)))
  .sort();

for (const file of files) {
  const result = spawnSync(process.execPath, ["--check", file], { encoding: "utf8", windowsHide: true });
  if (result.status !== 0) {
    process.stderr.write(result.stdout || "");
    process.stderr.write(result.stderr || "");
    process.exit(result.status || 1);
  }
}

process.stdout.write(`JavaScript syntax passed for ${files.length} runtime and test files.\n`);
