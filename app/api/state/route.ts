import { getChatGPTUser } from "../../chatgpt-auth";
import { stateFor } from "../../../lib/server";
export const dynamic = "force-dynamic";
export async function GET() {
  try { return Response.json(await stateFor(await getChatGPTUser()), { headers: { "Cache-Control": "no-store" } }); }
  catch (error) { console.error("RepClub state unavailable", error instanceof Error ? error.message : "unknown"); return Response.json({ error: "We couldn't load your campus. Please try again." }, { status: 503 }); }
}
