import path from "node:path";
import { fileURLToPath } from "node:url";
import { startPhpServer } from "./php_runtime.mjs";

const scriptPath = fileURLToPath(import.meta.url);
const sprintRoot = path.resolve(path.dirname(scriptPath), "..");
const port = Number.parseInt(process.env.FUNDS_MANAGER_HTTP_PORT || "4173", 10);

const server = await startPhpServer({ sprintRoot, port, stdio: "inherit" });
const health = await fetch(`${server.apiUrl}/health.php`);
if (!health.ok) {
  const body = await health.text();
  await server.stop();
  throw new Error(`API health check failed (${health.status}): ${body}`);
}

process.stdout.write(`Funds Manager is available at ${server.appUrl}\n`);
process.stdout.write(`API health: ${server.apiUrl}/health.php\n`);

async function shutdown() {
  await server.stop();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
await new Promise(() => {});
