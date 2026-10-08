import { readFile } from "node:fs/promises";
import type postgres from "postgres";

const BASE_MIGRATIONS = ["0000_catalog", "0001_auth_access"];
const REPOSITORY_MIGRATIONS = ["0002_repository_expansion", "0003_repository_constraints"];
const FEATURE_MIGRATIONS = ["0004_wealthy_groot", "0005_daily_agent_brand", "0006_complex_gladiator", "0007_brief_loki", "0008_great_agent_brand", "0009_material_maelstrom", "0010_fast_microbe", "0011_petite_the_renegades", "0012_steady_planning", "0013_spec_workflow", "0014_software_configuration", "0015_task_execution_flow", "0016_unified_spec_packages", "0017_task_execution_feedback", "0018_assigned_issue_sources", "0019_source_aware_planning", "0020_local_workspace_target", "0021_local_companion", "0022_local_machine_revocation", "0023_local_machine_heartbeat_key", "0024_local_request_keys", "0025_local_command_transport", "0026_brainy_sheva_callister", "0027_harsh_randall_flagg", "0028_ordinary_ego", "0029_local_link_requests", "0030_local_loop_catalog"];

export async function applyMigration(client: postgres.Sql, name: string) {
  const sql = await readFile(new URL(`../drizzle/${name}.sql`, import.meta.url), "utf8");
  await client.begin(async (tx) => { await tx.unsafe(sql); });
}

export async function applyBaseMigrations(client: postgres.Sql) {
  for (const migration of BASE_MIGRATIONS) await applyMigration(client, migration);
}

export async function applyCurrentMigrations(client: postgres.Sql, stopBefore?: string) {
  await client`DELETE FROM projects`;
  for (const migration of REPOSITORY_MIGRATIONS) await applyMigration(client, migration);
  for (const migration of FEATURE_MIGRATIONS) {
    if (migration === stopBefore) return;
    await applyMigration(client, migration);
  }
}

export async function applyMigrationsAfter(client: postgres.Sql, name: string) {
  for (const migration of FEATURE_MIGRATIONS.slice(FEATURE_MIGRATIONS.indexOf(name) + 1)) await applyMigration(client, migration);
}
