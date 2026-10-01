export type GithubResolver = (login: string) => Promise<{ id: number; login: string }>;
export async function resolveGithubLogins(logins: string[], resolve: GithubResolver) {
  const result = [];
  for (const login of logins) {
    const value = await resolve(login);
    if (!value || !Number.isSafeInteger(value.id) || value.login.toLowerCase() !== login.toLowerCase()) throw new Error(`GitHub identity could not be resolved: ${login}`);
    result.push({ githubUserId: String(value.id), resolvedLogin: value.login });
  }
  return result;
}
