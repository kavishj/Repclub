import RepClub from "./repclub";
import { getChatGPTUser } from "./chatgpt-auth";
import { stateFor } from "../lib/server";
import type { AppState } from "../lib/league";

export const dynamic = "force-dynamic";

export default async function Home() {
  let initialState: AppState | null = null;
  let initialError = "";
  try { initialState = await stateFor(await getChatGPTUser()); }
  catch { initialError = "Couldn’t load your account. Try again."; }
  return <RepClub initialState={initialState} initialError={initialError}/>;
}
