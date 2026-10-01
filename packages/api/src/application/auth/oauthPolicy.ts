export function validateSocialRequest(input: { provider?: unknown; scopes?: unknown; additionalParams?: unknown }) {
  if (input.provider !== "github") throw new Error("Only GitHub sign-in is supported");
  if (input.scopes !== undefined || input.additionalParams !== undefined) throw new Error("OAuth parameters are server controlled");
}
