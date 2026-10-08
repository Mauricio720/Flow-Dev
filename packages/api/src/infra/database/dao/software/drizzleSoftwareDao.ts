import type { SoftwareDao } from "../../../../application/database/dao/softwareDao";
import type { Database } from "../../client";
import { DrizzleAccessDao } from "../drizzleAccessDao";
import { SoftwareAuditStore } from "./softwareAuditStore";
import { SoftwareConnectionStore } from "./softwareConnectionStore";
import { SoftwareOperationStore } from "./softwareOperationStore";
import { SoftwareSettingsStore } from "./softwareSettingsStore";

export class DrizzleSoftwareDao implements SoftwareDao {
  readonly settings;
  readonly connections;
  readonly operations;
  readonly audit;
  private readonly access;

  constructor(private readonly database: Database) {
    this.settings = new SoftwareSettingsStore(database);
    this.connections = new SoftwareConnectionStore(database);
    this.operations = new SoftwareOperationStore(database);
    this.audit = new SoftwareAuditStore(database);
    this.access = new DrizzleAccessDao(database);
  }

  isAdmin(userId: string) {
    return this.access.isAdmin(userId);
  }

  transaction<T>(callback: (dao: SoftwareDao) => Promise<T>): Promise<T> {
    return this.database.transaction((tx): Promise<T> => callback(new DrizzleSoftwareDao(tx as unknown as Database)));
  }
}
