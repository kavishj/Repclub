"use client";
import { useEffect, useState, type FormEvent } from "react";
import { ArrowLeft, ArrowRight, Building2, Check, CheckCheck, ChevronRight, Dumbbell, KeyRound, Loader2, Moon, Play, Sun, Target, Users } from "lucide-react";
import type { AppState } from "../lib/league";
import { AnimatePresence } from "motion/react";
import * as m from "motion/react-m";
import { DayPicker, GoalPicker, Hint, celebrate } from "./experience";
export type SetupPayload = {
    action: "createCampus" | "joinCampus";
    name: string;
    campusName?: string;
    gymName?: string;
    code?: string;
    goal: number;
    days: number[];
    consent: true;
};
type Props = {
    state: AppState | null;
    theme: "light" | "dark";
    busy: boolean;
    error: string;
    connectionError: string;
    loading: boolean;
    onTheme: () => void;
    onSubmit: (payload: SetupPayload) => Promise<boolean>;
    onSquad: (payload: {
        action: "createSquad" | "joinSquad";
        name?: string;
        code?: string;
    }) => Promise<boolean>;
    onFinish: () => void;
    onDemo: () => void;
    onRetry: () => void;
    onClearError: () => void;
};
const steps = ["Campus", "Profile", "Weekly goal", "Squad"];
const defaultDays: Record<number, number[]> = { 2: [1, 4], 3: [0, 2, 4], 4: [0, 1, 3, 5], 5: [0, 1, 2, 4, 5] };
export default function Onboarding(props: Props) {
    const { state, busy, error, connectionError, loading } = props;
    const [step, setStep] = useState(0);
    const [mode, setMode] = useState<"joinCampus" | "createCampus" | null>(null);
    const [name, setName] = useState(state?.user?.name && !state.user.name.includes("@") ? state.user.name : "");
    const [campusName, setCampusName] = useState("");
    const [gymName, setGymName] = useState("");
    const [code, setCode] = useState("");
    const [goal, setGoal] = useState(3);
    const [days, setDays] = useState<number[]>([0, 2, 4]);
    const [consent, setConsent] = useState(false);
    const [squadMode, setSquadMode] = useState<"createSquad" | "joinSquad">("createSquad");
    const [squadName, setSquadName] = useState("");
    const [squadCode, setSquadCode] = useState("");
    const hasCampus = !!state?.campus && !!state.me;
    const activeStep = hasCampus ? 3 : step;
    const squad = state?.squads.find(item => item.id === state.me?.squadId);
    const unavailable = loading || !!connectionError || !state;
    useEffect(() => {
        const initial = new URLSearchParams(window.location.search).get("setup");
        if (initial === "joinCampus" || initial === "createCampus") {
            setMode(initial);
            if (state?.user)
                setStep(1);
        }
    }, [state?.user?.userId]);
    useEffect(() => {
        if (error && mode === "joinCampus" && /invite code|wasn't found|code wasn't/i.test(error))
            setStep(1);
    }, [error, mode]);
    function finish() { props.onFinish(); void celebrate(); }
    function back() { props.onClearError(); setStep(current => Math.max(0, current - 1)); }
    function detailsNext(event: FormEvent<HTMLFormElement>) { event.preventDefault(); props.onClearError(); setStep(2); }
    async function save(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!mode || !consent)
            return;
        await props.onSubmit({ action: mode, name: name.trim(), ...(mode === "createCampus" ? { campusName: campusName.trim(), gymName: gymName.trim() } : { code: code.trim().toUpperCase() }), goal, days, consent: true });
    }
    async function saveSquad(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        await props.onSquad(squadMode === "createSquad" ? { action: squadMode, name: squadName.trim() } : { action: squadMode, code: squadCode.trim().toUpperCase() });
    }
    return <main className="onboarding-shell">
    <header className="onboarding-header"><a className="brand" href="/" aria-label="RepClub home"><span className="brand-mark"><Dumbbell size={25}/></span>repclub<span className="brand-dot">.</span></a><div><button className="text-button onboarding-demo" onClick={props.onDemo}><Play size={14}/> Try demo</button><Hint label={`Switch to ${props.theme === "dark" ? "light" : "dark"} mode`}><button className="icon-button" onClick={props.onTheme} aria-label={`Switch to ${props.theme === "dark" ? "light" : "dark"} mode`}>{props.theme === "dark" ? <Sun size={19}/> : <Moon size={19}/>}</button></Hint></div></header>
    <div className="onboarding-layout">
      <aside className="onboarding-steps" aria-label="Setup progress"><h1>Set up RepClub</h1><ol>{steps.map((label, index) => <li key={label} aria-current={activeStep === index ? "step" : undefined} className={index < activeStep ? "complete" : activeStep === index ? "current" : ""}><span>{index < activeStep ? <Check size={16}/> : index + 1}</span><div>{label}{index === 3 && <small>Optional</small>}</div></li>)}</ol></aside>
      <section className="card onboarding-card" aria-labelledby="onboarding-title">
        <AnimatePresence initial={false} mode="wait"><m.div key={activeStep} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: .16 }} onAnimationComplete={() => document.getElementById("onboarding-title")?.focus({ preventScroll: true })}>
        <div className="onboarding-step-label">STEP {activeStep + 1} OF {steps.length}{activeStep === 3 && " · OPTIONAL"}</div>
        {connectionError && <div className="connection-error" role="alert"><span>{connectionError}</span><button onClick={props.onRetry}>Retry</button></div>}
        {activeStep === 0 && <>
          <span className="onboarding-icon"><Building2 size={25}/></span><h2 id="onboarding-title" tabIndex={-1}>Your campus</h2><p className="onboarding-help">Join an existing gym or set up a campus pilot.</p>
          <div className="onboarding-choices"><button className={mode === "joinCampus" ? "selected" : ""} onClick={() => { setMode("joinCampus"); props.onClearError(); }} aria-pressed={mode === "joinCampus"}><KeyRound size={23}/><span><strong>Join a campus</strong><small>I have an invite code</small></span>{mode === "joinCampus" ? <Check size={18}/> : <ChevronRight size={17}/>}</button><button className={mode === "createCampus" ? "selected" : ""} onClick={() => { setMode("createCampus"); props.onClearError(); }} aria-pressed={mode === "createCampus"}><Building2 size={23}/><span><strong>Create a campus</strong><small>For gym organizers</small></span>{mode === "createCampus" ? <Check size={18}/> : <ChevronRight size={17}/>}</button></div>
          {state && !state.user && mode ? <a className="btn primary full" target="_top" href={`/signin-with-chatgpt?return_to=${encodeURIComponent("/?setup=" + mode)}`}>Sign in to continue <ArrowRight size={16}/></a> : <button className="btn primary full" disabled={!mode || unavailable} onClick={() => setStep(1)}>{loading ? <Loader2 size={16} className="spin"/> : null} Continue <ArrowRight size={16}/></button>}
        </>}
        {activeStep === 1 && <>
          <span className="onboarding-icon"><Users size={25}/></span><h2 id="onboarding-title" tabIndex={-1}>Your profile</h2>
          <form onSubmit={detailsNext} className="onboarding-form"><label>Display name<input autoComplete="nickname" value={name} onChange={event => setName(event.target.value)} minLength={2} maxLength={50} placeholder="Your name" required/></label>{mode === "createCampus" ? <><label>College or campus<input value={campusName} onChange={event => setCampusName(event.target.value)} minLength={2} maxLength={50} placeholder="College name" required/></label><label>Gym name<input value={gymName} onChange={event => setGymName(event.target.value)} minLength={2} maxLength={50} placeholder="Campus gym" required/></label><p className="onboarding-field-help">You’ll manage this campus and appoint gym verifiers.</p></> : <><label>Invite code<input className="code-input" value={code} onChange={event => setCode(event.target.value.toUpperCase().replace(/\s/g, ""))} minLength={6} maxLength={12} autoComplete="off" placeholder="Campus or squad code" required/></label><p className="onboarding-field-help">Get this code from your gym organizer or a friend.</p></>}{error && <p role="alert" className="form-error">{error}</p>}<div className="onboarding-actions"><button type="button" className="btn secondary" onClick={back}><ArrowLeft size={15}/> Back</button><button className="btn primary" disabled={unavailable}>Continue <ArrowRight size={15}/></button></div></form>
        </>}
        {activeStep === 2 && <>
          <span className="onboarding-icon"><Target size={25}/></span><h2 id="onboarding-title" tabIndex={-1}>Your weekly goal</h2><p className="onboarding-help">How many gym days will you commit to?</p>
          <form onSubmit={save} className="onboarding-form"><GoalPicker goal={goal} onChange={value => { setGoal(value); setDays(defaultDays[value]); }}/><label className="field-label">Planned days <span className="optional">optional</span></label><DayPicker selected={days} onChange={setDays}/><p className="onboarding-field-help">Days can change. Your target locks after your first workout log.</p><label className="checkbox-label"><input type="checkbox" checked={consent} onChange={event => setConsent(event.target.checked)} required/><span>I’m 18+ and choose to join. My name and goal progress are visible to campus members; workouts are shared with my squad and gym staff.</span></label>{error && <p role="alert" className="form-error">{error}</p>}<div className="onboarding-actions"><button type="button" className="btn secondary" disabled={busy} onClick={back}><ArrowLeft size={15}/> Back</button><button className="btn primary" disabled={busy || unavailable || !consent}>{busy ? <Loader2 size={16} className="spin"/> : null}{mode === "createCampus" ? "Create campus" : "Join campus"}<ArrowRight size={15}/></button></div></form>
        </>}
        {activeStep === 3 && state?.campus && <>
          <span className="onboarding-icon"><Users size={25}/></span><h2 id="onboarding-title" tabIndex={-1}>{squad ? "You’re set" : "Add your squad"}</h2><div className="onboarding-summary"><Building2 size={17}/><span><strong>{state.campus.name}</strong><small>{state.campus.gymName} · {state.me?.stats.goal} days / week</small></span><Check size={17}/></div>
          {squad ? <><div className="onboarding-summary"><Users size={18}/><span><strong>{squad.name}</strong><small>{state.members.filter(member => member.squadId === squad.id).length} members</small></span><CheckCheck size={18}/></div><button className="btn primary full" onClick={finish}>Open RepClub <ArrowRight size={16}/></button></> : <><p className="onboarding-help">Share workouts with a private group of friends.</p><div className="segmented modal-tabs"><button className={squadMode === "createSquad" ? "selected" : ""} onClick={() => { setSquadMode("createSquad"); props.onClearError(); }}>Create squad</button><button className={squadMode === "joinSquad" ? "selected" : ""} onClick={() => { setSquadMode("joinSquad"); props.onClearError(); }}>Join squad</button></div><form onSubmit={saveSquad} className="onboarding-form">{squadMode === "createSquad" ? <label>Squad name<input value={squadName} onChange={event => setSquadName(event.target.value)} placeholder="Your group’s name" minLength={2} maxLength={50} required/></label> : <label>Squad code<input className="code-input" value={squadCode} onChange={event => setSquadCode(event.target.value.toUpperCase().replace(/\s/g, ""))} placeholder="Invite code" minLength={6} maxLength={12} autoComplete="off" required/></label>}{error && <p role="alert" className="form-error">{error}</p>}<button className="btn primary full" disabled={busy || unavailable}>{busy ? <Loader2 size={16} className="spin"/> : null}{squadMode === "createSquad" ? "Create squad" : "Join squad"}<ArrowRight size={16}/></button></form><button className="onboarding-skip" disabled={busy} onClick={finish}>Skip for now</button></>}
        </>}
        </m.div></AnimatePresence>
      </section>
    </div>
  </main>;
}
