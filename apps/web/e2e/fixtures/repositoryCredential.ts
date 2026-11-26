import { createCipheriv, createHash, randomBytes } from "node:crypto";
import type { Sql } from "postgres";
import { fakeAccessToken } from "../fakeGithub/fakeBoard";
import { e2eRepositoryTokenKey } from "./environment";

const ALGORITHM = "aes-256-gcm";
const IV_BYTES = 12;
const KEY_BYTES = 32;
const CIPHERTEXT_VERSION = "v1";
const GRANTED_SCOPES = ["repo", "project", "offline_access"];

function tokenKey() {
  const value = e2eRepositoryTokenKey ?? "";
  const base64 = Buffer.from(value, "base64url");
  return base64.length === KEY_BYTES ? base64 : Buffer.from(value, "hex");
}

function encrypt(value: string) {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, tokenKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return [CIPHERTEXT_VERSION, iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), ciphertext.toString("base64url")].join(".");
}

export async function grantRepositoryAccess(sql: Sql, user: { id: string; githubId: string }) {
  const ciphertext = encrypt(fakeAccessToken(user.githubId));
  await sql`insert into github_repository_authorizations (user_id, github_user_id, access_token_ciphertext, granted_scopes) values (${user.id}, ${user.githubId}, ${ciphertext}, ${GRANTED_SCOPES})`;
}

export function issueContentHash(input: { repositoryId: string; issueNodeId: string; title: string; bodyMarkdown: string }) {
  const hash = createHash("sha256");
  for (const value of [input.repositoryId, input.issueNodeId, input.title, input.bodyMarkdown]) hash.update(`${Buffer.byteLength(value)}:${value}\n`);
  return hash.digest("hex");
}
