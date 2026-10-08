import type { SoftwareDao } from "../../database/dao/softwareDao";
import type { SessionPrincipal } from "../../../context";
import { SoftwareError } from "./softwareErrors";

export type Clock = () => Date;
export const systemClock: Clock = () => new Date();

export async function requireAdmin(dao: SoftwareDao, actor: SessionPrincipal) {
  if (!(await dao.isAdmin(actor.userId))) throw new SoftwareError("admin_required");
  return actor.userId;
}

export async function replayedAudit(dao: SoftwareDao, input: { idempotencyKey: string; requestHash: string }) {
  const previous = await dao.audit.findByKey(input.idempotencyKey);
  if (!previous) return null;
  if (previous.requestHash !== input.requestHash) throw new SoftwareError("idempotency_key_reused");
  return previous;
}
