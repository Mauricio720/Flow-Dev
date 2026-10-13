const CREDENTIAL_COUNT = /\b([1-9]\d*) credentials?\b/i;

export function hasOpenCodeCredentials(output: string) {
  return CREDENTIAL_COUNT.test(output);
}
