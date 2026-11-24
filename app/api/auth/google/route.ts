import { NextResponse } from "next/server";
import { GOOGLE_SIGN_IN, getUserClient, safeNext } from "@/lib/auth";
import { back, originOf } from "@/lib/forms";

export async function GET(req: Request) {
  const next = safeNext(new URL(req.url).searchParams.get("next"));
  const db = await getUserClient();
  if (!GOOGLE_SIGN_IN || !db) return back(req, "/signin");
  const { data, error } = await db.auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${originOf(req)}/auth/callback?next=${encodeURIComponent(next)}` } });
  if (error || !data.url) return back(req, "/signin?e=failed");
  return NextResponse.redirect(data.url, 303);
}
