"use client";
import type { ReactNode } from "react";
import * as m from "motion/react-m";
import { ArrowRight, ArrowUpRight, ChevronDown, CircleHelp, Clock3, Dumbbell, Heart, RotateCcw, ShieldCheck, Trophy } from "lucide-react";
import { type RankedMember, type Session } from "../lib/league";
export type Exercise = {
    name: string;
    sets: number;
    reps: number;
    weight: number;
};
export function dateLabel(date: string, short = false) {
    return new Date(date + "T12:00:00Z").toLocaleDateString("en-IN", { day: "numeric", month: "short", ...(short ? {} : { weekday: "short" as const }) });
}
export function exerciseList(session: Session): Exercise[] { return JSON.parse(session.exercises); }
export function loggedVolume(session: Session) { return exerciseList(session).reduce((sum, exercise) => sum + exercise.sets * exercise.reps * exercise.weight, 0); }
export function Avatar({ name, size = "", index = 0 }: {
    name: string;
    size?: string;
    index?: number;
}) {
    return <span aria-hidden="true" className={`avatar ${size} color-${index % 5}`}>{name.split(" ").map(part => part[0]).slice(0, 2).join("").toUpperCase()}</span>;
}
export function Pill({ status }: {
    status: string;
}) {
    const Icon = status === "verified" ? ShieldCheck : status === "pending" ? Clock3 : CircleHelp;
    return <span className={`pill ${status}`} title={status === "verified" ? "Gym attendance confirmed by staff. Exercise details remain self-reported." : undefined}><Icon size={13}/>{status === "verified" ? "Verified visit" : status === "pending" ? "Pending review" : "Needs attention"}</span>;
}
export function Empty({ icon, title, text, children }: {
    icon: ReactNode;
    title: string;
    text: string;
    children?: ReactNode;
}) {
    return <div className="empty"><span className="empty-icon">{icon}</span><h3>{title}</h3><p>{text}</p>{children}</div>;
}
export function Standings({ members, meId, compact = false, onSelect }: {
    members: RankedMember[];
    meId: string;
    compact?: boolean;
    onSelect: (member: RankedMember) => void;
}) {
    return <div className={`standings ${compact ? "compact" : ""}`}>{members.map((member, index) => <button className={`standing ${member.userId === meId ? "is-you" : ""}`} key={member.userId} onClick={() => onSelect(member)} aria-label={`View ${member.userId === meId ? "your" : member.name + "'s"} progress`}>
      <span className={`rank rank-${member.rank}`}>{member.rank === 1 ? <Trophy size={16}/> : String(member.rank).padStart(2, "0")}</span>
      <Avatar name={member.name} index={index}/>
      <span className="standing-name"><strong>{member.userId === meId ? "You" : member.name}{member.userId === meId && <span className="you-label">YOU</span>}</strong><small>{member.stats.count}/{member.stats.goal} visits</small></span>
      {!compact && <span className="standing-bar"><span style={{ width: `${member.stats.percent}%` }}/></span>}
      <span className="standing-score">{member.stats.percent}<small>%</small></span>
      {!compact && <ArrowUpRight size={15} className="row-arrow"/>}
    </button>)}</div>;
}
export function WorkoutCard({ session, member, viewerId, busy, onOpen, onCheer, onRepeat, onMember }: {
    session: Session;
    member?: RankedMember;
    viewerId: string;
    busy: boolean;
    onOpen: (session: Session) => void;
    onCheer: (id: string) => void;
    onRepeat: (session: Session) => void;
    onMember: (member: RankedMember) => void;
}) {
    const exercises = exerciseList(session), volume = loggedVolume(session), isOwn = session.userId === viewerId;
    return <article className="workout-card">
    <div className="workout-top">
      <button className="athlete-button" onClick={() => member && onMember(member)} aria-label={`View ${isOwn ? "your" : member?.name || "member"} progress`}>
        <Avatar name={member?.name || "Member"} index={member?.name.charCodeAt(0) || 0}/>
        <span><strong>{isOwn ? "You" : member?.name || "Member"}</strong><small>{dateLabel(session.date)}<span className="meta-dot">·</span>{session.type}</small></span>
      </button>
      <Pill status={session.status}/>
    </div>
    <button className="workout-title" onClick={() => onOpen(session)}>{session.title}<ArrowUpRight size={17}/></button>
    {session.notes && <p className="workout-note">{session.notes}</p>}
    <div className="workout-metrics">
      <span><small>Duration</small><strong>{session.duration}<em>min</em></strong></span>
      <span><small>{exercises.length ? "Exercises" : "Activity"}</small><strong>{exercises.length || session.type}</strong></span>
      <span><small>Logged volume</small><strong>{volume ? volume.toLocaleString("en-IN") : "N/A"}{volume > 0 && <em>kg</em>}</strong></span>
    </div>
    {exercises.length > 0 && <details className="exercise-preview">
      <summary><span className="exercise-preview-icons"><Dumbbell size={15}/></span><span>{exercises.slice(0, 2).map(e => e.name).join(" · ")}{exercises.length > 2 ? ` +${exercises.length - 2}` : ""}</span><ChevronDown size={15}/></summary>
      <div className="exercise-preview-list">{exercises.map((exercise, index) => <div key={index}><span>{exercise.name}</span><strong>{exercise.sets} × {exercise.reps}<small>{exercise.weight} kg</small></strong></div>)}</div>
    </details>}
    {session.status === "declined" && <p className="review-note">Staff note: {session.reviewNote}</p>}
    <div className="workout-bottom">
      <m.button whileTap={{ scale: .9 }} className={`cheer ${session.cheered ? "cheered" : ""}`} disabled={busy} onClick={() => onCheer(session.id)} aria-pressed={!!session.cheered} aria-label={`${session.cheered ? "Unlike" : "Like"} ${session.title}`}><m.span className="cheer-heart" initial={false} animate={{ scale: session.cheered ? [1, 1.3, 1] : 1 }} transition={{ duration: .3 }}><Heart size={17} fill={session.cheered ? "currentColor" : "none"}/></m.span><span>{session.cheers || 0}</span><span className="cheer-label">{session.cheered ? "Liked" : "Like"}</span></m.button>
      <div className="workout-actions">{isOwn && <button className="subtle-button" onClick={() => onRepeat(session)}><RotateCcw size={14}/> Repeat</button>}<button className="subtle-button" onClick={() => onOpen(session)}>Details <ArrowRight size={14}/></button></div>
    </div>
  </article>;
}
