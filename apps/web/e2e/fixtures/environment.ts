export const e2eDatabaseUrl = process.env.E2E_DATABASE_URL;
export const e2eAuthSecret = process.env.E2E_AUTH_SECRET;
export const e2eConfigured = Boolean(e2eDatabaseUrl && e2eAuthSecret);
export const E2E_SKIP_REASON = "Defina E2E_DATABASE_URL e E2E_AUTH_SECRET de um ambiente de teste descartável.";
export const e2eCompozyUrl = process.env.E2E_COMPOZY_URL;
export const COMPOZY_SKIP_REASON = "Defina E2E_COMPOZY_URL (loopback, porta livre) e inicie o servidor do app com COMPOZY_URL igual a ela.";
