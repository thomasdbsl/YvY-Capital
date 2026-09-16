import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { resolvePhpRuntime } from "./php_runtime.mjs";

const commands = { migrate: "migrate_sprint4.php", provision: "provision_user.php" };
const script = commands[process.argv[2]];
if (!script) throw new Error("Expected migrate or provision");
const runtime = resolvePhpRuntime();
const args = runtime.ini ? ["-c", runtime.ini] : [];
args.push(path.join(path.dirname(fileURLToPath(import.meta.url)), script));
const result = spawnSync(runtime.executable, args, { stdio: "inherit", windowsHide: true });
process.exit(result.status ?? 1);
