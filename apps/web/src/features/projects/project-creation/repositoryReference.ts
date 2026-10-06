export type RepositoryReference = { ok: true; owner: string; name: string } | { ok: false; error: string };

const GITHUB_URL_PREFIX = /^https:\/\/github\.com\//i;
const GIT_SUFFIX = /\.git$/i;
// GitHub owners are 1-39 alphanumerics or hyphens; repository names allow dots and underscores up to 100 characters.
const OWNER_AND_NAME = /^([A-Za-z0-9](?:[A-Za-z0-9-]{0,38}))\/([A-Za-z0-9._-]{1,100})$/;
const INVALID_REFERENCE = "Informe o repositório como owner/nome, por exemplo acme/loja-web.";
const FOREIGN_URL = "Só repositórios do github.com são aceitos. Informe owner/nome.";
const RESERVED_NAMES = [".", ".."];

export function parseRepositoryReference(input: string): RepositoryReference {
  const value = input.trim();
  if (value.includes("://") && !GITHUB_URL_PREFIX.test(value)) return { ok: false, error: FOREIGN_URL };
  const path = value.replace(GITHUB_URL_PREFIX, "").replace(/\/$/, "").replace(GIT_SUFFIX, "");
  const match = OWNER_AND_NAME.exec(path);
  if (!match || RESERVED_NAMES.includes(match[2])) return { ok: false, error: INVALID_REFERENCE };
  return { ok: true, owner: match[1], name: match[2] };
}
