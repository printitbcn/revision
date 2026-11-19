import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // El catálogo estático vive en /catalog y se sirve por middleware/route.
  // La capa de revisión (app/, lib/, public/revision/) nunca se sobrescribe en sync.
  poweredByHeader: false,
  serverExternalPackages: ["pg"],
  outputFileTracingIncludes: {
    "*": ["./supabase/schema.sql", "./.sync-meta.json"],
  },
  // Los vídeos viven en public/media y los sirve la CDN. No deben ir dentro de la función.
  outputFileTracingExcludes: {
    "*": [
      "./catalog/media/**/*.mp4",
      "./catalog/media/**/*.mov",
      "./catalog/media/**/*.webm",
      "./public/media/**/*.mp4",
      "./public/media/**/*.mov",
      "./public/media/**/*.webm",
    ],
  },
};

export default nextConfig;
