"use client";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { BarChart3, Monitor, Moon, Search, Sun, Activity, ArrowDownToLine, ArrowRight, ArrowUpRight, Award, CalendarDays, Check, CheckCheck, ChevronDown, ChevronRight, CircleHelp, Clock3, ScanLine, Copy, Dumbbell, Flame, LayoutDashboard, Leaf, Loader2, LockKeyhole, LogOut, Plus, RefreshCw, Settings2, ShieldCheck, Target, Trophy, Users, X, Zap } from "lucide-react";
import { badgeList, dayKey, shiftDay, weekKey, type AppState, type Session, type RankedMember } from "../lib/league";
import { makeDemo, demoState } from "../lib/demo";
import Onboarding from "./onboarding";
import WorkoutEditor, { type EditorConfig } from "./workout-editor";
import { CompactSelect } from "./entry-controls";
import { useWorkoutPage, WorkoutPageControls } from "./use-workout-page";
import { clearWorkoutDrafts } from "../lib/workout-draft";
import * as m from "motion/react-m";
import { toast as notify } from "sonner";
import { DayPicker, GoalPicker, Hint, celebrate } from "./experience";
import { newMilestone, MIN_SCAN_DURATION, MAX_SCAN_DURATION } from "../lib/league";
import { GymQr, QrScanner, ScanTimes, StatusTimeline, WorkoutSession } from "./scan-workout";
import { Avatar, Pill, Empty, Standings, WorkoutCard, exerciseList, loggedVolume } from "./ui";
type Tab = "overview" | "workouts" | "league" | "rewards" | "desk";
type Modal = "scan" | "workout" | "plan" | "squad" | "invite" | "rules" | "profile" | "review" | "details" | "day" | "member" | "achievement" | null;
type Payload = Record<string, unknown> & {
    action: string;
};
const nav = [{ id: "overview", label: "Home", icon: LayoutDashboard }, { id: "workouts", label: "My workouts", icon: Dumbbell }, { id: "league", label: "Leaderboard", icon: Trophy }, { id: "rewards", label: "Achievements", icon: Award }, { id: "desk", label: "Gym desk", icon: ShieldCheck }] as const;
const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const dateLabel = (s: string, short = false) => new Date(s + "T12:00:00Z").toLocaleDateString("en-IN", { day: "numeric", month: "short", ...(short ? {} : { weekday: "short" as const }) });
export default function RepClub({ initialState = null, initialError = "" }: {
    initialState?: AppState | null;
    initialError?: string;
}) {
    const [tab, setTab] = useState<Tab>("overview"), [modal, setModal] = useState<Modal>(null);
    const [live, setLive] = useState<AppState | null>(initialState), [sample, setSample] = useState(makeDemo), [explore, setExplore] = useState(false);
    const [loading, setLoading] = useState(!initialState && !initialError), [loadError, setLoadError] = useState(initialError), [busy, setBusy] = useState(false), [error, setError] = useState("");
    const [finishingSetup, setFinishingSetup] = useState(false);
    const [squadMode, setSquadMode] = useState("createSquad"), [review, setReview] = useState<Session | null>(null);
    const [workoutFilter, setWorkoutFilter] = useState("all"), [leagueScope, setLeagueScope] = useState("campus");
    const [selectedDays, setSelectedDays] = useState<number[]>([0, 2, 4]), [selectedGoal, setSelectedGoal] = useState(3);
    const [confirmAttendance, setConfirmAttendance] = useState(false);
    const [theme, setTheme] = useState<"dark" | "light">("dark");
    const [feedScope, setFeedScope] = useState("squad"), [feedFilter, setFeedFilter] = useState("all");
    const [query, setQuery] = useState(""), [workoutRange, setWorkoutRange] = useState("all"), [rewardFilter, setRewardFilter] = useState("all");
    const [selectedSession, setSelectedSession] = useState<Session | null>(null), [selectedDate, setSelectedDate] = useState(dayKey());
    const [selectedMember, setSelectedMember] = useState<RankedMember | null>(null), [selectedBadge, setSelectedBadge] = useState(0);
    const [scanTarget, setScanTarget] = useState<Session | null>(null);
    const [editor,setEditor] = useState<EditorConfig>({mode:"manual"});
    const [inlineEditor,setInlineEditor]=useState(false),[editorAutoFocus,setEditorAutoFocus]=useState(true);
    const activeEditorId=useRef<string|null>(null),workoutForm=useRef<HTMLFormElement>(null);
    const [inviteCode,setInviteCode] = useState("");
    const dialog = useRef<HTMLDialogElement>(null), progressSnapshot = useRef(initialState);
    const demo = !live?.campus || explore, data = useMemo(() => demo ? demoState(sample) : live!, [demo, sample, live]);
    const clockReceivedAt = useMemo(() => typeof window === "undefined" ? 0 : Date.now(), [data.serverNow]);
    const me = data.me!, stats = me.stats, squad = data.squads.find(s => s.id === me.squadId), mySquad = data.members.filter(m => me.squadId && m.squadId === me.squadId);
    const currentPlan = data.plans.find(p => p.week === data.week), planned: number[] = JSON.parse(currentPlan?.days ?? me.days);
    const badges = badgeList(stats), pending = data.activity.pending;
    const admin = me.role !== "member";
    const refreshGeneration=useRef(0),refreshAbort=useRef<AbortController|null>(null),lastRefresh=useRef(0);
    async function refresh() {
        const job=++refreshGeneration.current;refreshAbort.current?.abort();const controller=new AbortController();refreshAbort.current=controller;lastRefresh.current=Date.now();
        setLoading(true);
        setLoadError("");
        try {
            const res = await fetch("/api/state", { cache: "no-store",signal:controller.signal });
            const json = await res.json() as AppState & {
                error?: string;
            };
            if (!res.ok)
                throw new Error(json.error);
            if(job!==refreshGeneration.current)return null;
            const milestone = newMilestone(progressSnapshot.current, json);
            progressSnapshot.current = json;
            setLive(json);
            if (milestone) {
                notify.success(milestone, { duration: 5000 });
                void celebrate();
            }
            return json as AppState;
        }
        catch (e) {
            if(!controller.signal.aborted&&job===refreshGeneration.current)setLoadError(e instanceof Error ? e.message : "Connection unavailable.");
            return null;
        }
        finally {
            if(job===refreshGeneration.current)setLoading(false);
        }
    }
    useEffect(() => {
        if (!initialState)
            void refresh();
    }, []);
    useEffect(()=>{
        const resync=()=>{if(document.visibilityState==="visible"&&navigator.onLine&&Date.now()-lastRefresh.current>1500)void refresh();};
        const invite=new URLSearchParams(window.location.search).get("invite")?.toUpperCase()??"";
        if(/^[A-Z0-9]{6,12}$/.test(invite)){setInviteCode(invite);if(initialState?.me){setSquadMode("joinSquad");setModal("squad");}}
        document.addEventListener("visibilitychange",resync);window.addEventListener("online",resync);window.addEventListener("pageshow",resync);
        const interval=setInterval(()=>{if(document.visibilityState==="visible"&&navigator.onLine)void refresh();},60000);
        return()=>{document.removeEventListener("visibilitychange",resync);window.removeEventListener("online",resync);window.removeEventListener("pageshow",resync);clearInterval(interval);refreshAbort.current?.abort();};
    },[]);
    useEffect(() => {
        if (modal) {
            setError("");
            dialog.current?.showModal();
        }
        else
            dialog.current?.close();
    }, [modal]);
    function message(text: string, tone: "success" | "error" = "success") { notify[tone](text); }
    function startSetup() { setError(""); setModal(null); setExplore(false); setFinishingSetup(!!live?.campus);  }
    function openWorkout(config:EditorConfig){setEditor(config);setEditorAutoFocus(true);setInlineEditor(true);setError("");setModal(null);setTab("overview");}
    useEffect(()=>{
        if(data.activeSession&&activeEditorId.current!==data.activeSession.id){activeEditorId.current=data.activeSession.id;setEditor({mode:"edit",session:data.activeSession});setEditorAutoFocus(false);setInlineEditor(true);}
        else if(!data.activeSession&&activeEditorId.current){const endedId=activeEditorId.current;activeEditorId.current=null;if(editor.session?.id===endedId)setInlineEditor(false);}
    },[data.activeSession?.id]);
    function beginScan(){
        if(!data.activeSession){open("scan");return;}
        if(tab==="overview"&&inlineEditor&&editor.mode==="edit"&&editor.session?.id===data.activeSession.id){
            const button=workoutForm.current?.querySelector<HTMLButtonElement>('button[value="checkout"]');
            if(button){workoutForm.current?.requestSubmit(button);return;}
            workoutForm.current?.querySelector<HTMLInputElement>("#workout-title")?.focus();return;
        }
        openWorkout({mode:"edit",session:data.activeSession});
    }
    function checkoutSession(session:Session){setScanTarget(session);setError("");setModal("scan");}
    function open(m: Modal) {
        setError("");
        if (m === "scan") setScanTarget(data.activeSession);
        if (m === "plan") {
            setSelectedGoal(stats.goal);
            setSelectedDays(planned);
        }
        if (m === "workout") {openWorkout({mode:"manual"});return;}
        setModal(m);
    }
    function navigate(t: Tab) { setTab(t);  setQuery(""); window.scrollTo({ top: 0, behavior: "auto" }); }
    async function run(payload: Payload, forceLive = false) {
        if (busy)
            return false;
        setBusy(true);
        setError("");
        try {
            if (demo && !forceLive) {
                const d = structuredClone(sample), action = payload.action;
                if (action === "workout") {
                    d.sessions.push({ ...payload, id: crypto.randomUUID(), campusId: d.campus.id, userId: "you", exercises: JSON.stringify(payload.exercises), status: "manual", timingSource: "manual", startedAt: null, endedAt: null, deskSupported: 0, createdAt: Date.now(), reviewedBy: null, reviewedAt: null, reviewNote: null, cheers: 0, cheered: false } as unknown as Session);
                }
                if (action === "scanStart") {
                    if (d.sessions.some(s => s.userId === "you" && s.status === "recording"))
                        throw new Error("A workout is already running.");
                    if (d.sessions.some(s => s.userId === "you" && s.date === dayKey() && s.timingSource === "scan" && ["recording","pending","verified"].includes(s.status)))
                        throw new Error("You already have a scan-timed workout today. You can still add a manual log.");
                    d.sessions.push({ id: crypto.randomUUID(), campusId: d.campus.id, userId: "you", title: "Gym workout", type: "Strength", date: dayKey(), duration: 0, notes: "", exercises: "[]", status: "recording", timingSource: "scan", startedAt: Date.now(), endedAt: null, deskSupported: 1, createdAt: Date.now(), reviewedBy: null, reviewedAt: null, reviewNote: null });
                }
                if (action === "scanFinish" || action === "scanCancel" || action === "manualFinish") {
                    const session = d.sessions.find(s => s.id === payload.id && s.userId === "you" && s.status === "recording");
                    if (!session?.startedAt)
                        throw new Error("This workout is no longer running.");
                    const elapsed = Date.now() - session.startedAt;
                    session.duration = Math.floor(elapsed / 60000);
                    session.status = action === "scanFinish" ? elapsed>=MIN_SCAN_DURATION&&elapsed<=MAX_SCAN_DURATION ? "pending" : "unqualified" : "manual";
                    session.timingSource = action === "scanFinish" ? "scan" : "manual";
                    session.endedAt = action === "scanFinish" ? Date.now() : null;
                    if(action==="manualFinish")Object.assign(session,{title:payload.title,type:payload.type,duration:payload.duration,notes:payload.notes,exercises:JSON.stringify(payload.exercises)});
                }
                if (action === "workoutDetails") {
                    const session = d.sessions.find(s => s.id === payload.id && s.userId === "you" && ["recording", "pending"].includes(s.status));
                    if (!session)
                        throw new Error("This workout is unavailable or has already been reviewed.");
                    Object.assign(session, { title: payload.title, type: payload.type, notes: payload.notes, exercises: JSON.stringify(payload.exercises) });
                }
                if (action === "plan") {
                    if (d.sessions.some(s => s.userId === "you" && s.startedAt !== null && weekKey(s.date) === data.week) && payload.goal !== me.goal)
                        throw new Error("Your target is locked for this week. Planned days can change.");
                    const m = d.members.find(m => m.userId === "you")!;
                    m.goal = Number(payload.goal);
                    m.days = JSON.stringify(payload.days);
                    const p = d.plans.find(p => p.userId === "you" && p.week === data.week);
                    if (p) {
                        p.goal = m.goal;
                        p.days = m.days;
                    }
                }
                if (action === "cheer") {
                    const s = d.sessions.find(s => s.id === payload.id)!;
                    s.cheered = !s.cheered;
                    s.cheers = (s.cheers || 0) + (s.cheered ? 1 : -1);
                }
                if (action === "review") {
                    const s = d.sessions.find(s => s.id === payload.id)!;
                    if (s.timingSource !== "scan" || !s.startedAt || !s.endedAt)
                        throw new Error("Manual logs do not earn rewards.");
                    if (s.userId === "you")
                        throw new Error("Another verifier must review your own attendance.");
                    if (payload.decision === "verified" && !payload.confirmed)
                        throw new Error("Confirm that you independently checked attendance.");
                    if (payload.decision === "declined" && String(payload.note).trim().length < 3)
                        throw new Error("Add a short reason for the member.");
                    s.status = String(payload.decision);
                    s.reviewedBy = "you";
                    s.reviewedAt = Date.now();
                    s.reviewNote = String(payload.note);
                }
                if (action === "createSquad") {
                    const squadId = crypto.randomUUID();
                    d.squads.push({ id: squadId, campusId: d.campus.id, name: String(payload.name), inviteCode: "SQUAD234", createdAt: Date.now() });
                    d.members.find(m => m.userId === "you")!.squadId = squadId;
                }
                if (action === "joinSquad") {
                    const s = d.squads.find(s => s.inviteCode === String(payload.code).toUpperCase());
                    if (!s)
                        throw new Error("Try REPS2026 or EARLY234 in the sample campus.");
                    d.members.find(m => m.userId === "you")!.squadId = s.id;
                }
                if (action === "desk")
                    d.deskCode = { code: "repclub:gym:v1:" + "a".repeat(64), expiresAt: Date.now() + 120000 };
                if (action === "role")
                    d.members.find(m => m.userId === payload.id)!.role = String(payload.role);
                setSample(d);
                if (!["cheer","desk"].includes(payload.action))
                    message("Demo updated.");
            }
            else {
                const res = await fetch("/api/actions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
                const json = await res.json() as {
                    error?: string;
                };
                if (!res.ok) {
                    if (res.status === 409 && ["scanStart", "scanFinish", "scanCancel", "manualFinish"].includes(payload.action)) await refresh();
                    throw new Error(json.error || "Something went wrong.");
                }
                const updated = await refresh();
                if (!updated) message("Saved. Use Refresh to load the latest activity.");
                if (forceLive) {
                    setExplore(false);
                    setTab("overview");
                    if (payload.action === "createCampus" || payload.action === "joinCampus")
                        setFinishingSetup(true);
                }
                if (!["cheer","desk"].includes(payload.action))
                    message(payload.action === "scanStart" ? "Workout timer started." : payload.action === "scanFinish" ? "Checkout saved. Reward eligibility is shown in your history." : payload.action === "workout" || payload.action === "scanCancel" || payload.action === "manualFinish" ? "Manual log saved. No rewards." : "Saved.");
            }
            return true;
        }
        catch (e) {
            const msg = e instanceof Error ? e.message : "Please try again.";
            setError(msg);
            message(msg, "error");
            return false;
        }
        finally {
            setBusy(false);
        }
    }
    async function submit(e: FormEvent<HTMLFormElement>, action: string) {
        e.preventDefault();
        const f = new FormData(e.currentTarget), get = (k: string) => String(f.get(k) ?? "");
        let payload: Payload = { action };
        if (action === "plan")
            payload = { action, goal: selectedGoal, days: selectedDays };
        if (action === "createSquad")
            payload.name = get("name");
        if (action === "joinSquad")
            payload.code = get("code");
        if (await run(payload))
            setModal(null);
    }
    async function copy(text: string) {
        try {
            await navigator.clipboard.writeText(text);
            message("Copied to clipboard.");
        }
        catch {
            message("Select and copy the code shown below.");
        }
    }
    async function download() {
        try { const response=demo?null:await fetch("/api/export",{cache:"no-store"});if(response&&!response.ok)throw new Error("Could not export. Try again.");const contents=response?await response.text():JSON.stringify({member:me,workouts:data.mine,plans:data.plans},null,2);const url=URL.createObjectURL(new Blob([contents],{type:"application/json"})),a=document.createElement("a");a.href=url;a.download="repclub-my-workouts.json";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000); }catch(error){message(error instanceof Error?error.message:"Export unavailable.","error");}
    }
    const goalLocked = data.activity.goalLocked;
    const goalPicker = <><label className="field-label">Weekly target</label><GoalPicker goal={selectedGoal} onChange={setSelectedGoal} locked={goalLocked}/><label className="field-label">Planned days</label><DayPicker selected={selectedDays} onChange={setSelectedDays}/></>;
    const [feedLimit, setFeedLimit] = useState(5), [historyWeek, setHistoryWeek] = useState(data.week);
    const themePreference = useRef<"dark" | "light" | "system">("dark");
    const [appearance, setAppearance] = useState<"dark" | "light" | "system">("dark");
    useEffect(() => {
        const media = window.matchMedia("(prefers-color-scheme: dark)");
        let saved: string | null = null;
        try {
            saved = localStorage.getItem("repclub-theme");
        }
        catch { }
        const preference = saved === "light" || saved === "system" ? saved : "dark";
        themePreference.current = preference;
        setAppearance(preference);
        const resolved = preference === "system" ? (media.matches ? "dark" : "light") : preference;
        document.documentElement.dataset.theme = resolved;
        setTheme(resolved);
        const followSystem = () => {
            if (themePreference.current !== "system")
                return;
            const next = media.matches ? "dark" : "light";
            document.documentElement.dataset.theme = next;
            setTheme(next);
        };
        media.addEventListener("change", followSystem);
        return () => media.removeEventListener("change", followSystem);
    }, []);
    useEffect(() => {
        const shortcut = (event: KeyboardEvent) => {
            const target = event.target as HTMLElement | null;
            if ((!live?.campus && !explore) || finishingSetup || event.key.toLowerCase() !== "n" || event.metaKey || event.ctrlKey || event.altKey || modal || inlineEditor || busy || target?.closest("input,textarea,select,[contenteditable=true]"))
                return;
            event.preventDefault();
            openWorkout({mode:"manual"});
        };
        window.addEventListener("keydown", shortcut);
        return () => window.removeEventListener("keydown", shortcut);
    }, [modal, live?.campus, explore, finishingSetup, inlineEditor, busy]);
    function changeTheme(preference: "dark" | "light" | "system") {
        themePreference.current = preference;
        setAppearance(preference);
        const next = preference === "system" ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light") : preference;
        setTheme(next);
        document.documentElement.dataset.theme = next;
        try {
            localStorage.setItem("repclub-theme", preference);
        }
        catch { }
    }
    function openSession(session: Session) { setSelectedSession(session); open("details"); }
    function openMember(member: RankedMember) { setSelectedMember(member); open("member"); }
    function openDay(date: string) { setSelectedDate(date); open("day"); }
    function logForDay(date:string){openWorkout({mode:"manual",date});}
    function editScan(session:Session){openWorkout({mode:"edit",session});}
    function finishManually(session:Session){openWorkout({mode:"edit",session,manualFallback:true});}
    function repeatWorkout(session:Session){openWorkout({mode:"manual",repeat:session});}
    const rangeStart = workoutRange === "7" ? shiftDay(dayKey(), -6) : workoutRange === "30" ? shiftDay(dayKey(), -29) : workoutRange === "week" ? historyWeek : undefined;
    const feedPage=useWorkoutPage(data,demo,{scope:feedScope==="mine"?"mine":"feed",status:feedFilter,active:tab==="overview"});
    const journalPage=useWorkoutPage(data,demo,{scope:"mine",status:workoutFilter,query,from:rangeStart,to:workoutRange==="week"?shiftDay(historyWeek,6):undefined,active:tab==="workouts"});
    const dayPage=useWorkoutPage(data,demo,{scope:"mine",from:selectedDate,to:selectedDate,active:modal==="day"});
    const reviewPage=useWorkoutPage(data,demo,{scope:"reviews",active:tab==="desk"&&admin});
    const feed=feedPage.items,journal=journalPage.items;
    const scopedMembers = (leagueScope === "squad" ? mySquad : data.members);
    const leagueMembers = scopedMembers.map((m, i) => ({ ...m, rank: i === 0 || m.stats.percent !== scopedMembers[i - 1].stats.percent ? i + 1 : scopedMembers.findIndex(p => p.stats.percent === m.stats.percent) + 1 })).filter(m => !query || m.name.toLowerCase().includes(query.toLowerCase().trim()));
    const earned = badges.filter(b => b.earned).length;
    const history = data.activity.history;
    const card = (session: Session) => <WorkoutCard key={session.id} session={session} member={data.members.find(m => m.userId === session.userId)} viewerId={me.userId} busy={busy} onOpen={openSession} onCheer={id => void run({ action: "cheer", id })} onRepeat={repeatWorkout} onMember={openMember}/>;
    const appearanceControl = <div className="appearance-control" aria-label="Appearance">{([{ id: "light", icon: Sun, name: "Light" }, { id: "dark", icon: Moon, name: "Dark" }, { id: "system", icon: Monitor, name: "System" }] as const).map(item => <button key={item.id} type="button" aria-pressed={appearance === item.id} className={appearance === item.id ? "selected" : ""} onClick={() => changeTheme(item.id)}><item.icon size={15}/>{item.name}</button>)}</div>;
    const setupTasks = [
        { id: "goal", label: "Weekly goal", detail: `${stats.goal} days / week`, done: true, action: () => open("plan"), icon: Target },
        { id: "squad", label: "Join or create a squad", detail: squad?.name || "Share workouts with friends", done: !!squad, action: () => open("squad"), icon: Users },
        { id: "workout", label: "Scan your first workout", detail: "Scan in and out at the gym", done: data.activity.hasScanWorkout, action: () => open("scan"), icon: Dumbbell },
        admin
            ? { id: "verifier", label: "Add a gym verifier", detail: "Invite staff and assign verifier access", done: data.members.some(member => member.userId !== me.userId && member.role !== "member"), action: () => { navigate("desk"); }, icon: ShieldCheck }
            : { id: "verified", label: "Verify your first visit", detail: "Ask gym staff to review it", done: stats.total > 0, action: () => { setWorkoutFilter("pending"); navigate("workouts"); }, icon: ShieldCheck },
    ];
    const setupCount = setupTasks.filter(task => task.done).length;
    if (!explore && (!live?.campus || finishingSetup))
        return <Onboarding state={live} theme={theme} busy={busy} error={error} connectionError={loadError} loading={loading} onTheme={() => changeTheme(theme === "dark" ? "light" : "dark")} onSubmit={payload => run(payload, true)} onSquad={payload => run(payload, true)} onFinish={() => { setFinishingSetup(false); setError(""); setTab("overview"); }} onDemo={() => { setExplore(true); setFinishingSetup(false); setError(""); setTab("overview"); }} onRetry={() => { void refresh(); }} onClearError={() => setError("")}/>;
    return <div className="app-shell clubhouse-app">
    <main className="main">
      <header className="club-header">
        <div className="club-header-row"><a className="brand" href="/" aria-label="RepClub home">repclub<span className="brand-dot">.</span></a><div className="club-header-actions"><button className={`btn primary club-mobile-scan ${inlineEditor?"editor-open":""}`} disabled={busy} aria-label={data.activeSession?"Finish workout":"Scan to start"} onClick={beginScan}><ScanLine size={16}/>{data.activeSession?"Finish":"Start"}</button><button className="club-campus" onClick={()=>open("profile")}>{data.campus?.name}<ChevronDown size={14}/></button><Hint label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}><button className="icon-button" aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`} onClick={()=>changeTheme(theme === "dark" ? "light" : "dark")}>{theme === "dark"?<Sun size={19}/>:<Moon size={19}/>}</button></Hint><Hint label="Refresh campus"><button className="icon-button club-refresh" aria-label="Refresh campus" disabled={loading} onClick={()=>void refresh()}><RefreshCw size={18} className={loading?"spin":""}/></button></Hint><Hint label="Rules and privacy"><button className="icon-button club-help" aria-label="Rules and privacy" onClick={()=>open("rules")}><CircleHelp size={19}/></button></Hint><button className="club-profile" aria-label="Open profile" onClick={()=>open("profile")}><Avatar name={me.name}/></button></div></div>
        <nav className="club-nav" aria-label="Main navigation">{nav.filter(item=>item.id!=="desk"||admin).map(item=><button key={item.id} className={tab===item.id?"selected":""} aria-current={tab===item.id?"page":undefined} onClick={()=>navigate(item.id)}>{item.id==="overview"?"Your squad":item.label}{item.id==="desk"&&data.pages.reviews.total>0&&<span>{data.pages.reviews.total}</span>}</button>)}</nav>
      </header>
      <div className="main-content">
        {demo && <div className="demo-banner"><span><span className="demo-indicator"/><strong>Demo mode</strong></span><button onClick={() => live?.campus ? setExplore(false) : startSetup()}>{live?.campus ? "My campus" : "Set up campus"}<ArrowRight size={14}/></button></div>}
        {loadError && <div className="connection-error" role="alert"><CircleHelp size={17}/><span>{loadError}</span><button onClick={() => void refresh()}>Retry</button></div>}
        <div className="page-heading"><div><h1>{tab === "overview" ? squad?.name || "Your squad" : tab === "workouts" ? "Workouts" : tab === "league" ? "Leaderboard" : tab === "rewards" ? "Achievements" : "Gym desk"}</h1>{tab==="overview"&&<p>{squad?`${mySquad.length} members · ${data.campus?.name}`:data.campus?.name}</p>}</div><div className="page-heading-actions">{tab==="workouts"&&<button className={`btn ${data.activeSession?"secondary":"primary"}`} disabled={busy} onClick={()=>open("workout")}><Plus size={16}/> Log workout</button>}<span className="page-date"><CalendarDays size={15}/>{dateLabel(data.week, true)} – {dateLabel(shiftDay(data.week, 6), true)}</span></div></div>

        {tab!=="overview" && data.activeSession && <WorkoutSession active={data.activeSession} serverNow={data.serverNow} receivedAt={clockReceivedAt} busy={busy} onScan={beginScan} onManual={()=>open("workout")} onDetails={editScan} onCancel={()=>finishManually(data.activeSession!)}/>}
        {tab === "overview" && <div className={`clubhouse-layout ${inlineEditor?"editing":""}`}>
          <div className="clubhouse-community">
            <section className="club-week" aria-label="Weekly goal"><div className="club-week-heading"><div><h2>{stats.count>=stats.goal?"Weekly goal met":stats.goal-stats.count===1?"One visit to your goal":`${stats.goal-stats.count} visits to your goal`}</h2><p>{stats.count} of {stats.goal} days verified{pending>0?` · ${pending} pending`:""}</p></div><button className="icon-button" aria-label="Edit weekly goal" onClick={()=>open("plan")}><Settings2 size={18}/></button></div>
              <div className="week-calendar">{days.map((day,index)=>{const date=shiftDay(data.week,index),visits=data.activity.attendance.filter(s=>s.date===date),done=visits.some(s=>s.status==="verified"),waiting=!done&&visits.some(s=>s.status==="pending");return <button key={day} className={`calendar-day ${done?"complete":waiting?"waiting":planned.includes(index)?"planned":"rest"} ${date===dayKey()?"today":""}`} aria-label={`${day} ${dateLabel(date,true)}, ${done?"verified visit":waiting?"awaiting review":planned.includes(index)?"planned gym day":"rest day"}`} onClick={()=>openDay(date)}><small>{day}</small><span>{done?<Check size={16}/>:waiting?<Clock3 size={16}/>:Number(date.slice(-2))}</span></button>;})}</div>
              <div className="club-week-footer"><span>Targets lock after your first scan.</span><button className="text-button" onClick={()=>open("plan")}>Edit plan</button></div>
            </section>
            <section className="club-activity" aria-label="Squad activity"><div className="section-heading"><h2>{feedScope==="mine"?"Your activity":"Squad activity"}</h2><button className="text-button" onClick={()=>open(squad?"invite":"squad")}><Users size={15}/>{squad?"Invite friends":"Find your squad"}</button></div>
              <div className="feed-controls"><div className="under-tabs" aria-label="Activity feed"><button className={feedScope==="squad"?"selected":""} aria-pressed={feedScope==="squad"} onClick={()=>{setFeedScope("squad");setFeedLimit(5);}}>My squad</button><button className={feedScope==="mine"?"selected":""} aria-pressed={feedScope==="mine"} onClick={()=>{setFeedScope("mine");setFeedLimit(5);}}>My activity</button></div><CompactSelect label="Filter feed by attendance status" value={feedFilter} onChange={setFeedFilter} items={[{value:"all",label:"All visits"},{value:"verified",label:"Verified"},{value:"pending",label:"Pending"},{value:"manual",label:"Manual logs"},{value:"unqualified",label:"History only"}]}/></div>
              {feed.length?<div className="workout-feed">{feed.slice(0,feedLimit).map(card)}{(feed.length>feedLimit||feedPage.nextCursor)&&<button className="btn secondary load-more" disabled={feedPage.loading} onClick={()=>{setFeedLimit(n=>n+5);if(feed.length<=feedLimit)void feedPage.loadMore();}}>{feedPage.loading?<Loader2 size={16} className="spin"/>:null} Show more workouts<ChevronDown size={16}/></button>}</div>:feedPage.loading?<div className="feed-skeleton" role="status" aria-label="Loading workouts"><span/><span/><span/></div>:<Empty icon={<Dumbbell size={22}/>} title={feedFilter!=="all"?"No matching visits":squad?"Your squad starts here":"A place for your gym friends"} text={feedFilter!=="all"?"Try another attendance filter.":squad?"Finished workouts appear here for your squad.":"Join a squad to share workouts and build a routine together."}><button className="btn secondary" onClick={()=>open(squad?"scan":"squad")}>{squad?"Start a workout":"Join or create a squad"}<ArrowRight size={15}/></button></Empty>}
              {feedPage.error&&<WorkoutPageControls page={feedPage}/>}</section>
          </div>
          <aside className="clubhouse-personal">
            <section className="clubhouse-workout" aria-label="Your workout">
              <div className="club-workout-heading"><h2>{inlineEditor?editor.mode==="edit"?"Your workout":editor.mode==="manual-finish"?"Save without checkout":"Log a workout":"Your workout"}</h2>{inlineEditor&&<button className="icon-button" aria-label="Close workout editor" disabled={busy} onClick={()=>setInlineEditor(false)}><X size={18}/></button>}</div>
              {(!inlineEditor||editor.mode==="edit")&&<WorkoutSession active={data.activeSession} serverNow={data.serverNow} receivedAt={clockReceivedAt} busy={busy} embedded detailsOpen={inlineEditor} onScan={beginScan} onManual={()=>open("workout")} onDetails={editScan} onCancel={()=>{if(data.activeSession)finishManually(data.activeSession);}}/>}
              {inlineEditor&&<WorkoutEditor key={`${me.userId}:${editor.mode}:${editor.session?.id??editor.repeat?.id??editor.date??"new"}`} config={editor} userId={me.userId} campusId={me.campusId} history={data.mine} busy={busy} error={error} embedded autoFocus={editorAutoFocus} formRef={workoutForm} canCheckout={!!data.activeSession&&editor.session?.id===data.activeSession.id} onSave={run} onCheckout={checkoutSession} onClose={()=>setInlineEditor(false)}/>}
            </section>
            {squad&&<section className="club-squad-progress"><div className="section-heading"><h2>Squad progress</h2><button className="text-button" onClick={()=>{setLeagueScope("squad");navigate("league");}}>League<ArrowRight size={14}/></button></div><Standings members={mySquad.slice(0,4)} meId={me.userId} compact onSelect={openMember}/><div className="club-squad-links"><button className="text-button" onClick={()=>open("squad")}>Manage squad</button><button className="text-button" onClick={()=>open("invite")}>Invite friends</button></div></section>}
            {!demo&&setupCount<setupTasks.length&&<details className="club-setup"><summary>Finish setup <span>{setupCount}/{setupTasks.length}</span></summary><div className="club-setup-tasks">{setupTasks.filter(task=>!task.done).map(task=><button key={task.id} onClick={task.action}><span><strong>{task.label}</strong><small>{task.detail}</small></span><ChevronRight size={16}/></button>)}</div></details>}
          </aside>
        </div>}

        {tab === "workouts" && <><div className="journal-metrics"><span><Dumbbell size={20}/><span><strong>{data.pages.mine.total}</strong><small>Logged workouts</small></span></span><span><ShieldCheck size={20}/><span><strong>{stats.total}</strong><small>Qualified gym days</small></span></span><span><Clock3 size={20}/><span><strong>{pending}</strong><small>Awaiting review</small></span></span><button className="text-button" onClick={download}><ArrowDownToLine size={16}/> Export records</button></div><div className="journal-layout"><div><div className="journal-toolbar"><label className="search-field"><Search size={17}/><input aria-label="Search your workouts" placeholder="Search workouts or exercises" value={query} onChange={e => setQuery(e.target.value)}/>{query && <button aria-label="Clear workout search" onClick={() => setQuery("")}><X size={14}/></button>}</label><CompactSelect label="Workout date range" value={workoutRange} onChange={setWorkoutRange} items={[{value:"all",label:"All time"},{value:"7",label:"Last 7 days"},{value:"30",label:"Last 30 days"},...(workoutRange==="week"?[{value:"week",label:`${dateLabel(historyWeek,true)} week`}]:[])]}/></div><div className="under-tabs journal-tabs">{["all", "verified", "pending", "manual", "unqualified", "declined"].map(filter => <button key={filter} className={workoutFilter === filter ? "selected" : ""} onClick={() => setWorkoutFilter(filter)}>{filter === "all" ? "All workouts" : filter === "declined" ? "Needs attention" : filter === "verified" ? "Verified" : filter === "manual" ? "Manual" : filter === "unqualified" ? "History only" : "Pending"}</button>)}</div><div className="workout-feed">{journal.length ? journal.map(card) : <section className="card"><Empty icon={<Search size={24}/>} title={journalPage.loading?"Loading workouts":"No matching workouts"} text="Try a different search, date range, or attendance filter."><button className="btn secondary" onClick={() => { setQuery(""); setWorkoutFilter("all"); setWorkoutRange("all"); }}>Reset filters</button></Empty></section>}<WorkoutPageControls page={journalPage}/></div></div><aside className="journal-aside"><section className="card history-card"><div className="section-heading"><h2>Weekly progress</h2><BarChart3 size={18}/></div><p className="section-caption">Select a week to filter workouts.</p><div className="history-chart">{history.map(item => <button key={item.week} aria-label={`View week of ${dateLabel(item.week, true)}, ${item.percent}% complete`} className={workoutRange === "week" && historyWeek === item.week ? "selected" : ""} onClick={() => { setHistoryWeek(item.week); setWorkoutRange("week"); }}><span className="history-percent">{item.percent}%</span><span className="history-track"><span style={{ height: `${Math.max(item.percent, 3)}%` }}/></span><small>{dateLabel(item.week, true)}</small></button>)}</div></section><section className="card attendance-card"><div className="section-heading"><h2>Your last 28 days</h2><CalendarDays size={18}/></div><div className="attendance-grid">{Array.from({ length: 28 }, (_, index) => { const date = shiftDay(dayKey(), index - 27), visits=data.activity.attendance.filter(s=>s.date===date&&s.status!=="declined"&&s.status!=="recording"),status=visits.some(s=>s.status==="verified")?"verified":visits.some(s=>s.status==="pending")?"pending":visits.length?"manual":""; return <button key={date} title={`${dateLabel(date)}: ${status || "no logged visit"}`} aria-label={`${dateLabel(date)}: ${status || "no logged visit"}`} className={status} onClick={() => openDay(date)}>{Number(date.slice(-2))}</button>; })}</div><div className="calendar-legend"><span className="legend-dot verified-dot"/> Qualified<span className="legend-dot pending-dot"/> Pending</div></section>
</aside></div></>}

        {tab === "league" && <><div className="league-summary"><span className="league-icon"><Trophy size={25}/></span><div><strong>Weekly ranking</strong><p>Ranked by goal completion. Ties share a rank.</p></div><button className="text-button" onClick={() => open("rules")}>Scoring rules <CircleHelp size={15}/></button></div><div className="toolbar"><div className="segmented"><button className={leagueScope === "campus" ? "selected" : ""} onClick={() => setLeagueScope("campus")}>Campus league <span>{data.members.length}</span></button><button className={leagueScope === "squad" ? "selected" : ""} onClick={() => setLeagueScope("squad")}>My squad <span>{mySquad.length}</span></button></div><label className="search-field league-search"><Search size={16}/><input aria-label="Search league members" placeholder="Find a member" value={query} onChange={e => setQuery(e.target.value)}/></label></div><section className="card league-table"><div className="league-table-head"><span>RANK / MEMBER</span><span>WEEKLY PROGRESS</span><span>GOAL MET</span></div>{leagueMembers.length ? <Standings members={leagueMembers} meId={me.userId} onSelect={openMember}/> : <Empty icon={<Users size={24}/>} title={query ? "No members found" : "No squad yet"} text={query ? "Try another name." : "Create a squad or join one with a friend’s code."}>{!query && <button className="btn primary" onClick={() => open("squad")}>Your squad <ArrowRight size={15}/></button>}</Empty>}</section></>}

        {tab === "rewards" && <><div className="achievement-summary"><span className="achievement-big"><Award size={30}/></span><div><h2>{earned} of {badges.length} achievements unlocked</h2></div><span className="xp-total"><Zap size={20}/>{stats.xp}<small>XP</small></span></div><div className="toolbar"><div className="under-tabs">{[{ id: "all", label: "All achievements" }, { id: "earned", label: "Unlocked" }, { id: "progress", label: "In progress" }].map(item => <button key={item.id} className={rewardFilter === item.id ? "selected" : ""} onClick={() => setRewardFilter(item.id)}>{item.label}</button>)}</div><span className="subtle-label">XP has no cash value</span></div><div className="badges-grid">{badges.map((badge, index) => ({ badge, index })).filter(({ badge }) => rewardFilter === "all" || (rewardFilter === "earned" ? badge.earned : !badge.earned)).map(({ badge, index }) => { const Icon = [Dumbbell, CheckCheck, Flame, Trophy, RefreshCw][index]; return <m.button whileHover={{ y: -3 }} whileTap={{ scale: .98 }} key={badge.id} className={`card badge-card ${badge.earned ? "earned" : "locked"}`} onClick={() => { setSelectedBadge(index); open("achievement"); }}><span className="badge-card-top"><span className={`badge-art badge-${index}`}><Icon size={30}/></span><span className="badge-state">{badge.earned ? <><Check size={12}/> UNLOCKED</> : <LockKeyhole size={14}/>}</span></span><h2>{badge.name}</h2><p>{badge.detail}</p><div className="progress"><span style={{ width: `${badge.earned ? 100 : badge.progress / badge.target * 100}%` }}/></div><span className="badge-progress-label">{badge.earned ? "Unlocked" : `${badge.progress} / ${badge.target} complete`}<ArrowUpRight size={15}/></span></m.button>; })}</div>{!badges.some(badge => rewardFilter === "all" || (rewardFilter === "earned" ? badge.earned : !badge.earned)) && <section className="card"><Empty icon={<Award size={26}/>} title={rewardFilter === "earned" ? "No achievements yet" : "All achievements unlocked"} text={rewardFilter === "earned" ? "Your first scan-timed, staff-verified visit unlocks First visit." : ""}/></section>}</>}

        {tab === "desk" && admin && <><div className="desk-grid"><GymQr code={data.deskCode} busy={busy} onRefresh={() => run({ action: "desk" })}/><section className="card pilot-summary"><div className="section-heading"><h2>Campus snapshot</h2><Activity size={19}/></div><div><span>Participating members</span><strong>{data.members.length}</strong></div><div><span>Met their weekly goal</span><strong>{data.members.filter(m => m.stats.percent === 100).length}</strong></div><div><span>Awaiting review</span><strong>{data.pages.reviews.total}</strong></div><button className="panel-link" onClick={() => open("invite")}>Invite participants <ArrowRight size={15}/></button></section></div><div className="section-heading desk-section"><div><h2>Attendance review <span className="inline-count">{data.pages.reviews.total}</span></h2><p>Confirm using gym records or independent observation.</p></div></div><section className="card review-list">{data.pages.reviews.total ? reviewPage.items.map(session => <div className="review-row" key={session.id}><Avatar name={data.members.find(m => m.userId === session.userId)?.name || "Member"}/><div><strong>{data.members.find(m => m.userId === session.userId)?.name}</strong><span>{session.title}</span><small>{dateLabel(session.date)} · {session.duration} min scan timed · Staff review needed</small></div><button className="btn secondary" disabled={session.userId === me.userId} onClick={() => { setReview(session); setConfirmAttendance(false); open("review"); }}>{session.userId === me.userId ? "Another verifier needed" : "Review"}<ChevronRight size={15}/></button></div>) : <Empty icon={<CheckCheck size={25}/>} title="No pending visits" text="New submissions appear here."/>}</section><WorkoutPageControls page={reviewPage}/><div className="section-heading desk-section"><div><h2>Trusted verifiers</h2><p>Only the campus owner can appoint verifiers.</p></div></div><section className="card verifier-list">{data.members.map((member, index) => <div className="verifier-row" key={member.userId}><Avatar name={member.name} index={index}/><div><strong>{member.name}</strong><small>{member.role === "owner" ? "Campus owner" : member.role === "staff" ? "Gym verifier" : "Participant"}</small></div>{me.role === "owner" && member.role !== "owner" && <button className="btn secondary" disabled={busy} onClick={() => void run({ action: "role", id: member.userId, role: member.role === "staff" ? "member" : "staff" })}>{member.role === "staff" ? "Remove verifier" : "Make verifier"}</button>}</div>)}</section></>}

      </div>
    </main>
    <nav className="bottom-nav" aria-label="Mobile navigation">{nav.filter(item => item.id !== "desk" || admin).map(item => <button key={item.id} aria-current={tab === item.id ? "page" : undefined} className={tab === item.id ? "active" : ""} onClick={() => navigate(item.id)}><item.icon size={20}/><span>{item.id === "overview" ? "Home" : item.id === "workouts" ? "Workouts" : item.id === "league" ? "League" : item.id === "rewards" ? "Awards" : "Desk"}</span></button>)}</nav>
    <dialog ref={dialog} className="modal" onCancel={e => {if(busy)e.preventDefault();else setModal(null);}} onClick={e => {
            if (!busy && e.target === e.currentTarget)
                setModal(null);
        }} aria-labelledby="modal-title"><m.div key={modal} className="modal-inner" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .18 }}><button className="modal-close icon-button" aria-label="Close dialog" disabled={busy} onClick={() => setModal(null)}><X size={20}/></button>

    {modal === "details" && selectedSession && <>
      <div className="detail-top"><Pill status={selectedSession.status}/></div>
      <h2 id="modal-title">{selectedSession.title}</h2>
      <p className="modal-intro">{data.members.find(member => member.userId === selectedSession.userId)?.name} · {dateLabel(selectedSession.date)} · {selectedSession.type}</p>
      <div className="detail-metrics"><span><strong>{selectedSession.duration}<small>min</small></strong>{selectedSession.timingSource === "scan" ? "Scan duration" : "Manual duration"}</span><span><strong>{exerciseList(selectedSession).length}</strong>Exercises</span><span><strong>{loggedVolume(selectedSession).toLocaleString("en-IN")}<small>kg</small></strong>Logged volume</span></div>
      {selectedSession.notes && <p className="detail-note">{selectedSession.notes}</p>}
      {exerciseList(selectedSession).length > 0 && <div className="detail-exercises"><div className="detail-exercise-head"><span>EXERCISE</span><span>SETS × REPS</span><span>WEIGHT</span></div>{exerciseList(selectedSession).map((exercise, index) => <div key={index}><strong>{exercise.name}</strong><span>{exercise.sets} × {exercise.reps}</span><span>{exercise.weight} kg</span></div>)}</div>}
      <StatusTimeline session={selectedSession}/><ScanTimes session={selectedSession}/>
      <div className="info-strip"><ShieldCheck size={18}/><span>{selectedSession.status === "verified" ? "Attendance verified. " : "Attendance not yet verified. "}Workout details are self-reported.</span></div>
      {selectedSession.reviewNote && <p className="review-note">Staff note: {selectedSession.reviewNote}</p>}
      {selectedSession.userId === me.userId && selectedSession.timingSource === "scan" && selectedSession.status === "pending" && <button className="btn secondary full" onClick={() => editScan(selectedSession)}>Edit workout details</button>}
      {selectedSession.userId === me.userId && <button className="btn primary full" onClick={() => repeatWorkout(selectedSession)}><RefreshCw size={16}/> Repeat this workout</button>}
    </>}
    {modal === "day" && <><h2 id="modal-title">{dateLabel(selectedDate)}</h2><p className="modal-intro">Your gym attendance for this day.</p>{dayPage.items.length ? dayPage.items.map(session => <button className="day-session" key={session.id} onClick={() => openSession(session)}><span><strong>{session.title}</strong><small>{session.duration} min · {session.type}</small></span><Pill status={session.status}/><ChevronRight size={16}/></button>) : <div className="day-empty"><Leaf size={27}/><h3>{selectedDate > dayKey() ? "Planned day" : "No workout logged"}</h3><p>{selectedDate > dayKey() ? "Edit your weekly plan to schedule this day." : "Log a recent visit or edit your plan."}</p></div>}<WorkoutPageControls page={dayPage}/><button className="btn secondary full" onClick={() => open("plan")}><Settings2 size={16}/> Edit weekly plan</button>{selectedDate >= shiftDay(dayKey(), -6) && selectedDate <= dayKey() && !dayPage.items.some(session => session.status !== "declined") && <button className="btn primary full" onClick={() => logForDay(selectedDate)}><Plus size={16}/> Log a workout</button>}</>}
    {modal === "member" && selectedMember && <><div className="member-detail-heading"><Avatar name={selectedMember.name} size="large"/><div><h2 id="modal-title">{selectedMember.userId === me.userId ? "Your progress" : selectedMember.name}</h2><p>{data.campus?.name} · {data.squads.find(item => item.id === selectedMember.squadId)?.name || "Campus participant"}</p></div></div><div className="member-commitment"><div><strong>Weekly goal</strong><span>{selectedMember.stats.count} / {selectedMember.stats.goal} visits</span></div><div className="progress"><span style={{ width: `${selectedMember.stats.percent}%` }}/></div><p>{selectedMember.stats.percent}% of this week’s goal completed</p></div><div className="detail-metrics"><span><strong>{selectedMember.stats.total}</strong>Verified days</span><span><strong>{selectedMember.stats.xp}</strong>Pilot XP</span><span><strong>{selectedMember.stats.goalWeeks}</strong>Goals met</span></div><div className="info-strip"><ShieldCheck size={18}/><span>Only scan-timed, staff-verified visits count toward your weekly goal.</span></div>{selectedMember.userId === me.userId && <button className="btn primary full" onClick={() => { setModal(null); navigate("workouts"); }}>View my workouts <ArrowRight size={16}/></button>}</>}
    {modal === "achievement" && <><span className={`achievement-detail-icon ${badges[selectedBadge].earned ? "earned" : ""}`}><Award size={45}/></span><h2 id="modal-title">{badges[selectedBadge].name}</h2><p className="modal-intro">{badges[selectedBadge].detail}. Both gym scans and staff verification are required.</p><div className="progress achievement-progress"><span style={{ width: `${badges[selectedBadge].earned ? 100 : badges[selectedBadge].progress / badges[selectedBadge].target * 100}%` }}/></div><p className="achievement-progress-text">{badges[selectedBadge].earned ? "Unlocked" : `${badges[selectedBadge].progress} of ${badges[selectedBadge].target} complete`}</p><button className="btn primary full" onClick={() => open("plan")}>Edit weekly goal <ArrowRight size={16}/></button></>}
    {modal === "scan" && <><h2 id="modal-title">{scanTarget ? "Scan to finish" : "Scan to start"}</h2><p className="modal-intro">Scan the current QR displayed at your gym. Rewards require both scans, 5–240 minutes, and staff review.</p>{scanTarget && <div className="info-strip"><Clock3 size={18}/><span>Finishing {scanTarget.title}. Duration is recorded automatically.</span></div>}<QrScanner busy={busy} demoCode={demo ? data.deskCode?.code : undefined} onScan={async (code) => { if (await run(scanTarget ? { action: "scanFinish", id: scanTarget.id, code } : { action: "scanStart", code })) {
        setModal(null);if(scanTarget)setInlineEditor(false);} }}/>{error && <p className="form-error" role="alert">{error}</p>}<button className="text-button full" disabled={busy} onClick={() => scanTarget?finishManually(scanTarget):open("workout")}>{scanTarget?"Save without checkout":"Log manually without rewards"}</button></>}

    {modal === "plan" && <><h2 id="modal-title">Weekly goal</h2><p className="modal-intro">Your target locks after your first scan each week. Planned days can change.</p><form onSubmit={e => void submit(e, "plan")}>{goalPicker}{error && <p className="form-error" role="alert">{error}</p>}<button className="btn primary full" disabled={busy}>Save my commitment <Check size={16}/></button></form></>}
    {modal === "squad" && <><h2 id="modal-title">Your squad</h2><p className="modal-intro">Switching squads changes who can see your workouts.</p><div className="segmented modal-tabs"><button className={squadMode === "createSquad" ? "selected" : ""} onClick={() => { setSquadMode("createSquad"); setError(""); }}>Create a squad</button><button className={squadMode === "joinSquad" ? "selected" : ""} onClick={() => { setSquadMode("joinSquad"); setError(""); }}>Join with a code</button></div><form onSubmit={e => void submit(e, squadMode)} key={squadMode}>{squadMode === "createSquad" ? <label>Squad name<input name="name" minLength={2} maxLength={50} required placeholder="e.g. The 6 PM Club"/></label> : <label>Squad invite code<input name="code" minLength={6} maxLength={12} required defaultValue={inviteCode} placeholder={demo ? "Try REPS2026" : "Enter your friend's code"} className="code-input"/></label>}{error && <p className="form-error" role="alert">{error}</p>}<button className="btn primary full" disabled={busy}>{squadMode === "createSquad" ? "Create my squad" : "Join the squad"}<ArrowRight size={16}/></button></form></>}
    {modal === "invite" && <><h2 id="modal-title">Invite members</h2><p className="modal-intro">Invite a friend with a link or code.</p>{squad?.inviteCode ? <div className="invite-box"><span>{squad.name.toUpperCase()} · SQUAD INVITE</span><strong>{squad.inviteCode}</strong><button className="btn secondary" onClick={() => void copy(squad.inviteCode!)}><Copy size={15}/> Copy squad code</button><button className="btn primary" onClick={()=>void copy(`${window.location.origin}/?invite=${squad.inviteCode}`)}><Copy size={15}/> Copy invite link</button></div> : <button className="btn secondary full" onClick={() => open("squad")}>Create a squad to invite friends</button>}{admin && data.campus?.inviteCode && <div className="invite-box secondary-invite"><span>{data.campus.name.toUpperCase()} · CAMPUS INVITE</span><strong>{data.campus.inviteCode}</strong><button className="text-button" onClick={() => void copy(data.campus!.inviteCode!)}><Copy size={14}/> Copy campus code</button><button className="btn secondary" onClick={()=>void copy(`${window.location.origin}/?invite=${data.campus!.inviteCode}`)}><Copy size={15}/> Copy invite link</button></div>}<p className="fine-print invite-note">{demo ? "Demo codes only." : "Members need access to this private site before using a code."}</p></>}
    {modal === "review" && review && <><h2 id="modal-title">Confirm attendance.</h2><p className="modal-intro">{data.members.find(m => m.userId === review.userId)?.name} · {dateLabel(review.date)}<br />{review.title} · {review.duration} minutes scan timed</p><div className="info-strip"><ShieldCheck size={18}/><span>Both gym scans are recorded. Independently confirm attendance before approving.</span></div><ScanTimes session={review}/><form onSubmit={async (e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                if (await run({ action: "review", id: review.id, decision: "verified", confirmed: confirmAttendance, note: String(f.get("note") || "Attendance independently confirmed.") }))
                    setModal(null);
            }}><label className="checkbox-label"><input type="checkbox" checked={confirmAttendance} onChange={e => setConfirmAttendance(e.target.checked)}/><span>I independently confirmed this member’s gym attendance.</span></label><label>Review note<input name="note" maxLength={250} placeholder="Optional for approval; required if declining"/></label>{error && <p className="form-error" role="alert">{error}</p>}<div className="form-row"><button className="btn secondary" type="button" disabled={busy} onClick={async (e) => {
                const form = e.currentTarget.closest("form")!;
                const note = String(new FormData(form).get("note") || "");
                if (await run({ action: "review", id: review.id, decision: "declined", confirmed: false, note }))
                    setModal(null);
            }}>Needs attention</button><button className="btn primary" disabled={busy || !confirmAttendance}><Check size={16}/> Verify attendance</button></div></form></>}
    {modal === "rules" && <><h2 id="modal-title">Rules & privacy</h2><ol className="rules"><li><strong>Scoring</strong><p>One scan-timed, staff-verified visit per day earns 10 XP, capped at your weekly target. Manual logs earn no league points or achievements. Rankings use goal completion; ties share a rank.</p></li><li><strong>Attendance</strong><p>Gym staff review visits. You cannot verify your own attendance. Scan duration comes from server timestamps. Exercise details are self-reported.</p></li><li><strong>Weekly goals</strong><p>Choose 2–5 days. The target locks after your first scan. Weeks reset Monday in India time.</p></li><li><strong>Sharing</strong><p>Campus members see your name and goal progress. Your current squad and authorized staff can see workout details.</p></li><li><strong>Rewards</strong><p>XP and badges have no cash value.</p></li></ol><button className="btn primary full" onClick={() => setModal(null)}>Got it <Check size={16}/></button></>}
    {modal === "profile" && <><h2 id="modal-title">Profile</h2><p className="modal-intro">{data.campus?.name} · {data.campus?.gymName}</p><div className="profile-card"><Avatar name={me.name}/><div><strong>{me.name}</strong><span>{demo ? "Sample participant" : me.role === "owner" ? "Campus owner" : me.role === "staff" ? "Gym verifier" : "Campus participant"}</span></div></div><div className="profile-appearance"><label className="field-label">Appearance</label>{appearanceControl}</div><button className="btn secondary full" onClick={() => open("plan")}><CalendarDays size={17}/> Edit weekly goal</button><button className="btn secondary full" onClick={()=>open("rules")}><CircleHelp size={17}/> Rules and privacy</button><button className="btn secondary full" onClick={startSetup}><CheckCheck size={17}/> Setup guide</button><button className="btn secondary full" onClick={download}><ArrowDownToLine size={17}/> Export workouts</button><button className="btn secondary full" onClick={() => { setExplore(!demo); setFinishingSetup(false); setModal(null); }}>{demo ? live?.campus ? "Back to campus" : "Back to setup" : "Try demo"}<ArrowRight size={16}/></button>{live?.user && <a className="text-button signout" href="/signout-with-chatgpt?return_to=/" target="_top" onClick={()=>clearWorkoutDrafts(live.user!.userId)}><LogOut size={15}/> Sign out</a>}</>}
    </m.div></dialog>
  </div>;
}
