import fs from "fs";
import path from "path";

export const CATALOG_ROOT = path.join(process.cwd(), "catalog");

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".mp4": "video/mp4",
  ".mov": "video/quicktime",
  ".webm": "video/webm",
  ".pdf": "application/pdf",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".txt": "text/plain; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
};

export function safeCatalogPath(urlPath: string): string | null {
  let p = decodeURIComponent(urlPath.split("?")[0].split("#")[0] || "/");
  if (p === "/" || p === "") p = "/index.html";
  if (p.endsWith("/")) p += "index.html";
  const rel = p.replace(/^\/+/, "");
  const resolved = path.resolve(CATALOG_ROOT, rel);
  if (!resolved.startsWith(CATALOG_ROOT + path.sep) && resolved !== CATALOG_ROOT) {
    return null;
  }
  return resolved;
}

export function mimeFor(filePath: string): string {
  return MIME[path.extname(filePath).toLowerCase()] || "application/octet-stream";
}

export function readCatalogFile(filePath: string): Buffer | null {
  try {
    if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) return null;
    return fs.readFileSync(filePath);
  } catch {
    return null;
  }
}

/** Inyecta overlay de notas + enlace Novedades en HTML del catálogo. */
export function injectRevisionLayer(html: string): string {
  const snippet = `
<link rel="stylesheet" href="/revision/overlay.css?v=4" />
<script src="/revision/overlay.js?v=4" defer></script>
`;
  if (/<\/body>/i.test(html)) {
    return html.replace(/<\/body>/i, `${snippet}</body>`);
  }
  return html + snippet;
}

export function listCatalogHtmlPages(): string[] {
  const pages: string[] = [];
  const walk = (dir: string, base = "") => {
    for (const name of fs.readdirSync(dir)) {
      const full = path.join(dir, name);
      const rel = path.join(base, name).replace(/\\/g, "/");
      const st = fs.statSync(full);
      if (st.isDirectory()) walk(full, rel);
      else if (name.endsWith(".html")) pages.push("/" + rel);
    }
  };
  if (fs.existsSync(CATALOG_ROOT)) walk(CATALOG_ROOT);
  return pages.sort();
}
