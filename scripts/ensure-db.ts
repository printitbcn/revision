import { closeDb } from "../lib/db";
import { ensureDatabase } from "../lib/ensure-db";
import { loadLocalEnv } from "../lib/load-env";

loadLocalEnv();

ensureDatabase()
  .then((result) => {
    console.log(result.message);
  })
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeDb();
  });
