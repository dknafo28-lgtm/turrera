import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Keeps a signed-in visitor's session fresh. Only runs when they have a Supabase sign-in cookie.
async function refreshSession(req: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key || !req.cookies.getAll().some((c) => c.name.startsWith("sb-"))) return NextResponse.next();
  let res = NextResponse.next({ request: req });
  const db = createServerClient(url, key, {
    cookies: {
      getAll: () => req.cookies.getAll(),
      setAll: (list) => {
        for (const { name, value } of list) req.cookies.set(name, value);
        res = NextResponse.next({ request: req });
        for (const { name, value, options } of list) res.cookies.set(name, value, options);
      },
    },
  });
  await db.auth.getUser();
  return res;
}

// The site is public. Set SITE_LOCK=1 in Vercel to put the whole site back behind SITE_PASSWORD.
// The admin pages always need
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

export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;
  if (path.startsWith("/admin") || path.startsWith("/api/admin")) {
    const adminPassword = process.env.ADMIN_PASSWORD || process.env.SITE_PASSWORD;
    if (!adminPassword) return new NextResponse("Admin is locked. Set ADMIN_PASSWORD in Vercel.", { status: 403 });
    return passwordOk(req, adminPassword) ? NextResponse.next() : ask("Turrera admin");
  }
  const password = process.env.SITE_LOCK === "1" ? process.env.SITE_PASSWORD : undefined;
  if (password && !passwordOk(req, password)) return ask("Turrera");
  return refreshSession(req);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|favicon.svg).*)"],
};
