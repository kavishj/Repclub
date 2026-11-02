"use client";
import { useEffect, useRef, useState } from "react";
import { Camera, Check, Clock3, Loader2, QrCode, RefreshCw, ScanLine, ShieldCheck } from "lucide-react";
import type { IScannerControls } from "@zxing/browser";
import { countsForRewards, isScanTimed, MIN_SCAN_DURATION, MAX_SCAN_DURATION, type Session } from "../lib/league";
const clock = (milliseconds: number) => {
    const seconds = Math.max(0, Math.floor(milliseconds / 1000));
    return `${String(Math.floor(seconds / 3600)).padStart(2, "0")}:${String(Math.floor(seconds / 60) % 60).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
};
const time = (timestamp: number) => new Date(timestamp).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", second: "2-digit" });
export function TimingSummary({ session }: {
    session: Session;
}) {
    const timed = isScanTimed(session);
    return <div className={`timing-summary ${timed ? "scan-timed" : "manual-timed"}`}>
    {timed ? <ScanLine size={14}/> : <Clock3 size={14}/>}
    <span>{timed ? `Scan timed · ${countsForRewards(session) ? "Reward qualified" : session.status === "pending" ? "Awaiting staff review" : "No rewards"}` : "Manual duration · No league XP or achievements"}</span>
  </div>;
}
export function ScanTimes({ session }: {
    session: Session;
}) {
    return isScanTimed(session) ? <div className="scan-times"><span>Scanned in<strong>{time(session.startedAt!)}</strong></span><span>Scanned out<strong>{time(session.endedAt!)}</strong></span></div> : null;
}
export function StatusTimeline({session}:{session:Session}) {
    const qualified=countsForRewards(session),scannedIn=!!session.startedAt,scannedOut=isScanTimed(session),reviewed=!!session.reviewedAt;
    const reason=qualified?"Qualified gym day. XP is capped at your weekly target.":session.timingSource!=="scan"?scannedIn?"Saved without checkout. This visit stays in your history and earns no rewards.":"Manual log. Both gym scans and staff review are needed for rewards.":session.status==="unqualified"?(session.duration<5?"Under 5 minutes. Both scans are saved, but this visit earns no rewards.":"Over 4 hours. Both scans are saved, but this visit earns no rewards."):session.status==="declined"?session.reviewNote||"Attendance was not confirmed. Contact your gym verifier.":session.status==="pending"?"Both scans saved. Awaiting an independent gym staff review.":session.status==="recording"?"Timer running. Scan the gym QR again when you finish.":"This visit does not meet the reward rules.";
    return <section className="status-timeline" aria-label="Workout verification"><ol>{[{label:"Checked in",done:scannedIn},{label:"Checked out",done:scannedOut},{label:"Staff reviewed",done:reviewed},{label:"Reward qualified",done:qualified}].map((step,index)=><li key={step.label} className={step.done?"complete":""}><span>{step.done?<Check size={12}/>:index+1}</span>{step.label}</li>)}</ol><p>{reason}</p></section>;
}
export function WorkoutSession({ active, serverNow, receivedAt, busy, onScan, onManual, onDetails, onCancel }: {
    active: Session | null;
    serverNow: number;
    receivedAt: number;
    busy: boolean;
    onScan: () => void;
    onManual: () => void;
    onDetails: (session: Session) => void;
    onCancel: (id: string) => void;
}) {
    const [elapsed, setElapsed] = useState(active?.startedAt ? serverNow - active.startedAt : 0);
    useEffect(() => {
        if (!active?.startedAt) {
            setElapsed(0);
            return;
        }
        const base = serverNow - active.startedAt, received = receivedAt;
        const update = () => setElapsed(Math.max(0, base + Date.now() - received));
        update();
        const timer = setInterval(update, 1000);
        return () => clearInterval(timer);
    }, [active?.id, active?.startedAt, serverNow, receivedAt]);
    const expired = elapsed > MAX_SCAN_DURATION;
    return <section className={`card workout-session ${active ? "running" : ""}`} aria-label="Workout timer">
    <span className="session-symbol">{active ? <Clock3 size={22}/> : <ScanLine size={23}/>}</span>
    <div className="session-copy"><h2>{active ? active.title : "Scan in at the gym"}</h2>
      <p>{active ? expired ? "Scan out to end your timer. This visit will stay in history without rewards." : "Scan out when you finish. Staff review unlocks rewards." : "Scan again at checkout to record your duration."}</p>
      {active && <><output className="session-clock" role="timer" aria-label="Elapsed workout time">{clock(elapsed)}</output><small>{elapsed < MIN_SCAN_DURATION ? "Rewards require 5–240 minutes." : `Started ${time(active.startedAt!)}`}</small></>}
    </div>
    <div className="session-actions"><button className="btn primary" disabled={busy} onClick={onScan}><ScanLine size={16}/>{active ? "Scan to finish" : "Scan to start"}</button>
      {active ? <><button className="btn secondary" disabled={busy} onClick={() => onDetails(active)}>Workout details</button><button className="text-button" disabled={busy} onClick={() => onCancel(active.id)}>Save without checkout</button></> : <button className="btn secondary" disabled={busy} onClick={onManual}>Manual log</button>}
    </div>
  </section>;
}
export function QrScanner({ busy, demoCode, onScan }: {
    busy: boolean;
    demoCode?: string;
    onScan: (code: string) => Promise<void>;
}) {
    const video = useRef<HTMLVideoElement>(null), controls = useRef<IScannerControls | null>(null);
    const stream = useRef<MediaStream | null>(null), generation = useRef(0), scanHandler = useRef(onScan);
    const [camera, setCamera] = useState(false), [opening, setOpening] = useState(false), [error, setError] = useState("");
    useEffect(() => { scanHandler.current = onScan; }, [onScan]);
    function stop() {
        generation.current++;
        controls.current?.stop();
        controls.current = null;
        stream.current?.getTracks().forEach(track => track.stop());
        stream.current = null;
        if (video.current)
            video.current.srcObject = null;
    }
    useEffect(() => () => stop(), []);
    async function start() {
        stop();
        const job = generation.current;
        setError("");
        setCamera(true);
        setOpening(true);
        try {
            if (!navigator.mediaDevices?.getUserMedia)
                throw new Error("Camera access is unavailable. Use HTTPS and allow camera permission, or save a manual log.");
            const { BrowserQRCodeReader } = await import("@zxing/browser");
            if (job !== generation.current)
                return;
            const media = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: { ideal: "environment" } } });
            if (job !== generation.current || !video.current) {
                media.getTracks().forEach(track => track.stop());
                return;
            }
            stream.current = media;
            const reader = new BrowserQRCodeReader(undefined, { delayBetweenScanAttempts: 250 });
            const scanner = await reader.decodeFromStream(media, video.current, (result, _error, scannerControls) => {
                if (!result || job !== generation.current)
                    return;
                const value = result.getText();
                scannerControls.stop();
                stop();
                setCamera(false);
                setOpening(false);
                if (!/^repclub:gym:v1:[a-f0-9]{64}$/.test(value)) {
                    setError("This is not a RepClub gym QR. Scan the current code at your gym.");
                    return;
                }
                void scanHandler.current(value);
            });
            if (job !== generation.current)
                scanner.stop();
            else {
                controls.current = scanner;
                setOpening(false);
            }
        }
        catch (cause) {
            if (job !== generation.current)
                return;
            stop();
            setCamera(false);
            setOpening(false);
            setError(cause instanceof DOMException && cause.name === "NotAllowedError" ? "Camera permission was denied. Allow it in your browser or save a manual log." : cause instanceof Error ? cause.message : "Could not open the camera. Try again or save a manual log.");
        }
    }
    return <div className="qr-scanner">
    <div className={`camera-frame ${camera ? "camera-active" : ""}`}><video ref={video} autoPlay playsInline muted aria-label="Gym QR camera" hidden={!camera}/>{!camera && <QrCode size={60}/>}<span className="scan-guide" aria-hidden="true"/></div>
    {error && <p className="form-error" role="alert">{error}</p>}
    <button className="btn primary full" disabled={busy || opening} onClick={() => { if (camera) {
        stop();
        setCamera(false);
    }
    else
        void start(); }}>{busy || opening ? <Loader2 size={16} className="spin"/> : <Camera size={16}/>} {opening ? "Opening camera…" : camera ? "Stop camera" : "Enable camera"}</button>
    {demoCode && <button className="btn secondary full" disabled={busy || camera} onClick={() => void onScan(demoCode)}>Use demo QR</button>}
    <p className="fine-print">Camera images stay on your device. Manual logs earn no rewards.</p>
  </div>;
}
export function GymQr({ code, busy, onRefresh }: {
    code: {
        code: string;
        expiresAt: number;
    } | null;
    busy: boolean;
    onRefresh: () => Promise<boolean>;
}) {
    const [image, setImage] = useState(""), [now, setNow] = useState(0), [error, setError] = useState("");
    const refresh = useRef(onRefresh);
    useEffect(() => { refresh.current = onRefresh; }, [onRefresh]);
    useEffect(() => { setNow(Date.now()); const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer); }, []);
    useEffect(() => {
        let cancelled = false;
        setImage("");
        setError("");
        if (code?.code.startsWith("repclub:gym:v1:"))
            void import("qrcode").then(module => module.default.toDataURL(code.code, { width: 280, margin: 4, errorCorrectionLevel: "M", color: { dark: "#111111", light: "#ffffff" } })).then(value => { if (!cancelled)
                setImage(value); }).catch(() => { if (!cancelled)
                setError("Could not render the QR. Refresh to try again."); });
        return () => { cancelled = true; };
    }, [code?.code]);
    useEffect(() => {
        let cancelled = false, timer: ReturnType<typeof setTimeout>;
        const renew = async () => {
            const saved = !document.hidden && await refresh.current();
            if (!saved && !cancelled)
                timer = setTimeout(() => { void renew(); }, 15000);
        };
        timer = setTimeout(() => { void renew(); }, Math.max(1000, (code?.code.startsWith("repclub:gym:v1:") ? code.expiresAt : 0) - Date.now() - 10000));
        const visible = () => { if (!document.hidden && (!code || code.expiresAt <= Date.now() + 10000))
            renew(); };
        document.addEventListener("visibilitychange", visible);
        return () => { cancelled = true; clearTimeout(timer); document.removeEventListener("visibilitychange", visible); };
    }, [code?.expiresAt]);
    const valid = !!code && code.expiresAt > now && code.code.startsWith("repclub:gym:v1:");
    return <section className="card desk-code-card"><div className="section-heading"><h2>Gym scan QR</h2><ShieldCheck size={20}/></div><p>Display at the staffed gym desk for check-in and checkout.</p>
    <div className="gym-qr">{valid && image ? <img src={image} width={280} height={280} alt="Current gym check-in and checkout QR"/> : <div><QrCode size={50}/><span>{busy ? "Preparing QR…" : "Refresh the gym QR"}</span></div>}</div>
    {error && <p className="form-error" role="alert">{error}</p>}
    <div className="desk-code-footer"><small>{valid ? `Refreshes in ${Math.max(0, Math.ceil((code.expiresAt - now - 10000) / 1000))}s` : "No active QR"}</small><button className="btn secondary" disabled={busy} onClick={() => void onRefresh()}><RefreshCw size={15}/> Refresh QR</button></div>
  </section>;
}
