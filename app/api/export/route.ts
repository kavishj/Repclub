import { getChatGPTUser } from "../../chatgpt-auth";
import { memberFor, rawDb } from "../../../lib/server";
import { mapSession } from "../../../lib/workout-query";
export const dynamic="force-dynamic";
export async function GET(){
  const user=await getChatGPTUser();if(!user)return Response.json({error:"Sign in to export workouts."},{status:401});
  const me=await memberFor(user.userId);if(!me)return Response.json({error:"Join a campus first."},{status:403});
  try{
    const db=rawDb(),[sessions,plans,routines,reviews]=await Promise.all([db.prepare("SELECT * FROM sessions WHERE user_id=? ORDER BY created_at DESC,id DESC").bind(me.userId).all<Record<string,unknown>>(),db.prepare("SELECT week,goal,days FROM plans WHERE user_id=? ORDER BY week").bind(me.userId).all(),db.prepare("SELECT * FROM routines WHERE user_id=?").bind(me.userId).all(),db.prepare("SELECT e.* FROM review_events e JOIN sessions s ON e.session_id=s.id WHERE s.user_id=? ORDER BY e.created_at").bind(me.userId).all()]);
    return Response.json({member:me,workouts:sessions.results.map(mapSession),plans:plans.results,routines:routines.results,reviews:reviews.results},{headers:{"Cache-Control":"no-store","Content-Disposition":"attachment; filename=repclub-my-workouts.json"}});
  }catch{return Response.json({error:"Could not export workouts. Try again."},{status:503});}
}
