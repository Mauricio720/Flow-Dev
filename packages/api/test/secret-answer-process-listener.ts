import postgres from "postgres";
import { PostgresSecretAnswerListener } from "../src/infra/database/postgresSecretAnswerListener";

const sql = postgres(process.env.SECRET_TEST_DATABASE_URL!, { max: 1 });
const expected = process.env.SECRET_TEST_VALUE!;
const listener = new PostgresSecretAnswerListener(sql, async (delivery) => {
  const accepted = delivery.answers.token === expected;
  process.stdout.write(accepted ? "ACCEPTED\n" : "REJECTED\n");
  return accepted;
});
await listener.start();
process.stdout.write("READY\n");
process.on("SIGTERM", async () => { await listener.stop(); await sql.end(); process.exit(0); });
