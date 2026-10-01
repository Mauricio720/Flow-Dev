export class OriginRateLimiter {
  private readonly attempts = new Map<string, number[]>();
  constructor(private readonly max = 10, private readonly windowMs = 60_000) {}
  allow(origin: string, now = Date.now()) {
    const current = (this.attempts.get(origin) ?? []).filter((timestamp) => now - timestamp < this.windowMs);
    if (current.length >= this.max) { this.attempts.set(origin, current); return false; }
    current.push(now); this.attempts.set(origin, current); return true;
  }
}
