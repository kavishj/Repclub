import { getChatGPTUser } from "../../chatgpt-auth";
import { memberFor, rawDb } from "../../../lib/server";
import { readWorkoutQuery, workoutPage } from "../../../lib/workout-query";
export const dynamic="force-dynamic";
export async function GET(request:Request) {
  const user=await getChatGPTUser();
  if(!user) return Response.json({error:"Sign in to view your workouts."},{status:401});
  const me=await memberFor(user.userId);
  if(!me) return Response.json({error:"Join a campus first."},{status:403});
  let query;
  try{query=readWorkoutQuery(new URL(request.url).searchParams);}catch(error){return Response.json({error:(error as Error).message},{status:400});}
  if(query.scope==="reviews"&&me.role==="member")return Response.json({error:"Only gym staff can view the review queue."},{status:403});
  try{return Response.json(await workoutPage(rawDb(),me,query),{headers:{"Cache-Control":"no-store"}});}
  catch(error){console.error("Workout page unavailable",error instanceof Error?error.message:"unknown");return Response.json({error:"Could not load workouts. Try again."},{status:503});}
}
