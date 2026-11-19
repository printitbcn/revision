import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // El catálogo estático vive en /catalog y se sirve por middleware/route.
  // La capa de revisión (app/, lib/, public/revision/) nunca se sobrescribe en sync.
  poweredByHeader: false,
  serverExternalPackages: ["pg"],
  outputFileTracingIncludes: {
    "*": ["./supabase/schema.sql", "./.sync-meta.json"],
  },
};

export default nextConfig;
