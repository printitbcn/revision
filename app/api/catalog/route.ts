import { NextRequest, NextResponse } from "next/server";
import {
  injectRevisionLayer,
  mimeFor,
  readCatalogFile,
  safeCatalogPath,
} from "@/lib/catalog";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const urlPath = request.nextUrl.searchParams.get("path") || "/";
  const filePath = safeCatalogPath(urlPath);
  if (!filePath) {
    return new NextResponse("Not found", { status: 404 });
  }

  let buf = readCatalogFile(filePath);
  // fallback: directory → index.html already handled in safeCatalogPath
  if (!buf && !urlPath.includes(".")) {
    const alt = safeCatalogPath(urlPath.replace(/\/?$/, "/") + "index.html");
    if (alt) buf = readCatalogFile(alt);
  }
  if (!buf) {
    return new NextResponse("Not found", { status: 404 });
  }

  const type = mimeFor(filePath);
  if (type.startsWith("text/html")) {
    const html = injectRevisionLayer(buf.toString("utf8"));
    return new NextResponse(html, {
      status: 200,
      headers: {
        "Content-Type": type,
        "Cache-Control": "private, no-cache",
        "X-Printit-Revision": "1",
      },
    });
  }

  return new NextResponse(new Uint8Array(buf), {
    status: 200,
    headers: {
      "Content-Type": type,
      "Cache-Control": "private, max-age=3600",
      "X-Printit-Revision": "1",
    },
  });
}
