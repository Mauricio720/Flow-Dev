import { readFile } from "node:fs/promises";
import { resolveGithubLogins } from "./githubResolver";
import { requireDatabase } from "../infra/database/client";
import { DrizzleAccessDao } from "../infra/database/dao/drizzleAccessDao";

const fileIndex = process.argv.indexOf("--file");
const file = fileIndex >= 0 ? process.argv[fileIndex + 1] : undefined;
if (!file) throw new Error("Usage: admins:provision -- --file <admins.json> [--dry-run]");
const logins = JSON.parse(await readFile(file, "utf8"));
if (!Array.isArray(logins) || logins.some((login) => typeof login !== "string" || !login.trim())) throw new Error("Admin manifest must be an array of GitHub logins");
const token = process.env.GITHUB_ADMIN_TOKEN;
const resolved = await resolveGithubLogins(logins, async (login) => { const response = await fetch(`https://api.github.com/users/${encodeURIComponent(login)}`, { headers: token ? { authorization: `Bearer ${token}` } : undefined }); if (!response.ok) throw new Error(`GitHub lookup failed: ${response.status}`); return response.json() as Promise<{ id: number; login: string }>; });
if (!process.argv.includes("--dry-run")) await new DrizzleAccessDao(requireDatabase()).replaceAdmins(resolved);
console.log(JSON.stringify({ resolved: resolved.map((item) => item.githubUserId), dryRun: process.argv.includes("--dry-run") }));
