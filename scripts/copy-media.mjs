#!/usr/bin/env node
/**
 * Copia catalog/media → public/media para que Vercel los sirva como archivos
 * estáticos (Range/206 y caché). public/media está en .gitignore.
 * No modifica catalog/.
 */
import fs from "fs";
import path from "path";

const src = path.join(process.cwd(), "catalog", "media");
const dest = path.join(process.cwd(), "public", "media");

if (!fs.existsSync(src)) {
  console.log("No hay catalog/media. No se copia nada.");
  process.exit(0);
}

fs.rmSync(dest, { recursive: true, force: true });
fs.cpSync(src, dest, { recursive: true });

let files = 0;
let bytes = 0;
const walk = (dir) => {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) walk(full);
    else {
      files += 1;
      bytes += stat.size;
    }
  }
};
walk(dest);
const mb = (bytes / (1024 * 1024)).toFixed(1);
console.log(`Medios listos en public/media: ${files} archivos, ${mb} MB`);
