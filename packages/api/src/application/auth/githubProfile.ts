export type GithubProfile = { id: number; login: string; name?: string | null; avatar_url?: string | null; email?: string | null };
export type GithubIdentity = { accountId: string; login: string; name: string; image: string | null; email: string };
export function mapGithubProfile(profile: GithubProfile): GithubIdentity {
  if (!Number.isSafeInteger(profile.id) || profile.id <= 0) throw new Error("GitHub profile id is invalid");
  const login = profile.login?.trim();
  if (!login) throw new Error("GitHub profile login is invalid");
  return { accountId: String(profile.id), login, name: profile.name?.trim() || login, image: profile.avatar_url ?? null, email: `github-${profile.id}@flowdev.invalid` };
}
