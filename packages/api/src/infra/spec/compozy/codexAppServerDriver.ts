import type { CodexAccount, CodexDeviceLogin, CodexLoginDriver, CodexLoginProgress } from "./codexLoginDriver";
import { JsonRpcProcess } from "./jsonRpcProcess";

const DEVICE_CODE_TTL_MS = 15 * 60_000;
const CLIENT_INFO = { name: "flow-dev-broker", title: "Flow Dev", version: "1.0.0" };
const APP_SERVER_ARGS = ["app-server", "-c", "cli_auth_credentials_store=file"];

type LoginEntry = { process: JsonRpcProcess; progress: CodexLoginProgress };
type DeviceCodeResponse = { type: string; loginId: string; verificationUrl: string; userCode: string };
type AccountResponse = { account: { type: string; email: string | null; planType?: string } | null };

function appServerEnvironment(home: string): NodeJS.ProcessEnv {
  return { PATH: process.env.PATH, HOME: process.env.HOME, CODEX_HOME: home } as unknown as NodeJS.ProcessEnv;
}

export class CodexAppServerDriver implements CodexLoginDriver {
  private readonly logins = new Map<string, LoginEntry>();

  constructor(private readonly command = "codex") {}

  private async open(home: string) {
    const rpc = new JsonRpcProcess(this.command, { args: APP_SERVER_ARGS, env: appServerEnvironment(home) });
    await rpc.request("initialize", { clientInfo: CLIENT_INFO, capabilities: null });
    rpc.notify("initialized");
    return rpc;
  }

  async start(home: string): Promise<CodexDeviceLogin> {
    const rpc = await this.open(home);
    const response = await rpc.request<DeviceCodeResponse>("account/login/start", { type: "chatgptDeviceCode" });
    if (response.type !== "chatgptDeviceCode") throw new Error("device_login_unsupported");
    const entry: LoginEntry = { process: rpc, progress: "pending" };
    rpc.onNotification = ({ method, params }) => {
      if (method !== "account/login/completed" || params.loginId !== response.loginId) return;
      entry.progress = params.success ? "completed" : "failed";
      rpc.close();
    };
    this.logins.set(response.loginId, entry);
    const expiresAt = new Date(Date.now() + DEVICE_CODE_TTL_MS);
    return { loginId: response.loginId, verificationUrl: response.verificationUrl, userCode: response.userCode, expiresAt };
  }

  async progress(loginId: string) {
    return this.logins.get(loginId)?.progress ?? "failed";
  }

  async readAccount(home: string): Promise<CodexAccount | null> {
    const rpc = await this.open(home);
    try {
      const { account } = await rpc.request<AccountResponse>("account/read", { refreshToken: false });
      if (!account) return null;
      return { accountId: `${account.type}:${account.email ?? "unknown"}`, email: account.email, subscription: account.type === "chatgpt" };
    } finally {
      rpc.close();
    }
  }

  async cancel(loginId: string) {
    const entry = this.logins.get(loginId);
    this.logins.delete(loginId);
    if (!entry) return;
    await entry.process.request("account/login/cancel", { loginId }).catch(() => undefined);
    entry.process.close();
  }
}
