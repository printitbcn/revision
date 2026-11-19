/**
 * Comprueba que @supabase/supabase-js acepta una clave sb_secret_
 * y la envía en la cabecera apikey (no hace falta un proyecto real).
 */
import { createClient } from "@supabase/supabase-js";

const secret = "sb_secret_verificacion_local_no_es_una_clave_real";
const calls = [];

function headerValue(headers, name) {
  if (!headers) return "";
  if (typeof headers.get === "function") return headers.get(name) || headers.get(name.toLowerCase()) || "";
  const found = Object.keys(headers).find((key) => key.toLowerCase() === name.toLowerCase());
  return found ? String(headers[found]) : "";
}

const fetchMock = async (url, init) => {
  calls.push({ url: String(url), init });
  const href = String(url);
  if (href.includes("/rest/v1/")) {
    return new Response("[]", {
      status: 200,
      headers: { "content-type": "application/json", "content-range": "0-0/0" },
    });
  }
  return new Response("{}", {
    status: 200,
    headers: { "content-type": "application/json" },
  });
};

const client = createClient("https://example.supabase.co", secret, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  global: { fetch: fetchMock },
});

const { error } = await client.from("anotaciones").select("id").limit(1);
if (error) {
  console.error("La librería rechazó sb_secret_:", error.message);
  process.exit(1);
}

const rest = calls.find((call) => call.url.includes("/rest/v1/anotaciones"));
if (!rest) {
  console.error("No hubo petición a PostgREST");
  process.exit(1);
}

const apikey = headerValue(rest.init?.headers, "apikey");
if (apikey !== secret) {
  console.error("La cabecera apikey no lleva la clave sb_secret_");
  process.exit(1);
}

createClient("https://example.supabase.co", "sb_publishable_verificacion_local", {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  global: { fetch: fetchMock },
});

console.log("sb_secret_ aceptada por @supabase/supabase-js y enviada como apikey");
