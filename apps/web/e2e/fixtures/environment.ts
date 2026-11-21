export const e2eDatabaseUrl = process.env.E2E_DATABASE_URL;
export const e2eAuthSecret = process.env.E2E_AUTH_SECRET;
export const e2eConfigured = Boolean(e2eDatabaseUrl && e2eAuthSecret);
export const E2E_SKIP_REASON = "Defina E2E_DATABASE_URL e E2E_AUTH_SECRET de um ambiente de teste descartável.";
