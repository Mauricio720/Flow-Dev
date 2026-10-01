export class HealthController {
  check(requestId: string) {
    return { status: "ok" as const, requestId, serverTime: new Date().toISOString() };
  }
}

export const healthController = new HealthController();
