#!/usr/bin/env node
/**
 * Sincroniza SOLO assets live desde printitbcn/cat-logo-2026- (lectura).
 * No toca la capa de revisión: app/, components/, lib/, public/revision/,
 * supabase/, scripts/, .github/, INFORME_ASSETS.md (se regenera).
 */
import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import os from "os";

const ROOT = process.cwd();
const CATALOG = path.join(ROOT, "catalog");
const ORIGINAL_REPO =
  process.env.ORIGINAL_REPO_URL || "https://github.com/printitbcn/cat-logo-2026-.git";
const ORIGINAL_BRANCH = process.env.ORIGINAL_BRANCH || "redesign-home";
const TOKEN = process.env.ORIGINAL_READ_TOKEN || "";

const EXCLUDE_DIR_PREFIXES = ["revisar/", "videos_1080p/", "node_modules/", ".git/", ".cursor/"];

function sh(cmd, opts = {}) {
  return execSync(cmd, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], ...opts }).trim();
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
  const target = ref.startsWith("/")
    ? path.join(srcRoot, ref.slice(1))
    : path.resolve(base, ref);
  const rel = path.relative(srcRoot, target).replace(/\\/g, "/");
  if (rel.startsWith("..")) return null;
  return rel;
}

function walk(dir) {
  const out = [];
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

function main() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "printit-sync-"));
  const src = path.join(tmp, "original");
  console.log("Cloning", ORIGINAL_REPO, "branch", ORIGINAL_BRANCH);
  sh(
    `git clone --depth 1 --branch ${ORIGINAL_BRANCH} "${cloneUrl()}" "${src}"`
  );
  const commit = sh("git rev-parse HEAD", { cwd: src });
  const message = sh("git log -1 --pretty=%B", { cwd: src }).split("\n")[0];

  const live = collectLiveFiles(src);
  console.log("Live files:", live.length);

  const before = new Set(
    fs.existsSync(CATALOG)
      ? walk(CATALOG).map((f) => path.relative(CATALOG, f).replace(/\\/g, "/"))
      : []
  );

  rmDir(CATALOG);
  fs.mkdirSync(CATALOG, { recursive: true });
  for (const rel of live) {
    if (rel === "scripts/serve-lan.sh") continue;
    copyFile(path.join(src, rel), path.join(CATALOG, rel));
  }

  const after = new Set(
    walk(CATALOG).map((f) => path.relative(CATALOG, f).replace(/\\/g, "/"))
  );
  const changed = [...after].filter((f) => !before.has(f) || true);
  // Prefer git diff if repo already tracked
  let changedFiles = [...after];
  try {
    const diff = sh("git status --porcelain catalog", { cwd: ROOT });
    if (diff) {
      changedFiles = diff
        .split("\n")
        .map((l) => l.slice(3).trim().replace(/^catalog\//, ""))
        .filter(Boolean);
    }
  } catch {
    /* first run */
  }

  const pages = changedFiles
    .filter((f) => f.endsWith(".html"))
    .map((f) => "/" + f.replace(/\\/g, "/"));

  // Write sync meta for Action / optional Supabase insert
  const meta = {
    commit_sha: commit,
    commit_message: message,
    archivos_cambiados: changedFiles,
    paginas_cambiadas: pages,
    fecha: new Date().toISOString(),
  };
  fs.writeFileSync(path.join(ROOT, ".sync-meta.json"), JSON.stringify(meta, null, 2));

  // Regenerate INFORME_ASSETS.md (brief)
  const lines = [
    "# INFORME_ASSETS — catálogo revisión",
    "",
    `- **Fuente:** \`${ORIGINAL_REPO}\` rama \`${ORIGINAL_BRANCH}\` @ \`${commit.slice(0, 7)}\``,
    `- **Copiados:** ${live.length} archivos`,
    `- **Carpetas excluidas:** ${EXCLUDE_DIR_PREFIXES.join(", ")}`,
    "",
    "## Copiado",
    ...live.sort().map((x) => `- \`${x}\``),
    "",
  ];
  fs.writeFileSync(path.join(ROOT, "INFORME_ASSETS.md"), lines.join("\n"));

  rmDir(tmp);
  console.log("Sync done:", commit.slice(0, 7), message);
  console.log("Changed pages:", pages.length);
}

main();
