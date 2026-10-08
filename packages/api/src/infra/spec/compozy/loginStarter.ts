import type { BeginLoginInput, LoginStart } from "../../../application/software/credentialBroker";
import { driverFor, type BrokerContext } from "./brokerContext";
import { assertOpaqueId } from "./credentialHomes";
import type { LoginKind } from "./loginOperations";

export async function beginLogin(context: BrokerContext, kind: LoginKind, input: BeginLoginInput): Promise<LoginStart> {
  assertOpaqueId(input.connectionId);
  const replay = context.operations.find(input.operationId);
  if (replay) return { operationId: replay.operationId, expiresAt: replay.expiresAt, ...replay.start };
  if (context.operations.hasPendingFor(input.connectionId, context.now())) throw new Error("login_in_progress");
  const driver = driverFor(context, kind);
  await context.homes.ensureRoot();
  const stagingHome = await context.homes.createStaging(input.operationId);
  const login = await driver.start(stagingHome).catch(async (error: unknown) => {
    await context.homes.discardStaging(input.operationId);
    throw error;
  });
  const start = { verificationUrl: login.verificationUrl, userCode: login.userCode };
  context.operations.add({ ...input, kind, loginId: login.loginId, stagingHome, expiresAt: login.expiresAt, start, settled: null, authenticated: null });
  return { operationId: input.operationId, expiresAt: login.expiresAt, ...start };
}
