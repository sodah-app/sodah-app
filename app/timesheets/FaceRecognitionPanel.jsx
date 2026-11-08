"use client";
import React, { useEffect, useRef, useState } from "react";
import { Camera, ShieldCheck, CheckCircle2, Users, Clock3, ScanFace, Lock, Unlock } from "lucide-react";
import { todayISO } from "@/lib/time";
function localTime() { return new Date().toTimeString().slice(0,5); }

function FaceAttendancePanel({ employees, onAttendanceAction, onClose, kioskLocked = false, onKioskLockChange }) {
  const [mode, setMode] = useState("scan");
  const [employeeKey, setEmployeeKey] = useState("");
  const [consent, setConsent] = useState(false);
  const [cameraState, setCameraState] = useState("idle");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [detectedEmployee, setDetectedEmployee] = useState(null);
  const [attendanceResult, setAttendanceResult] = useState(null);
  const [pinDialog, setPinDialog] = useState(false);
  const [pinMode, setPinMode] = useState("lock");
  const [pinValue, setPinValue] = useState("");
  const [pinError, setPinError] = useState("");
  const [kioskPinHash, setKioskPinHash] = useState("");
  useEffect(() => { try { setKioskPinHash(localStorage.getItem("sodah-face-kiosk-pin-hash") || ""); } catch {} }, []);
  useEffect(() => {
    if (!pinDialog) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event) => { if (event.key === "Escape") setPinDialog(false); };
    window.addEventListener("keydown", onKeyDown);
    return () => { document.body.style.overflow = previousOverflow; window.removeEventListener("keydown", onKeyDown); };
  }, [pinDialog]);
  const hashPin = async (value) => {
    const bytes = new TextEncoder().encode(value);
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    return Array.from(new Uint8Array(digest)).map(v => v.toString(16).padStart(2, "0")).join("");
  };
  const openPinDialog = () => { setPinMode(kioskLocked ? "unlock" : "lock"); setPinValue(""); setPinError(""); setPinDialog(true); };
  const submitPinDialog = async (event) => {
    event.preventDefault();
    if (!/^\d{4,12}$/.test(pinValue)) { setPinError("Enter a PIN containing 4 to 12 digits."); return; }
    try {
      const hash = await hashPin(pinValue);
      if (pinMode === "lock") {
        setKioskPinHash(hash);
        try { localStorage.setItem("sodah-face-kiosk-pin-hash", hash); } catch {}
        onKioskLockChange?.(true);
        setMode("scan"); setDetectedEmployee(null); setAttendanceResult(null); setError("");
        setMessage("Kiosk locked. Camera scanning and attendance actions remain available.");
      } else {
        if (!kioskPinHash || hash !== kioskPinHash) { setPinError("Incorrect PIN. The kiosk remains locked."); return; }
        onKioskLockChange?.(false); setMode("scan"); setMessage("Kiosk unlocked.");
      }
      setPinDialog(false); setPinValue("");
    } catch { setPinError("Unable to verify the PIN. Please try again."); }
  };
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const stopCamera = () => {
    streamRef.current?.getTracks?.().forEach(track => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraState("idle");
  };

  const startCamera = async () => {
    setError(""); setMessage(""); setDetectedEmployee(null); setAttendanceResult(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Camera access is unavailable. Open this page over HTTPS on a supported browser.");
      return;
    }
    try {
      stopCamera();
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraState("live");
    } catch (e) {
      setError(e?.name === "NotAllowedError" ? "Camera permission was denied. Allow camera access and try again." : "Unable to start the camera. Check that another app is not using it.");
    }
  };

  useEffect(() => () => {
    streamRef.current?.getTracks?.().forEach(track => track.stop());
  }, []);

  useEffect(() => {
    if (cameraState !== "live" || !videoRef.current || !streamRef.current) return;
    videoRef.current.srcObject = streamRef.current;
    videoRef.current.play().catch(() => setError("The camera preview could not start. Please retry."));
  }, [cameraState]);

  const captureFrame = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) throw new Error("Camera is not ready. Start the camera and position your face in the frame.");
    const canvas = document.createElement("canvas");
    const scale = Math.min(1, 960 / video.videoWidth);
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.86).split(",")[1];
  };

  const submitFrame = async () => {
    if (busy) return;
    if (mode === "enroll" && (!employeeKey || !consent)) {
      setError("Select an employee and confirm their informed consent before enrollment.");
      return;
    }
    setBusy(true); setError(""); setMessage("");
    try {
      const image = captureFrame();
      const selected = employees.find(e => e.key === employeeKey);
      const endpoint = mode === "enroll" ? "/api/timesheets/face/enroll" : "/api/timesheets/face/verify";
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mode === "enroll"
          ? { image, employee: { name: selected?.name || "", employeeId: selected?.employeeId || "" }, consent: true }
          : { image })
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result?.success) {
        if (response.status === 404 || response.status === 501) throw new Error("Face recognition service is not connected yet. Configure the secure enrollment and verification API before using biometric check-in.");
        throw new Error(result?.error || (mode === "enroll" ? "Face enrollment failed." : "Face verification failed."));
      }
      if (mode === "enroll") {
        setMessage(result.message || `Face profile enrolled for ${selected?.name || "the employee"}.`);
        setConsent(false);
      } else if (result.matched && result.employee) {
        setDetectedEmployee(result.employee);
        setAttendanceResult(null);
        setMessage(`Face matched: ${result.employee.name || result.employee.employeeId}. Choose Check In or Check Out.`);
      } else {
        setError(result.message || "No matching employee was found. Try again or use the normal check-in option.");
      }
    } catch (e) {
      setError(e?.message || "Unable to process this face scan.");
    } finally {
      setBusy(false);
    }
  };

  const submitAttendanceAction = (action) => {
    if (!detectedEmployee || busy) return;
    setError("");
    const result = onAttendanceAction?.(detectedEmployee, action);
    if (result?.success) {
      setAttendanceResult({ action, time: result.time || "", message: result.message || "Attendance updated in the employee timesheet." });
      setMessage(result.message || `Successfully recorded ${action === "check-in" ? "check-in" : "check-out"}.`);
    } else {
      setAttendanceResult(null);
      setError(result?.message || "Attendance could not be recorded. Please contact an administrator.");
    }
  };

  return <section className="ts-panel ts-face-panel ts-kiosk-panel">
    <div className="ts-panel-header ts-face-panel-header"><div><h2>Employee Attendance Kiosk</h2><p>Face recognition connected to the existing employee timesheet and attendance rules.</p></div><div className="ts-face-lock-controls"><label className="ts-kiosk-lock-control"><span className="ts-kiosk-lock-label">Kiosk</span><button type="button" role="switch" aria-checked={kioskLocked} aria-label={kioskLocked ? "Unlock attendance kiosk" : "Lock attendance kiosk"} className={`ts-kiosk-lock-switch ${kioskLocked ? "is-on" : ""}`} onClick={openPinDialog}><span className="ts-kiosk-lock-action">{kioskLocked ? <><Unlock size={13}/> Unlock</> : <><Lock size={13}/> Lock</>}</span><span className="ts-kiosk-lock-switch-thumb"/></button></label></div></div>
    <div className="ts-kiosk-layout">
      <div className="ts-face-camera-card ts-kiosk-camera-card">
        <div className="ts-kiosk-camera-head"><span className="ts-face-live-pill"><i/>{cameraState === "live" ? "LIVE SCAN" : "CAMERA OFF"}</span><span className="ts-kiosk-connected"><CheckCircle2 size={15}/> Connected to Employee Timesheet</span></div>
        <div className="ts-face-mode-tabs"><button type="button" className={mode === "scan" ? "active" : ""} onClick={()=>{setMode("scan");setError("");setMessage("");setDetectedEmployee(null);setAttendanceResult(null);}}>Attendance Kiosk</button>{!kioskLocked && <button type="button" className={mode === "enroll" ? "active" : ""} onClick={()=>{setMode("enroll");setError("");setMessage("");setDetectedEmployee(null);setAttendanceResult(null);}}>Admin Face Enrollment</button>}</div>
        {mode === "enroll" && <label className="ts-face-field"><span>Employee</span><select value={employeeKey} onChange={e=>setEmployeeKey(e.target.value)}><option value="">Select employee</option>{employees.map(e=><option key={e.key} value={e.key}>{e.name}{e.employeeId ? ` • ${e.employeeId}` : ""}</option>)}</select></label>}
        <div className="ts-face-video-wrap">
          {cameraState === "live" ? <video ref={videoRef} autoPlay playsInline muted aria-label="Live face camera preview"/> : <div className="ts-face-camera-placeholder"><Camera size={54}/><strong>Employee Face Scan</strong><span>Start the camera and position your face in the centre of the frame.</span></div>}
          <div className="ts-face-corners" aria-hidden="true"><i/><i/><i/><i/></div>
        </div>
        {mode === "enroll" && <label className="ts-face-consent"><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)}/><span>I confirm this employee has been informed and has freely agreed to biometric face enrollment. They can use the standard attendance method instead.</span></label>}
        <div className="ts-face-actions ts-kiosk-camera-actions"><button type="button" className="secondary" onClick={cameraState === "live" ? stopCamera : startCamera}>{cameraState === "live" ? "Stop Camera" : "Start Camera"}</button><button type="button" className="primary" onClick={submitFrame} disabled={busy || cameraState !== "live" || (mode === "enroll" && (!employeeKey || !consent))}>{busy ? "Processing…" : mode === "enroll" ? "Capture & Register Face" : "Scan & Identify Employee"}</button></div>
        {message && <div className="ts-face-message success" role="status"><ShieldCheck size={17}/>{message}</div>}
        {error && <div className="ts-face-message error" role="alert">{error}</div>}
      </div>
      <aside className="ts-kiosk-employee-card">
        <div className="ts-kiosk-result-banner"><CheckCircle2 size={24}/><div><strong>{attendanceResult ? (attendanceResult.action === "check-in" ? "Check-In Successful" : "Check-Out Successful") : detectedEmployee ? "Employee Identified" : "Ready for Attendance"}</strong><span>{attendanceResult ? attendanceResult.message : "Scan your face to display your employee details."}</span></div></div>
        {detectedEmployee ? <>
          <div className="ts-kiosk-person"><div className="ts-kiosk-avatar"><Users size={30}/></div><div><strong>{detectedEmployee.name || "Employee"}</strong><span>Employee ID: {detectedEmployee.employeeId || "Not provided"}</span><span>{detectedEmployee.department || detectedEmployee.role || "Employee"}</span></div></div>
          <div className="ts-kiosk-meta"><span><small>Date</small><b>{todayISO()}</b></span><span><small>Time</small><b>{localTime()}</b></span></div>
          <div className="ts-kiosk-actions"><button type="button" className="ts-kiosk-checkin" onClick={()=>submitAttendanceAction("check-in")} disabled={!!attendanceResult}> <CheckCircle2 size={18}/> Check In</button><button type="button" className="ts-kiosk-checkout" onClick={()=>submitAttendanceAction("check-out")} disabled={!!attendanceResult}> <Clock3 size={18}/> Check Out</button></div>
          {attendanceResult && <div className="ts-kiosk-locked-note">This action has been recorded in the existing employee timesheet.</div>}
        </> : <div className="ts-kiosk-empty"><ScanFace size={38}/><strong>No employee detected yet</strong><span>After a successful scan, the employee name, ID, date and time will appear here.</span></div>}
        <div className="ts-kiosk-rules"><strong>Attendance protection</strong><span>• Duplicate check-ins are blocked.</span><span>• Check-out follows the current minimum / automatic duty rules.</span><span>• All attendance changes use the existing employee timesheet records.</span></div>
      </aside>
    </div>
    {pinDialog && <div className="ts-face-pin-backdrop" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget) setPinDialog(false); }}><form className="ts-face-pin-dialog" onSubmit={submitPinDialog} role="dialog" aria-modal="true" aria-labelledby="ts-face-pin-title"><div className="ts-face-pin-icon"><ShieldCheck size={22}/></div><h3 id="ts-face-pin-title">{pinMode === "lock" ? "Lock attendance kiosk" : "Unlock attendance kiosk"}</h3><p>{pinMode === "lock" ? "Enter a 4–12 digit PIN to lock the attendance kiosk. No email or account details are required." : "Enter the PIN to unlock the attendance kiosk. No email or account details are required."}</p><label><span>{pinMode === "lock" ? "Create PIN" : "Administrator PIN"}</span><input autoFocus inputMode="numeric" type="password" maxLength={12} value={pinValue} onChange={e => setPinValue(e.target.value.replace(/\D/g, "").slice(0,12))} placeholder="4–12 digits" /></label>{pinError && <div className="ts-face-pin-error" role="alert">{pinError}</div>}<div className="ts-face-pin-actions"><button type="button" className="secondary" onClick={() => setPinDialog(false)}>Cancel</button><button type="submit" className="primary">{pinMode === "lock" ? "Confirm & Lock" : "Unlock kiosk"}</button></div></form></div>}
  </section>;
}

export default FaceAttendancePanel;
