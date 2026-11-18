import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // El catálogo estático vive en /catalog y se sirve por middleware/route.
  // La capa de revisión (app/, components/revision, lib/) nunca se sobrescribe en sync.
  poweredByHeader: false,
};

export default nextConfig;
