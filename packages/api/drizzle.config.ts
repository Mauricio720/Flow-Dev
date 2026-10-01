import type { Config } from "drizzle-kit";

export default {
  schema: "./src/infra/database/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url: process.env.DATABASE_URL ?? "postgresql://localhost/flow_dev" },
} satisfies Config;
