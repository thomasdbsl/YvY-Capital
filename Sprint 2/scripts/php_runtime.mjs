import { accessSync, constants, existsSync, readdirSync } from "node:fs";
import { spawn } from "node:child_process";
import path from "node:path";

function executableExists(candidate) {
  try {
    accessSync(candidate, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

function versionParts(name) {
  return name.replace(/^php/i, "").split(".").map((part) => Number.parseInt(part, 10) || 0);
}

function compareVersionsDescending(left, right) {
  const a = versionParts(left);
  const b = versionParts(right);
  for (let index = 0; index < Math.max(a.length, b.length); index += 1) {
    const difference = (b[index] || 0) - (a[index] || 0);
    if (difference) return difference;
  }
  return 0;
}

export function resolvePhpRuntime() {
  if (process.env.PHP_EXECUTABLE) {
    if (!executableExists(process.env.PHP_EXECUTABLE)) throw new Error(`PHP_EXECUTABLE does not exist: ${process.env.PHP_EXECUTABLE}`);
    return { executable: process.env.PHP_EXECUTABLE, ini: process.env.PHP_INI || null };
  }

  if (process.platform === "win32") {
    const mampPhpRoot = "C:\\MAMP\\bin\\php";
    if (existsSync(mampPhpRoot)) {
      const versions = readdirSync(mampPhpRoot, { withFileTypes: true })
        .filter((entry) => entry.isDirectory() && /^php\d/.test(entry.name))
        .map((entry) => entry.name)
        .sort(compareVersionsDescending);
      for (const version of versions) {
        const executable = path.join(mampPhpRoot, version, "php.exe");
        if (!executableExists(executable)) continue;
        const iniCandidate = path.join("C:\\MAMP\\conf", version, "php.ini");
        return { executable, ini: existsSync(iniCandidate) ? iniCandidate : null };
      }
    }
  }

  return { executable: "php", ini: process.env.PHP_INI || null };
}

async function waitForServer(url, child) {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    if (child.exitCode !== null) throw new Error(`PHP server exited with code ${child.exitCode}`);
    try {
      const response = await fetch(url);
      if (response.status < 500) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`PHP server did not start at ${url}`);
}

export async function startPhpServer({ sprintRoot, port = 4173, host = "127.0.0.1", stdio = "ignore" }) {
  const runtime = resolvePhpRuntime();
  const args = [];
  if (runtime.ini) args.push("-c", runtime.ini);
  args.push("-S", `${host}:${port}`, "-t", sprintRoot);
  const child = spawn(runtime.executable, args, {
    cwd: sprintRoot,
    env: process.env,
    stdio,
    windowsHide: true,
  });
  const origin = `http://${host}:${port}`;
  try {
    await waitForServer(`${origin}/src/app/`, child);
  } catch (error) {
    child.kill();
    throw error;
  }
  return {
    child,
    origin,
    appUrl: `${origin}/src/app/`,
    apiUrl: `${origin}/api`,
    runtime,
    async stop() {
      if (child.exitCode === null) child.kill();
      await new Promise((resolve) => {
        if (child.exitCode !== null) return resolve();
        child.once("exit", resolve);
        setTimeout(resolve, 1500).unref();
      });
    },
  };
}
