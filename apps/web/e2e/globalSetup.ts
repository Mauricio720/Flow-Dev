import type { FullConfig } from "@playwright/test";
import { startFakeGithub } from "./fakeGithub/fakeGithubServer";
import { e2eConfigured, e2eDatabaseUrl, fakeGithubPort } from "./fixtures/environment";
import { startSessionWorker } from "./sessionWorkerSetup";
import { warmUpServer } from "./warmUpServer";

export default async function globalSetup(config: FullConfig) {
  if (!e2eConfigured) return undefined;
  const baseURL = String(config.projects[0]?.use.baseURL ?? "");
  const stopFakeGithub = await startFakeGithub(e2eDatabaseUrl ?? "", fakeGithubPort);
  const stopWorker = await startSessionWorker(baseURL);
  await warmUpServer(baseURL);
  return async () => {
    await stopWorker?.();
    await stopFakeGithub();
  };
}
