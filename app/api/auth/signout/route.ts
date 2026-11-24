import { getUserClient } from "@/lib/auth";
import { back } from "@/lib/forms";

export async function POST(req: Request) {
  const db = await getUserClient();
  await db?.auth.signOut();
  return back(req, "/");
}
