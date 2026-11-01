"use client";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { BarChart3, Monitor, Moon, Search, SlidersHorizontal, Sun, Activity, ArrowDownToLine, ArrowRight, ArrowUpRight, Award, CalendarDays, Check, CheckCheck, ChevronDown, ChevronRight, CircleHelp, Clock3, Copy, Dumbbell, Flame, LayoutDashboard, Leaf, Loader2, LockKeyhole, LogOut, Menu, Plus, RefreshCw, Settings2, ShieldCheck, Target, Trophy, Users, X, Zap } from "lucide-react";
import { badgeList, dayKey, shiftDay, weekKey, statsFor, type AppState, type Session, type RankedMember } from "../lib/league";
import { makeDemo, demoState } from "../lib/demo";
import Onboarding from "./onboarding";
import { AnimatePresence } from "motion/react";
import * as m from "motion/react-m";
import { toast as notify } from "sonner";
import { DayPicker, GoalPicker, Hint, celebrate } from "./experience";
import { newMilestone } from "../lib/league";
import { Avatar, Pill, Empty, Standings, WorkoutCard, exerciseList, loggedVolume } from "./ui";
type Tab = "overview" | "workouts" | "league" | "rewards" | "desk";
type Modal = "workout" | "plan" | "squad" | "invite" | "rules" | "profile" | "review" | "details" | "day" | "member" | "achievement" | null;
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
    const [tab, setTab] = useState<Tab>("overview"), [modal, setModal] = useState<Modal>(null), [mobile, setMobile] = useState(false);
    const [live, setLive] = useState<AppState | null>(initialState), [sample, setSample] = useState(makeDemo), [explore, setExplore] = useState(false);
    const [loading, setLoading] = useState(!initialState && !initialError), [loadError, setLoadError] = useState(initialError), [busy, setBusy] = useState(false), [error, setError] = useState("");
    const [finishingSetup, setFinishingSetup] = useState(false);
    const [squadMode, setSquadMode] = useState("createSquad"), [review, setReview] = useState<Session | null>(null);
    const [workoutFilter, setWorkoutFilter] = useState("all"), [leagueScope, setLeagueScope] = useState("campus");
    const [selectedDays, setSelectedDays] = useState<number[]>([0, 2, 4]), [selectedGoal, setSelectedGoal] = useState(3);
    const [exerciseRows, setExerciseRows] = useState<{
        name: string;
        sets: number;
        reps: number;
        weight: number;
    }[]>([]);
    const [confirmAttendance, setConfirmAttendance] = useState(false), [tick, setTick] = useState(0);
    const [theme, setTheme] = useState<"dark" | "light">("dark");
    const [feedScope, setFeedScope] = useState("squad"), [feedFilter, setFeedFilter] = useState("all");
    const [query, setQuery] = useState(""), [workoutRange, setWorkoutRange] = useState("all"), [rewardFilter, setRewardFilter] = useState("all");
    const [selectedSession, setSelectedSession] = useState<Session | null>(null), [selectedDate, setSelectedDate] = useState(dayKey());
    const [selectedMember, setSelectedMember] = useState<RankedMember | null>(null), [selectedBadge, setSelectedBadge] = useState(0);
    const [workoutDraft, setWorkoutDraft] = useState<Session | null>(null);
    const [workoutDate, setWorkoutDate] = useState(dayKey());
    const dialog = useRef<HTMLDialogElement>(null), progressSnapshot = useRef(initialState);
    const demo = !live?.campus || explore, data = useMemo(() => demo ? demoState(sample) : live!, [demo, sample, live]);
    const me = data.me!, stats = me.stats, squad = data.squads.find(s => s.id === me.squadId), mySquad = data.members.filter(m => me.squadId && m.squadId === me.squadId);
    const currentPlan = data.plans.find(p => p.week === data.week), planned: number[] = JSON.parse(currentPlan?.days ?? me.days);
    const badges = badgeList(stats), pending = data.mine.filter(s => s.status === "pending").length;
    const admin = me.role !== "member";
    async function refresh() {
        setLoading(true);
        setLoadError("");
        try {
            const res = await fetch("/api/state", { cache: "no-store" });
            const json = await res.json() as AppState & {
                error?: string;
            };
            if (!res.ok)
                throw new Error(json.error);
            const milestone = newMilestone(progressSnapshot.current, json);
            progressSnapshot.current = json;
            setLive(json);
            if (milestone) { notify.success(milestone, { duration: 5000 }); void celebrate(); }
            return json as AppState;
        }
        catch (e) {
            setLoadError(e instanceof Error ? e.message : "Connection unavailable.");
            return null;
        }
        finally {
            setLoading(false);
        }
    }
    useEffect(() => {
        if (!initialState)
            void refresh();
        const timer = setInterval(() => setTick(current => current + 1), 30000);
        return () => clearInterval(timer);
    }, []);
    useEffect(() => {
        if (modal) {
            setError("");
            dialog.current?.showModal();
        }
        else
            dialog.current?.close();
    }, [modal]);
    function message(text: string, tone: "success" | "error" = "success") { notify[tone](text); }
    function startSetup() { setError(""); setModal(null); setExplore(false); setFinishingSetup(!!live?.campus); setMobile(false); }
    function open(m: Modal) {
        setError("");
        if (m === "plan") {
            setSelectedGoal(stats.goal);
            setSelectedDays(planned);
        }
        if (m === "workout") {
            setExerciseRows([]);
            setWorkoutDraft(null);
            setWorkoutDate(dayKey());
        }
        setModal(m);
    }
    function navigate(t: Tab) { setTab(t); setMobile(false); setQuery(""); window.scrollTo({ top: 0, behavior: "auto" }); }
    async function run(payload: Payload, forceLive = false) {
        if (busy)
            return false;
        setBusy(true);
        setError("");
        try {
            if (demo && !forceLive) {
                const d = structuredClone(sample), action = payload.action;
                if (action === "workout") {
                    if (d.sessions.some(s => s.userId === "you" && s.date === payload.date && s.status !== "declined"))
                        throw new Error("You already logged a workout for this day. Try another date in the last seven days.");
                    if (payload.code && payload.code !== d.deskCode.code)
                        throw new Error("The sample gym code is 654321. You can also leave it blank.");
                    d.sessions.push({ ...payload, id: crypto.randomUUID(), campusId: d.campus.id, userId: "you", exercises: JSON.stringify(payload.exercises), status: "pending", deskSupported: payload.code ? 1 : 0, createdAt: Date.now(), reviewedBy: null, reviewedAt: null, reviewNote: null, cheers: 0, cheered: false } as unknown as Session);
                }
                if (action === "plan") {
                    if (d.sessions.some(s => s.userId === "you" && weekKey(s.date) === data.week) && payload.goal !== me.goal)
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
                    d.deskCode = { code: "654321", expiresAt: Date.now() + 15 * 60000 };
                if (action === "role")
                    d.members.find(m => m.userId === payload.id)!.role = String(payload.role);
                setSample(d);
                if (payload.action !== "cheer") message("Demo updated.");
            }
            else {
                const res = await fetch("/api/actions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
                const json = await res.json() as {
                    error?: string;
                };
                if (!res.ok)
                    throw new Error(json.error || "Something went wrong.");
                const updated = await refresh();
                if (!updated)
                    throw new Error("Saved, but we couldn't refresh. Retry before submitting again.");
                if (forceLive) {
                    setExplore(false);
                    setTab("overview");
                    if (payload.action === "createCampus" || payload.action === "joinCampus")
                        setFinishingSetup(true);
                }
                if (payload.action !== "cheer") message(payload.action === "workout" ? "Workout submitted." : "Saved.");
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
        if (action === "workout")
            payload = { action, title: get("title"), type: get("type"), date: get("date"), duration: Number(get("duration")), notes: get("notes"), code: get("code"), exercises: exerciseRows };
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
    function download() { const blob = new Blob([JSON.stringify({ member: me, workouts: data.mine, plans: data.plans }, null, 2)], { type: "application/json" }); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = "repclub-my-workouts.json"; a.click(); URL.revokeObjectURL(url); }
    const goalLocked = modal === "plan" && data.mine.some(session => weekKey(session.date) === data.week);
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
            if ((!live?.campus && !explore) || finishingSetup || event.key.toLowerCase() !== "n" || event.metaKey || event.ctrlKey || event.altKey || modal || target?.closest("input,textarea,select,[contenteditable=true]"))
                return;
            event.preventDefault();
            setExerciseRows([]);
            setWorkoutDraft(null);
            setWorkoutDate(dayKey());
            setError("");
            setModal("workout");
        };
        window.addEventListener("keydown", shortcut);
        return () => window.removeEventListener("keydown", shortcut);
    }, [modal, live?.campus, explore, finishingSetup]);
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
    function logForDay(date: string) { setError(""); setWorkoutDraft(null); setWorkoutDate(date); setExerciseRows([]); setModal("workout"); }
    function repeatWorkout(session: Session) {
        setError("");
        setWorkoutDraft(session);
        setWorkoutDate(dayKey());
        setExerciseRows(exerciseList(session));
        setModal("workout");
    }
    const searchMatch = (session: Session) => !query || `${session.title} ${session.type} ${session.notes} ${exerciseList(session).map(e => e.name).join(" ")} ${data.members.find(m => m.userId === session.userId)?.name || ""}`.toLowerCase().includes(query.toLowerCase().trim());
    const feed = (feedScope === "mine" ? data.mine : data.feed).filter(s => (feedFilter === "all" || s.status === feedFilter) && searchMatch(s));
    const rangeStart = workoutRange === "7" ? shiftDay(dayKey(), -6) : workoutRange === "30" ? shiftDay(dayKey(), -29) : workoutRange === "week" ? historyWeek : "0000-00-00";
    const journal = data.mine.filter(s => (workoutFilter === "all" || s.status === workoutFilter) && searchMatch(s) && s.date >= rangeStart && (workoutRange !== "week" || s.date <= shiftDay(historyWeek, 6)));
    const scopedMembers = (leagueScope === "squad" ? mySquad : data.members);
    const leagueMembers = scopedMembers.map((m, i) => ({ ...m, rank: i === 0 || m.stats.percent !== scopedMembers[i - 1].stats.percent ? i + 1 : scopedMembers.findIndex(p => p.stats.percent === m.stats.percent) + 1 })).filter(m => !query || m.name.toLowerCase().includes(query.toLowerCase().trim()));
    const earned = badges.filter(b => b.earned).length;
    const history = Array.from({ length: 4 }, (_, i) => {
        const week = shiftDay(data.week, -(3 - i) * 7);
        const end = Math.min(Date.now(), Date.parse(shiftDay(week, 6) + "T23:59:59+05:30"));
        return { week, ...statsFor(me, data.mine, data.plans, end) };
    });
    const card = (session: Session) => <WorkoutCard key={session.id} session={session} member={data.members.find(m => m.userId === session.userId)} viewerId={me.userId} busy={busy} onOpen={openSession} onCheer={id => void run({ action: "cheer", id })} onRepeat={repeatWorkout} onMember={openMember}/>;
    const appearanceControl = <div className="appearance-control" aria-label="Appearance">{([{ id: "light", icon: Sun, name: "Light" }, { id: "dark", icon: Moon, name: "Dark" }, { id: "system", icon: Monitor, name: "System" }] as const).map(item => <button key={item.id} type="button" aria-pressed={appearance === item.id} className={appearance === item.id ? "selected" : ""} onClick={() => changeTheme(item.id)}><item.icon size={15}/>{item.name}</button>)}</div>;
    const setupTasks = [
        { id: "goal", label: "Weekly goal", detail: `${stats.goal} days / week`, done: true, action: () => open("plan"), icon: Target },
        { id: "squad", label: "Join or create a squad", detail: squad?.name || "Share workouts with friends", done: !!squad, action: () => open("squad"), icon: Users },
        { id: "workout", label: "Log your first workout", detail: "Submit a visit for review", done: data.mine.length > 0, action: () => open("workout"), icon: Dumbbell },
        admin
            ? { id: "verifier", label: "Add a gym verifier", detail: "Invite staff and assign verifier access", done: data.members.some(member => member.userId !== me.userId && member.role !== "member"), action: () => { navigate("desk"); }, icon: ShieldCheck }
            : { id: "verified", label: "Verify your first visit", detail: "Ask gym staff to review it", done: stats.total > 0, action: () => { setWorkoutFilter("pending"); navigate("workouts"); }, icon: ShieldCheck },
    ];
    const setupCount = setupTasks.filter(task => task.done).length;
    if (!explore && (!live?.campus || finishingSetup))
        return <Onboarding state={live} theme={theme} busy={busy} error={error} connectionError={loadError} loading={loading} onTheme={() => changeTheme(theme === "dark" ? "light" : "dark")} onSubmit={payload => run(payload, true)} onSquad={payload => run(payload, true)} onFinish={() => { setFinishingSetup(false); setError(""); setTab("overview"); }} onDemo={() => { setExplore(true); setFinishingSetup(false); setError(""); setTab("overview"); }} onRetry={() => { void refresh(); }} onClearError={() => setError("")}/>;
    return <div className="app-shell">
    {mobile && <button className="nav-overlay" aria-label="Close navigation" onClick={() => setMobile(false)}/>}
    <aside className={`sidebar ${mobile ? "mobile-open" : ""}`}>
      <a className="brand" href="/" aria-label="RepClub home"><span className="brand-mark"><Dumbbell size={25}/></span>repclub<span className="brand-dot">.</span></a>
      <button className="campus-switch" aria-label="Open campus profile" onClick={() => open("profile")}><span className="campus-icon"><Leaf size={18}/></span><span><strong>{data.campus?.name}</strong><small>{demo ? "Demo campus" : "Campus pilot"}</small></span><ChevronDown size={15}/></button>
      <div className="workspace-label">WORKSPACE</div>
      <nav aria-label="Main navigation">{nav.filter(item => item.id !== "desk" || admin).map(item => <button key={item.id} className={`nav-item ${tab === item.id ? "active" : ""}`} aria-current={tab === item.id ? "page" : undefined} onClick={() => navigate(item.id)}><item.icon size={19}/><span>{item.label}</span>{item.id === "desk" && data.reviews.length > 0 && <span className="nav-count">{data.reviews.length}</span>}</button>)}</nav>
      <div className="sidebar-squad"><div className="workspace-label">MY SQUAD<button aria-label="Manage squad" onClick={() => open("squad")}><Plus size={15}/></button></div><button className="squad-link" onClick={() => { setLeagueScope("squad"); navigate("league"); }}><span className="squad-bullet"/>{squad?.name || "Create your squad"}<ChevronRight size={15}/></button></div>
      <div className="sidebar-goal"><div><Target size={16}/><span>Weekly goal</span><strong>{stats.count}/{stats.goal}</strong></div><div className="progress"><span style={{ width: `${stats.percent}%` }}/></div><button onClick={() => open("plan")}>Edit goal <ArrowUpRight size={13}/></button></div>
      <div className="sidebar-spacer"/>
      <button className="sidebar-invite" onClick={() => open("invite")}><Users size={18}/><span>Invite members</span><Plus size={15}/></button>
      <div className="sidebar-bottom"><button className="sidebar-help" onClick={() => open("rules")}><CircleHelp size={17}/> Pilot rules & privacy</button><button className="sidebar-user" onClick={() => open("profile")}><Avatar name={me.name}/><span><strong>{me.name}</strong><small>{demo ? "Demo participant" : me.role === "owner" ? "Campus owner" : me.role === "staff" ? "Gym verifier" : "Campus member"}</small></span><Settings2 size={16}/></button></div>
    </aside>
    <main className="main">
      <header className="topbar"><div className="breadcrumb"><button className="mobile-menu icon-button" aria-label="Open navigation" onClick={() => setMobile(true)}><Menu size={22}/></button><span>{data.campus?.name}</span><ChevronRight size={14}/><strong>{nav.find(n => n.id === tab)?.label}</strong></div><div className="top-actions"><Hint label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}><button className="icon-button theme-toggle" aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`} title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`} onClick={() => changeTheme(theme === "dark" ? "light" : "dark")}>{theme === "dark" ? <Sun size={19}/> : <Moon size={19}/>}</button></Hint><Hint label="Refresh campus"><button className="icon-button refresh-button" aria-label="Refresh campus" disabled={loading} onClick={() => void refresh()}><RefreshCw size={18} className={loading ? "spin" : ""}/></button></Hint><span className="top-divider"/><m.button whileTap={{ scale: .96 }} className="btn primary top-log" onClick={() => open("workout")}><Plus size={17}/> Log workout <kbd>N</kbd></m.button><button className="top-avatar" aria-label="Open profile" onClick={() => open("profile")}><Avatar name={me.name} size="small"/></button></div></header>
      <AnimatePresence initial={false} mode="wait"><m.div key={tab} className="main-content" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: .14 }}>
        {demo && <div className="demo-banner"><span><span className="demo-indicator"/><strong>Demo mode</strong></span><button onClick={() => live?.campus ? setExplore(false) : startSetup()}>{live?.campus ? "My campus" : "Set up campus"}<ArrowRight size={14}/></button></div>}
        {loadError && <div className="connection-error" role="alert"><CircleHelp size={17}/><span>{loadError}</span><button onClick={() => void refresh()}>Retry</button></div>}
        <div className="page-heading"><div><h1>{tab === "overview" ? "Home" : tab === "workouts" ? "Workouts" : tab === "league" ? "Leaderboard" : tab === "rewards" ? "Achievements" : "Gym desk"}</h1></div><span className="page-date"><CalendarDays size={15}/>{dateLabel(data.week, true)} – {dateLabel(shiftDay(data.week, 6), true)}</span></div>

        {tab === "overview" && !demo && setupCount < setupTasks.length && <section className="card setup-checklist" aria-label="Finish setup"><div className="section-heading"><h2>Finish setup</h2><span>{setupCount}/{setupTasks.length}</span></div><div className="setup-tasks">{setupTasks.map(task => <button key={task.id} className={task.done ? "complete" : ""} onClick={task.action}><span className="setup-task-icon">{task.done ? <Check size={17}/> : <task.icon size={17}/>}</span><span><strong>{task.label}</strong><small>{task.detail}</small></span><ChevronRight size={15}/></button>)}</div></section>}
        {tab === "overview" && <div className="home-layout"><aside className="home-aside"><section className="card week-summary"><div className="week-summary-head"><div><span className="eyebrow">THIS WEEK</span><h2>Weekly goal</h2><p>{stats.count}/{stats.goal} verified visits{pending > 0 && <> · {pending} pending</>}</p></div><div className="mini-ring"><svg viewBox="0 0 80 80" aria-label={`${stats.percent}% of weekly commitment met`}><circle cx="40" cy="40" r="32" fill="none" stroke="var(--track)" strokeWidth="6"/><circle cx="40" cy="40" r="32" fill="none" stroke="var(--accent)" strokeWidth="6" strokeLinecap="round" strokeDasharray={`${stats.percent / 100 * 201} 201`} transform="rotate(-90 40 40)"/></svg><strong>{stats.percent}<small>%</small></strong></div></div>
            <div className="week-calendar">{days.map((day, index) => { const date = shiftDay(data.week, index), session = data.mine.find(s => s.date === date && s.status !== "declined"), done = session?.status === "verified", isPending = session?.status === "pending"; return <button key={day} className={`calendar-day ${done ? "complete" : isPending ? "waiting" : planned.includes(index) ? "planned" : "rest"} ${date === dayKey() ? "today" : ""}`} aria-label={`${day} ${dateLabel(date, true)}, ${done ? "verified visit" : isPending ? "awaiting review" : planned.includes(index) ? "planned gym day" : "rest day"}`} onClick={() => openDay(date)}><small>{day}</small><span>{done ? <Check size={17}/> : isPending ? <Clock3 size={16}/> : Number(date.slice(-2))}</span><i /></button>; })}</div>
            <div className="week-summary-bottom"><div><span className="legend-dot verified-dot"/> Verified<span className="legend-dot planned-dot"/> Planned<span className="legend-dot pending-dot"/> Pending</div><button className="text-button" onClick={() => open("plan")}><Settings2 size={14}/> Edit plan</button></div>
          </section>

          <section className="card side-league"><div className="section-heading"><h2>Campus leaderboard</h2><Trophy size={18}/></div><p className="section-caption">Weekly goal completion</p><Standings members={data.members.slice(0, 4)} meId={me.userId} compact onSelect={openMember}/><button className="panel-link" onClick={() => navigate("league")}>View full leaderboard <ArrowRight size={15}/></button></section>
          {squad && <section className="card squad-card"><div className="section-heading"><h2>{squad?.name || "Your squad"}</h2><Users size={18}/></div><p className="section-caption">{squad ? `${mySquad.length} members` : "No squad yet"}</p><div className="squad-people">{mySquad.slice(0, 4).map((member, index) => <button key={member.userId} title={member.name} aria-label={`View ${member.name}'s progress`} onClick={() => openMember(member)}><Avatar name={member.name} index={index}/></button>)}<button className="add-person" aria-label="Invite to squad" onClick={() => open("invite")}><Plus size={18}/></button></div><div className="squad-goal"><span>Weekly goals met</span><strong>{mySquad.filter(m => m.stats.percent === 100).length}<small>/{mySquad.length}</small></strong></div><div className="progress"><span style={{ width: `${mySquad.length ? mySquad.filter(m => m.stats.percent === 100).length / mySquad.length * 100 : 0}%` }}/></div><div className="squad-actions"><button className="btn secondary" onClick={() => open("squad")}>Manage squad</button><button className="btn primary" onClick={() => open("invite")}><Plus size={14}/> Invite</button></div></section>}

        </aside><div className="home-feed">

          <div className="quick-stats"><button onClick={() => navigate("workouts")}><span className="quick-stat-icon"><ShieldCheck size={18}/></span><span><strong>{stats.total}</strong><small>Verified visits</small></span><ArrowUpRight size={15}/></button><button onClick={() => navigate("rewards")}><span className="quick-stat-icon purple"><Zap size={18}/></span><span><m.strong key={stats.xp} initial={{ scale: .92 }} animate={{ scale: 1 }} transition={{ duration: .25 }}>{stats.xp}<em>XP</em></m.strong><small>Total XP</small></span><ArrowUpRight size={15}/></button><button onClick={() => navigate("league")}><span className="quick-stat-icon amber"><Trophy size={18}/></span><span><strong>#{me.rank}</strong><small>Campus rank</small></span><ArrowUpRight size={15}/></button></div>
          <section className="activity-section"><div className="section-heading"><h2>Activity feed <span className="inline-count">{feed.length}</span></h2><span className="subtle-label"><span /> Latest workouts</span></div><div className="feed-controls"><div className="under-tabs" aria-label="Activity feed"><button className={feedScope === "squad" ? "selected" : ""} onClick={() => { setFeedScope("squad"); setFeedLimit(5); }}>My squad</button><button className={feedScope === "mine" ? "selected" : ""} onClick={() => { setFeedScope("mine"); setFeedLimit(5); }}>My activity</button></div><label className="compact-select"><SlidersHorizontal size={14}/><select aria-label="Filter feed by attendance status" value={feedFilter} onChange={e => setFeedFilter(e.target.value)}><option value="all">All visits</option><option value="verified">Verified</option><option value="pending">Pending</option></select><ChevronDown size={13}/></label></div>

            {feed.length ? <div className="workout-feed">{feed.slice(0, feedLimit).map(card)}{feed.length > feedLimit && <button className="btn secondary load-more" onClick={() => setFeedLimit(n => n + 5)}>Show more workouts <ChevronDown size={16}/></button>}</div> : <section className="card"><Empty icon={<Dumbbell size={24}/>} title="No workouts yet" text="Log a workout to get started."><button className="btn primary" onClick={() => open("workout")}><Plus size={16}/> Log a workout</button></Empty></section>}
          </section>
        </div></div>}

        {tab === "workouts" && <><div className="journal-metrics"><span><Dumbbell size={20}/><span><strong>{data.mine.length}</strong><small>Logged workouts</small></span></span><span><ShieldCheck size={20}/><span><strong>{stats.total}</strong><small>Verified gym days</small></span></span><span><Clock3 size={20}/><span><strong>{pending}</strong><small>Awaiting review</small></span></span><button className="text-button" onClick={download}><ArrowDownToLine size={16}/> Export records</button></div><div className="journal-layout"><div><div className="journal-toolbar"><label className="search-field"><Search size={17}/><input aria-label="Search your workouts" placeholder="Search workouts or exercises" value={query} onChange={e => setQuery(e.target.value)}/>{query && <button aria-label="Clear workout search" onClick={() => setQuery("")}><X size={14}/></button>}</label><select aria-label="Workout date range" value={workoutRange} onChange={e => setWorkoutRange(e.target.value)}><option value="all">All time</option><option value="7">Last 7 days</option><option value="30">Last 30 days</option>{workoutRange === "week" && <option value="week">{dateLabel(historyWeek, true)} week</option>}</select></div><div className="under-tabs journal-tabs">{["all", "verified", "pending", "declined"].map(filter => <button key={filter} className={workoutFilter === filter ? "selected" : ""} onClick={() => setWorkoutFilter(filter)}>{filter === "all" ? "All workouts" : filter === "declined" ? "Needs attention" : filter === "verified" ? "Verified" : "Pending"}</button>)}</div><div className="workout-feed">{journal.length ? journal.map(card) : <section className="card"><Empty icon={<Search size={24}/>} title="No matching workouts" text="Try a different search, date range, or attendance filter."><button className="btn secondary" onClick={() => { setQuery(""); setWorkoutFilter("all"); setWorkoutRange("all"); }}>Reset filters</button></Empty></section>}</div></div><aside className="journal-aside"><section className="card history-card"><div className="section-heading"><h2>Weekly progress</h2><BarChart3 size={18}/></div><p className="section-caption">Select a week to filter workouts.</p><div className="history-chart">{history.map(item => <button key={item.week} aria-label={`View week of ${dateLabel(item.week, true)}, ${item.percent}% complete`} className={workoutRange === "week" && historyWeek === item.week ? "selected" : ""} onClick={() => { setHistoryWeek(item.week); setWorkoutRange("week"); }}><span className="history-percent">{item.percent}%</span><span className="history-track"><span style={{ height: `${Math.max(item.percent, 3)}%` }}/></span><small>{dateLabel(item.week, true)}</small></button>)}</div></section><section className="card attendance-card"><div className="section-heading"><h2>Your last 28 days</h2><CalendarDays size={18}/></div><div className="attendance-grid">{Array.from({ length: 28 }, (_, index) => { const date = shiftDay(dayKey(), index - 27), session = data.mine.find(s => s.date === date && s.status !== "declined"); return <button key={date} title={`${dateLabel(date)}: ${session?.status || "no logged visit"}`} aria-label={`${dateLabel(date)}: ${session?.status || "no logged visit"}`} className={session?.status || ""} onClick={() => openDay(date)}>{Number(date.slice(-2))}</button>; })}</div><div className="calendar-legend"><span className="legend-dot verified-dot"/> Verified<span className="legend-dot pending-dot"/> Pending</div></section></aside></div></>}

        {tab === "league" && <><div className="league-summary"><span className="league-icon"><Trophy size={25}/></span><div><strong>Weekly ranking</strong><p>Ranked by goal completion. Ties share a rank.</p></div><button className="text-button" onClick={() => open("rules")}>Scoring rules <CircleHelp size={15}/></button></div><div className="toolbar"><div className="segmented"><button className={leagueScope === "campus" ? "selected" : ""} onClick={() => setLeagueScope("campus")}>Campus league <span>{data.members.length}</span></button><button className={leagueScope === "squad" ? "selected" : ""} onClick={() => setLeagueScope("squad")}>My squad <span>{mySquad.length}</span></button></div><label className="search-field league-search"><Search size={16}/><input aria-label="Search league members" placeholder="Find a member" value={query} onChange={e => setQuery(e.target.value)}/></label></div><section className="card league-table"><div className="league-table-head"><span>RANK / MEMBER</span><span>WEEKLY PROGRESS</span><span>GOAL MET</span></div>{leagueMembers.length ? <Standings members={leagueMembers} meId={me.userId} onSelect={openMember}/> : <Empty icon={<Users size={24}/>} title={query ? "No members found" : "No squad yet"} text={query ? "Try another name." : "Create a squad or join one with a friend’s code."}>{!query && <button className="btn primary" onClick={() => open("squad")}>Your squad <ArrowRight size={15}/></button>}</Empty>}</section></>}

        {tab === "rewards" && <><div className="achievement-summary"><span className="achievement-big"><Award size={30}/></span><div><span className="eyebrow">YOUR PROGRESS</span><h2>{earned} of {badges.length} achievements unlocked</h2></div><span className="xp-total"><Zap size={20}/>{stats.xp}<small>XP</small></span></div><div className="toolbar"><div className="under-tabs">{[{ id: "all", label: "All achievements" }, { id: "earned", label: "Unlocked" }, { id: "progress", label: "In progress" }].map(item => <button key={item.id} className={rewardFilter === item.id ? "selected" : ""} onClick={() => setRewardFilter(item.id)}>{item.label}</button>)}</div><span className="subtle-label">XP has no cash value</span></div><div className="badges-grid">{badges.map((badge, index) => ({ badge, index })).filter(({ badge }) => rewardFilter === "all" || (rewardFilter === "earned" ? badge.earned : !badge.earned)).map(({ badge, index }) => { const Icon = [Dumbbell, CheckCheck, Flame, Trophy, RefreshCw][index]; return <m.button whileHover={{ y: -3 }} whileTap={{ scale: .98 }} key={badge.id} className={`card badge-card ${badge.earned ? "earned" : "locked"}`} onClick={() => { setSelectedBadge(index); open("achievement"); }}><span className="badge-card-top"><span className={`badge-art badge-${index}`}><Icon size={30}/></span><span className="badge-state">{badge.earned ? <><Check size={12}/> UNLOCKED</> : <LockKeyhole size={14}/>}</span></span><h2>{badge.name}</h2><p>{badge.detail}</p><div className="progress"><span style={{ width: `${badge.earned ? 100 : badge.progress / badge.target * 100}%` }}/></div><span className="badge-progress-label">{badge.earned ? "Unlocked" : `${badge.progress} / ${badge.target} complete`}<ArrowUpRight size={15}/></span></m.button>; })}</div>{!badges.some(badge => rewardFilter === "all" || (rewardFilter === "earned" ? badge.earned : !badge.earned)) && <section className="card"><Empty icon={<Award size={26}/>} title={rewardFilter === "earned" ? "No achievements yet" : "All achievements unlocked"} text={rewardFilter === "earned" ? "Your first verified visit unlocks First visit." : ""}/></section>}</>}

        {tab === "desk" && admin && <><div className="desk-grid"><section className="card desk-code-card"><div className="section-heading"><h2>Gym attendance code</h2><ShieldCheck size={20}/></div><p>Display this code at the staffed gym desk.</p><div className="desk-code" key={tick}>{data.deskCode && data.deskCode.expiresAt > Date.now() ? data.deskCode.code : "------"}</div><div className="desk-code-footer"><small>{data.deskCode && data.deskCode.expiresAt > Date.now() ? `Expires in ${Math.ceil((data.deskCode.expiresAt - Date.now()) / 60000)} min` : "No active code"}</small><button className="btn secondary" disabled={busy} onClick={() => void run({ action: "desk" })}><RefreshCw size={15}/> Generate code</button></div></section><section className="card pilot-summary"><div className="section-heading"><h2>Campus snapshot</h2><Activity size={19}/></div><div><span>Participating members</span><strong>{data.members.length}</strong></div><div><span>Met their weekly goal</span><strong>{data.members.filter(m => m.stats.percent === 100).length}</strong></div><div><span>Awaiting review</span><strong>{data.reviews.length}</strong></div><button className="panel-link" onClick={() => open("invite")}>Invite participants <ArrowRight size={15}/></button></section></div><div className="section-heading desk-section"><div><h2>Attendance review <span className="inline-count">{data.reviews.length}</span></h2><p>Confirm using gym records or independent observation.</p></div></div><section className="card review-list">{data.reviews.length ? data.reviews.map(session => <div className="review-row" key={session.id}><Avatar name={data.members.find(m => m.userId === session.userId)?.name || "Member"}/><div><strong>{data.members.find(m => m.userId === session.userId)?.name}</strong><span>{session.title}</span><small>{dateLabel(session.date)} · {session.duration} min reported · {session.deskSupported ? "Desk code recorded" : "Independent check needed"}</small></div><button className="btn secondary" disabled={session.userId === me.userId} onClick={() => { setReview(session); setConfirmAttendance(false); open("review"); }}>{session.userId === me.userId ? "Another verifier needed" : "Review"}<ChevronRight size={15}/></button></div>) : <Empty icon={<CheckCheck size={25}/>} title="No pending visits" text="New submissions appear here."/>}</section><div className="section-heading desk-section"><div><h2>Trusted verifiers</h2><p>Only the campus owner can appoint verifiers.</p></div></div><section className="card verifier-list">{data.members.map((member, index) => <div className="verifier-row" key={member.userId}><Avatar name={member.name} index={index}/><div><strong>{member.name}</strong><small>{member.role === "owner" ? "Campus owner" : member.role === "staff" ? "Gym verifier" : "Participant"}</small></div>{me.role === "owner" && member.role !== "owner" && <button className="btn secondary" disabled={busy} onClick={() => void run({ action: "role", id: member.userId, role: member.role === "staff" ? "member" : "staff" })}>{member.role === "staff" ? "Remove verifier" : "Make verifier"}</button>}</div>)}</section></>}

      </m.div></AnimatePresence>
    </main>
    <nav className="bottom-nav" aria-label="Mobile navigation">{nav.filter(item => item.id !== "desk" || admin).map(item => <button key={item.id} aria-current={tab === item.id ? "page" : undefined} className={tab === item.id ? "active" : ""} onClick={() => navigate(item.id)}><item.icon size={20}/><span>{item.id === "overview" ? "Home" : item.id === "workouts" ? "Workouts" : item.id === "league" ? "League" : item.id === "rewards" ? "Awards" : "Desk"}</span></button>)}</nav>
    <dialog ref={dialog} className="modal" onCancel={() => setModal(null)} onClick={e => {
            if (e.target === e.currentTarget)
                setModal(null);
        }} aria-labelledby="modal-title"><m.div key={modal} className="modal-inner" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .18 }}><button className="modal-close icon-button" aria-label="Close dialog" onClick={() => setModal(null)}><X size={20}/></button>

    {modal === "details" && selectedSession && <>
      <div className="detail-top"><span className="modal-symbol"><Dumbbell size={24}/></span><Pill status={selectedSession.status}/></div>
      <h2 id="modal-title">{selectedSession.title}</h2>
      <p className="modal-intro">{data.members.find(member => member.userId === selectedSession.userId)?.name} · {dateLabel(selectedSession.date)} · {selectedSession.type}</p>
      <div className="detail-metrics"><span><strong>{selectedSession.duration}<small>min</small></strong>Reported duration</span><span><strong>{exerciseList(selectedSession).length}</strong>Exercises</span><span><strong>{loggedVolume(selectedSession).toLocaleString("en-IN")}<small>kg</small></strong>Logged volume</span></div>
      {selectedSession.notes && <p className="detail-note">{selectedSession.notes}</p>}
      {exerciseList(selectedSession).length > 0 && <div className="detail-exercises"><div className="detail-exercise-head"><span>EXERCISE</span><span>SETS × REPS</span><span>WEIGHT</span></div>{exerciseList(selectedSession).map((exercise, index) => <div key={index}><strong>{exercise.name}</strong><span>{exercise.sets} × {exercise.reps}</span><span>{exercise.weight} kg</span></div>)}</div>}
      <div className="info-strip"><ShieldCheck size={18}/><span>{selectedSession.status === "verified" ? "Attendance verified. " : "Attendance not yet verified. "}Workout details are self-reported.</span></div>
      {selectedSession.reviewNote && <p className="review-note">Staff note: {selectedSession.reviewNote}</p>}
      {selectedSession.userId === me.userId && <button className="btn primary full" onClick={() => repeatWorkout(selectedSession)}><RefreshCw size={16}/> Repeat this workout</button>}
    </>}
    {modal === "day" && <><span className="modal-symbol"><CalendarDays size={24}/></span><h2 id="modal-title">{dateLabel(selectedDate)}</h2><p className="modal-intro">Your gym attendance for this day.</p>{data.mine.filter(session => session.date === selectedDate).length ? data.mine.filter(session => session.date === selectedDate).map(session => <button className="day-session" key={session.id} onClick={() => openSession(session)}><span><strong>{session.title}</strong><small>{session.duration} min · {session.type}</small></span><Pill status={session.status}/><ChevronRight size={16}/></button>) : <div className="day-empty"><Leaf size={27}/><h3>{selectedDate > dayKey() ? "Planned day" : "No workout logged"}</h3><p>{selectedDate > dayKey() ? "Edit your weekly plan to schedule this day." : "Log a recent visit or edit your plan."}</p></div>}<button className="btn secondary full" onClick={() => open("plan")}><Settings2 size={16}/> Edit weekly plan</button>{selectedDate >= shiftDay(dayKey(), -6) && selectedDate <= dayKey() && !data.mine.some(session => session.date === selectedDate && session.status !== "declined") && <button className="btn primary full" onClick={() => logForDay(selectedDate)}><Plus size={16}/> Log a workout</button>}</>}
    {modal === "member" && selectedMember && <><div className="member-detail-heading"><Avatar name={selectedMember.name} size="large"/><div><h2 id="modal-title">{selectedMember.userId === me.userId ? "Your progress" : selectedMember.name}</h2><p>{data.campus?.name} · {data.squads.find(item => item.id === selectedMember.squadId)?.name || "Campus participant"}</p></div></div><div className="member-commitment"><div><strong>Weekly goal</strong><span>{selectedMember.stats.count} / {selectedMember.stats.goal} visits</span></div><div className="progress"><span style={{ width: `${selectedMember.stats.percent}%` }}/></div><p>{selectedMember.stats.percent}% of this week’s goal completed</p></div><div className="detail-metrics"><span><strong>{selectedMember.stats.total}</strong>Verified days</span><span><strong>{selectedMember.stats.xp}</strong>Pilot XP</span><span><strong>{selectedMember.stats.goalWeeks}</strong>Goals met</span></div><div className="info-strip"><ShieldCheck size={18}/><span>Only verified visits count toward your weekly goal.</span></div>{selectedMember.userId === me.userId && <button className="btn primary full" onClick={() => { setModal(null); navigate("workouts"); }}>View my workouts <ArrowRight size={16}/></button>}</>}
    {modal === "achievement" && <><span className={`achievement-detail-icon ${badges[selectedBadge].earned ? "earned" : ""}`}><Award size={45}/></span><span className="eyebrow">{badges[selectedBadge].earned ? "ACHIEVEMENT UNLOCKED" : "YOUR NEXT MILESTONE"}</span><h2 id="modal-title">{badges[selectedBadge].name}</h2><p className="modal-intro">{badges[selectedBadge].detail}. Verified visits count toward this achievement.</p><div className="progress achievement-progress"><span style={{ width: `${badges[selectedBadge].earned ? 100 : badges[selectedBadge].progress / badges[selectedBadge].target * 100}%` }}/></div><p className="achievement-progress-text">{badges[selectedBadge].earned ? "Unlocked" : `${badges[selectedBadge].progress} of ${badges[selectedBadge].target} complete`}</p><button className="btn primary full" onClick={() => open("plan")}>Edit weekly goal <ArrowRight size={16}/></button></>}
    {modal === "workout" && <><span className="modal-symbol"><Dumbbell size={24}/></span><h2 id="modal-title">Log workout</h2><p className="modal-intro">{workoutDraft ? "Update the copied exercise results." : "Attendance needs staff review."}</p><form onSubmit={e => void submit(e, "workout")}><label>Workout name<input name="title" required minLength={2} maxLength={80} placeholder="e.g. Upper body strength" defaultValue={workoutDraft?.title || ""}/></label><div className="form-row"><label>Activity<select name="type" defaultValue={workoutDraft?.type || "Strength"}><option>Strength</option><option>Cardio</option><option>Mixed</option></select></label><label>Duration, minutes<input name="duration" type="number" min={5} max={240} defaultValue={workoutDraft?.duration || 45} required/></label></div><div className="form-row"><label>Date<input name="date" type="date" defaultValue={workoutDate} min={shiftDay(dayKey(), -6)} max={dayKey()} required/></label><label>Gym desk code <span className="optional">optional</span><input name="code" inputMode="numeric" maxLength={6} pattern="[0-9]{6}" placeholder={demo ? "Demo: 654321" : "6-digit code"}/></label></div><div className="exercise-editor">{exerciseRows.length > 0 && <div className="exercise-labels"><span>Exercise</span><span>Sets</span><span>Reps</span><span>kg</span><span /></div>}{exerciseRows.map((x, i) => <div className="exercise-row" key={i}><input aria-label={`Exercise ${i + 1}`} placeholder="Exercise name" value={x.name} maxLength={60} required onChange={e => setExerciseRows(a => a.map((r, j) => j === i ? { ...r, name: e.target.value } : r))}/>{(["sets", "reps", "weight"] as const).map(k => <input key={k} aria-label={`${k} for exercise ${i + 1}`} type="number" min={k === "weight" ? 0 : 1} max={k === "sets" ? 20 : k === "reps" ? 100 : 1000} step={k === "weight" ? 0.5 : 1} value={x[k]} required onChange={e => setExerciseRows(a => a.map((r, j) => j === i ? { ...r, [k]: Number(e.target.value) } : r))}/>)}<button className="icon-button" type="button" aria-label={`Remove exercise ${i + 1}`} onClick={() => setExerciseRows(a => a.filter((_, j) => i !== j))}><X size={14}/></button></div>)}{exerciseRows.length < 12 && <button className="text-button" type="button" onClick={() => setExerciseRows(a => [...a, { name: "", sets: 3, reps: 10, weight: 0 }])}><Plus size={14}/> Add exercise details</button>}</div><label>A note for your squad <span className="optional">optional</span><textarea name="notes" maxLength={600} placeholder="How did it go?" rows={2} defaultValue=""/></label><div className="info-strip"><ShieldCheck size={17}/><span>Exercise details and duration are self-reported. Staff verify your gym attendance.</span></div>{error && <p className="form-error" role="alert">{error}</p>}<button className="btn primary full" disabled={busy}>{busy ? <Loader2 size={17} className="spin"/> : <ShieldCheck size={17}/>} Submit for review</button></form></>}
    {modal === "plan" && <><span className="modal-symbol"><CalendarDays size={24}/></span><h2 id="modal-title">Weekly goal</h2><p className="modal-intro">Your target locks after your first log each week. Planned days can change.</p><form onSubmit={e => void submit(e, "plan")}>{goalPicker}{error && <p className="form-error" role="alert">{error}</p>}<button className="btn primary full" disabled={busy}>Save my commitment <Check size={16}/></button></form></>}
    {modal === "squad" && <><span className="modal-symbol"><Users size={24}/></span><h2 id="modal-title">Your squad</h2><p className="modal-intro">Switching squads changes who can see your workouts.</p><div className="segmented modal-tabs"><button className={squadMode === "createSquad" ? "selected" : ""} onClick={() => { setSquadMode("createSquad"); setError(""); }}>Create a squad</button><button className={squadMode === "joinSquad" ? "selected" : ""} onClick={() => { setSquadMode("joinSquad"); setError(""); }}>Join with a code</button></div><form onSubmit={e => void submit(e, squadMode)} key={squadMode}>{squadMode === "createSquad" ? <label>Squad name<input name="name" minLength={2} maxLength={50} required placeholder="e.g. The 6 PM Club"/></label> : <label>Squad invite code<input name="code" minLength={6} maxLength={12} required placeholder={demo ? "Try REPS2026" : "Enter your friend's code"} className="code-input"/></label>}{error && <p className="form-error" role="alert">{error}</p>}<button className="btn primary full" disabled={busy}>{squadMode === "createSquad" ? "Create my squad" : "Join the squad"}<ArrowRight size={16}/></button></form></>}
    {modal === "invite" && <><span className="modal-symbol"><Users size={24}/></span><h2 id="modal-title">Invite members</h2><p className="modal-intro">Share a code. New members choose Join a campus during setup.</p>{squad?.inviteCode ? <div className="invite-box"><span>{squad.name.toUpperCase()} · SQUAD INVITE</span><strong>{squad.inviteCode}</strong><button className="btn secondary" onClick={() => void copy(squad.inviteCode!)}><Copy size={15}/> Copy squad code</button></div> : <button className="btn secondary full" onClick={() => open("squad")}>Create a squad to invite friends</button>}{admin && data.campus?.inviteCode && <div className="invite-box secondary-invite"><span>{data.campus.name.toUpperCase()} · CAMPUS INVITE</span><strong>{data.campus.inviteCode}</strong><button className="text-button" onClick={() => void copy(data.campus!.inviteCode!)}><Copy size={14}/> Copy campus code</button></div>}<p className="fine-print invite-note">{demo ? "Demo codes only." : "Members need access to this private site before using a code."}</p></>}
    {modal === "review" && review && <><span className="modal-symbol"><ShieldCheck size={24}/></span><h2 id="modal-title">Confirm attendance.</h2><p className="modal-intro">{data.members.find(m => m.userId === review.userId)?.name} · {dateLabel(review.date)}<br />{review.title} · {review.duration} minutes reported</p><div className="info-strip"><ShieldCheck size={18}/><span>{review.deskSupported ? "Desk code recorded. Confirm attendance before approving." : "No desk code. Check the gym register or confirm in person."}</span></div><form onSubmit={async (e) => {
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
    {modal === "rules" && <><span className="modal-symbol"><ShieldCheck size={24}/></span><h2 id="modal-title">Rules & privacy</h2><ol className="rules"><li><strong>Scoring</strong><p>One verified visit per day earns 10 XP, capped at your weekly target. Rankings use goal completion; ties share a rank.</p></li><li><strong>Attendance</strong><p>Gym staff review visits. You cannot verify your own attendance. Exercise details and duration are self-reported.</p></li><li><strong>Weekly goals</strong><p>Choose 2–5 days. The target locks after your first log. Weeks reset Monday in India time.</p></li><li><strong>Sharing</strong><p>Campus members see your name and goal progress. Your current squad and authorized staff can see workout details.</p></li><li><strong>Rewards</strong><p>XP and badges have no cash value.</p></li></ol><button className="btn primary full" onClick={() => setModal(null)}>Got it <Check size={16}/></button></>}
    {modal === "profile" && <><span className="modal-symbol"><Users size={24}/></span><h2 id="modal-title">Profile</h2><p className="modal-intro">{data.campus?.name} · {data.campus?.gymName}</p><div className="profile-card"><Avatar name={me.name}/><div><strong>{me.name}</strong><span>{demo ? "Sample participant" : me.role === "owner" ? "Campus owner" : me.role === "staff" ? "Gym verifier" : "Campus participant"}</span></div></div><div className="profile-appearance"><label className="field-label">Appearance</label>{appearanceControl}</div><button className="btn secondary full" onClick={() => open("plan")}><CalendarDays size={17}/> Edit weekly goal</button><button className="btn secondary full" onClick={startSetup}><CheckCheck size={17}/> Setup guide</button><button className="btn secondary full" onClick={download}><ArrowDownToLine size={17}/> Export workouts</button><button className="btn secondary full" onClick={() => { setExplore(!demo); setFinishingSetup(false); setModal(null); }}>{demo ? live?.campus ? "Back to campus" : "Back to setup" : "Try demo"}<ArrowRight size={16}/></button>{live?.user && <a className="text-button signout" href="/signout-with-chatgpt?return_to=/" target="_top"><LogOut size={15}/> Sign out</a>}</>}
    </m.div></dialog>
  </div>;
}
