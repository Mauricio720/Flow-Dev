export type CodexDeviceLogin = {
  loginId: string;
  verificationUrl: string;
  userCode: string;
  expiresAt: Date;
};

export type CodexLoginProgress = "pending" | "completed" | "declined" | "failed";

export type CodexAccount = { accountId: string; email: string | null; subscription: boolean };

export interface CodexLoginDriver {
  start(home: string): Promise<CodexDeviceLogin>;
  progress(loginId: string): Promise<CodexLoginProgress>;
  readAccount(home: string): Promise<CodexAccount | null>;
  cancel(loginId: string): Promise<void>;
}
