import type { SessionPrincipal } from "../../../context";
import type { SoftwareDao } from "../../database/dao/softwareDao";
import { requireAdmin } from "./softwareAccess";

export class SoftwareHistoryService {
  constructor(private readonly dao: SoftwareDao) {}

  async history(actor: SessionPrincipal, query: { cursor?: string; limit: number }) {
    await requireAdmin(this.dao, actor);
    return this.dao.audit.list(query);
  }
}
