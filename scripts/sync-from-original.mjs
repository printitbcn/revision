#!/usr/bin/env node
/**
 * Sincroniza SOLO assets live desde printitbcn/cat-logo-2026- (lectura).
 * No toca la capa de revisión: app/, lib/, public/revision/, supabase/,
 * middleware ni las notas (viven en Postgres).
 *
 * El original es público: no hace falta ORIGINAL_READ_TOKEN.
 * Escribe catalog/, INFORME_ASSETS.md y .sync-meta.json.
 * La app registra la novedad en Supabase al construir o arrancar.
 */
import { execSync } from "child_process";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import os from "os";

const ROOT = process.cwd();
const CATALOG = path.join(ROOT, "catalog");
const ORIGINAL_REPO =
  process.env.ORIGINAL_REPO_URL || "https://github.com/printitbcn/cat-logo-2026-.git";
const ORIGINAL_BRANCH = process.env.ORIGINAL_BRANCH || "redesign-home";
const TOKEN = process.env.ORIGINAL_READ_TOKEN || "";
const DRY = process.argv.includes("--dry-run");

const EXCLUDE_DIR_PREFIXES = ["revisar/", "videos_1080p/", "node_modules/", ".git/", ".cursor/"];

function redact(text) {
  return String(text || "").replace(/x-access-token:[^@\s'"]+/g, "x-access-token:***");
}

function shellQuote(value) {
  return `'${String(value).replace(/'/g, `'\\''`)}'`;
}

function run(cmd, opts = {}) {
  try {
    return execSync(cmd, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      ...opts,
    }).trim();
  } catch (error) {
    const stderr = error.stderr?.toString?.() || "";
    const stdout = error.stdout?.toString?.() || "";
    throw new Error(redact(`${cmd}\n${stderr || stdout || error.message}`));
  }
}

function isExcluded(rel) {
  const r = rel.replace(/\\/g, "/");
  return EXCLUDE_DIR_PREFIXES.some((p) => r === p.slice(0, -1) || r.startsWith(p));
}

function cloneUrl() {
  if (!TOKEN) return ORIGINAL_REPO;
  if (ORIGINAL_REPO.startsWith("https://")) {
    return ORIGINAL_REPO.replace("https://", `https://x-access-token:${TOKEN}@`);
  }
  return ORIGINAL_REPO;
}

function collectLiveFiles(srcRoot) {
  const entries = new Set();
  for (const name of fs.readdirSync(srcRoot)) {
    if (name.endsWith(".html") && !isExcluded(name)) entries.add(name);
  }
  const sitemap = path.join(srcRoot, "sitemap");
  if (fs.existsSync(sitemap)) {
    for (const f of walk(sitemap)) {
      const rel = path.relative(srcRoot, f).replace(/\\/g, "/");
      if (!isExcluded(rel)) entries.add(rel);
    }
  }
  for (const core of ["app.js", "styles.css", "projects.js", "projects.html", ".gitattributes"]) {
    if (fs.existsSync(path.join(srcRoot, core))) entries.add(core);
  }

  const used = new Set(entries);
  const queue = [...entries];
  const seen = new Set();
  const attrRe =
    /(?:src|href|poster|data-src|data-logo-light|data-logo-dark|data-[a-z0-9_-]*src)\s*=\s*(['"])(.*?)\1|url\(\s*(['"]?)([^)'"]+)\3\s*\)/gi;
  const jsPathRe =
    /['"]((?:media|public|components|scripts|styles)[^'"]+\.(?:png|jpe?g|gif|webp|svg|mp4|mov|webm|pdf|css|js|html|json|woff2?|ttf|ico))['"]/gi;

  while (queue.length) {
    const rel = queue.pop();
    if (seen.has(rel)) continue;
    seen.add(rel);
    const full = path.join(srcRoot, rel);
    if (!fs.existsSync(full) || !fs.statSync(full).isFile()) continue;
    const ext = path.extname(full).toLowerCase();
    if (![".html", ".css", ".js", ".mjs", ".json", ".svg", ".xml"].includes(ext)) continue;
    const text = fs.readFileSync(full, "utf8");
    const refs = new Set();
    let m;
    attrRe.lastIndex = 0;
    while ((m = attrRe.exec(text))) refs.add(m[2] || m[4]);
    if (ext === ".js" || ext === ".html" || ext === ".mjs") {
      jsPathRe.lastIndex = 0;
      while ((m = jsPathRe.exec(text))) refs.add(m[1]);
    }
    for (const ref of refs) {
      const n = normalize(srcRoot, rel, ref);
      if (!n || isExcluded(n)) continue;
      if (!used.has(n)) {
        used.add(n);
        queue.push(n);
      }
    }
  }
  return [...used].filter((r) => fs.existsSync(path.join(srcRoot, r)));
}

function normalize(srcRoot, fromRel, ref) {
  if (!ref) return null;
  ref = String(ref).trim();
  if (!ref || /^(https?:|data:|blob:|mailto:|tel:|#|javascript:)/i.test(ref)) return null;
  if (ref.startsWith("//")) return null;
  ref = decodeURIComponent(ref.split("?")[0].split("#")[0]);
  const base = path.dirname(path.join(srcRoot, fromRel));
  const target = ref.startsWith("/") ? path.join(srcRoot, ref.slice(1)) : path.resolve(base, ref);
  const rel = path.relative(srcRoot, target).replace(/\\/g, "/");
  if (rel.startsWith("..")) return null;
  return rel;
}

function walk(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    if (fs.statSync(full).isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

function rmDir(p) {
  if (fs.existsSync(p)) fs.rmSync(p, { recursive: true, force: true });
}

function copyFile(src, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

function isLfsPointer(file) {
  let fd;
  try {
    fd = fs.openSync(file, "r");
    const buf = Buffer.alloc(120);
    const n = fs.readSync(fd, buf, 0, 120, 0);
    return buf.slice(0, n).toString("utf8").startsWith("version https://git-lfs.github.com/spec/v1");
  } catch {
    return false;
  } finally {
    if (fd !== undefined) fs.closeSync(fd);
  }
}

function fileSha256(file) {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

function lfsOid(file) {
  const text = fs.readFileSync(file, "utf8");
  const match = /oid sha256:([a-f0-9]+)/.exec(text);
  return match ? match[1] : null;
}

function sameFile(srcFile, destFile) {
  const srcStat = fs.statSync(srcFile);
  const destStat = fs.statSync(destFile);
  if (!srcStat.isFile() || !destStat.isFile()) return false;
  // En un checkout sin smudge el destino es un puntero LFS. El oid es el sha256 real.
  if (isLfsPointer(destFile) && !isLfsPointer(srcFile)) {
    return lfsOid(destFile) === fileSha256(srcFile);
  }
  if (isLfsPointer(srcFile) || isLfsPointer(destFile)) return false;
  if (srcStat.size !== destStat.size) return false;
  return fileSha256(srcFile) === fileSha256(destFile);
}

function catalogRels() {
  if (!fs.existsSync(CATALOG)) return [];
  return walk(CATALOG).map((file) => path.relative(CATALOG, file).replace(/\\/g, "/"));
}

function changedFiles(src, live) {
  const content = [];
  const removed = [];
  const liveSet = new Set(live);
  for (const rel of live) {
    const from = path.join(src, rel);
    const to = path.join(CATALOG, rel);
    if (!fs.existsSync(to) || !sameFile(from, to)) content.push(rel);
  }
  for (const rel of catalogRels()) {
    if (!liveSet.has(rel)) removed.push(rel);
  }
  return { content: content.sort(), removed: removed.sort() };
}

function readMeta() {
  try {
    return JSON.parse(fs.readFileSync(path.join(ROOT, ".sync-meta.json"), "utf8"));
  } catch {
    return null;
  }
}

function pushHistory(list, seen, entry) {
  if (!entry || !entry.commit_sha || seen.has(entry.commit_sha)) return;
  seen.add(entry.commit_sha);
  list.push({
    commit_sha: entry.commit_sha,
    commit_message: entry.commit_message || "",
    archivos_cambiados: entry.archivos_cambiados || [],
    paginas_cambiadas: entry.paginas_cambiadas || [],
    fecha: entry.fecha || new Date().toISOString(),
  });
}

function pullNeededLfs(src, live) {
  const pointers = live.filter((rel) => isLfsPointer(path.join(src, rel)));
  if (!pointers.length) return;
  console.log("Descargando LFS de", pointers.length, "archivos usados");
  const include = pointers.join(",");
  run(`git lfs pull --include=${shellQuote(include)}`, { cwd: src });
  const left = live.filter((rel) => isLfsPointer(path.join(src, rel)));
  if (left.length) {
    console.error("Siguen siendo punteros LFS. No se modifica catalog/.");
    left.slice(0, 12).forEach((rel) => console.error(" -", rel));
    process.exit(1);
  }
}

function main() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "printit-sync-"));
  const src = path.join(tmp, "original");
  console.log("Clonando", ORIGINAL_REPO, "rama", ORIGINAL_BRANCH, DRY ? "(dry-run)" : "");
  run(
    `git clone --depth 1 --branch ${shellQuote(ORIGINAL_BRANCH)} ${shellQuote(cloneUrl())} ${shellQuote(src)}`,
    {
      env: {
        ...process.env,
        GIT_LFS_SKIP_SMUDGE: "1",
        GIT_TERMINAL_PROMPT: "0",
      },
    }
  );

  try {
    const commit = run("git rev-parse HEAD", { cwd: src });
    const message = run("git log -1 --pretty=%B", { cwd: src }).split("\n")[0];
    const live = collectLiveFiles(src);
    console.log("Archivos usados:", live.length);
    pullNeededLfs(src, live);

    const diff = changedFiles(src, live);
    const changed = [...diff.content, ...diff.removed];
    const prev = readMeta();
    const sameCommit = prev?.commit_sha === commit;
    console.log("Commit", commit.slice(0, 7), message);
    console.log("Contenido distinto:", diff.content.length, "| solo en catalog:", diff.removed.length);

    if (DRY) {
      diff.content.forEach((rel) => console.log(" ~", rel));
      diff.removed.forEach((rel) => console.log(" -", rel));
      console.log(sameCommit ? "Mismo commit que .sync-meta.json" : "Commit distinto al de .sync-meta.json");
      if (!diff.content.length && sameCommit) {
        console.log("No escribiría nada. Los archivos que solo están en esta copia se conservan.");
      }
      return;
    }

    if (!diff.content.length && sameCommit) {
      if (diff.removed.length) {
        console.log(
          "Sin cambios en el original.",
          diff.removed.length,
          "archivos solo están en esta copia y se conservan."
        );
      } else {
        console.log("Sin cambios. No se toca catalog/ ni .sync-meta.json.");
      }
      return;
    }

    rmDir(CATALOG);
    fs.mkdirSync(CATALOG, { recursive: true });
    for (const rel of live) {
      if (rel === "scripts/serve-lan.sh") continue;
      copyFile(path.join(src, rel), path.join(CATALOG, rel));
    }

    const pages = changed.filter((file) => file.endsWith(".html")).map((file) => "/" + file);
    const fecha = new Date().toISOString();
    const historial = [];
    const seen = new Set();
    if (Array.isArray(prev?.historial)) prev.historial.forEach((entry) => pushHistory(historial, seen, entry));
    if (prev?.commit_sha) pushHistory(historial, seen, prev);
    const entry = {
      commit_sha: commit,
      commit_message: message,
      archivos_cambiados: changed,
      paginas_cambiadas: pages,
      fecha,
    };
    pushHistory(historial, seen, entry);
    fs.writeFileSync(path.join(ROOT, ".sync-meta.json"), JSON.stringify({ ...entry, historial }, null, 2) + "\n");

    const lines = [
      "# INFORME_ASSETS — catálogo revisión",
      "",
      `- **Fuente:** \`${ORIGINAL_REPO}\` rama \`${ORIGINAL_BRANCH}\` @ \`${commit.slice(0, 7)}\``,
      `- **Copiados:** ${live.length} archivos`,
      `- **Carpetas excluidas:** ${EXCLUDE_DIR_PREFIXES.join(", ")}`,
      "",
      "## Copiado",
      ...[...live].sort().map((file) => `- \`${file}\``),
      "",
    ];
    fs.writeFileSync(path.join(ROOT, "INFORME_ASSETS.md"), lines.join("\n"));
    console.log("Sync escrito. Páginas distintas:", pages.length);
  } finally {
    rmDir(tmp);
  }
}

main();
