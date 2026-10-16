import { check, customType, integer, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { tasks } from "./records";
import { projects, users } from "../../schema";

const bytea = customType<{ data: Uint8Array; driverData: Buffer }>({ dataType: () => "bytea", toDriver: (value) => Buffer.from(value), fromDriver: (value) => new Uint8Array(value) });

export const taskImages = pgTable("task_images", {
  id: uuid("id").defaultRandom().primaryKey(),
  taskId: uuid("task_id").notNull().references(() => tasks.id, { onDelete: "cascade" }),
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "restrict" }),
  uploadedByUserId: uuid("uploaded_by_user_id").notNull().references(() => users.id, { onDelete: "restrict" }),
  contentType: text("content_type").notNull(),
  byteSize: integer("byte_size").notNull(),
  sha256: text("sha256").notNull(),
  content: bytea("content").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  check("task_images_content_type_check", sql`${table.contentType} in ('image/png','image/jpeg','image/gif','image/webp')`),
  check("task_images_byte_size_check", sql`${table.byteSize} > 0 and ${table.byteSize} = octet_length(${table.content})`),
  uniqueIndex("task_images_task_sha_unique").on(table.taskId, table.sha256),
]);
