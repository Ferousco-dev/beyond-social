import { readFileSync } from "node:fs";
import path from "node:path";

/** The addresses e2e/stack.sh wrote when it started. Tests never fall back to a live service. */
function readStackEnv(): Record<string, string> {
  const file = path.resolve(__dirname, "../../../e2e/.state/env");
  try {
    return Object.fromEntries(
      readFileSync(file, "utf8")
        .split("\n")
        .filter((line) => line.includes("="))
        .map((line) => [line.slice(0, line.indexOf("=")), line.slice(line.indexOf("=") + 1)]),
    );
  } catch {
    throw new Error("The test stack is not running. Start it with e2e/stack.sh up.");
  }
}

const env = readStackEnv();

function local(name: string): string {
  const value = env[name] ?? "";
  if (!/^http:\/\/(127\.0\.0\.1|localhost):\d+/u.test(value)) throw new Error(`${name} must be a local address, got "${value}"`);
  return value;
}

export const stack = {
  webUrl: local("E2E_WEB_URL"),
  apiUrl: local("E2E_API_URL"),
  fakeUrl: local("E2E_FAKE_URL"),
  mailUrl: local("E2E_MAIL_URL"),
  supabaseUrl: local("E2E_SUPABASE_URL"),
  serviceRoleKey: env.E2E_SERVICE_ROLE_KEY ?? "",
};

export const USER_STATE = path.resolve(__dirname, "../.auth/user.json");
export const ADMIN_STATE = path.resolve(__dirname, "../.auth/admin.json");
export const PASSWORD = "Test-password-2026!";
