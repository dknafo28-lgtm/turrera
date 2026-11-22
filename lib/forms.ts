import { NextResponse } from "next/server";

export function field(fd: FormData, name: string, max = 500) {
  const v = fd.get(name);
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

export function back(req: Request, path: string) {
  return NextResponse.redirect(new URL(path, req.url), 303);
}

export function originOf(req: Request) {
  const u = new URL(req.url);
  const proto = req.headers.get("x-forwarded-proto") ?? u.protocol.replace(":", "");
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? u.host;
  return `${proto}://${host}`;
}

export const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
