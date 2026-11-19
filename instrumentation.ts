export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { ensureDatabase } = await import("@/lib/ensure-db");
    try {
      const result = await ensureDatabase();
      console.log(`[revision] ${result.message}`);
    } catch (error) {
      console.error(
        "[revision] No se pudieron crear las tablas al arrancar:",
        error instanceof Error ? error.message : error
      );
    }
  }
}
