import { ensureManagedRuntime } from "../infra/spec/compozy/managedRuntimeStartup";

try {
  if (await ensureManagedRuntime(process.env)) process.stdout.write("Compozy gerenciado: pronto.\n");
} catch {
  process.stderr.write("Não foi possível iniciar o Compozy gerenciado. Confira SOFTWARE_COMPOZY_SOCKET e a configuração do daemon.\n");
  process.exitCode = 1;
}
