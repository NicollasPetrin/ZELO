import { performance } from "node:perf_hooks";
import { setTimeout as sleep } from "node:timers/promises";

type Scenario = "public" | "auth-read" | "mixed";

type Config = {
  baseUrl: string;
  scenario: Scenario;
  durationSeconds: number;
  warmupSeconds: number;
  concurrency: number;
  concurrencyStages: number[];
  timeoutMs: number;
  cookie?: string;
  login?: {
    email: string;
    password: string;
  };
  paths: string[];
  maxErrorRate: number;
  maxP95Ms?: number;
};

type Result = {
  path: string;
  status?: number;
  ok: boolean;
  durationMs: number;
  bytes: number;
  error?: string;
};

const defaultPaths: Record<Scenario, string[]> = {
  public: ["/", "/login", "/signup"],
  "auth-read": ["/dashboard", "/my-tasks", "/team-tasks", "/departments", "/employees", "/goals", "/reports", "/settings", "/notifications"],
  mixed: ["/", "/login", "/dashboard", "/my-tasks", "/team-tasks", "/departments", "/employees", "/goals", "/reports", "/settings"],
};

function readArg(name: string) {
  const prefix = `--${name}=`;
  const valueWithEquals = process.argv.find((arg) => arg.startsWith(prefix));

  if (valueWithEquals) {
    return valueWithEquals.slice(prefix.length);
  }

  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function readNumberArg(name: string, fallback: number) {
  const value = readArg(name);

  if (!value) {
    return fallback;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`Parametro --${name} invalido: ${value}`);
  }

  return parsed;
}

function readNonNegativeNumberArg(name: string, fallback: number) {
  const value = readArg(name);

  if (value === undefined) {
    return fallback;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`Parametro --${name} invalido: ${value}`);
  }

  return parsed;
}

function parseConcurrencyStages(fallback: number) {
  const raw = readArg("concurrencies") ?? process.env.LOAD_CONCURRENCIES;

  if (!raw) {
    return [fallback];
  }

  const stages = raw.split(",").map((value) => Number(value.trim()));

  if (!stages.length || stages.some((value) => !Number.isSafeInteger(value) || value < 1)) {
    throw new Error(`Parametro --concurrencies invalido: ${raw}`);
  }

  return Array.from(new Set(stages));
}

function normalizeBaseUrl(value: string) {
  return value.endsWith("/") ? value : `${value}/`;
}

function parsePaths(scenario: Scenario) {
  const rawPaths = readArg("paths") ?? process.env.LOAD_PATHS;

  if (!rawPaths) {
    return defaultPaths[scenario];
  }

  return rawPaths
    .split(",")
    .map((path) => path.trim())
    .filter(Boolean)
    .map((path) => (path.startsWith("/") ? path : `/${path}`));
}

function parseConfig(): Config {
  const scenario = (readArg("scenario") ?? process.env.LOAD_SCENARIO ?? "public") as Scenario;

  if (!Object.keys(defaultPaths).includes(scenario)) {
    throw new Error(`Scenario invalido: ${scenario}. Use public, auth-read ou mixed.`);
  }

  const cookie = readArg("cookie") ?? process.env.LOAD_COOKIE;
  const loginEmail = process.env.LOAD_LOGIN_EMAIL;
  const loginPassword = process.env.LOAD_LOGIN_PASSWORD;
  const needsCookie = scenario === "auth-read" || scenario === "mixed";

  if (Boolean(loginEmail) !== Boolean(loginPassword)) {
    throw new Error("Defina LOAD_LOGIN_EMAIL e LOAD_LOGIN_PASSWORD juntos.");
  }

  if (needsCookie && !cookie && (!loginEmail || !loginPassword)) {
    throw new Error("Este scenario precisa de LOAD_COOKIE ou LOAD_LOGIN_EMAIL e LOAD_LOGIN_PASSWORD.");
  }

  const concurrency = readNumberArg("concurrency", Number(process.env.LOAD_CONCURRENCY ?? 10));

  return {
    baseUrl: normalizeBaseUrl(readArg("base-url") ?? process.env.LOAD_BASE_URL ?? "http://localhost:3000"),
    scenario,
    durationSeconds: readNumberArg("duration", Number(process.env.LOAD_DURATION_SECONDS ?? 30)),
    warmupSeconds: readNonNegativeNumberArg("warmup", Number(process.env.LOAD_WARMUP_SECONDS ?? 5)),
    concurrency,
    concurrencyStages: parseConcurrencyStages(concurrency),
    timeoutMs: readNumberArg("timeout-ms", Number(process.env.LOAD_TIMEOUT_MS ?? 10_000)),
    cookie,
    login: loginEmail && loginPassword ? { email: loginEmail, password: loginPassword } : undefined,
    paths: parsePaths(scenario),
    maxErrorRate: readNonNegativeNumberArg("max-error-rate", Number(process.env.LOAD_MAX_ERROR_RATE ?? 1)),
    maxP95Ms: readArg("max-p95-ms") || process.env.LOAD_MAX_P95_MS
      ? readNumberArg("max-p95-ms", Number(process.env.LOAD_MAX_P95_MS ?? 0))
      : undefined,
  };
}

async function authenticate(config: Config): Promise<Config> {
  if (config.cookie || !config.login) {
    return config;
  }

  const loginUrl = new URL("/login", config.baseUrl);
  const loginPage = await fetch(loginUrl, { cache: "no-store" });
  const html = await loginPage.text();
  const actionName = html.match(/name="(\$ACTION_ID_[^"]+)"/)?.[1];

  if (!actionName) {
    throw new Error("Nao foi possivel localizar a acao de login.");
  }

  const form = new FormData();
  form.set(actionName, "");
  form.set("email", config.login.email);
  form.set("password", config.login.password);
  const response = await fetch(loginUrl, {
    method: "POST",
    body: form,
    redirect: "manual",
  });
  const setCookie = response.headers.get("set-cookie");
  const sessionValue = setCookie?.match(/(?:^|,\s*)zelo_session=([^;]+)/)?.[1];

  if (!sessionValue) {
    throw new Error("Login de carga recusado. Confira as credenciais e o ambiente alvo.");
  }

  return {
    ...config,
    cookie: `zelo_session=${sessionValue}`,
  };
}

function percentile(values: number[], percentileValue: number) {
  if (!values.length) {
    return 0;
  }

  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((percentileValue / 100) * sorted.length) - 1;

  return sorted[Math.max(0, Math.min(index, sorted.length - 1))];
}

function formatMs(value: number) {
  return `${Math.round(value)}ms`;
}

function formatRate(value: number) {
  return `${value.toFixed(2)}/s`;
}

function pickPath(paths: string[]) {
  return paths[Math.floor(Math.random() * paths.length)] ?? "/";
}

async function requestPath(config: Config, path: string): Promise<Result> {
  const url = new URL(path, config.baseUrl);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs);
  const startedAt = performance.now();

  try {
    const response = await fetch(url, {
      method: "GET",
      redirect: "manual",
      cache: "no-store",
      signal: controller.signal,
      headers: {
        accept: "text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8",
        "user-agent": "zelo-load-test/1.0",
        ...(config.cookie ? { cookie: config.cookie } : {}),
      },
    });
    const body = await response.arrayBuffer();
    const durationMs = performance.now() - startedAt;

    return {
      path,
      status: response.status,
      ok: response.status >= 200 && response.status < 400,
      durationMs,
      bytes: body.byteLength,
    };
  } catch (error) {
    return {
      path,
      ok: false,
      durationMs: performance.now() - startedAt,
      bytes: 0,
      error: error instanceof Error ? error.name : "UnknownError",
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function runPhase(config: Config, seconds: number, collect: boolean) {
  const results: Result[] = [];
  const deadline = performance.now() + seconds * 1000;
  let completed = 0;
  const startedAt = performance.now();
  const progress = setInterval(() => {
    const elapsedSeconds = Math.max((performance.now() - startedAt) / 1000, 1);
    process.stdout.write(`\r${collect ? "Test" : "Warmup"}: ${completed} req, ${formatRate(completed / elapsedSeconds)}`);
  }, 1000);

  async function worker() {
    while (performance.now() < deadline) {
      const result = await requestPath(config, pickPath(config.paths));
      completed += 1;

      if (collect) {
        results.push(result);
      }
    }
  }

  await Promise.all(Array.from({ length: config.concurrency }, () => worker()));
  clearInterval(progress);
  process.stdout.write("\n");

  return results;
}

function printSummary(config: Config, results: Result[], elapsedSeconds: number) {
  const latencies = results.map((result) => result.durationMs);
  const failed = results.filter((result) => !result.ok);
  const byStatus = new Map<string, number>();
  const byPath = new Map<string, { count: number; failed: number; totalMs: number }>();
  const totalBytes = results.reduce((sum, result) => sum + result.bytes, 0);

  for (const result of results) {
    const statusKey = result.status ? String(result.status) : result.error ?? "error";
    byStatus.set(statusKey, (byStatus.get(statusKey) ?? 0) + 1);
    const pathStats = byPath.get(result.path) ?? { count: 0, failed: 0, totalMs: 0 };
    pathStats.count += 1;
    pathStats.failed += result.ok ? 0 : 1;
    pathStats.totalMs += result.durationMs;
    byPath.set(result.path, pathStats);
  }

  const errorRate = results.length ? (failed.length / results.length) * 100 : 100;
  const p95 = percentile(latencies, 95);

  console.log("\nLoad test summary");
  console.log("-----------------");
  console.log(`Base URL:        ${config.baseUrl}`);
  console.log(`Scenario:        ${config.scenario}`);
  console.log(`Concurrency:     ${config.concurrency}`);
  console.log(`Duration:        ${elapsedSeconds.toFixed(1)}s`);
  console.log(`Requests:        ${results.length}`);
  console.log(`Throughput:      ${formatRate(results.length / elapsedSeconds)}`);
  console.log(`Transferred:     ${(totalBytes / 1024 / 1024).toFixed(2)} MB`);
  console.log(`Error rate:      ${errorRate.toFixed(2)}%`);
  console.log(`Latency p50:     ${formatMs(percentile(latencies, 50))}`);
  console.log(`Latency p90:     ${formatMs(percentile(latencies, 90))}`);
  console.log(`Latency p95:     ${formatMs(p95)}`);
  console.log(`Latency p99:     ${formatMs(percentile(latencies, 99))}`);
  console.log(`Latency max:     ${formatMs(Math.max(...latencies, 0))}`);
  console.log(`Status counts:   ${Array.from(byStatus.entries()).map(([key, value]) => `${key}=${value}`).join(", ")}`);

  console.log("\nPaths");
  for (const [path, stats] of Array.from(byPath.entries()).sort((a, b) => b[1].count - a[1].count)) {
    console.log(`- ${path}: ${stats.count} req, ${stats.failed} fail, avg ${formatMs(stats.totalMs / stats.count)}`);
  }

  if (errorRate > config.maxErrorRate) {
    throw new Error(`Error rate ${errorRate.toFixed(2)}% passou do limite de ${config.maxErrorRate}%.`);
  }

  if (config.maxP95Ms && p95 > config.maxP95Ms) {
    throw new Error(`p95 ${formatMs(p95)} passou do limite de ${formatMs(config.maxP95Ms)}.`);
  }
}

async function main() {
  const config = await authenticate(parseConfig());

  console.log("Zelo load test");
  console.log(`Target: ${config.baseUrl}`);
  console.log(`Paths: ${config.paths.join(", ")}`);
  console.log(`Concurrency stages: ${config.concurrencyStages.join(" -> ")}`);
  console.log(`Duration per stage: ${config.durationSeconds}s`);
  console.log(`Warmup per stage: ${config.warmupSeconds}s`);

  for (const [index, concurrency] of config.concurrencyStages.entries()) {
    const stageConfig = { ...config, concurrency };
    console.log(`\nStage ${index + 1}/${config.concurrencyStages.length}: concurrency ${concurrency}`);

    if (stageConfig.warmupSeconds > 0) {
      await runPhase(stageConfig, stageConfig.warmupSeconds, false);
      await sleep(1000);
    }

    const startedAt = performance.now();
    const results = await runPhase(stageConfig, stageConfig.durationSeconds, true);
    const elapsedSeconds = Math.max((performance.now() - startedAt) / 1000, 0.001);

    printSummary(stageConfig, results, elapsedSeconds);

    if (index < config.concurrencyStages.length - 1) {
      await sleep(2000);
    }
  }
}

main().catch((error) => {
  console.error(`\nLoad test failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
