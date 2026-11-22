import { NextResponse } from "next/server";
import { lotsByIds } from "@/lib/lots";

export const dynamic = "force-dynamic";

// Used by the watchlist page: GET /api/lots?ids=a,b,c
export async function GET(req: Request) {
  const ids = (new URL(req.url).searchParams.get("ids") ?? "").split(",").filter(Boolean);
  const lots = await lotsByIds(ids);
  return NextResponse.json({ lots });
}
