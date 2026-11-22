import { NextResponse, type NextRequest } from "next/server";

// SITE_PASSWORD set in Vercel: the whole site needs the password.
// Remove SITE_PASSWORD to make the site public. The admin pages always need
// ADMIN_PASSWORD (or SITE_PASSWORD if that's all there is); with neither set they stay locked.
function passwordOk(req: NextRequest, password: string) {
  const header = req.headers.get("authorization");
  if (!header?.startsWith("Basic ")) return false;
  try {
    const decoded = atob(header.slice(6));
    return decoded.slice(decoded.indexOf(":") + 1) === password;
  } catch {
    return false;
  }
}

function ask(realm: string) {
  return new NextResponse("Password required", { status: 401, headers: { "WWW-Authenticate": `Basic realm="${realm}", charset="UTF-8"` } });
}

export function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;
  if (path.startsWith("/admin") || path.startsWith("/api/admin")) {
    const adminPassword = process.env.ADMIN_PASSWORD || process.env.SITE_PASSWORD;
    if (!adminPassword) return new NextResponse("Admin is locked. Set ADMIN_PASSWORD in Vercel.", { status: 403 });
    return passwordOk(req, adminPassword) ? NextResponse.next() : ask("Turrera admin");
  }
  const password = process.env.SITE_PASSWORD;
  if (!password) return NextResponse.next();
  return passwordOk(req, password) ? NextResponse.next() : ask("Turrera");
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|favicon.svg).*)"],
};
