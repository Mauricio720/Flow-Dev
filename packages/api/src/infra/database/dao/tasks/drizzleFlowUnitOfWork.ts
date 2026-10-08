import type { FlowTransaction, FlowUnitOfWork } from "../../../../application/database/dao/flowUnitOfWork";
import type { Database } from "../../client";
import { DrizzleSoftwareDao } from "../software/drizzleSoftwareDao";
import { DrizzleTaskFlowDao } from "./drizzleTaskFlowDao";

export class DrizzleFlowUnitOfWork implements FlowUnitOfWork {
  constructor(private readonly database: Database) {}

  run<T>(callback: (transaction: FlowTransaction) => Promise<T>): Promise<T> {
    return this.database.transaction((tx): Promise<T> => {
      const database = tx as unknown as Database;
      return callback({ flow: new DrizzleTaskFlowDao(database), software: new DrizzleSoftwareDao(database) });
    });
  }
}
