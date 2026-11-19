import { closeSync, createReadStream, openSync, readSync, statSync } from "fs";
import { Readable } from "stream";
import { NextRequest, NextResponse } from "next/server";
import {
  injectRevisionLayer,
  mimeFor,
  readCatalogFile,
  safeCatalogPath,
} from "@/lib/catalog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type FileHit = { filePath: string; type: string; size: number };

function resolveFile(urlPath: string): FileHit | null {
  const candidates = [urlPath];
  if (!urlPath.includes(".")) candidates.push(urlPath.replace(/\/?$/, "/") + "index.html");
  for (const candidate of candidates) {
    const filePath = safeCatalogPath(candidate);
    if (!filePath) continue;
    try {
      const stat = statSync(filePath);
      if (!stat.isFile()) continue;
      return { filePath, type: mimeFor(filePath), size: stat.size };
    } catch {
      /* siguiente candidato */
    }
  }
  return null;
}

function parseByteRange(
  header: string,
  size: number
): { start: number; end: number } | "invalid" {
  const trimmed = header.trim();
  if (!/^bytes=/i.test(trimmed)) return "invalid";
  const spec = trimmed.slice(trimmed.indexOf("=") + 1).split(",")[0].trim();
  const match = /^(\d*)-(\d*)$/.exec(spec);
  if (!match || (match[1] === "" && match[2] === "")) return "invalid";

  if (match[1] === "") {
    const suffix = Number(match[2]);
    if (!Number.isFinite(suffix) || suffix <= 0) return "invalid";
    const start = Math.max(0, size - suffix);
    return { start, end: size - 1 };
  }

  const start = Number(match[1]);
  let end = match[2] === "" ? size - 1 : Number(match[2]);
  if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end < start) return "invalid";
  if (start >= size) return "invalid";
  if (end >= size) end = size - 1;
  return { start, end };
}

function streamFile(filePath: string, start: number, end: number): ReadableStream {
  const nodeStream = createReadStream(filePath, { start, end });
  return Readable.toWeb(nodeStream) as ReadableStream;
}

function mediaHeaders(hit: FileHit, request: NextRequest): { status: number; headers: Headers } {
  const headers = new Headers({
    "Content-Type": hit.type,
    "Accept-Ranges": "bytes",
    "Cache-Control": "private, max-age=3600",
    "X-Printit-Revision": "1",
  });
  const range = request.headers.get("range");
  if (!range || hit.size === 0) {
    headers.set("Content-Length", String(hit.size));
    return { status: 200, headers };
  }
  const parsed = parseByteRange(range, hit.size);
  if (parsed === "invalid") {
    headers.set("Content-Range", `bytes */${hit.size}`);
    return { status: 416, headers };
  }
  headers.set("Content-Range", `bytes ${parsed.start}-${parsed.end}/${hit.size}`);
  headers.set("Content-Length", String(parsed.end - parsed.start + 1));
  return { status: 206, headers };
}

function mediaResponse(request: NextRequest, hit: FileHit): NextResponse {
  const described = mediaHeaders(hit, request);
  if (described.status !== 200 && described.status !== 206) {
    return new NextResponse(null, { status: described.status, headers: described.headers });
  }
  if (hit.size === 0) {
    return new NextResponse(null, { status: 200, headers: described.headers });
  }
  const range = described.status === 206 ? described.headers.get("content-range") : null;
  const match = range ? /^bytes (\d+)-(\d+)\//.exec(range) : null;
  const start = match ? Number(match[1]) : 0;
  const end = match ? Number(match[2]) : hit.size - 1;
  const length = end - start + 1;
  // Los trozos que pide Safari caben en memoria y así Content-Length no se pierde.
  if (length <= 8 * 1024 * 1024) {
    const buf = Buffer.alloc(length);
    const fd = openSync(hit.filePath, "r");
    try {
      readSync(fd, buf, 0, length, start);
    } finally {
      closeSync(fd);
    }
    return new NextResponse(buf, { status: described.status, headers: described.headers });
  }
  return new NextResponse(streamFile(hit.filePath, start, end), {
    status: described.status,
    headers: described.headers,
  });
}

function htmlResponse(filePath: string): NextResponse {
  const buf = readCatalogFile(filePath);
  if (!buf) return new NextResponse("Not found", { status: 404 });
  const html = injectRevisionLayer(buf.toString("utf8"));
  return new NextResponse(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "private, no-cache",
      "X-Printit-Revision": "1",
    },
  });
}

export async function GET(request: NextRequest) {
  const urlPath = request.headers.get("x-catalog-path") || request.nextUrl.searchParams.get("path") || "/";
  const hit = resolveFile(urlPath);
  if (!hit) return new NextResponse("Not found", { status: 404 });
  if (hit.type.startsWith("text/html")) return htmlResponse(hit.filePath);
  return mediaResponse(request, hit);
}

export async function HEAD(request: NextRequest) {
  const urlPath = request.headers.get("x-catalog-path") || request.nextUrl.searchParams.get("path") || "/";
  const hit = resolveFile(urlPath);
  if (!hit) return new NextResponse(null, { status: 404 });
  if (hit.type.startsWith("text/html")) {
    return new NextResponse(null, {
      status: 200,
      headers: { "Content-Type": hit.type, "X-Printit-Revision": "1" },
    });
  }
  const described = mediaHeaders(hit, request);
  return new NextResponse(null, { status: described.status, headers: described.headers });
}
