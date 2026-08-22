import { readFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const PREVIEW_SITE_URL = "https://remotory-preview.teyontt0309.workers.dev";
const REQUIRED_SECRETS = [
  "CLOUDFLARE_ACCESS_TEAM_DOMAIN",
  "CLOUDFLARE_ACCESS_AUD",
  "REMOTORY_ADMIN_EMAIL",
];

function parseEnvFile(source) {
  const values = {};
  for (const rawLine of source.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const separator = line.indexOf("=");
    if (separator <= 0) continue;
    const key = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();
    const isQuoted =
      value.length >= 2 &&
      ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'")));
    if (isQuoted) value = value.slice(1, -1);
    values[key] = value;
  }
  return values;
}

async function loadLocalEnvironment() {
  try {
    return parseEnvFile(await readFile(".env.local", "utf8"));
  } catch (error) {
    if (error?.code === "ENOENT") return {};
    throw error;
  }
}

function run(command, args, environment) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      env: environment,
      stdio: "inherit",
      shell: false,
    });
    child.once("error", reject);
    child.once("exit", (code) => {
      if (code === 0) resolve();
      else
        reject(new Error(`${command} exited with code ${code ?? "unknown"}`));
    });
  });
}

const localEnvironment = await loadLocalEnvironment();
const environment = {
  ...process.env,
  ...Object.fromEntries(
    REQUIRED_SECRETS.map((key) => [
      key,
      process.env[key] || localEnvironment[key],
    ]),
  ),
  REMOTORY_SITE_URL: PREVIEW_SITE_URL,
  REMOTORY_ALLOW_INDEXING: "false",
  REMOTORY_AUTH_DEV_BYPASS: "false",
  REMOTORY_ENABLE_REMOTE_BINDINGS: "false",
};

for (const key of REQUIRED_SECRETS) {
  if (!environment[key]) {
    throw new Error(
      `${key} is required in the process environment or ignored .env.local`,
    );
  }
}

const openNextCli = fileURLToPath(
  new URL(
    "../node_modules/@opennextjs/cloudflare/dist/cli/index.js",
    import.meta.url,
  ),
);

await run(process.execPath, [openNextCli, "build"], environment);
await run(
  process.execPath,
  [openNextCli, "deploy", "--env", "preview"],
  environment,
);
