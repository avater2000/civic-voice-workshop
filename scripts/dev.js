import { spawn } from "node:child_process";
import path from "node:path";

const cwd = process.cwd();
const webPort = process.env.WEB_PORT ?? "5173";
const apiPort = process.env.PORT ?? "3001";
const apiUrl = process.env.VITE_API_URL ?? `http://localhost:${apiPort}`;
const viteEntry = path.join(cwd, "node_modules", "vite", "bin", "vite.js");

const children = [
  spawn(process.execPath, [viteEntry, "--host", "0.0.0.0", "--port", webPort, "--strictPort"], {
    cwd,
    env: { ...process.env, VITE_API_URL: apiUrl },
    stdio: "inherit",
  }),
  spawn(process.execPath, ["--env-file-if-exists=.env", "server/index.js"], {
    cwd,
    env: { ...process.env, PORT: apiPort },
    stdio: "inherit",
  }),
];

let stopping = false;
function stop(signal = "SIGTERM") {
  if (stopping) return;
  stopping = true;
  for (const child of children) {
    if (!child.killed) child.kill(signal);
  }
}

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => stop(signal));
}

for (const child of children) {
  child.on("exit", (code, signal) => {
    if (!stopping && code !== 0) {
      stop();
      process.exitCode = code ?? (signal ? 1 : 0);
    }
  });
}
