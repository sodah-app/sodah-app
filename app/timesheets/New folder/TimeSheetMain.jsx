"use client";
import "./timesheet.css";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  BarChart3, CalendarDays, FileText, Settings2, Search, CheckCircle2,
  Clock3, Users, TimerReset, DollarSign, Plus, Minus, Upload, Download,
  Printer, X, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Camera, ShieldCheck, ScanFace,
  CircleDollarSign, Sparkles, Share2, MessageCircle, Mail, SlidersHorizontal, Package, RotateCcw, Copy, Clipboard, Trash2, Rows3, Columns3, Bold, Italic, Type, Palette, Paintbrush, Undo2, ChevronsUpDown
} from "lucide-react";
import { Building2, FilePlus2, Maximize2, Minimize2, MoreHorizontal, WalletCards, Minus as MinusIcon } from "lucide-react";
import { hrs, money, todayISO } from "@/lib/time";
import FaceAttendancePanel from "./FaceRecognitionPanel";
import { GeneralSheetPanel } from "./GeneralSheet";

const WEEK = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const MAX_SHEETS = 20;
const MAX_ROWS = 50;
const ROW_GROWTH = 10;
export const MAX_COLUMNS = 30;
export const DEFAULT_CUSTOM_COLUMNS = [];

export function nextDutyDate(iso) {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + 1);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

export function blankRow(settings, i = 0) {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}-${i}`,
    name: "",
    employeeId: "",
    date: todayISO(),
    checkIn: "",
    checkOut: "",
    hours: Number(settings.defaultHours || 8),
    ot: 0,
    status: "Present",
    note: "",
    custom: {},
    workedHours: 0
  };
}

export function newSheet(number, settings) {
  return {
    id: `sheet-${Date.now()}-${number}-${Math.random().toString(36).slice(2)}`,
    name: number === 1 ? "Employee Attendance" : `Sheet ${number}`,
    tabColor: "#9ca3af",
    columns: [...DEFAULT_CUSTOM_COLUMNS],
    rows: Array.from({ length: 10 }, (_, i) => blankRow(settings, i))
  };
}

export function normalizeSheet(source, settings, index = 0) {
  const safe = source || {};
  const columns = Array.isArray(safe.columns) ? safe.columns.map((c, i) => ({
    id: c.id || `custom-${Date.now()}-${i}`,
    label: c.label || `Column ${i + 1}`,
  })).slice(0, MAX_COLUMNS) : [];
  const rows = Array.isArray(safe.rows) ? safe.rows.map((r, i) => ({
    ...blankRow(settings, i),
    ...r,
    custom: { ...(r?.custom || {}) },
    workedHours: Number(r?.workedHours || 0)
  })) : Array.from({ length: 10 }, (_, i) => blankRow(settings, i));
  return {
    ...safe,
    id: safe.id || `sheet-${Date.now()}-${index}`,
    name: safe.name || `Sheet ${index + 1}`,
    tabColor: safe.tabColor || "#9ca3af",
    columns,
    rows
  };
}

export function localTime() {
  const d = new Date();
  return d.toTimeString().slice(0,5);
}

export function dayName(iso) {
  return WEEK[new Date(`${iso}T12:00:00`).getDay()];
}

export function minutesSince(a, b) {
  if (!a || !b) return 0;
  const [ah, am] = a.split(":").map(Number);
  const [bh, bm] = b.split(":").map(Number);
  let x = ah * 60 + am, y = bh * 60 + bm;
  if (y < x) y += 1440;
  return y - x;
}

export function workedFor(row, settings) {
  if (row.status !== "Present") return 0;
  if (settings.mode === "manual") return Number(row.hours || 0);
  return hrs(row.checkIn, row.checkOut);
}

export function actualWorkedFor(row) {
  if (row.status !== "Present") return 0;
  const accumulated = Number(row.workedHours || 0);
  if (!row.checkIn) return accumulated;
  return accumulated + hrs(row.checkIn, row.checkOut || localTime());
}

export function earningFor(row, settings) {
  if (!row.name && !row.employeeId) return 0;
  if (row.status === "Off-day") return Number(settings.offDayEarning || 0);
  if (row.status === "Absent") return Number(settings.absentEarning || 0);
  const actualHours = actualWorkedFor(row);
  return actualHours * Number(settings.defaultHourlyRate || 0)
    + Number(row.ot || 0) * Number(settings.otRate || 0);
}

export function expectedEarningFor(row, settings) {
  if (row.status === "Off-day") return Number(settings.offDayEarning || 0);
  if (row.status === "Absent") return Number(settings.absentEarning || 0);
  return Number(row.hours || settings.defaultHours || 0) * Number(settings.defaultHourlyRate || 0)
    + Number(row.ot || 0) * Number(settings.otRate || 0);
}

export function shiftEndFromStart(start, hours) {
  const [h, m] = String(start || "08:00").split(":").map(Number);
  const total = ((h || 0) * 60 + (m || 0) + Number(hours || 0) * 60) % 1440;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

export function weekStartISO(iso) {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() - d.getDay());
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

export function weekEndISO(iso) {
  const d = new Date(`${weekStartISO(iso)}T12:00:00`);
  d.setDate(d.getDate() + 6);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

export function monthStartISO(iso) {
  const d = new Date(`${iso}T12:00:00`);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-01`;
}

export function monthEndISO(iso) {
  const d = new Date(`${iso}T12:00:00`);
  d.setMonth(d.getMonth() + 1, 0);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0,10);
}

export function hourShortFor(row, settings) {
  if (row.status !== "Present") return 0;
  if (settings.mode !== "automatic") return 0;
  return Math.max(0, Number(row.hours || 0) - workedFor(row, settings));
}

export function createEquipmentRow(i = 0) {
  return {
    id: `equipment-${Date.now()}-${Math.random().toString(36).slice(2)}-${i}`,
    item: "",
    name: "",
    employeeId: "",
    date: todayISO(),
    givenAt: "",
    returnedAt: null,
    status: "Ready",
    actionState: "give",
    custom: {}
  };
}

export function normalizeEquipmentSheet(source, index = 0) {
  const safe = source || {};
  const columns = Array.isArray(safe.columns) ? safe.columns.map((c, i) => ({
    id: c.id || `equipment-custom-${Date.now()}-${i}`,
    label: c.label || `Column ${i + 1}`,
  })).slice(0, MAX_COLUMNS) : [];
  const rows = Array.isArray(safe.rows) ? safe.rows.map((r, i) => ({
    ...createEquipmentRow(i),
    ...r,
    custom: { ...(r?.custom || {}) }
  })) : Array.from({ length: 8 }, (_, i) => createEquipmentRow(i));
  return { ...safe, id: safe.id || `equipment-sheet-${Date.now()}-${index}`, name: safe.name || `Sheet ${index + 1}`, columns, rows };
}


const DEFAULT_SETTINGS = {
  companyName: "Sodah.io",
  agencyName: "Agency",
  currency: "USD",
  defaultHourlyRate: 0,
  defaultHours: 8,
  otRate: 30,
  minimumCheckoutMinutes: 30,
  mode: "manual",
  autoRule: "hour-to-hour",
  workStart: "08:00",
  workEnd: "16:00",
  offDayEarning: 0,
  absentEarning: 0,
  accent: "#10B981",
  accent2: "#2563EB",
  showEmployeeId: true,
  theme: "light",
  backgroundTheme: "blue"
};

const DARK_PALETTES = {
  blue: { label: "Light Blue", bg: "#061522", surface: "#0b2235", surface2: "#123b59", accent: "#8fd3ff", border: "rgba(255,255,255,.42)" },
  black: { label: "Black", bg: "#050505", surface: "#0d0d0d", surface2: "#181818", accent: "#ffffff", border: "rgba(255,255,255,.38)" },
  green: { label: "Green", bg: "#061a14", surface: "#0a2a20", surface2: "#104435", accent: "#67e8b5", border: "rgba(255,255,255,.38)" },
  gray: { label: "Gray", bg: "#15181c", surface: "#20252b", surface2: "#2c333b", accent: "#d7dde4", border: "rgba(255,255,255,.42)" }
};

import { AnalyticsPanel } from "./AnalyticsPanel";
import { SettingsPanel } from "./SettingsPanel";
import { ReportsPanel } from "./ReportsPanel";
const { CalendarPanel } = (() => {
const WEEK = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

function PanelHeader({title,subtitle,onClose}) { return <div className="ts-panel-header"><div><h2>{title}</h2><p>{subtitle}</p></div><button onClick={onClose}><X size={18}/></button></div>; }
function Stat({color,icon:Icon,label,value}) { return <div className={`ts-stat ${color}`}><div className="ts-stat-icon"><Icon size={20}/></div><span>{label}</span><strong>{value}</strong></div>; }
function Setting({label,children}) { return <label className="ts-setting"><span>{label}</span>{children}</label>; }
function ReportMetric({icon:Icon,label,value}) { return <div className="ts-report-metric"><Icon size={18}/><span>{label}</span><strong>{value}</strong></div>; }
function CalendarMini({date,cursor,setCursor,onSelect}) {
  const WEEK=["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
  const first=new Date(cursor.getFullYear(),cursor.getMonth(),1),start=new Date(first);start.setDate(1-first.getDay());
  return <div><div className="ts-mini-nav"><button onClick={()=>setCursor(new Date(cursor.getFullYear(),cursor.getMonth()-1,1) )}><ChevronLeft/></button><b>{cursor.toLocaleDateString("en-US",{month:"long",year:"numeric"})}</b><button onClick={()=>setCursor(new Date(cursor.getFullYear(),cursor.getMonth()+1,1) )}><ChevronRight/></button></div><div className="ts-mini-grid">{WEEK.map(d=><span key={d}>{d.slice(0,1)}</span>)}{Array.from({length:42},(_,i)=>{let d=new Date(start);d.setDate(start.getDate()+i);let iso=new Date(d-d.getTimezoneOffset()*60000).toISOString().slice(0,10);return <button key={iso} className={iso===date?"selected":d.getMonth()===cursor.getMonth()?"":"muted"} onClick={()=>onSelect(iso)}>{d.getDate()}</button>})}</div></div>;
}
function CalendarPanel({rows,cursor,setCursor,onClose,onSelect}) {
  const first = new Date(cursor.getFullYear(),cursor.getMonth(),1);
  const start = new Date(first); start.setDate(1-first.getDay());
  const cells = Array.from({length:42},(_,i)=>{const d=new Date(start);d.setDate(start.getDate()+i);const iso=new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,10);return {d,iso,current:d.getMonth()===cursor.getMonth(),count:rows.filter(r=>r.date===iso).length};});
  return <section className="ts-panel">
    <PanelHeader title="Calendar" subtitle="Select a day to open its exact attendance record" onClose={onClose}/>
    <div className="ts-calendar-head"><button onClick={()=>setCursor(new Date(cursor.getFullYear(),cursor.getMonth()-1,1) )}><ChevronLeft/></button><strong>{cursor.toLocaleDateString("en-US",{month:"long",year:"numeric"})}</strong><button onClick={()=>setCursor(new Date(cursor.getFullYear(),cursor.getMonth()+1,1) )}><ChevronRight/></button></div>
    <div className="ts-calendar-grid">{WEEK.map(d=><div className="ts-cal-week" key={d}>{d.slice(0,3)}</div>)}{cells.map(c=><button key={c.iso} className={`ts-cal-day ${c.current?"":"muted"} ${c.count?"has":""}`} onClick={()=>onSelect(c.iso )}><b>{c.d.getDate()}</b>{c.count>0&&<span>{c.count} record{c.count>1?"s":""}</span>}</button>)}</div>
  </section>;
}
return { CalendarPanel };
})();

const { EquipmentPanel } = (() => {
function PanelHeader({title,subtitle,onClose}) { return <div className="ts-panel-header"><div><h2>{title}</h2><p>{subtitle}</p></div><button onClick={onClose}><X size={18}/></button></div>; }
function Stat({color,icon:Icon,label,value}) { return <div className={`ts-stat ${color}`}><div className="ts-stat-icon"><Icon size={20}/></div><span>{label}</span><strong>{value}</strong></div>; }
function Setting({label,children}) { return <label className="ts-setting"><span>{label}</span>{children}</label>; }
function ReportMetric({icon:Icon,label,value}) { return <div className="ts-report-metric"><Icon size={18}/><span>{label}</span><strong>{value}</strong></div>; }
function CalendarMini({date,cursor,setCursor,onSelect}) {
  const WEEK=["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
  const first=new Date(cursor.getFullYear(),cursor.getMonth(),1),start=new Date(first);start.setDate(1-first.getDay());
  return <div><div className="ts-mini-nav"><button onClick={()=>setCursor(new Date(cursor.getFullYear(),cursor.getMonth()-1,1) )}><ChevronLeft/></button><b>{cursor.toLocaleDateString("en-US",{month:"long",year:"numeric"})}</b><button onClick={()=>setCursor(new Date(cursor.getFullYear(),cursor.getMonth()+1,1) )}><ChevronRight/></button></div><div className="ts-mini-grid">{WEEK.map(d=><span key={d}>{d.slice(0,1)}</span>)}{Array.from({length:42},(_,i)=>{let d=new Date(start);d.setDate(start.getDate()+i);let iso=new Date(d-d.getTimezoneOffset()*60000).toISOString().slice(0,10);return <button key={iso} className={iso===date?"selected":d.getMonth()===cursor.getMonth()?"":"muted"} onClick={()=>onSelect(iso)}>{d.getDate()}</button>})}</div></div>;
}
function EquipmentPanel({rows,sheets,equipmentSheets,activeEquipmentSheetId,onSelectSheet,onUpdate,onAction,onAdd,onRemove,onAddColumn,onRemoveColumn,onUpdateColumn,onUpdateCell,onClose,onImportNames,onAddSheet}) {
  const [sourceSheetId, setSourceSheetId] = useState(sheets?.[0]?.id || "");
  const activeEquipmentSheet = equipmentSheets?.find(s => s.id === activeEquipmentSheetId) || equipmentSheets?.[0];
  useEffect(() => {
    if (!sourceSheetId && sheets?.[0]?.id) setSourceSheetId(sheets[0].id);
    if (sourceSheetId && !sheets?.some(s => s.id === sourceSheetId)) setSourceSheetId(sheets?.[0]?.id || "");
  }, [sheets, sourceSheetId]);
  // Every issued item counts as "Given Out", including items already returned.
  // Pending Return contains only items that are currently assigned/out.
  const givenOut = rows.filter(r => r.status === "Pending Return" || r.status === "Returned").length;
  const returned = rows.filter(r => r.status === "Returned").length;
  const pending = rows.filter(r => r.status === "Pending Return").length;

  return <section className="ts-panel ts-equipment-panel">
    <PanelHeader title="Employee Tools & Device Register" subtitle="Give out company tools, track assignments and record returns." onClose={onClose}/>

    <div className="ts-equipment-stats">
      <button type="button" className="ts-equipment-stat given"><span>Items Given Out</span><strong>{givenOut}</strong></button>
      <button type="button" className="ts-equipment-stat returned"><span>Items Returned</span><strong>{returned}</strong></button>
      <button type="button" className="ts-equipment-stat pending"><span>Pending Return</span><strong>{pending}</strong></button>
    </div>

    <div className="ts-equipment-toolbar">
      <button type="button" className="ts-equipment-main-btn add" onClick={onAdd}><Plus size={16}/> Add Item</button>
      <button type="button" className="ts-equipment-main-btn remove" onClick={onRemove} disabled={!rows.length}><Minus size={16}/> Remove Item</button>
      <button type="button" className="ts-equipment-main-btn add" onClick={onAddColumn} title="Add a new custom column immediately after Employee ID"><Plus size={16}/> Add Column</button>
      <button type="button" className="ts-equipment-main-btn remove" onClick={onRemoveColumn} disabled={!activeEquipmentSheet?.columns?.length}><Minus size={16}/> Remove Column</button>
      <div className="ts-equipment-sheet-tabs" aria-label="Tool sheets">
        {(equipmentSheets || []).map(sheet => <button type="button" key={sheet.id} className={sheet.id === activeEquipmentSheetId ? "active" : ""} onClick={()=>onSelectSheet(sheet.id)}>{sheet.name}</button>)}
        <button type="button" className="ts-equipment-add-sheet" onClick={onAddSheet} aria-label="Add tool sheet" title="Add sheet"><Plus size={18}/></button>
      </div>
      <div className="ts-equipment-import-names">
        <select value={sourceSheetId} onChange={e=>setSourceSheetId(e.target.value)} aria-label="Select employee sheet">
          <option value="">Select employee sheet</option>
          {(sheets || []).map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <button type="button" className="ts-equipment-main-btn import" onClick={()=>onImportNames(sourceSheetId)} disabled={!sourceSheetId}><Users size={16}/> Import Names</button>
      </div>
    </div>

    <div className="ts-equipment-table-wrap">
      <table className="ts-equipment-table">
        <thead><tr><th>GIVE OUT / RETURN</th><th>TOOL / DEVICE</th><th>EMPLOYEE NAME</th><th>EMPLOYEE ID</th>{/* CUSTOM COLUMNS ARE INSERTED HERE — immediately after Employee ID. */}{(activeEquipmentSheet?.columns || []).map(c => <th key={c.id} className="ts-custom-header"><div className="ts-custom-head-inner"><input value={c.label} onChange={e=>onUpdateColumn(c.id,e.target.value)} title="Edit column name"/></div></th>)}<th>DATE</th><th>HOUR</th><th>STATUS</th></tr></thead>
        <tbody>
          {rows.map((r,i)=><tr key={r.id || i}>
            <td><button type="button" className={`ts-equipment-action ${r.actionState === "return" ? "return" : "give"}`} onClick={()=>onAction(r)}>{r.actionState === "return" ? <><RotateCcw size={15}/> Return</> : <><Package size={15}/> Give Out</>}</button></td>
            <td><input aria-label="Tool or device" className="ts-cell" value={r.item || ""} onChange={e=>onUpdate(r.id,"item",e.target.value)} /></td>
            <td><input aria-label="Employee name" className="ts-cell" value={r.name || ""} onChange={e=>onUpdate(r.id,"name",e.target.value)} /></td>
            <td><input aria-label="Employee ID" className="ts-cell" value={r.employeeId || ""} onChange={e=>onUpdate(r.id,"employeeId",e.target.value)} /></td>
            {(activeEquipmentSheet?.columns || []).map(c => <td key={c.id}><input className="ts-cell" value={r.custom?.[c.id] ?? ""} onChange={e=>onUpdateCell(r.id,c.id,e.target.value)} /></td>)}
            <td>{r.date || ""}</td>
            <td>{r.givenAt || ""}</td>
            <td><span className={`ts-equipment-status ${r.status === "Pending Return" ? "pending" : r.status === "Returned" ? "returned" : "ready"}`}>{r.status || ""}</span></td>
          </tr>)}
        </tbody>
      </table>
    </div>

    {/* Bottom controls for the Tools table — Add Column is intentionally here
        beside the row/item controls. New columns render after Employee ID. */}
    <div className="ts-bottom-tools ts-spreadsheet-tools ts-equipment-bottom-tools">
      <button type="button" onClick={onAdd}><Plus size={15}/> Add Row</button>
      <button type="button" onClick={onRemove} disabled={!rows.length}><Minus size={15}/> Remove Row</button>
      <button
        type="button"
        className="ts-add-column-bottom"
        onClick={onAddColumn}
        title="Add a new column after Employee ID"
      >
        <Plus size={15}/> Add Column
      </button>
      <button
        type="button"
        onClick={onRemoveColumn}
        disabled={!activeEquipmentSheet?.columns?.length}
        title="Remove the last custom column"
      >
        <Minus size={15}/> Remove Column
      </button>
    </div>
  </section>;
}
return { EquipmentPanel };
})();





export default function TimeSheetMain() {
  // General Sheet now provides range selection, cell formatting and a persistent trash bin.

  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [sheets, setSheets] = useState([]);
  const [activeId, setActiveId] = useState("");
  const [openPanel, setOpenPanel] = useState("general");
  const [sheetMenuOpen, setSheetMenuOpen] = useState(false);
  const [sodaToolsOpen, setSodaToolsOpen] = useState(false);
  const [faceKioskLocked, setFaceKioskLocked] = useState(() => { try { return localStorage.getItem("sodah-face-kiosk-locked") === "1"; } catch { return false; } });
  useEffect(() => { try { localStorage.setItem("sodah-face-kiosk-locked", faceKioskLocked ? "1" : "0"); } catch {} }, [faceKioskLocked]);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  const cloudReadyRef = useRef(false);
  const sodaToolsRef = useRef(null);
  const [sheetTabMenu, setSheetTabMenu] = useState(null);
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState(null);
  const [celebrate, setCelebrate] = useState(null);
  const [clock, setClock] = useState(null);
  const [clockReady, setClockReady] = useState(false);
  const [selectedDate, setSelectedDate] = useState(todayISO());
  const [equipmentSheets, setEquipmentSheets] = useState([]);
  const [activeEquipmentSheetId, setActiveEquipmentSheetId] = useState("");
  const [reportPeriod, setReportPeriod] = useState("weekly");
  const [reportDay, setReportDay] = useState(todayISO());
  const [reportEmployee, setReportEmployee] = useState("all");
  const [reportMore, setReportMore] = useState(false);
  const [reportText, setReportText] = useState("");
  useEffect(() => {
    const closeMenu = (event) => { if (sodaToolsRef.current && !sodaToolsRef.current.contains(event.target)) setSodaToolsOpen(false); };
    const closeOnEscape = (event) => { if (event.key === "Escape") setSodaToolsOpen(false); };
    document.addEventListener("pointerdown", closeMenu, true);
    document.addEventListener("keydown", closeOnEscape);
    return () => { document.removeEventListener("pointerdown", closeMenu, true); document.removeEventListener("keydown", closeOnEscape); };
  }, []);
  const [calendarCursor, setCalendarCursor] = useState(new Date());
  const [attendanceTrash, setAttendanceTrash] = useState([]);
  const [binOpen, setBinOpen] = useState(false);
  const [attendanceSelection, setAttendanceSelection] = useState({ start: { row: 0, col: 0 }, end: { row: 0, col: 0 } });
  const [attendanceDragging, setAttendanceDragging] = useState(false);
  const [attendanceClipboard, setAttendanceClipboard] = useState(null);
  const [attendanceSelectedSheetIds, setAttendanceSelectedSheetIds] = useState([]);
  const [toolbarFontSize, setToolbarFontSize] = useState(12);
  const [toolbarFont, setToolbarFont] = useState("Inter, Arial, sans-serif");
  const [toolbarTextColor, setToolbarTextColor] = useState("");
  const [toolbarFillColor, setToolbarFillColor] = useState("");
  const [freezeHeader, setFreezeHeader] = useState(true);
  const [pageScrolled, setPageScrolled] = useState(false);
  const importRef = useRef(null);

  const saveWorkspaceCloud = async (partial) => {
    try {
      const response = await fetch("/api/timesheet-workspace", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(partial) });
      if (!response.ok) console.warn("Timesheet cloud save was rejected", await response.text());
    } catch (error) { console.warn("Timesheet cloud save failed; local copy remains available", error); }
  };

  useEffect(() => {
    const onScroll = () => setPageScrolled(window.scrollY > 34);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const tick = () => { setClock(new Date()); setClockReady(true); };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    try {
      const savedSettings = JSON.parse(localStorage.getItem("sodah-timesheet-settings") || "null");
      const savedSheets = JSON.parse(localStorage.getItem("sodah-timesheet-sheets") || "null");
      const savedEquipment = JSON.parse(localStorage.getItem("sodah-timesheet-equipment") || "null");
      const savedEquipmentSheets = JSON.parse(localStorage.getItem("sodah-timesheet-equipment-sheets") || "null");
      const savedAttendanceTrash = JSON.parse(localStorage.getItem("sodah-timesheet-sheet-trash-v1") || "[]");
      setAttendanceTrash(Array.isArray(savedAttendanceTrash) ? savedAttendanceTrash : []);
      let s = { ...DEFAULT_SETTINGS, ...(savedSettings || {}) };
      if (!DARK_PALETTES[s.backgroundTheme]) s.backgroundTheme = "blue";
      if (s.mode === "automatic") {
        s.workEnd = shiftEndFromStart(s.workStart, s.defaultHours);
      }
      setSettings(s);
      if (Array.isArray(savedEquipmentSheets) && savedEquipmentSheets.length) {
        const finalEquipmentSheets = savedEquipmentSheets.slice(0,20).map((item, i) => normalizeEquipmentSheet(item, i));
        setEquipmentSheets(finalEquipmentSheets);
        setActiveEquipmentSheetId(finalEquipmentSheets[0].id);
      } else {
        const legacyRows = Array.isArray(savedEquipment) ? savedEquipment : [];
        const firstEquipmentSheet = {
          id: `equipment-sheet-${Date.now()}`,
          name: "Sheet 1",
          columns: [],
          rows: legacyRows.length ? legacyRows.map((r,i)=>({ ...makeEquipmentRow(i), ...r, custom: { ...(r?.custom || {}) } })) : Array.from({ length: 8 }, (_, i) => makeEquipmentRow(i))
        };
        setEquipmentSheets([firstEquipmentSheet]);
        setActiveEquipmentSheetId(firstEquipmentSheet.id);
      }
      if (Array.isArray(savedSheets) && savedSheets.length) {
        const finalSheets = savedSheets.slice(0, MAX_SHEETS).map((item, i) => {
          const normalized = normalizeSheet(item, s, i);
          if (i === 0 && (!normalized.name || normalized.name === "Sheet 1")) normalized.name = "Employee Attendance";
          if (i === 1 && (!normalized.name || normalized.name === "Sheet 2")) normalized.name = "Employee Attendance 2";
          return normalized;
        });
        if (finalSheets.length < 2) {
          const second = newSheet(2, s);
          second.name = "Employee Attendance 2";
          finalSheets.push(second);
        }
        setSheets(finalSheets);
        setActiveId(finalSheets[0].id);
      } else {
        const first = newSheet(1, s);
        const second = newSheet(2, s);
        second.name = "Employee Attendance 2";
        setSheets([first, second]);
        setActiveId(first.id);
      }
    } catch {
      const first = newSheet(1, DEFAULT_SETTINGS);
      const second = newSheet(2, DEFAULT_SETTINGS);
      second.name = "Employee Attendance 2";
      setSheets([first, second]);
      setActiveId(first.id);
    }
  }, []);

  // Restore the authenticated user's server-side workspace after local recovery.
  // Never write the initial empty React state over the cloud copy.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch("/api/timesheet-workspace", { cache: "no-store" });
        if (!response.ok) return;
        const result = await response.json();
        const cloud = result?.workspace || {};
        if (cancelled) return;
        if (cloud.settings && typeof cloud.settings === "object") setSettings({ ...DEFAULT_SETTINGS, ...cloud.settings });
        if (Array.isArray(cloud.sheets) && cloud.sheets.length) {
          const restored = cloud.sheets.slice(0, MAX_SHEETS).map((item, i) => normalizeSheet(item, { ...DEFAULT_SETTINGS, ...(cloud.settings || {}) }, i));
          setSheets(restored); setActiveId(prev => restored.some(x => x.id === prev) ? prev : restored[0].id);
        }
        if (Array.isArray(cloud.attendanceTrash)) setAttendanceTrash(cloud.attendanceTrash);
        if (Array.isArray(cloud.equipmentSheets) && cloud.equipmentSheets.length) {
          const restoredEquipment = cloud.equipmentSheets.slice(0,20).map((item,i)=>normalizeEquipmentSheet(item,i));
          setEquipmentSheets(restoredEquipment); setActiveEquipmentSheetId(prev => restoredEquipment.some(x=>x.id===prev) ? prev : restoredEquipment[0].id);
        }
        if (Array.isArray(cloud.equipmentRows)) {
          // Preserve legacy equipment records if the newer sheet collection is absent.
          if (!Array.isArray(cloud.equipmentSheets) || !cloud.equipmentSheets.length) setEquipmentSheets([{ id:`equipment-sheet-${Date.now()}`, name:"Sheet 1", columns:[], rows:cloud.equipmentRows }]);
        }
      } catch (error) { console.warn("Timesheet cloud restore unavailable; local data retained", error); }
      finally {
        if (!cancelled) {
          cloudReadyRef.current = true;
          // Trigger debounced upload of recovered local data when this is a new cloud workspace.
          setSheets(current => [...current]);
          setSettings(current => ({ ...current }));
          setAttendanceTrash(current => [...current]);
          setEquipmentSheets(current => [...current]);
        }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (sheets.length) localStorage.setItem("sodah-timesheet-sheets", JSON.stringify(sheets));
    if (!autoSaveEnabled || !cloudReadyRef.current || !sheets.length) return;
    const timer = window.setTimeout(() => saveWorkspaceCloud({ sheets }), 700);
    return () => window.clearTimeout(timer);
  }, [sheets, autoSaveEnabled]);

  useEffect(() => {
    localStorage.setItem("sodah-timesheet-sheet-trash-v1", JSON.stringify(attendanceTrash));
    if (!autoSaveEnabled || !cloudReadyRef.current) return;
    const timer = window.setTimeout(() => saveWorkspaceCloud({ attendanceTrash }), 700);
    return () => window.clearTimeout(timer);
  }, [attendanceTrash, autoSaveEnabled]);

  const activeEquipmentSheet = equipmentSheets.find(s => s.id === activeEquipmentSheetId) || equipmentSheets[0];
  const equipmentRows = activeEquipmentSheet?.rows || [];

  useEffect(() => {
    localStorage.setItem("sodah-timesheet-equipment-sheets", JSON.stringify(equipmentSheets));
    localStorage.setItem("sodah-timesheet-equipment", JSON.stringify(equipmentRows));
    if (!autoSaveEnabled || !cloudReadyRef.current || !equipmentSheets.length) return;
    const timer = window.setTimeout(() => saveWorkspaceCloud({ equipmentSheets, equipmentRows }), 700);
    return () => window.clearTimeout(timer);
  }, [equipmentSheets, equipmentRows, autoSaveEnabled]);

  useEffect(() => {
    localStorage.setItem("sodah-timesheet-settings", JSON.stringify(settings));
    const timer = autoSaveEnabled && cloudReadyRef.current
      ? window.setTimeout(() => saveWorkspaceCloud({ settings }), 700)
      : null;
    document.documentElement.style.setProperty("--ts-accent", settings.accent);
    document.documentElement.style.setProperty("--ts-accent-2", settings.accent2);
    return () => { if (timer) window.clearTimeout(timer); };
  }, [settings, autoSaveEnabled]);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("sodah-timesheet-dark", settings.theme === "dark");
    document.body.classList.toggle("sodah-timesheet-dark-body", settings.theme === "dark");
    return () => {
      root.classList.remove("sodah-timesheet-dark");
      document.body.classList.remove("sodah-timesheet-dark-body");
    };
  }, [settings.theme]);

  useEffect(() => {
    if (settings.mode !== "automatic") return;
    const nextEnd = shiftEndFromStart(settings.workStart, settings.defaultHours);
    if (settings.workEnd !== nextEnd) {
      setSettings(s => ({ ...s, workEnd: nextEnd }));
    }
    setSheets(prev => prev.map(s => ({
      ...s,
      rows: s.rows.map(r => ({ ...r, hours: Number(settings.defaultHours || r.hours || 8) }))
    })));
  }, [settings.mode, settings.defaultHours, settings.workStart]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2800);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    if (!celebrate) return;
    const t = setTimeout(() => setCelebrate(null), 3800);
    return () => clearTimeout(t);
  }, [celebrate]);

  const sheet = sheets.find(s => s.id === activeId) || sheets[0];

  const updateSheet = (fn) => {
    if (!sheet) return;
    setSheets(prev => prev.map(s => s.id === sheet.id ? fn(s) : s));
  };

  const employees = useMemo(() => {
    const seen = new Map();
    sheets.flatMap(s => s.rows).forEach(r => {
      if (r.name || r.employeeId) {
        const key = (r.employeeId || r.name).toLowerCase();
        if (!seen.has(key)) seen.set(key, r);
      }
    });
    return [...seen.values()];
  }, [sheets]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return sheet?.rows || [];
    return (sheet?.rows || []).filter(r =>
      (r.name || "").toLowerCase().includes(q) ||
      (r.employeeId || "").toLowerCase().includes(q)
    );
  }, [sheet, search]);

  const totals = useMemo(() => {
    const rows = sheets.flatMap(s => s.rows);
    const namedRows = rows.filter(r => r.name || r.employeeId);
    return {
      employees: new Set(rows.map(r => r.employeeId || r.name).filter(Boolean)).size,
      worked: rows.reduce((a,r) => a + actualWorkedFor(r), 0),
      scheduled: namedRows.filter(r => r.status !== "Absent").reduce((a,r) => a + Number(r.hours || settings.defaultHours || 0), 0),
      ot: rows.reduce((a,r) => a + Number(r.ot || 0), 0),
      absents: rows.filter(r => r.status === "Absent").length,
      earning: rows.reduce((a,r) => a + earningFor(r, settings), 0),
      expectedEarning: namedRows.reduce((a,r) => a + expectedEarningFor(r, settings), 0)
    };
  }, [sheets, settings]);

  const notify = (title, message, type = "success") => setToast({ title, message, type });

  const makeEquipmentSeed = (i = 0) => ({
    id: `equipment-${Date.now()}-seed-${i}`, item: "", name: "", employeeId: "", date: todayISO(), givenAt: "", returnedAt: null, status: "Ready", actionState: "give", custom: {}
  });

  const makeEquipmentRow = (i = 0) => createEquipmentRow(i);

  const updateEquipmentRow = (id, key, value) => {
    if (!activeEquipmentSheet) return;
    setEquipmentSheets(prev => prev.map(sheet => sheet.id === activeEquipmentSheet.id
      ? { ...sheet, rows: sheet.rows.map(r => r.id === id ? { ...r, [key]: value } : r) }
      : sheet));
  };

  const equipmentAction = (row) => {
    if (!row.name && !row.employeeId) {
      notify("Employee required", "Enter the employee name or employee ID before giving out an item.", "error");
      return;
    }
    if (!row.item) {
      notify("Item required", "Enter the tool or device name before giving it out.", "error");
      return;
    }
    const now = new Date();
    const time = now.toTimeString().slice(0,5);
    setEquipmentSheets(prev => prev.map(sheet => {
      if (sheet.id !== activeEquipmentSheet?.id) return sheet;
      return { ...sheet, rows: sheet.rows.map(r => r.id !== row.id ? r : row.actionState === "return"
        ? { ...r, returnedAt: Date.now(), status: "Returned", actionState: "give" }
        : { ...r, date: todayISO(), givenAt: time, returnedAt: null, status: "Pending Return", actionState: "return" }
      )};
    }));
    notify(row.actionState === "return" ? "Item returned" : "Item given out", row.actionState === "return"
      ? `${row.item} has been marked as returned.`
      : `${row.item} is now assigned to ${row.name || row.employeeId}.`);
  };

  const addEquipmentRow = () => {
    if (!activeEquipmentSheet) return;
    setEquipmentSheets(prev => prev.map(sheet => sheet.id === activeEquipmentSheet.id
      ? { ...sheet, rows: [...sheet.rows, makeEquipmentRow(sheet.rows.length)] }
      : sheet));
  };

  const removeEquipmentRow = () => {
    if (!activeEquipmentSheet) return;
    setEquipmentSheets(prev => prev.map(sheet => sheet.id === activeEquipmentSheet.id
      ? { ...sheet, rows: sheet.rows.slice(0, -1) }
      : sheet));
  };

  const addEquipmentColumn = () => {
    if (!activeEquipmentSheet) return;
    if ((activeEquipmentSheet.columns || []).length >= MAX_COLUMNS) {
      notify("Column limit reached", `A maximum of ${MAX_COLUMNS} custom columns is allowed per sheet.`, "error");
      return;
    }
    const label = window.prompt("New tool-sheet column name", `Column ${(activeEquipmentSheet.columns || []).length + 1}`);
    if (!label?.trim()) return;
    const column = { id: `equipment-custom-${Date.now()}-${Math.random().toString(36).slice(2)}`, label: label.trim() };
    setEquipmentSheets(prev => prev.map(sheet => sheet.id === activeEquipmentSheet.id
      ? { ...sheet, columns: [...(sheet.columns || []), column], rows: sheet.rows.map(r => ({ ...r, custom: { ...(r.custom || {}), [column.id]: "" } })) }
      : sheet));
    notify("Column added", `${column.label} was added to ${activeEquipmentSheet.name}.`);
  };

  const removeEquipmentColumn = () => {
    if (!activeEquipmentSheet?.columns?.length) { notify("No custom columns", "Add a custom column first.", "error"); return; }
    const column = activeEquipmentSheet.columns[activeEquipmentSheet.columns.length - 1];
    if (!window.confirm(`Remove the last custom column “${column.label}”?`)) return;
    setEquipmentSheets(prev => prev.map(sheet => sheet.id === activeEquipmentSheet.id
      ? { ...sheet, columns: sheet.columns.slice(0, -1), rows: sheet.rows.map(r => { const custom = { ...(r.custom || {}) }; delete custom[column.id]; return { ...r, custom }; }) }
      : sheet));
    notify("Column removed", `${column.label} was removed.`);
  };

  const updateEquipmentColumn = (columnId, value) => {
    if (!activeEquipmentSheet) return;
    setEquipmentSheets(prev => prev.map(sheet => sheet.id === activeEquipmentSheet.id
      ? { ...sheet, columns: (sheet.columns || []).map(c => c.id === columnId ? { ...c, label: value } : c) }
      : sheet));
  };

  const updateEquipmentCell = (rowId, columnId, value) => {
    if (!activeEquipmentSheet) return;
    setEquipmentSheets(prev => prev.map(sheet => sheet.id === activeEquipmentSheet.id
      ? { ...sheet, rows: sheet.rows.map(r => r.id === rowId ? { ...r, custom: { ...(r.custom || {}), [columnId]: value } } : r) }
      : sheet));
  };

  const addEquipmentSheet = () => {
    if (equipmentSheets.length >= MAX_SHEETS) {
      notify("Sheet limit reached", `A maximum of ${MAX_SHEETS} tool sheets is allowed.`, "error");
      return;
    }
    const next = { id: `equipment-sheet-${Date.now()}-${equipmentSheets.length + 1}`, name: `Sheet ${equipmentSheets.length + 1}`, columns: [], rows: Array.from({ length: 8 }, (_, i) => makeEquipmentRow(i)) };
    setEquipmentSheets(prev => [...prev, next]);
    setActiveEquipmentSheetId(next.id);
  };

  const importEquipmentNames = (sheetId) => {
    const source = sheets.find(s => s.id === sheetId);
    if (!source || !activeEquipmentSheet) {
      notify("Select a sheet", "Choose an existing employee sheet before importing names.", "error");
      return;
    }
    const existing = new Set(activeEquipmentSheet.rows.map(r => (r.employeeId || r.name || "").toLowerCase()).filter(Boolean));
    const imported = [];
    source.rows.forEach(r => {
      const name = String(r.name || "").trim();
      const employeeId = String(r.employeeId || "").trim();
      if (!name && !employeeId) return;
      const key = (employeeId || name).toLowerCase();
      if (existing.has(key)) return;
      existing.add(key);
      imported.push({ ...makeEquipmentRow(imported.length), name, employeeId });
    });
    if (!imported.length) {
      notify("No new employees", "All employees from the selected sheet are already in this Tools sheet.", "error");
      return;
    }
    setEquipmentSheets(prev => prev.map(sheet => sheet.id === activeEquipmentSheet.id ? { ...sheet, rows: [...sheet.rows, ...imported] } : sheet));
    notify("Names imported", `${imported.length} employee(s) added from ${source.name}.`);
  };

  const checkAction = (row, targetSheetId = activeId) => {
    const updateTargetSheet = (fn) => setSheets(prev => prev.map(item => item.id === targetSheetId ? fn(item) : item));
    if (!row.name && !row.employeeId) {
      notify("Employee required", "Enter the employee name or employee ID before checking in.", "error");
      return false;
    }

    const now = localTime();

    // A completed shift is ready to start another check-in. The previous
    // worked time remains stored on the same day and is accumulated.
    if (row.checkOut) {
      updateTargetSheet(s => ({
        ...s,
        rows: s.rows.map(r => r.id === row.id ? {
          ...r,
          checkIn: now,
          checkOut: "",
          status: "Present"
        } : r)
      }));
      notify("Check-in successful", `${row.name || row.employeeId} checked in again at ${now}. Previous hours remain recorded for ${row.date}.`);
      return true;
    }

    if (!row.checkIn) {
      updateTargetSheet(s => ({
        ...s,
        rows: s.rows.map(r => r.id === row.id ? {
          ...r,
          checkIn: now,
          checkOut: "",
          status: "Present"
        } : r)
      }));
      notify("Check-in successful", `${row.name || row.employeeId} checked in at ${now}.`);
      return true;
    }

    const elapsed = minutesSince(row.checkIn, now);
    const required = settings.mode === "manual"
      ? Number(settings.minimumCheckoutMinutes || 30)
      : Number(settings.defaultHours || row.hours || 8) * 60;

    if (elapsed < required) {
      const remaining = required - elapsed;
      notify(
        "Check-out not available",
        settings.mode === "automatic"
          ? `Automatic mode requires the full ${row.hours || settings.defaultHours} hour duty period. ${Math.ceil(remaining / 60)} hour(s) remaining.`
          : `You cannot check out yet. Please wait ${remaining} minute(s).`,
        "error"
      );
      return false;
    }

    const previousWorked = Number(row.workedHours || 0);
    const shiftWorked = hrs(row.checkIn, now);
    const totalWorked = previousWorked + shiftWorked;
    const checked = { ...row, checkOut: now, workedHours: totalWorked, status: "Present" };
    const nextDate = nextDutyDate(row.date || todayISO());

    // Keep today's completed record and create the next-duty row. The completed
    // row's action immediately becomes Check In again if another shift is needed.
    setSheets(prev => prev.map(s => {
      if (s.id !== targetSheetId) return s;
      const completedRows = s.rows.map(r => r.id === row.id ? { ...r, checkOut: now, workedHours: totalWorked, status: "Present" } : r);
      const alreadyExists = completedRows.some(r =>
        r.date === nextDate &&
        (r.employeeId || r.name) &&
        (r.employeeId || r.name) === (row.employeeId || row.name)
      );
      if (alreadyExists || completedRows.length >= MAX_ROWS) return { ...s, rows: completedRows };
      return {
        ...s,
        rows: [...completedRows, {
          ...blankRow(settings, completedRows.length),
          name: row.name,
          employeeId: row.employeeId,
          date: nextDate,
          checkIn: "",
          checkOut: "",
          workedHours: 0,
          hours: Number(settings.defaultHours || row.hours || 8),
          status: "Present",
          ot: 0
        }]
      };
    }));

    setCelebrate({
      name: row.name || row.employeeId,
      earning: earningFor(checked, settings),
      worked: totalWorked,
      ot: Number(row.ot || 0),
      nextDate
    });
    notify("Shift completed", `${row.name || row.employeeId} checked out at ${now}. The day is recorded as Present with ${totalWorked.toFixed(2)} hour(s) worked.`);
    return true;
  };

  const handleFaceRecognized = (person, action) => {
    const employeeId = String(person?.employeeId || "").trim().toLowerCase();
    const name = String(person?.name || "").trim().toLowerCase();
    if (!employeeId && !name) return { success: false, message: "The recognition service did not return an employee ID or registered name." };
    const today = todayISO();
    const candidates = sheets.flatMap(source => source.rows.map(row => ({ row, sheetId: source.id }))).filter(item =>
      (employeeId && String(item.row.employeeId || "").trim().toLowerCase() === employeeId) ||
      (name && String(item.row.name || "").trim().toLowerCase() === name)
    );
    const match = candidates.find(item => item.row.checkIn && !item.row.checkOut) || candidates.find(item => item.row.date === today) || candidates.find(item => !item.row.checkOut) || candidates[0];
    if (!match) return { success: false, message: "No employee timesheet row was found. Ask an administrator to add this employee to the attendance sheet." };
    const row = match.row;
    if (action === "check-in" && row.checkIn && !row.checkOut) {
      return { success: false, message: `${row.name || row.employeeId} is already checked in at ${row.checkIn}. A second check-in is not allowed.` };
    }
    if (action === "check-out" && (!row.checkIn || row.checkOut)) {
      return { success: false, message: row.checkOut ? `This employee already checked out at ${row.checkOut}.` : "This employee has not checked in yet, so check-out is not available." };
    }
    setActiveId(match.sheetId);
    const recorded = checkAction(row, match.sheetId);
    if (!recorded) return { success: false, message: "The existing attendance rules did not allow this action. Check the timesheet notification for the reason." };
    return { success: true, time: localTime(), message: `${row.name || row.employeeId} ${action === "check-in" ? "checked in" : "checked out"}. The existing employee timesheet has been updated.` };
  };

  const findSearchMatch = () => {
    const q = search.trim().toLowerCase();
    if (!q || !sheet?.rows?.length) return null;
    const today = todayISO();
    const matches = sheet.rows.filter(r =>
      (r.name || "").toLowerCase() === q ||
      (r.employeeId || "").toLowerCase() === q ||
      (r.name || "").toLowerCase().includes(q) ||
      (r.employeeId || "").toLowerCase().includes(q)
    );
    return matches.find(r => r.date === today && !r.checkOut) ||
      matches.find(r => r.date === today) ||
      matches.find(r => !r.checkOut) ||
      matches[0] || null;
  };

  const searchActionLabel = (() => {
    const found = findSearchMatch();
    return found?.checkIn && !found?.checkOut ? "Check Out" : "Check In";
  })();

  const checkSearch = () => {
    const q = search.trim().toLowerCase();
    if (!q) {
      notify("Search employee", "Type an employee name or ID first.", "error");
      return;
    }
    const found = findSearchMatch();
    if (!found) {
      notify("Employee not found", "No matching employee exists in this sheet.", "error");
      return;
    }
    checkAction(found);
  };

  const addColumn = () => {
    if (!sheet) return;
    if ((sheet.columns || []).length >= MAX_COLUMNS) {
      notify("Column limit reached", `A maximum of ${MAX_COLUMNS} custom columns is allowed per sheet.`, "error");
      return;
    }
    const label = window.prompt("New column name", `Column ${(sheet.columns || []).length + 1}`);
    if (!label?.trim()) return;
    const column = { id: `custom-${Date.now()}-${Math.random().toString(36).slice(2)}`, label: label.trim() };
    updateSheet(s => ({ ...s, columns: [...(s.columns || []), column], rows: s.rows.map(r => ({ ...r, custom: { ...(r.custom || {}), [column.id]: "" } })) }));
    notify("Column added", `${column.label} was added to ${sheet.name}.`);
  };

  const removeColumn = () => {
    if (!sheet?.columns?.length) { notify("No custom columns", "Add a custom column first.", "error"); return; }
    const column = sheet.columns[sheet.columns.length - 1];
    if (!window.confirm(`Remove the last custom column “${column.label}”?`)) return;
    updateSheet(s => ({ ...s, columns: s.columns.slice(0, -1), rows: s.rows.map(r => { const custom = { ...(r.custom || {}) }; delete custom[column.id]; return { ...r, custom }; }) }));
    notify("Column removed", `${column.label} was removed.`);
  };

  const updateCustomColumn = (columnId, value) => updateSheet(s => ({
    ...s,
    columns: (s.columns || []).map(c => c.id === columnId ? { ...c, label: value } : c)
  }));

  const updateCustomCell = (rowId, columnId, value) => updateSheet(s => ({
    ...s,
    rows: s.rows.map(r => r.id === rowId ? { ...r, custom: { ...(r.custom || {}), [columnId]: value } } : r)
  }));

  const addRow = () => updateSheet(s => {
  if (s.rows.length >= MAX_ROWS) {
    notify("Row limit reached", `A maximum of ${MAX_ROWS} rows is allowed per sheet.`, "error");
    return s;
  }
  return { ...s, rows: [...s.rows, blankRow(settings, s.rows.length)] };
});
  const removeRow = () => updateSheet(s => ({ ...s, rows: s.rows.slice(0, -1) }));

  const addSheet = () => {
    if (sheets.length >= MAX_SHEETS) {
      notify("Sheet limit reached", `A maximum of ${MAX_SHEETS} sheets is allowed.`, "error");
      return;
    }
    const n = sheets.length + 1;
    const next = newSheet(n, settings);
    setSheets(prev => [...prev, next]);
    setActiveId(next.id);
  };

  const deleteSheet = (id) => {
    if (sheets.length === 1) {
      notify("Cannot remove sheet", "At least one sheet must remain.", "error");
      return;
    }
    const target = sheets.find(s => s.id === id);
    if (!target) return;
    const deleted = { ...target, deletedAt: Date.now(), deletedFrom: "Employee Timesheet" };
    const next = sheets.filter(s => s.id !== id);
    setAttendanceTrash(prev => [deleted, ...prev]);
    setSheets(next);
    if (id === activeId) setActiveId(next[0].id);
    setSheetTabMenu(null);
    notify("Sheet moved to Bin", `${target.name} can be restored from the Bin.`);
  };

  const renameAttendanceSheet = (id) => {
    const target = sheets.find(s => s.id === id);
    if (!target) return;
    const name = window.prompt("Sheet name", target.name);
    if (!name?.trim()) return;
    setSheets(prev => prev.map(s => s.id === id ? { ...s, name: name.trim() } : s));
    setSheetTabMenu(null);
  };

  const setAttendanceSheetColor = (id, color) => {
    setSheets(prev => prev.map(s => s.id === id ? { ...s, tabColor: color } : s));
    setSheetTabMenu(null);
  };

  const duplicateAttendanceSheet = (id) => {
    if (sheets.length >= MAX_SHEETS) {
      notify("Sheet limit reached", `A maximum of ${MAX_SHEETS} attendance sheets is allowed.`, "error");
      return;
    }
    const source = sheets.find(s => s.id === id);
    if (!source) return;
    const next = {
      ...source,
      id: `sheet-${Date.now()}-copy-${Math.random().toString(36).slice(2)}`,
      name: `${source.name} Copy`,
      rows: source.rows.map(r => ({ ...r, id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, custom: { ...(r.custom || {}) } })),
      columns: (source.columns || []).map(c => ({ ...c }))
    };
    setSheets(prev => [...prev, next]);
    setActiveId(next.id);
    setOpenPanel(null);
    setSheetTabMenu(null);
  };

  const moveAttendanceSheet = (id, direction) => {
    setSheets(prev => {
      const index = prev.findIndex(s => s.id === id);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
    setSheetTabMenu(null);
  };

  const updateCell = (id, key, value) => updateSheet(s => {
    let rows = s.rows.map(r => r.id === id ? { ...r, [key]: value } : r);
    const edited = rows.find(r => r.id === id);
    const isDataEntry = ["name", "employeeId", "date", "checkIn", "checkOut", "hours", "ot", "status", "note"].includes(key);
    const last = rows[rows.length - 1];
    const lastHasData = last && (
      last.name || last.employeeId || last.checkIn || last.checkOut ||
      Number(last.ot || 0) > 0 || key === "status" && last.status !== "Present"
    );
    if (isDataEntry && edited && id === last.id && lastHasData && rows.length < MAX_ROWS) {
      const count = Math.min(ROW_GROWTH, MAX_ROWS - rows.length);
      rows = [...rows, ...Array.from({ length: count }, (_, i) => blankRow(settings, rows.length + i))];
    }
    return { ...s, rows };
  });

  const updateSheetName = (name) => updateSheet(s => ({ ...s, name }));

  const addAttendanceSheet = () => {
    if (sheets.length >= MAX_SHEETS) {
      notify("Sheet limit reached", `A maximum of ${MAX_SHEETS} attendance sheets is allowed.`, "error");
      return;
    }
    const next = newSheet(sheets.length + 1, settings);
    next.name = `Employee Attendance ${sheets.length + 1}`;
    setSheets(prev => [...prev, next]);
    setActiveId(next.id);
    setOpenPanel(null);
  };

  const openDate = (date) => {
    setSelectedDate(date);
    setCalendarCursor(new Date(`${date}T12:00:00`));
  };

  const sortAttendanceByName = (direction = "asc") => {
    updateSheet(s => ({
      ...s,
      rows: [...s.rows].sort((a, b) => {
        const aa = String(a.name || "").trim().toLowerCase();
        const bb = String(b.name || "").trim().toLowerCase();
        return direction === "desc" ? bb.localeCompare(aa) : aa.localeCompare(bb);
      }),
    }));
    notify("Rows sorted", `Employee names sorted ${direction === "desc" ? "Z → A" : "A → Z"}.`);
  };

  const attendanceCellVars = (style = {}) => ({
    "--ts-cell-fill": style.color || "transparent",
    "--ts-cell-text": style.textColor || "inherit",
    "--ts-cell-font-size": style.fontSize ? `${Number(style.fontSize)}px` : "inherit",
    "--ts-cell-font-family": style.fontFamily || "inherit",
    "--ts-cell-font-weight": style.fontWeight || "inherit",
    "--ts-cell-font-style": style.fontStyle || "inherit",
  });

  // Spreadsheet selection is intentionally limited to user-editable employee data.
  // Fixed attendance controls (check-in/out, day, hours, OT, earnings and status)
  // are not part of the selectable clipboard grid.
  const attendanceColumnDefs = useMemo(() => [
    { key: "name", label: "EMPLOYEE NAME", field: "name" },
    { key: "employeeId", label: "EMPLOYEE ID", field: "employeeId" },
    ...((sheet?.columns || []).map(c => ({ key: `custom:${c.id}`, label: c.label, customId: c.id }))),
  ], [sheet]);

  const attendanceRange = useMemo(() => ({
    minRow: Math.min(attendanceSelection.start.row, attendanceSelection.end.row),
    maxRow: Math.max(attendanceSelection.start.row, attendanceSelection.end.row),
    minCol: Math.min(attendanceSelection.start.col, attendanceSelection.end.col),
    maxCol: Math.max(attendanceSelection.start.col, attendanceSelection.end.col),
  }), [attendanceSelection]);

  const isAttendanceSelected = (row, col) => row >= attendanceRange.minRow && row <= attendanceRange.maxRow && col >= attendanceRange.minCol && col <= attendanceRange.maxCol;

  const startAttendanceSelection = (row, col, extend = false) => {
    if (extend) {
      setAttendanceSelection(prev => ({ ...prev, end: { row, col } }));
      setAttendanceDragging(false);
      return;
    }
    setAttendanceSelection({ start: { row, col }, end: { row, col } });
    setAttendanceSelectedSheetIds([activeId]);
    setAttendanceDragging(true);
  };
  const extendAttendanceSelection = (row, col) => {
    if (attendanceDragging) setAttendanceSelection(prev => ({ ...prev, end: { row, col } }));
  };

  const rowHasEmployeeData = (row) => !!(
    String(row?.name || "").trim() || String(row?.employeeId || "").trim() ||
    Object.values(row?.custom || {}).some(value => String(value ?? "").trim())
  );
  const populatedAttendanceSheets = sheets.filter(item => item.rows?.some(row =>
    rowHasEmployeeData(row) || String(row.checkIn || "").trim() || String(row.checkOut || "").trim() ||
    Number(row.ot || 0) > 0 || String(row.note || "").trim()
  ));

  const selectAllAttendanceSheets = () => {
    const targets = populatedAttendanceSheets;
    if (!targets.length) {
      setAttendanceSelectedSheetIds([activeId]);
      setAttendanceSelection({ start: { row: 0, col: 0 }, end: { row: 0, col: Math.max(1, attendanceColumnDefs.length) - 1 } });
      setAttendanceDragging(false);
      return;
    }
    const maxRows = Math.max(1, ...targets.map(item => {
      const last = (item.rows || []).reduce((found, row, index) => rowHasEmployeeData(row) ? index : found, -1);
      return last + 1;
    }));
    const maxCols = Math.max(1, ...targets.map(item => 2 + (item.columns?.length || 0)));
    setAttendanceSelection({ start: { row: 0, col: 0 }, end: { row: maxRows - 1, col: maxCols - 1 } });
    setAttendanceSelectedSheetIds(targets.map(item => item.id));
    setAttendanceDragging(false);
  };

  useEffect(() => {
    const stop = () => setAttendanceDragging(false);
    window.addEventListener("mouseup", stop);
    return () => window.removeEventListener("mouseup", stop);
  }, []);

  const updateAttendanceSelectionStyles = (patch) => {
    const selectedRows = filteredRows.filter((_, ri) => ri >= attendanceRange.minRow && ri <= attendanceRange.maxRow).map(r => r.id);
    if (!selectedRows.length) return;
    const defs = attendanceColumnDefs;
    updateSheet(s => ({
      ...s,
      rows: s.rows.map(row => {
        if (!selectedRows.includes(row.id)) return row;
        const styles = { ...(row.styles || {}) };
        for (let ci = attendanceRange.minCol; ci <= attendanceRange.maxCol; ci += 1) {
          const def = defs[ci];
          if (!def || def.editable === false && !def.field && !def.customId) continue;
          const key = def.customId ? `custom:${def.customId}` : def.key;
          styles[key] = { ...(styles[key] || {}), ...patch };
        }
        return { ...row, styles };
      })
    }));
  };

  const readAttendanceCell = (row, def) => {
    if (!row || !def) return "";
    if (def.customId) return row.custom?.[def.customId] ?? "";
    if (def.field) return row[def.field] ?? "";
    if (def.key === "day") return dayName(row.date);
    if (def.key === "rate") return money(settings.defaultHourlyRate, settings.currency);
    return "";
  };

  const getEditableDefs = (targetSheet) => [
    { key: "name", field: "name" },
    { key: "employeeId", field: "employeeId" },
    ...(targetSheet.columns || []).map(c => ({ key: `custom:${c.id}`, customId: c.id })),
  ];

  const copyAttendanceSelection = async () => {
    const targetIds = attendanceSelectedSheetIds.length ? attendanceSelectedSheetIds : [activeId];
    const blocks = targetIds.map(id => {
      const targetSheet = sheets.find(item => item.id === id);
      if (!targetSheet) return [];
      const defs = getEditableDefs(targetSheet);
      const selectedDefs = defs.slice(attendanceRange.minCol, attendanceRange.maxCol + 1);
      return targetSheet.rows.slice(attendanceRange.minRow, attendanceRange.maxRow + 1).map(row =>
        selectedDefs.map(def => def.customId ? (row.custom?.[def.customId] ?? "") : (row[def.field] ?? ""))
      );
    }).filter(block => block.length);
    const rows = blocks.flat();
    setAttendanceClipboard(rows);
    try { await navigator.clipboard?.writeText(rows.map(row => row.join("\t")).join("\n")); } catch {}
  };

  const clearAttendanceSelection = () => {
    const targetIds = attendanceSelectedSheetIds.length ? attendanceSelectedSheetIds : [activeId];
    setSheets(prev => prev.map(target => {
      if (!targetIds.includes(target.id)) return target;
      const defs = getEditableDefs(target);
      const selectedDefs = defs.slice(attendanceRange.minCol, attendanceRange.maxCol + 1);
      return { ...target, rows: target.rows.map((row, ri) => {
        if (ri < attendanceRange.minRow || ri > attendanceRange.maxRow) return row;
        const next = { ...row, custom: { ...(row.custom || {}) } };
        selectedDefs.forEach(def => {
          if (def.customId) next.custom[def.customId] = "";
          else next[def.field] = "";
        });
        return next;
      }) };
    }));
  };

  const dispatchGeneralCommand = (command, payload) => {
    window.dispatchEvent(new CustomEvent("sodah-general-sheet-command", { detail: { command, payload } }));
  };

  const applyUnifiedFormatting = (patch) => {
    if (openPanel === "general") {
      dispatchGeneralCommand("format", patch);
      return;
    }
    updateAttendanceSelectionStyles(patch);
  };

  const unifiedCopy = () => openPanel === "general" ? dispatchGeneralCommand("copy") : copyAttendanceSelection();
  const unifiedPaste = () => openPanel === "general" ? dispatchGeneralCommand("paste") : (async () => {
    let data = attendanceClipboard;
    if (!data) {
      try {
        const text = await navigator.clipboard?.readText();
        if (text) data = text.replace(/\r/g, "").split("\n").filter((line, index, all) => !(index === all.length - 1 && line === "")).map(line => line.split("\t"));
      } catch {}
    }
    if (!data?.length) return;
    const rowsData = Array.isArray(data[0]) ? data : [[data]];
    const targetIds = attendanceSelectedSheetIds.length ? attendanceSelectedSheetIds : [activeId];
    const oneCell = rowsData.length === 1 && rowsData[0].length === 1;
    setSheets(prev => prev.map(target => {
      if (!targetIds.includes(target.id)) return target;
      const defs = getEditableDefs(target);
      const selectedCols = defs.slice(attendanceRange.minCol, attendanceRange.maxCol + 1);
      if (!selectedCols.length) return target;
      const selectedRowCount = attendanceRange.maxRow - attendanceRange.minRow + 1;
      // A single copied cell fills the selected range. A multi-line clipboard
      // is distributed row-by-row from the active cell, extending the sheet
      // when the pasted list is longer than the current selection.
      const pasteRowCount = oneCell ? selectedRowCount : Math.max(selectedRowCount, rowsData.length);
      const sourceRows = oneCell ? Array.from({ length: pasteRowCount }, () => rowsData[0]) : rowsData;
      const rows = [...target.rows];
      while (rows.length < attendanceRange.minRow + pasteRowCount) {
        rows.push(blankRow(settings, rows.length));
      }
      for (let relativeRow = 0; relativeRow < pasteRowCount; relativeRow += 1) {
        const rowIndex = attendanceRange.minRow + relativeRow;
        const sourceRow = sourceRows[relativeRow] || [];
        const current = rows[rowIndex];
        const next = { ...current, custom: { ...(current.custom || {}) } };
        selectedCols.forEach((def, offset) => {
          const value = sourceRow.length === 1 && !oneCell ? sourceRow[0] : sourceRow[offset];
          if (value === undefined) return;
          if (def.customId) next.custom[def.customId] = String(value);
          else next[def.field] = String(value);
        });
        rows[rowIndex] = next;
      }
      return { ...target, rows };
    }));
  })();

  useEffect(() => {
    const onKeyDown = (event) => {
      if (openPanel === "general") return;
      const key = event.key.toLowerCase();
      const modifier = event.ctrlKey || event.metaKey;
      if (modifier && key === "a") {
        event.preventDefault();
        selectAllAttendanceSheets();
      } else if (modifier && key === "c") {
        event.preventDefault();
        copyAttendanceSelection();
      } else if (modifier && key === "v") {
        event.preventDefault();
        unifiedPaste();
      } else if (!modifier && (key === "delete" || key === "backspace")) {
        const target = event.target;
        const isEditableControl = target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT");
        const hasRange = attendanceRange.minRow !== attendanceRange.maxRow || attendanceRange.minCol !== attendanceRange.maxCol || attendanceSelectedSheetIds.length > 1;
        if (!isEditableControl || hasRange) {
          event.preventDefault();
          clearAttendanceSelection();
        }
      } else if (key === "escape") {
        setAttendanceSelectedSheetIds([activeId]);
        setAttendanceSelection({ start: { row: 0, col: 0 }, end: { row: 0, col: 0 } });
      }
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [openPanel, activeId, sheets, attendanceClipboard, attendanceRange, attendanceSelectedSheetIds]);


  const unifiedDelete = () => openPanel === "general" ? dispatchGeneralCommand("deleteSheet") : deleteSheet(activeId);
  const unifiedRename = () => openPanel === "general" ? dispatchGeneralCommand("rename") : renameAttendanceSheet(activeId);
  const unifiedNewSheet = () => openPanel === "general" ? dispatchGeneralCommand("newSheet") : addAttendanceSheet();
  const unifiedInsertRow = () => openPanel === "general" ? dispatchGeneralCommand("insertRow") : addRow();
  const unifiedDeleteRow = () => openPanel === "general" ? dispatchGeneralCommand("deleteRow") : removeRow();
  const unifiedInsertColumn = () => openPanel === "general" ? dispatchGeneralCommand("insertColumn") : addColumn();
  const unifiedDeleteColumn = () => openPanel === "general" ? dispatchGeneralCommand("deleteColumn") : removeColumn();
  const unifiedAutoFit = () => dispatchGeneralCommand("autoFit");
  const unifiedClear = () => openPanel === "general" ? dispatchGeneralCommand("clear") : clearAttendanceSelection();

  const loadUnifiedBin = () => {
    try {
      const general = JSON.parse(localStorage.getItem("sodah-general-sheet-trash-v1") || "[]");
      const attendance = JSON.parse(localStorage.getItem("sodah-timesheet-sheet-trash-v1") || "[]");
      return { general: Array.isArray(general) ? general : [], attendance: Array.isArray(attendance) ? attendance : [] };
    } catch { return { general: [], attendance: [] }; }
  };
  const [unifiedBin, setUnifiedBin] = useState({ general: [], attendance: [] });
  const openUnifiedBin = () => { setUnifiedBin(loadUnifiedBin()); setBinOpen(true); };
  const restoreBinItem = (type, id) => {
    if (type === "attendance") {
      const item = unifiedBin.attendance.find(x => x.id === id);
      if (!item) return;
      const restored = { ...item }; delete restored.deletedAt; delete restored.deletedFrom;
      setSheets(prev => prev.length >= MAX_SHEETS ? prev : [...prev, restored]);
      const next = unifiedBin.attendance.filter(x => x.id !== id);
      setAttendanceTrash(next);
      setUnifiedBin(v => ({ ...v, attendance: next }));
      setActiveId(restored.id);
    } else {
      const item = unifiedBin.general.find(x => x.id === id);
      if (!item) return;
      const restored = { ...item }; delete restored.deletedAt; delete restored.deletedFrom;
      const current = JSON.parse(localStorage.getItem("sodah-general-sheet-v2") || "[]");
      const nextSheets = Array.isArray(current) ? [...current, restored] : [restored];
      localStorage.setItem("sodah-general-sheet-v2", JSON.stringify(nextSheets));
      const next = unifiedBin.general.filter(x => x.id !== id);
      localStorage.setItem("sodah-general-sheet-trash-v1", JSON.stringify(next));
      setUnifiedBin(v => ({ ...v, general: next }));
      window.dispatchEvent(new Event("sodah-general-sheet-refresh"));
    }
  };
  const permanentlyDeleteBinItem = (type, id) => {
    if (type === "attendance") { const next = unifiedBin.attendance.filter(x => x.id !== id); setAttendanceTrash(next); setUnifiedBin(v => ({ ...v, attendance: next })); }
    else { const next = unifiedBin.general.filter(x => x.id !== id); localStorage.setItem("sodah-general-sheet-trash-v1", JSON.stringify(next)); setUnifiedBin(v => ({ ...v, general: next })); }
  };
  const emptyUnifiedBin = () => { setAttendanceTrash([]); localStorage.setItem("sodah-general-sheet-trash-v1", "[]"); setUnifiedBin({ general: [], attendance: [] }); };

  const dateRows = (sheets.find(s => s.id === activeId) || sheets[0])?.rows.filter(r => r.date === selectedDate) || [];

  const reportRows = useMemo(() => {
    let rows = sheets.flatMap(s => s.rows);
    if (reportPeriod === "daily") {
      rows = rows.filter(r => r.date === reportDay);
    } else if (reportPeriod === "weekly") {
      const start = weekStartISO(reportDay);
      const end = weekEndISO(reportDay);
      rows = rows.filter(r => r.date >= start && r.date <= end);
    } else if (reportPeriod === "monthly") {
      const start = monthStartISO(reportDay);
      const end = monthEndISO(reportDay);
      rows = rows.filter(r => r.date >= start && r.date <= end);
    } else if (reportPeriod === "yearly") {
      const year = new Date(`${reportDay}T12:00:00`).getFullYear();
      rows = rows.filter(r => String(r.date || "").startsWith(String(year)));
    }
    if (reportEmployee !== "all") rows = rows.filter(r => (r.employeeId || r.name) === reportEmployee);
    return rows;
  }, [sheets, reportEmployee, reportPeriod, reportDay]);

  const flattenRowForExport = (r, sheetName = "") => {
    const base = {
      Sheet: sheetName,
      "Employee Name": r.name,
      "Employee ID": r.employeeId,
      Date: r.date,
      Day: dayName(r.date),
      "Check In": r.checkIn,
      "Check Out": r.checkOut,
      "Scheduled Hours": Number(r.hours || settings.defaultHours || 0),
      "Actual Hours": actualWorkedFor(r),
      "O.T": Number(r.ot || 0),
      "Hourly Earning": settings.defaultHourlyRate,
      "O.T Earning": Number(r.ot || 0) * Number(settings.otRate || 0),
      "Actual Earning": earningFor(r, settings),
      "Expected Earning": expectedEarningFor(r, settings),
      "Earning Cut": Math.max(0, expectedEarningFor(r, settings) - earningFor(r, settings)),
      Status: r.status,
      Note: r.note || ""
    };
    return base;
  };

  const exactRecordHtml = (date, rows, title = "Attendance Record") => {
    const cols = ["Employee","ID","Check In","Check Out","Scheduled","Actual","O.T","Hourly Earning","O.T Earning","Actual Earning","Expected Earning","Earning Cut","Status","Note"];
    const esc = v => String(v ?? "").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;");
    const body = rows.map(r => `<tr><td>${esc(r.name || "—")}</td><td>${esc(r.employeeId || "—")}</td><td>${esc(r.checkIn || "—")}</td><td>${esc(r.checkOut || "—")}</td><td>${Number(r.hours || settings.defaultHours || 0).toFixed(2)}</td><td>${actualWorkedFor(r).toFixed(2)}</td><td>${Number(r.ot || 0).toFixed(2)}</td><td>${esc(money(settings.defaultHourlyRate, settings.currency))}</td><td>${esc(money(Number(r.ot || 0) * Number(settings.otRate || 0), settings.currency))}</td><td>${esc(money(earningFor(r,settings), settings.currency))}</td><td>${esc(money(expectedEarningFor(r,settings), settings.currency))}</td><td>${esc(money(Math.max(0, expectedEarningFor(r,settings)-earningFor(r,settings)), settings.currency))}</td><td>${esc(r.status)}</td><td>${esc(r.note || "")}</td></tr>`).join("");
    const total = rows.reduce((a,r)=>a+earningFor(r,settings),0), expected=rows.reduce((a,r)=>a+expectedEarningFor(r,settings),0);
    return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title><style>body{font-family:Arial,sans-serif;margin:28px;color:#172033}h1{margin:0 0 5px}p{color:#64748b;margin:0 0 18px}.summary{display:flex;gap:10px;flex-wrap:wrap;margin:0 0 18px}.summary span{border:1px solid #cbd5e1;padding:8px 12px;border-radius:8px;background:#f8fafc}table{border-collapse:collapse;width:100%;min-width:1100px}th,td{border:1px solid #8f9dad;padding:9px 10px;text-align:left;white-space:nowrap}th{background:#e8eef5;font-weight:800}tfoot td{background:#e8f7f1;font-weight:800}@media print{body{margin:10mm}table{font-size:9px}}</style></head><body><h1>${esc(settings.companyName)} — ${esc(title)}</h1><p>${esc(settings.agencyName)} • ${esc(date)} • ${esc(dayName(date))}</p><div class="summary"><span>Employees: <b>${rows.filter(r=>r.name||r.employeeId).length}</b></span><span>Actual Earning: <b>${esc(money(total,settings.currency))}</b></span><span>Expected Earning: <b>${esc(money(expected,settings.currency))}</b></span><span>Earning Cut: <b>${esc(money(Math.max(0,expected-total),settings.currency))}</b></span></div><table><thead><tr>${cols.map(c=>`<th>${esc(c)}</th>`).join("")}</tr></thead><tbody>${body || `<tr><td colspan="14">No records for this day.</td></tr>`}</tbody></table></body></html>`;
  };

  const downloadExactRecord = (date, rows) => {
    const html = exactRecordHtml(date, rows);
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href=url; a.download=`sodah-attendance-${date}-exact-table.html`; a.click(); URL.revokeObjectURL(url);
  };

  const printExactRecord = (date, rows) => {
    const win = window.open("", "_blank", "width=1400,height=900");
    if (!win) { notify("Print blocked", "Allow pop-ups for Sodah to print the exact table.", "error"); return; }
    win.document.write(exactRecordHtml(date, rows)); win.document.close(); win.focus(); setTimeout(() => win.print(), 250);
  };

  const shareExactRecord = async (date, rows) => {
    const html = exactRecordHtml(date, rows);
    const file = new File([html], `sodah-attendance-${date}-table.html`, { type: "text/html" });
    try {
      if (navigator.share && navigator.canShare?.({ files: [file] })) await navigator.share({ title: `Attendance ${date}`, text: `${settings.companyName} — Attendance Record`, files: [file] });
      else if (navigator.share) await navigator.share({ title: `Attendance ${date}`, text: `${settings.companyName} — Attendance Record\n${date}\n${rows.length} record(s)` });
      else { await navigator.clipboard?.writeText(html); notify("Table copied", "The exact table HTML was copied to the clipboard."); }
    } catch {}
  };

  const buildExactSheetRows = (sourceRows = filteredRows) => sourceRows.map(r => {
    const base = {
      "Employee Name": r.name || "",
      "Employee ID": r.employeeId || "",
    };
    base["Check In"] = r.checkIn || "";
    base["Check Out"] = r.checkOut || "";
    (sheet?.columns || []).forEach(c => { base[c.label] = r.custom?.[c.id] ?? ""; });
    base["Day"] = dayName(r.date);
    base["Hours"] = Number(r.hours || settings.defaultHours || 0);
    base["O.T"] = Number(r.ot || 0);
    base["Hourly Earning"] = Number(settings.defaultHourlyRate || 0);
    base["Status"] = r.status || "";
    base["Action"] = r.checkIn && !r.checkOut ? "Check Out" : "Check In";
    return base;
  });

  const exportExcel = async () => {
    const XLSX = await import("xlsx");
    const data = buildExactSheetRows();
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, (sheet?.name || "Employee Attendance").slice(0, 31));
    XLSX.writeFile(wb, `sodah-${(sheet?.name || "employee-attendance").replace(/[^a-z0-9]+/gi,"-").toLowerCase()}.xlsx`);
  };

  const exportRowsXlsx = async (rows, filename = "sodah-time-sheet-report.xlsx") => {
    const XLSX = await import("xlsx");
    const data = rows.map(r => ({
      Date: r.date,
      Day: dayName(r.date),
      "Employee Name": r.name,
      "Employee ID": r.employeeId,
      "Check In": r.checkIn,
      "Check Out": r.checkOut,
      "Scheduled Hours": Number(r.hours || settings.defaultHours || 0),
      "Actual Hours": actualWorkedFor(r),
      "O.T": Number(r.ot || 0),
      "Hourly Earning": settings.defaultHourlyRate,
      "O.T Earning": Number(r.ot || 0) * Number(settings.otRate || 0),
      "Actual Earning": earningFor(r, settings),
      "Expected Earning": expectedEarningFor(r, settings),
      "Earning Cut": Math.max(0, expectedEarningFor(r, settings) - earningFor(r, settings)),
      Status: r.status,
      Note: r.note || ""
    }));
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, "Report");
    XLSX.writeFile(wb, filename);
  };

  const exportRowsCSV = (rows, filename = "sodah-time-sheet-report.csv") => {
    const data = rows.map(r => ({
      Date: r.date, Day: dayName(r.date), "Employee Name": r.name, "Employee ID": r.employeeId,
      "Check In": r.checkIn, "Check Out": r.checkOut,
      "Scheduled Hours": Number(r.hours || settings.defaultHours || 0),
      "Actual Hours": actualWorkedFor(r), "O.T": Number(r.ot || 0),
      "Hourly Earning": settings.defaultHourlyRate,
      "O.T Earning": Number(r.ot || 0) * Number(settings.otRate || 0),
      "Total Earning": earningFor(r, settings), Status: r.status, Note: r.note || ""
    }));
    if (!data.length) return;
    const headers = Object.keys(data[0]);
    const body = [headers, ...data.map(r => headers.map(h => r[h] ?? ""))]
      .map(a => a.map(v => `"${String(v).replaceAll('"','""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([body], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a"); a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };

  const exportCSV = () => {
    const rows = buildExactSheetRows();
    if (!rows.length) return;
    const headers = Object.keys(rows[0]);
    const body = [headers, ...rows.map(r => headers.map(h => r[h] ?? ""))]
      .map(a => a.map(v => `"${String(v).replaceAll('"','""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([body], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `sodah-${(sheet?.name || "employee-attendance").replace(/[^a-z0-9]+/gi,"-").toLowerCase()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importExcel = async (file) => {
    if (!file) return;
    const XLSX = await import("xlsx");
    const wb = XLSX.read(await file.arrayBuffer(), { type: "array" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(ws, { defval: "" });
    const mapped = data.map((r, i) => ({
      id: `${Date.now()}-${i}`,
      name: r["Employee Name"] || r.Name || "",
      employeeId: r["Employee ID"] || r.ID || "",
      date: r.RecordDate || r.Date || todayISO(),
      checkIn: r["Check In"] || "",
      checkOut: r["Check Out"] || "",
      hours: Number(r.Hours || settings.defaultHours),
      ot: Number(r["O.T"] || r.OT || 0),
      status: r.Status || "Present",
      note: r.Note || ""
    }));
    updateSheet(s => {
      if (!mapped.length) return s;
      // Excel-style import: imported records always start at row 1/top of the active sheet.
      const base = s.rows.length >= mapped.length
        ? s.rows.map((row, index) => mapped[index] ? { ...row, ...mapped[index] } : row)
        : [...mapped, ...Array.from({ length: Math.min(MAX_ROWS - mapped.length, ROW_GROWTH) }, (_, i) => blankRow(settings, mapped.length + i))];
      return { ...s, rows: base.slice(0, MAX_ROWS) };
    });
    notify("Import complete", `${mapped.length} record(s) loaded from the top of the active sheet.`);
  };

  return (
    <>

      <style>{`
        .ts-face-panel{overflow:hidden}
        .ts-kiosk-panel{background:linear-gradient(135deg,#f8fbff,#eef4ff);border:1px solid #cbdcf8;border-radius:18px}
        .ts-kiosk-panel>.ts-panel-header{padding:17px 20px;background:linear-gradient(100deg,#102b68,#1d3da0);color:#fff}
        .ts-kiosk-panel>.ts-panel-header h2,.ts-kiosk-panel>.ts-panel-header p{color:#fff}
        .ts-kiosk-lock,.ts-kiosk-connected{display:inline-flex;align-items:center;gap:7px;padding:8px 11px;border-radius:999px;background:#dcfce7;color:#166534;font-size:11px;font-weight:900;white-space:nowrap}
        .ts-kiosk-layout{display:grid;grid-template-columns:minmax(0,1.05fr) minmax(330px,.95fr);gap:14px;padding:16px}
        .ts-kiosk-camera-card{padding:13px;background:#fff;border-radius:16px}
        .ts-kiosk-camera-head{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:11px}
        .ts-kiosk-connected{background:#e0f2fe;color:#075985}
        .ts-kiosk-camera-card .ts-face-video-wrap{min-height:340px;aspect-ratio:4/3;background:radial-gradient(circle at 50% 40%,#334e80,#0c1c3c 75%)}
        .ts-kiosk-camera-actions{margin-top:13px}.ts-kiosk-camera-actions .primary{background:linear-gradient(135deg,#16a34a,#059669)}
        .ts-kiosk-employee-card{display:flex;flex-direction:column;gap:12px;padding:14px;border:1px solid #d5e2f5;border-radius:16px;background:#fff;box-shadow:0 5px 20px rgba(30,64,175,.07);min-width:0}
        .ts-kiosk-result-banner{display:flex;align-items:center;gap:11px;padding:14px;border:1px solid #86efac;border-radius:13px;background:linear-gradient(100deg,#dcfce7,#f0fdf4);color:#15803d}.ts-kiosk-result-banner>div{display:grid;gap:3px}.ts-kiosk-result-banner strong{font-size:18px}.ts-kiosk-result-banner span{font-size:11px;color:#166534;line-height:1.45}
        .ts-kiosk-person{display:flex;align-items:center;gap:13px;padding:14px;border:1px solid #dbeafe;border-radius:13px;background:#f8fbff}.ts-kiosk-avatar{width:58px;height:58px;display:grid;place-items:center;border-radius:50%;background:#dbeafe;color:#1d4ed8;flex-shrink:0}.ts-kiosk-person>div:last-child{display:grid;gap:5px;min-width:0}.ts-kiosk-person strong{font-size:18px;color:#0f172a}.ts-kiosk-person span{font-size:12px;color:#334155}
        .ts-kiosk-meta{display:grid;grid-template-columns:1fr 1fr;gap:8px}.ts-kiosk-meta span{display:grid;gap:4px;padding:11px;border-radius:10px;background:#eff6ff}.ts-kiosk-meta small{font-size:10px;color:#64748b}.ts-kiosk-meta b{font-size:13px;color:#0f172a}
        .ts-kiosk-actions{display:grid;grid-template-columns:1fr 1fr;gap:9px}.ts-kiosk-actions button{display:flex;align-items:center;justify-content:center;gap:8px;min-height:48px;border:0;border-radius:11px;font-weight:900;cursor:pointer}.ts-kiosk-actions button:disabled{opacity:.5;cursor:not-allowed}.ts-kiosk-checkin{background:linear-gradient(135deg,#16a34a,#15803d);color:#fff}.ts-kiosk-checkout{border:1px solid #4f46e5!important;background:#eef2ff;color:#3730a3}
        .ts-kiosk-locked-note{padding:10px;border-radius:9px;background:#dcfce7;color:#166534;font-size:11px;font-weight:800;text-align:center}.ts-kiosk-empty{display:grid;justify-items:center;gap:8px;padding:30px 18px;text-align:center;color:#64748b;border:1px dashed #cbd5e1;border-radius:12px}.ts-kiosk-empty svg{color:#6366f1}.ts-kiosk-empty strong{color:#1e293b}.ts-kiosk-empty span{font-size:11px;line-height:1.5}.ts-kiosk-rules{display:grid;gap:6px;margin-top:auto;padding:12px;border-radius:11px;background:#f8fafc;color:#475569;font-size:10px;line-height:1.5}.ts-kiosk-rules strong{color:#1e3a8a;font-size:12px}
        @media(max-width:900px){.ts-kiosk-layout{grid-template-columns:1fr}.ts-kiosk-camera-card .ts-face-video-wrap{min-height:260px}}
        @media(max-width:520px){.ts-kiosk-meta,.ts-kiosk-actions{grid-template-columns:1fr}.ts-kiosk-camera-head{align-items:flex-start;flex-direction:column}.ts-kiosk-panel>.ts-panel-header{align-items:flex-start;gap:8px;flex-direction:column}}
        .ts-face-intro{display:flex;align-items:center;gap:12px;margin:14px 16px;padding:13px 15px;border:1px solid #c7d2fe;border-radius:13px;background:linear-gradient(100deg,#f5f3ff,#eff6ff)}
        .ts-face-intro>span{display:grid;place-items:center;width:48px;height:48px;border-radius:13px;background:linear-gradient(135deg,#7c3aed,#4f46e5);color:#fff}
        .ts-face-intro>div{display:grid;gap:3px;flex:1}.ts-face-intro strong{font-size:15px;color:#172554}.ts-face-intro small{font-size:12px;color:#64748b}
        .ts-face-status{display:flex;align-items:center;gap:7px;padding:8px 11px;border-radius:999px;background:#dcfce7;color:#166534;font-size:11px;white-space:nowrap}.ts-face-status i,.ts-face-live-pill i{width:8px;height:8px;border-radius:50%;background:#16a34a;display:inline-block}
        .ts-face-layout{display:grid;grid-template-columns:minmax(0,1.55fr) minmax(260px,.75fr);gap:14px;padding:0 16px 16px}
        .ts-face-camera-card,.ts-face-info-card{min-width:0;border:1px solid #dbe4f0;border-radius:14px;background:#fff;padding:14px;box-shadow:0 4px 16px rgba(15,23,42,.05)}
        .ts-face-mode-tabs{display:flex;gap:8px;margin-bottom:12px}.ts-face-mode-tabs button{border:1px solid #cbd5e1;background:#f8fafc;color:#334155;border-radius:9px;padding:10px 13px;font-weight:800;cursor:pointer}.ts-face-mode-tabs button.active{background:#ede9fe;border-color:#8b5cf6;color:#5b21b6}
        .ts-face-field{display:grid;gap:6px;margin-bottom:12px;color:#334155;font-size:12px;font-weight:800}.ts-face-field select{height:40px;border:1px solid #cbd5e1;border-radius:9px;padding:0 10px;background:#fff;color:#0f172a}
        .ts-face-video-wrap{position:relative;min-height:300px;aspect-ratio:16/9;overflow:hidden;border-radius:13px;background:radial-gradient(circle at 50% 40%,#334155,#0f172a 70%);display:grid;place-items:center}
        .ts-face-video-wrap video{width:100%;height:100%;position:absolute;inset:0;object-fit:cover;transform:scaleX(-1)}
        .ts-face-camera-placeholder{display:grid;justify-items:center;gap:9px;color:#cbd5e1;text-align:center}.ts-face-camera-placeholder strong{color:#fff;font-size:17px}.ts-face-camera-placeholder span{font-size:12px}
        .ts-face-corners{position:absolute;inset:15% 29%;pointer-events:none}.ts-face-corners i{position:absolute;width:34px;height:34px;border-color:#4ade80;border-style:solid}.ts-face-corners i:nth-child(1){top:0;left:0;border-width:4px 0 0 4px;border-radius:8px 0 0}.ts-face-corners i:nth-child(2){top:0;right:0;border-width:4px 4px 0 0;border-radius:0 8px 0 0}.ts-face-corners i:nth-child(3){bottom:0;left:0;border-width:0 0 4px 4px;border-radius:0 0 0 8px}.ts-face-corners i:nth-child(4){bottom:0;right:0;border-width:0 4px 4px 0;border-radius:0 0 8px}
        .ts-face-live-pill{position:absolute;top:12px;left:12px;display:flex;align-items:center;gap:7px;padding:7px 10px;border-radius:999px;background:rgba(15,23,42,.8);color:#fff;font-size:10px;font-weight:900;letter-spacing:.04em}.ts-face-live-pill i{background:#4ade80}
        .ts-face-consent{display:flex;align-items:flex-start;gap:9px;margin:12px 0;padding:11px;border-radius:9px;background:#fffbeb;color:#854d0e;font-size:11px;line-height:1.5}.ts-face-consent input{margin-top:2px}
        .ts-face-actions{display:flex;gap:9px;margin-top:12px}.ts-face-actions button{min-height:42px;border-radius:9px;padding:0 14px;font-weight:900;cursor:pointer}.ts-face-actions .secondary{border:1px solid #cbd5e1;background:#fff;color:#334155}.ts-face-actions .primary{flex:1;border:0;background:linear-gradient(135deg,#16a34a,#059669);color:#fff}.ts-face-actions button:disabled{opacity:.5;cursor:not-allowed}
        .ts-face-message{display:flex;align-items:flex-start;gap:8px;margin-top:12px;padding:10px 12px;border-radius:9px;font-size:12px;line-height:1.45}.ts-face-message.success{background:#dcfce7;color:#166534}.ts-face-message.error{background:#fee2e2;color:#991b1b}
        .ts-face-info-card h3{display:flex;align-items:center;gap:9px;margin:2px 0 13px;color:#312e81;font-size:15px}.ts-face-info-card ul{display:grid;gap:11px;padding-left:19px;margin:0;color:#334155;font-size:12px;line-height:1.5}.ts-face-note{display:grid;gap:6px;margin-top:18px;padding:12px;border:1px solid #c4b5fd;border-radius:10px;background:#f5f3ff;color:#4c1d95;font-size:11px;line-height:1.5}.ts-face-note strong{font-size:12px}
        @media(max-width:850px){.ts-face-layout{grid-template-columns:1fr}.ts-face-status{display:none}}
        @media(max-width:560px){.ts-face-intro{align-items:flex-start}.ts-face-layout{padding:0 9px 12px}.ts-face-camera-card,.ts-face-info-card{padding:10px}.ts-face-mode-tabs{flex-direction:column}.ts-face-video-wrap{min-height:230px}.ts-face-actions{flex-direction:column}.ts-face-actions button{width:100%}}


        .ts-app.ts-dark {
          --ts-bg: #07111f;
          --ts-surface: #0c1726;
          --ts-surface-2: #111f31;
          --ts-border: rgba(148,163,184,.18);
          --ts-text: #f8fafc;
          --ts-muted: #94a3b8;
          background: #07111f !important;
          color: #f8fafc !important;
        }
        .ts-app.ts-dark .ts-topbar,
        .ts-app.ts-dark .ts-heading,
        .ts-app.ts-dark .ts-panel,
        .ts-app.ts-dark .ts-sheet-bar,
        .ts-app.ts-dark .ts-grid-wrap,
        .ts-app.ts-dark .ts-bottom-tools,
        .ts-app.ts-dark .ts-summary-card,
        .ts-app.ts-dark .ts-chart-card,
        .ts-app.ts-dark .ts-stat,
        .ts-app.ts-dark .ts-detail-box,
        .ts-app.ts-dark .ts-record-sheet {
          background: #0c1726 !important;
          color: #f8fafc !important;
          border-color: rgba(148,163,184,.18) !important;
        }
        .ts-app.ts-dark input,
        .ts-app.ts-dark select,
        .ts-app.ts-dark textarea,
        .ts-app.ts-dark .ts-cell,
        .ts-app.ts-dark .ts-search {
          background: #111f31 !important;
          color: #f8fafc !important;
          border-color: rgba(148,163,184,.2) !important;
        }
        .ts-app.ts-dark input::placeholder,
        .ts-app.ts-dark textarea::placeholder,
        .ts-app.ts-dark p,
        .ts-app.ts-dark small,
        .ts-app.ts-dark span {
          color: inherit;
        }
        .ts-app.ts-dark .ts-grid th,
        .ts-app.ts-dark .ts-grid td,
        .ts-app.ts-dark .ts-record-table th,
        .ts-app.ts-dark .ts-record-table td {
          border-color: rgba(148,163,184,.14) !important;
        }
        .ts-app.ts-dark .ts-grid th,
        .ts-app.ts-dark .ts-record-table th {
          background: #101d2e !important;
          color: #cbd5e1 !important;
        }
        .ts-app.ts-dark .ts-grid td,
        .ts-app.ts-dark .ts-record-table td {
          color: #e2e8f0 !important;
        }
        .ts-app.ts-dark .ts-panel-header,
        .ts-app.ts-dark .ts-report-head,
        .ts-app.ts-dark .ts-setting-help {
          color: #e2e8f0 !important;
          border-color: rgba(148,163,184,.14) !important;
        }
        .ts-app.ts-dark .ts-top-action,
        .ts-app.ts-dark .ts-icon-tool,
        .ts-app.ts-dark .ts-bottom-tools button,
        .ts-app.ts-dark .ts-sheet-tab button,
        .ts-app.ts-dark .ts-calendar-head button,
        .ts-app.ts-dark .ts-cal-day,
        .ts-app.ts-dark .ts-mini-nav button {
          color: #e2e8f0 !important;
        }
        .ts-app.ts-dark .ts-top-action.active,
        .ts-app.ts-dark .ts-sheet-tab.active {
          background: rgba(16,185,129,.14) !important;
          color: #6ee7b7 !important;
        }
        .ts-app.ts-dark .ts-cal-day.muted { color: #475569 !important; }
        .ts-app.ts-dark .ts-money,
        .ts-app.ts-dark .ts-stat strong,
        .ts-app.ts-dark .ts-summary-card strong {
          color: #f8fafc !important;
        }

        .ts-report-week-list { display: grid; gap: 16px; }
        .ts-week-record { overflow: auto; border: 1px solid rgba(148,163,184,.16); border-radius: 18px; background: rgba(255,255,255,.72); }
        .ts-week-record-head { display: grid; grid-template-columns: 1.5fr 1.4fr 1fr 1fr; gap: 14px; padding: 16px; border-bottom: 1px solid rgba(148,163,184,.16); }
        .ts-week-record-head > div { display: flex; flex-direction: column; gap: 4px; }
        .ts-week-record-head span { font-size: 12px; opacity: .65; }
        .ts-week-record table { width: 100%; min-width: 980px; border-collapse: collapse; }
        .ts-week-record th, .ts-week-record td { padding: 10px 12px; text-align: left; border-bottom: 1px solid rgba(148,163,184,.12); white-space: nowrap; }
        .ts-week-record th { font-size: 11px; text-transform: uppercase; letter-spacing: .05em; opacity: .7; }
        .ts-app.ts-dark .ts-week-record { background: #0c1726; border-color: rgba(148,163,184,.18); }
        .ts-app.ts-dark .ts-week-record-head,
        .ts-app.ts-dark .ts-week-record th,
        .ts-app.ts-dark .ts-week-record td { border-color: rgba(148,163,184,.14); color: #e2e8f0; }
        .ts-app.ts-dark .ts-week-record th { background: #101d2e; }

        .ts-analytics-controls { display:grid; grid-template-columns:minmax(160px,1fr) auto minmax(150px,1fr) auto minmax(180px,1fr); gap:10px; align-items:center; margin:16px 0; }
        .ts-analytics-controls select, .ts-analytics-controls input, .ts-analytics-controls button { min-height:42px; border:1px solid rgba(148,163,184,.2); border-radius:12px; padding:0 12px; background:#fff; color:#0f172a; }
        .ts-analytics-controls button { display:grid; place-items:center; cursor:pointer; }
        .ts-analytics-period-title { display:flex; justify-content:space-between; align-items:center; gap:12px; padding:14px 16px; border-radius:14px; background:linear-gradient(135deg,rgba(16,185,129,.08),rgba(37,99,235,.06)); border:1px solid rgba(16,185,129,.14); margin-bottom:14px; }
        .ts-analytics-period-title span { opacity:.65; }
        .ts-analytics-detail { margin-top:16px; border:1px solid rgba(148,163,184,.16); border-radius:18px; overflow:hidden; background:rgba(255,255,255,.75); }
        .ts-analytics-detail-head { display:flex; justify-content:space-between; align-items:center; gap:16px; padding:16px 18px; border-bottom:1px solid rgba(148,163,184,.14); }
        .ts-analytics-detail-head h3 { margin:0 0 4px; }
        .ts-analytics-detail-head p { margin:0; opacity:.65; font-size:13px; }
        .ts-analytics-table-wrap { overflow:auto; }
        .ts-analytics-table-wrap table { width:100%; min-width:760px; border-collapse:collapse; }
        .ts-analytics-table-wrap th, .ts-analytics-table-wrap td { padding:11px 13px; border-bottom:1px solid rgba(148,163,184,.12); text-align:left; white-space:nowrap; }
        .ts-analytics-table-wrap th { background:#f8fafc; font-size:11px; text-transform:uppercase; letter-spacing:.04em; }
        .ts-week-report-title { display:flex; justify-content:space-between; align-items:center; gap:16px; margin-bottom:14px; }
        .ts-week-report-title h3 { margin:0 0 4px; }
        .ts-week-report-title p { margin:0; opacity:.65; font-size:13px; }
        .ts-week-summary-table-wrap { overflow:auto; }
        .ts-week-summary-table { width:100%; min-width:820px; border-collapse:collapse; }
        .ts-week-summary-table th, .ts-week-summary-table td { padding:12px 13px; border-bottom:1px solid rgba(148,163,184,.12); text-align:left; white-space:nowrap; }
        .ts-week-summary-table th { background:#f8fafc; font-size:11px; text-transform:uppercase; letter-spacing:.04em; }
        .ts-week-summary-table tfoot th { background:rgba(16,185,129,.08); }
        .ts-week-all-list { display:grid; gap:14px; }
        .ts-week-record tfoot th, .ts-week-record tfoot td { background:rgba(16,185,129,.07); font-weight:700; }
        .ts-money-rain { position:absolute; inset:0; overflow:hidden; pointer-events:none; }
        .ts-money-rain span { position:absolute; top:-70px; font-size:28px; animation:ts-money-fall linear infinite; filter:drop-shadow(0 8px 10px rgba(0,0,0,.12)); }
        @keyframes ts-money-fall { 0% { transform:translate3d(0,-80px,0) rotate(0deg); opacity:0; } 10% { opacity:1; } 100% { transform:translate3d(30px,110vh,0) rotate(360deg); opacity:.95; } }
        .ts-celebrate-bg { position:fixed !important; inset:0 !important; z-index:99999 !important; }
        .ts-celebrate { position:relative; z-index:2; }
        .ts-celebrate-stats { display:grid; gap:6px; }
        .ts-celebrate small { display:block; margin-top:14px; opacity:.7; }
        .ts-app.ts-dark .ts-analytics-detail, .ts-app.ts-dark .ts-week-summary-table-wrap { background:#0c1726; border-color:rgba(148,163,184,.18); }
        .ts-app.ts-dark .ts-analytics-period-title, .ts-app.ts-dark .ts-week-summary-table tfoot th, .ts-app.ts-dark .ts-week-record tfoot th, .ts-app.ts-dark .ts-week-record tfoot td { background:rgba(16,185,129,.08); color:#e2e8f0; }
        .ts-app.ts-dark .ts-analytics-controls select, .ts-app.ts-dark .ts-analytics-controls input, .ts-app.ts-dark .ts-analytics-controls button { background:#111f31; color:#f8fafc; border-color:rgba(148,163,184,.2); }
        .ts-app.ts-dark .ts-analytics-table-wrap th, .ts-app.ts-dark .ts-week-summary-table th { background:#101d2e; color:#cbd5e1; }
        .ts-app.ts-dark .ts-analytics-table-wrap td, .ts-app.ts-dark .ts-analytics-table-wrap th, .ts-app.ts-dark .ts-week-summary-table td, .ts-app.ts-dark .ts-week-summary-table th { border-color:rgba(148,163,184,.14); color:#e2e8f0; }
        @media (max-width: 900px) {
          .ts-week-record-head { grid-template-columns: 1fr 1fr; }
        }

        /* Premium dark theme — one consistent surface system across every panel */
        html.sodah-timesheet-dark,
        body.sodah-timesheet-dark-body {
          background: #07111f !important;
          color: #f8fafc !important;
          color-scheme: dark;
        }
        body.sodah-timesheet-dark-body { margin: 0; }

        .ts-app.ts-dark {
          --ts-dark-bg: #07111f;
          --ts-dark-surface: #0b1726;
          --ts-dark-surface-2: #0f1f31;
          --ts-dark-surface-3: #12263a;
          --ts-dark-border: rgba(148,163,184,.18);
          --ts-dark-border-strong: rgba(148,163,184,.28);
          --ts-dark-text: #f8fafc;
          --ts-dark-text-2: #e2e8f0;
          --ts-dark-muted: #94a3b8;
          --ts-dark-green: #10b981;
          background: linear-gradient(180deg,#07111f 0%,#081524 100%) !important;
          color: var(--ts-dark-text) !important;
        }

        .ts-app.ts-dark .ts-heading,
        .ts-app.ts-dark .ts-main { background: transparent !important; }

        .ts-app.ts-dark .ts-topbar {
          background: rgba(7,17,31,.96) !important;
          border-color: var(--ts-dark-border) !important;
          box-shadow: 0 1px 0 rgba(255,255,255,.02), 0 10px 30px rgba(0,0,0,.12);
        }
        .ts-app.ts-dark .ts-heading {
          border-color: var(--ts-dark-border) !important;
        }
        .ts-app.ts-dark .ts-title-row h1,
        .ts-app.ts-dark .ts-heading p,
        .ts-app.ts-dark .ts-current-day,
        .ts-app.ts-dark .ts-current-day span,
        .ts-app.ts-dark .ts-current-day strong,
        .ts-app.ts-dark .ts-current-day small { color: var(--ts-dark-text-2) !important; }
        .ts-app.ts-dark .ts-current-day {
          background: #0e1d2d !important;
          border: 1px solid var(--ts-dark-border) !important;
          box-shadow: 0 8px 24px rgba(0,0,0,.12);
        }

        /* Panels */
        .ts-app.ts-dark .ts-panel {
          background: #0b1726 !important;
          border: 1px solid var(--ts-dark-border) !important;
          box-shadow: 0 18px 50px rgba(0,0,0,.18);
        }
        .ts-app.ts-dark .ts-panel-header {
          background: #0f1f31 !important;
          border-bottom: 1px solid var(--ts-dark-border) !important;
        }
        .ts-app.ts-dark .ts-panel-header h2 { color: #f8fafc !important; }
        .ts-app.ts-dark .ts-panel-header p { color: #94a3b8 !important; }
        .ts-app.ts-dark .ts-panel-header button {
          background: #14283b !important;
          color: #cbd5e1 !important;
          border: 1px solid var(--ts-dark-border) !important;
        }

        /* Settings: remove the accidental white blocks */
        .ts-app.ts-dark .ts-settings-grid { background: transparent !important; }
        .ts-app.ts-dark .ts-setting span { color: #cbd5e1 !important; }
        .ts-app.ts-dark .ts-setting input,
        .ts-app.ts-dark .ts-setting select {
          background: #0f1f31 !important;
          color: #f8fafc !important;
          border: 1px solid #263b50 !important;
          box-shadow: inset 0 1px 0 rgba(255,255,255,.02);
        }
        .ts-app.ts-dark .ts-setting input:focus,
        .ts-app.ts-dark .ts-setting select:focus,
        .ts-app.ts-dark .ts-analytics-controls input:focus,
        .ts-app.ts-dark .ts-analytics-controls select:focus {
          border-color: rgba(16,185,129,.65) !important;
          box-shadow: 0 0 0 3px rgba(16,185,129,.10) !important;
          outline: none !important;
        }
        .ts-app.ts-dark .ts-setting-help {
          background: linear-gradient(135deg,#10283a,#0d2031) !important;
          color: #b8c6d6 !important;
          border: 1px solid rgba(16,185,129,.16) !important;
          box-shadow: inset 0 1px 0 rgba(255,255,255,.025);
        }
        .ts-app.ts-dark .ts-setting-help b { color: #6ee7b7 !important; }

        /* Calendar */
        .ts-app.ts-dark .ts-calendar-head,
        .ts-app.ts-dark .ts-calendar-grid {
          background: #0b1726 !important;
        }
        .ts-app.ts-dark .ts-calendar-head { color: #f8fafc !important; }
        .ts-app.ts-dark .ts-calendar-head button {
          background: #12263a !important;
          color: #e2e8f0 !important;
          border: 1px solid #294057 !important;
        }
        .ts-app.ts-dark .ts-cal-week {
          background: #0f1f31 !important;
          color: #94a3b8 !important;
          border-color: var(--ts-dark-border) !important;
        }
        .ts-app.ts-dark .ts-cal-day {
          background: #0b1726 !important;
          color: #e2e8f0 !important;
          border-color: var(--ts-dark-border) !important;
        }
        .ts-app.ts-dark .ts-cal-day:hover { background: #12283b !important; }
        .ts-app.ts-dark .ts-cal-day.has { background: rgba(16,185,129,.08) !important; }
        .ts-app.ts-dark .ts-cal-day.has span { color: #6ee7b7 !important; }
        .ts-app.ts-dark .ts-cal-day.muted { background: #091420 !important; color: #526174 !important; }

        /* Analytics */
        .ts-app.ts-dark .ts-stat,
        .ts-app.ts-dark .ts-chart-card,
        .ts-app.ts-dark .ts-analytics-detail,
        .ts-app.ts-dark .ts-detail-box,
        .ts-app.ts-dark .ts-week-record,
        .ts-app.ts-dark .ts-week-summary-table-wrap {
          background: #0b1726 !important;
          border-color: var(--ts-dark-border) !important;
        }
        .ts-app.ts-dark .ts-stat span,
        .ts-app.ts-dark .ts-chart-title,
        .ts-app.ts-dark .ts-analytics-detail-head p,
        .ts-app.ts-dark .ts-week-report-title p,
        .ts-app.ts-dark .ts-week-record-head span { color: #94a3b8 !important; }
        .ts-app.ts-dark .ts-stat strong,
        .ts-app.ts-dark .ts-chart-title,
        .ts-app.ts-dark .ts-analytics-detail-head h3,
        .ts-app.ts-dark .ts-week-report-title h3 { color: #f8fafc !important; }
        .ts-app.ts-dark .ts-analytics-controls select,
        .ts-app.ts-dark .ts-analytics-controls input,
        .ts-app.ts-dark .ts-analytics-controls button {
          background: #0f1f31 !important;
          color: #f8fafc !important;
          border-color: #263b50 !important;
        }

        /* Tables and record sheets */
        .ts-app.ts-dark .ts-grid-wrap,
        .ts-app.ts-dark .ts-record-sheet {
          background: #0b1726 !important;
          border-color: var(--ts-dark-border) !important;
        }
        .ts-app.ts-dark .ts-grid thead th,
        .ts-app.ts-dark .ts-record-table thead th,
        .ts-app.ts-dark .ts-analytics-table-wrap th,
        .ts-app.ts-dark .ts-week-summary-table th,
        .ts-app.ts-dark .ts-week-record th {
          background: #101f31 !important;
          color: #cbd5e1 !important;
          border-color: var(--ts-dark-border) !important;
        }
        .ts-app.ts-dark .ts-grid tbody tr,
        .ts-app.ts-dark .ts-record-table tbody tr,
        .ts-app.ts-dark .ts-week-summary-table tbody tr,
        .ts-app.ts-dark .ts-week-record tbody tr {
          background: #0b1726 !important;
        }
        .ts-app.ts-dark .ts-grid tbody tr:hover,
        .ts-app.ts-dark .ts-record-table tbody tr:hover,
        .ts-app.ts-dark .ts-week-summary-table tbody tr:hover,
        .ts-app.ts-dark .ts-week-record tbody tr:hover { background: #0e2033 !important; }
        .ts-app.ts-dark .ts-grid td,
        .ts-app.ts-dark .ts-record-table td,
        .ts-app.ts-dark .ts-week-summary-table td,
        .ts-app.ts-dark .ts-week-record td { color: #e2e8f0 !important; border-color: var(--ts-dark-border) !important; }
        .ts-app.ts-dark .ts-money { color: #a7f3d0 !important; font-weight: 700; }
        .ts-app.ts-dark .ts-cell,
        .ts-app.ts-dark .ts-status,
        .ts-app.ts-dark .ts-select {
          background: #0f1f31 !important;
          color: #f8fafc !important;
          border-color: #263b50 !important;
        }
        .ts-app.ts-dark .ts-day-cell {
          background: #102033 !important;
          color: #d1fae5 !important;
          border-color: rgba(16,185,129,.14) !important;
        }

        /* Record modal: no white cards in dark mode */
        .ts-app.ts-dark .ts-modal-bg { background: rgba(1,8,16,.78) !important; backdrop-filter: blur(8px); }
        .ts-app.ts-dark .ts-record-top,
        .ts-app.ts-dark .ts-record-calendar,
        .ts-app.ts-dark .ts-record-summary,
        .ts-app.ts-dark .ts-record-actions { background: #0b1726 !important; color: #f8fafc !important; }
        .ts-app.ts-dark .ts-record-top { border-bottom: 1px solid var(--ts-dark-border) !important; }
        .ts-app.ts-dark .ts-record-top span,
        .ts-app.ts-dark .ts-record-top p { color: #94a3b8 !important; }
        .ts-app.ts-dark .ts-record-top h2 { color: #f8fafc !important; }
        .ts-app.ts-dark .ts-record-top button,
        .ts-app.ts-dark .ts-mini-nav button {
          background: #12263a !important;
          color: #e2e8f0 !important;
          border: 1px solid #294057 !important;
        }
        .ts-app.ts-dark .ts-record-summary span {
          background: #0f1f31 !important;
          border: 1px solid var(--ts-dark-border) !important;
          color: #94a3b8 !important;
        }
        .ts-app.ts-dark .ts-record-summary b { color: #f8fafc !important; }
        .ts-app.ts-dark .ts-mini-grid span { color: #94a3b8 !important; }
        .ts-app.ts-dark .ts-mini-grid button {
          background: #0b1726 !important;
          color: #cbd5e1 !important;
          border-color: var(--ts-dark-border) !important;
        }
        .ts-app.ts-dark .ts-mini-grid button:hover { background: #12283b !important; }
        .ts-app.ts-dark .ts-mini-grid button.selected { background: #10b981 !important; color: #04130d !important; }

        /* Summary cards */
        .ts-app.ts-dark .ts-summary-card {
          background: linear-gradient(145deg,#0b1726,#0e1c2c) !important;
          border-color: var(--ts-dark-border) !important;
        }
        .ts-app.ts-dark .ts-summary-card span { color: #94a3b8 !important; }
        .ts-app.ts-dark .ts-summary-card strong { color: #f8fafc !important; }
        .ts-app.ts-dark .ts-summary-card.accent {
          border-color: rgba(16,185,129,.28) !important;
          background: linear-gradient(145deg,#0b1d27,#0d2530) !important;
        }

        /* Buttons */
        .ts-app.ts-dark .ts-bottom-tools button,
        .ts-app.ts-dark .ts-report-actions button,
        .ts-app.ts-dark .ts-record-actions button {
          background: #102236 !important;
          color: #e2e8f0 !important;
          border: 1px solid #294057 !important;
        }
        .ts-app.ts-dark .ts-report-actions button.ai,
        .ts-app.ts-dark .ts-record-actions button:first-child {
          background: linear-gradient(135deg,#10b981,#059669) !important;
          color: #03140e !important;
          border-color: transparent !important;
        }
        .ts-app.ts-dark .ts-report-actions button.download { background: #12283b !important; color: #a7f3d0 !important; }

        /* Native controls stay dark instead of rendering white OS menus */
        .ts-app.ts-dark select,
        .ts-app.ts-dark input,
        .ts-app.ts-dark textarea { color-scheme: dark; }
        /* Sticky spreadsheet headers */
        .ts-grid-wrap { overflow:auto !important; }
        .ts-grid thead th { position:sticky !important; top:0 !important; z-index:8 !important; }
        .ts-grid .ts-row-num { position:sticky !important; left:0 !important; z-index:9 !important; }
        .ts-grid thead .ts-row-num { z-index:12 !important; }
        .ts-grid tbody .ts-row-num { z-index:7 !important; }

        /* Employee Tools / Device Register */
        .ts-equipment-toolbar { display:flex; gap:10px; flex-wrap:wrap; padding:14px 0; }
        .ts-equipment-table-wrap { overflow:auto; border:1px solid rgba(148,163,184,.22); border-radius:16px; }
        .ts-equipment-table { width:100%; min-width:980px; border-collapse:separate; border-spacing:0; }
        .ts-equipment-table th, .ts-equipment-table td { padding:12px; border-right:1px solid rgba(148,163,184,.18); border-bottom:1px solid rgba(148,163,184,.18); text-align:left; white-space:nowrap; }
        .ts-equipment-table th { position:sticky; top:0; z-index:5; font-size:11px; text-transform:uppercase; letter-spacing:.05em; }
        .ts-equipment-action { min-width:120px; min-height:38px; border-radius:10px; border:1px solid rgba(16,185,129,.45); font-weight:800; cursor:pointer; }
        .ts-equipment-action.give { background:#10b981; color:#052015; }
        .ts-equipment-action.return { background:#8fd3ff; color:#061522; }
        .ts-equipment-action.returned { background:#94a3b8; color:#0f172a; }
        .ts-equipment-status { font-weight:800; }
        .ts-equipment-status.pending { color:#fbbf24; }
        .ts-equipment-status.returned { color:#34d399; }
        .ts-equipment-status.ready { color:#60a5fa; }
        .ts-equipment-help { padding:14px 16px; margin-top:14px; border-radius:14px; font-size:13px; line-height:1.6; }

        /* Tools: real spreadsheet grid and premium quick analytics */
        .ts-equipment-stats { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:12px; margin:14px 0; }
        .ts-equipment-stat { min-height:78px; width:100%; text-align:left; cursor:default; font-family:inherit; border-radius:14px; padding:14px 16px; border:1px solid rgba(255,255,255,.24); display:flex; align-items:center; justify-content:space-between; color:#fff; box-shadow:none; }
        .ts-equipment-stat span { font-size:12px; font-weight:800; text-transform:uppercase; letter-spacing:.04em; }
        .ts-equipment-stat strong { font-size:26px; }
        .ts-equipment-stat.given { background:#0f6b5c; border-color:#37d4b5; }
        .ts-equipment-stat.returned { background:#1769a8; border-color:#65c5ff; }
        .ts-equipment-stat.pending { background:#8a5a12; border-color:#ffd166; }
        .ts-equipment-toolbar { display:flex; gap:10px; align-items:center; flex-wrap:wrap; padding:14px 0; }
        .ts-equipment-main-btn { display:inline-flex; align-items:center; gap:7px; min-height:40px; padding:0 15px; border-radius:10px; border:1px solid rgba(255,255,255,.38); font-weight:900; cursor:pointer; color:#fff; background:#12324d; }
        .ts-equipment-main-btn.add { background:#19b58a; color:#031c15; border-color:#64f0cf; }
        .ts-equipment-main-btn.remove { background:#24364a; color:#fff; }
        .ts-equipment-main-btn.import { background:#247bc2; color:#fff; }
        .ts-equipment-main-btn:disabled { opacity:.45; cursor:not-allowed; }
        .ts-equipment-sheet-tabs { display:flex; align-items:center; gap:6px; margin-left:auto; }
        .ts-equipment-sheet-tabs button { min-height:38px; padding:0 13px; border-radius:9px; border:1px solid rgba(255,255,255,.28); background:#0c2236; color:#fff; font-weight:800; cursor:pointer; }
        .ts-equipment-sheet-tabs button.active { background:#8fd3ff; color:#04111c; border-color:#8fd3ff; }
        .ts-equipment-sheet-tabs .ts-equipment-add-sheet { width:40px; padding:0; display:grid; place-items:center; background:#12324d; }
        .ts-equipment-import-names { display:flex; gap:8px; align-items:center; }
        .ts-equipment-import-names select { min-height:40px; border-radius:10px; border:1px solid rgba(255,255,255,.32); background:#0c2236; color:#fff; padding:0 10px; }
        .ts-equipment-table-wrap { overflow:auto; border:1px solid rgba(255,255,255,.55); border-radius:10px; background:#071523; }
        .ts-equipment-table { width:100%; min-width:980px; border-collapse:collapse; table-layout:fixed; }
        .ts-equipment-table th, .ts-equipment-table td { padding:9px 10px; border:1px solid rgba(255,255,255,.62); text-align:left; white-space:nowrap; height:54px; }
        .ts-equipment-table th { position:sticky; top:0; z-index:5; background:#0b2942; color:#fff; font-size:11px; font-weight:900; letter-spacing:.05em; }
        .ts-equipment-table td { background:#081b2c; color:#fff; }
        .ts-equipment-table tbody tr:nth-child(even) td { background:#0b2237; }
        .ts-equipment-table .ts-cell { width:100%; min-height:36px; border:1px solid rgba(255,255,255,.42); background:#0e2940; color:#fff; border-radius:7px; padding:0 9px; }
        .ts-equipment-table .ts-cell:focus { outline:2px solid #8fd3ff; outline-offset:-1px; }
        .ts-equipment-action { min-width:120px; min-height:36px; border-radius:8px; border:1px solid rgba(255,255,255,.5); font-weight:900; cursor:pointer; display:inline-flex; align-items:center; justify-content:center; gap:6px; }
        .ts-equipment-action.give { background:#19b58a; color:#031c15; }
        .ts-equipment-action.return { background:#8fd3ff; color:#04111c; }
        .ts-equipment-status { font-weight:900; }
        .ts-equipment-status.pending { color:#ffd166; }
        .ts-equipment-status.returned { color:#65f0c8; }
        .ts-equipment-status.ready { color:#8fd3ff; }
        @media(max-width:900px){ .ts-equipment-stats{grid-template-columns:1fr;} .ts-equipment-sheet-tabs{margin-left:0;} .ts-equipment-toolbar{align-items:stretch;} }

        .ts-settings-appearance { margin-top:18px; padding:18px; border-radius:18px; border:1px solid rgba(148,163,184,.22); }
        .ts-settings-appearance-title { font-size:13px; font-weight:900; text-transform:uppercase; letter-spacing:.06em; margin-bottom:12px; }
        .ts-mode-buttons { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:10px; }
        .ts-mode-button { min-height:48px; border-radius:12px; border:1px solid rgba(148,163,184,.25); font-weight:800; cursor:pointer; }
        .ts-settings-brand-colors { margin-top:14px; display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:12px; }
        .ts-settings-brand-colors .ts-setting { margin:0; }
        @media(max-width:800px){ .ts-settings-brand-colors,.ts-mode-buttons{grid-template-columns:1fr;} }

        /* FINAL SUBTITLE STABILITY + FLEXIBLE WIDTH */
        .ts-app .ts-heading {
          position:sticky !important;
          top:189px !important;
          z-index:1020 !important;
          min-height:72px !important;
          box-sizing:border-box !important;
          display:flex !important;
          align-items:center !important;
          width:100% !important;
          max-width:none !important;
          padding:10px 22px 9px !important;
          background:#f1f3f5 !important;
          border-top:1px solid #d5dadd !important;
          border-bottom:1px solid #cbd1d6 !important;
          box-shadow:0 2px 8px rgba(15,23,42,.08) !important;
        }
        .ts-app .ts-heading > div:first-child {
          flex:1 1 auto !important;
          min-width:0 !important;
          width:100% !important;
          max-width:none !important;
        }
        .ts-app .ts-heading .ts-title-row {
          min-width:0 !important;
        }
        .ts-app .ts-heading .ts-title-row h1 {
          margin:0 !important;
        }
        .ts-app .ts-heading p {
          display:block !important;
          width:100% !important;
          max-width:none !important;
          margin:3px 0 0 !important;
          padding:0 !important;
          color:#6b7280 !important;
          font-size:12px !important;
          line-height:18px !important;
          font-weight:500 !important;
          letter-spacing:.01em !important;
          white-space:normal !important;
          overflow:visible !important;
          text-overflow:clip !important;
        }
        .ts-app .ts-current-day {
          flex:0 0 auto !important;
          margin-left:18px !important;
        }
        .ts-app .ts-sheet-bar {
          top:261px !important;
        }
        @media(max-width:900px){
          .ts-app .ts-heading { top:185px !important; min-height:68px !important; padding-left:14px !important; padding-right:14px !important; }
          .ts-app .ts-sheet-bar { top:253px !important; }
          .ts-app .ts-heading p { font-size:11px !important; }
          .ts-app .ts-current-day { margin-left:10px !important; }
        }
        .ts-app.ts-dark .ts-heading {
          background:#0f1d2a !important;
          border-color:rgba(148,163,184,.22) !important;
        }
        .ts-app.ts-dark .ts-heading p {
          color:#94a3b8 !important;
        }

      `}</style>
      <style>{`
        /* SODAH DARK MODE — LIGHT BLUE + BLACK PROFESSIONAL SYSTEM */
        .ts-app.ts-dark {
          --ts-dark-bg: #06111d;
          --ts-dark-surface: #091a2b;
          --ts-dark-surface-2: #0d2439;
          --ts-dark-surface-3: #12324d;
          --ts-dark-blue: #8fd3ff;
          --ts-dark-blue-strong: #5dbaf5;
          --ts-dark-text: #ffffff;
          --ts-dark-muted: #c5d7e6;
          --ts-dark-border: rgba(255,255,255,.42);
          --ts-dark-border-soft: rgba(255,255,255,.22);
          background: #06111d !important;
          color: #ffffff !important;
          color-scheme: dark;
        }

        html.sodah-timesheet-dark,
        body.sodah-timesheet-dark-body {
          background: #06111d !important;
          color: #ffffff !important;
        }

        .ts-app.ts-dark,
        .ts-app.ts-dark .ts-main,
        .ts-app.ts-dark .ts-heading,
        .ts-app.ts-dark .ts-workspace,
        .ts-app.ts-dark .ts-content {
          background: #06111d !important;
          color: #ffffff !important;
        }

        /* Top navigation / heading */
        .ts-app.ts-dark .ts-topbar {
          background: #050e18 !important;
          border-color: rgba(255,255,255,.28) !important;
          box-shadow: none !important;
        }
        .ts-app.ts-dark .ts-brand-name,
        .ts-app.ts-dark .ts-brand-sub,
        .ts-app.ts-dark .ts-title-row h1,
        .ts-app.ts-dark .ts-heading p,
        .ts-app.ts-dark .ts-current-day,
        .ts-app.ts-dark .ts-current-day span,
        .ts-app.ts-dark .ts-current-day strong,
        .ts-app.ts-dark .ts-current-day small {
          color: #ffffff !important;
        }
        .ts-app.ts-dark .ts-current-day {
          background: #102c44 !important;
          border: 1px solid rgba(255,255,255,.45) !important;
          box-shadow: none !important;
        }

        /* Top controls */
        .ts-app.ts-dark .ts-top-action,
        .ts-app.ts-dark .ts-icon-tool,
        .ts-app.ts-dark .ts-search,
        .ts-app.ts-dark .ts-search input {
          background: #0b2033 !important;
          color: #ffffff !important;
          border-color: rgba(255,255,255,.34) !important;
        }
        .ts-app.ts-dark .ts-top-action svg,
        .ts-app.ts-dark .ts-icon-tool svg,
        .ts-app.ts-dark .ts-search svg { color: #ffffff !important; }
        .ts-app.ts-dark .ts-top-action.active {
          background: #8fd3ff !important;
          color: #04111c !important;
          border-color: #8fd3ff !important;
        }
        .ts-app.ts-dark .ts-top-action.active svg { color: #04111c !important; }
        .ts-app.ts-dark .ts-search input::placeholder { color: #c5d7e6 !important; }
        .ts-app.ts-dark .ts-search-check {
          background: #8fd3ff !important;
          color: #04111c !important;
          border-color: #8fd3ff !important;
        }

        /* Panels */
        .ts-app.ts-dark .ts-panel,
        .ts-app.ts-dark .ts-grid-wrap,
        .ts-app.ts-dark .ts-chart-card,
        .ts-app.ts-dark .ts-stat,
        .ts-app.ts-dark .ts-detail-box,
        .ts-app.ts-dark .ts-analytics-detail,
        .ts-app.ts-dark .ts-week-record,
        .ts-app.ts-dark .ts-week-summary-table-wrap {
          background: #091a2b !important;
          color: #ffffff !important;
          border: 1px solid rgba(255,255,255,.32) !important;
          box-shadow: none !important;
        }
        .ts-app.ts-dark .ts-panel-header {
          background: #0d2439 !important;
          color: #ffffff !important;
          border-bottom: 1px solid rgba(255,255,255,.32) !important;
        }
        .ts-app.ts-dark .ts-panel-header h2,
        .ts-app.ts-dark .ts-panel-header p,
        .ts-app.ts-dark .ts-panel-header button { color: #ffffff !important; }
        .ts-app.ts-dark .ts-panel-header button {
          background: #12324d !important;
          border: 1px solid rgba(255,255,255,.38) !important;
        }

        /* Settings — no white blocks */
        .ts-app.ts-dark .ts-settings-grid,
        .ts-app.ts-dark .ts-setting,
        .ts-app.ts-dark .ts-setting-help { background: transparent !important; }
        .ts-app.ts-dark .ts-setting span,
        .ts-app.ts-dark .ts-setting-help,
        .ts-app.ts-dark .ts-setting-help b { color: #ffffff !important; }
        .ts-app.ts-dark .ts-setting input,
        .ts-app.ts-dark .ts-setting select,
        .ts-app.ts-dark .ts-analytics-controls input,
        .ts-app.ts-dark .ts-analytics-controls select {
          background: #0d2439 !important;
          color: #ffffff !important;
          border: 1px solid rgba(255,255,255,.38) !important;
          box-shadow: none !important;
        }
        .ts-app.ts-dark .ts-setting-help {
          background: #0d2439 !important;
          border: 1px solid rgba(255,255,255,.38) !important;
          border-radius: 12px !important;
        }
        .ts-app.ts-dark .ts-setting input:focus,
        .ts-app.ts-dark .ts-setting select:focus,
        .ts-app.ts-dark .ts-analytics-controls input:focus,
        .ts-app.ts-dark .ts-analytics-controls select:focus {
          border-color: #8fd3ff !important;
          box-shadow: 0 0 0 2px rgba(143,211,255,.18) !important;
          outline: none !important;
        }

        /* Calendar */
        .ts-app.ts-dark .ts-calendar-head,
        .ts-app.ts-dark .ts-calendar-grid { background: #091a2b !important; color: #ffffff !important; }
        .ts-app.ts-dark .ts-calendar-head button {
          background: #12324d !important;
          color: #ffffff !important;
          border: 1px solid rgba(255,255,255,.42) !important;
        }
        .ts-app.ts-dark .ts-cal-week {
          background: #0d2439 !important;
          color: #ffffff !important;
          border-color: rgba(255,255,255,.38) !important;
        }
        .ts-app.ts-dark .ts-cal-day {
          background: #091a2b !important;
          color: #ffffff !important;
          border-color: rgba(255,255,255,.38) !important;
        }
        .ts-app.ts-dark .ts-cal-day:hover,
        .ts-app.ts-dark .ts-cal-day.has { background: #12324d !important; color: #ffffff !important; }
        .ts-app.ts-dark .ts-cal-day.has span { color: #8fd3ff !important; }
        .ts-app.ts-dark .ts-cal-day.muted { background: #071421 !important; color: #8fa6b8 !important; }

        /* Analytics text and cards */
        .ts-app.ts-dark .ts-stat span,
        .ts-app.ts-dark .ts-chart-title,
        .ts-app.ts-dark .ts-analytics-detail-head p,
        .ts-app.ts-dark .ts-week-report-title p,
        .ts-app.ts-dark .ts-week-record-head span { color: #ffffff !important; }
        .ts-app.ts-dark .ts-stat strong,
        .ts-app.ts-dark .ts-chart-title,
        .ts-app.ts-dark .ts-analytics-detail-head h3,
        .ts-app.ts-dark .ts-week-report-title h3 { color: #ffffff !important; }

        /* ALL TABLES: black-blue surfaces, white text, bright white lines */
        .ts-app.ts-dark table,
        .ts-app.ts-dark .ts-grid,
        .ts-app.ts-dark .ts-record-table,
        .ts-app.ts-dark .ts-analytics-table,
        .ts-app.ts-dark .ts-week-summary-table,
        .ts-app.ts-dark .ts-week-record table {
          background: #091a2b !important;
          color: #ffffff !important;
          border-color: rgba(255,255,255,.72) !important;
        }
        .ts-app.ts-dark table th,
        .ts-app.ts-dark table td,
        .ts-app.ts-dark .ts-grid th,
        .ts-app.ts-dark .ts-grid td,
        .ts-app.ts-dark .ts-record-table th,
        .ts-app.ts-dark .ts-record-table td,
        .ts-app.ts-dark .ts-analytics-table th,
        .ts-app.ts-dark .ts-analytics-table td,
        .ts-app.ts-dark .ts-week-summary-table th,
        .ts-app.ts-dark .ts-week-summary-table td,
        .ts-app.ts-dark .ts-week-record th,
        .ts-app.ts-dark .ts-week-record td {
          color: #ffffff !important;
          background: #091a2b !important;
          border-color: rgba(255,255,255,.72) !important;
        }
        .ts-app.ts-dark table thead th,
        .ts-app.ts-dark .ts-grid thead th,
        .ts-app.ts-dark .ts-record-table thead th,
        .ts-app.ts-dark .ts-analytics-table-wrap th,
        .ts-app.ts-dark .ts-week-summary-table th,
        .ts-app.ts-dark .ts-week-record th {
          background: #102c44 !important;
          color: #ffffff !important;
          border-color: rgba(255,255,255,.78) !important;
        }
        .ts-app.ts-dark table tbody tr:hover,
        .ts-app.ts-dark .ts-grid tbody tr:hover { background: #12324d !important; }
        .ts-app.ts-dark .ts-money { color: #ffffff !important; }

        /* Main spreadsheet cells */
        .ts-app.ts-dark .ts-cell,
        .ts-app.ts-dark .ts-status,
        .ts-app.ts-dark .ts-select,
        .ts-app.ts-dark .ts-day-cell {
          background: #0d2439 !important;
          color: #ffffff !important;
          border-color: rgba(255,255,255,.52) !important;
        }
        .ts-app.ts-dark .ts-day-cell { background: #12324d !important; }
        .ts-app.ts-dark .ts-grid input,
        .ts-app.ts-dark .ts-grid select,
        .ts-app.ts-dark .ts-grid textarea {
          background: #0d2439 !important;
          color: #ffffff !important;
          border-color: rgba(255,255,255,.42) !important;
        }
        .ts-app.ts-dark .ts-grid input::placeholder { color: #c5d7e6 !important; }

        /* Summary cards */
        .ts-app.ts-dark .ts-summary-card {
          background: #091a2b !important;
          color: #ffffff !important;
          border: 1px solid rgba(255,255,255,.42) !important;
          box-shadow: none !important;
        }
        .ts-app.ts-dark .ts-summary-card span,
        .ts-app.ts-dark .ts-summary-card strong { color: #ffffff !important; }
        .ts-app.ts-dark .ts-summary-icon { background: #12324d !important; color: #ffffff !important; }
        .ts-app.ts-dark .ts-summary-card.accent { background: #0d2439 !important; border-color: #8fd3ff !important; }

        /* Buttons */
        .ts-app.ts-dark .ts-bottom-tools button,
        .ts-app.ts-dark .ts-report-actions button,
        .ts-app.ts-dark .ts-record-actions button {
          background: #12324d !important;
          color: #ffffff !important;
          border: 1px solid rgba(255,255,255,.48) !important;
          box-shadow: none !important;
        }
        .ts-app.ts-dark .ts-report-actions button.ai,
        .ts-app.ts-dark .ts-record-actions button:first-child {
          background: #8fd3ff !important;
          color: #04111c !important;
          border-color: #8fd3ff !important;
        }
        .ts-app.ts-dark .ts-report-actions button.download { background: #12324d !important; color: #ffffff !important; }

        /* Modal / record view */
        .ts-app.ts-dark .ts-modal-bg { background: rgba(1,8,16,.84) !important; backdrop-filter: blur(10px); }
        .ts-app.ts-dark .ts-record-sheet,
        .ts-app.ts-dark .ts-record-top,
        .ts-app.ts-dark .ts-record-calendar,
        .ts-app.ts-dark .ts-record-summary,
        .ts-app.ts-dark .ts-record-actions { background: #091a2b !important; color: #ffffff !important; }
        .ts-app.ts-dark .ts-record-top { border-bottom: 1px solid rgba(255,255,255,.42) !important; }
        .ts-app.ts-dark .ts-record-top span,
        .ts-app.ts-dark .ts-record-top p,
        .ts-app.ts-dark .ts-record-summary span { color: #ffffff !important; }
        .ts-app.ts-dark .ts-record-top h2,
        .ts-app.ts-dark .ts-record-summary b { color: #ffffff !important; }
        .ts-app.ts-dark .ts-record-top button,
        .ts-app.ts-dark .ts-mini-nav button {
          background: #12324d !important;
          color: #ffffff !important;
          border: 1px solid rgba(255,255,255,.48) !important;
        }
        .ts-app.ts-dark .ts-record-summary span {
          background: #0d2439 !important;
          border: 1px solid rgba(255,255,255,.42) !important;
        }
        .ts-app.ts-dark .ts-mini-grid span { color: #ffffff !important; }
        .ts-app.ts-dark .ts-mini-grid button {
          background: #091a2b !important;
          color: #ffffff !important;
          border-color: rgba(255,255,255,.58) !important;
        }
        .ts-app.ts-dark .ts-mini-grid button:hover { background: #12324d !important; }
        .ts-app.ts-dark .ts-mini-grid button.selected { background: #8fd3ff !important; color: #04111c !important; }

        /* Remove green from dark mode: dark mode is strictly black + light blue */
        .ts-app.ts-dark .ts-logo,
        .ts-app.ts-dark .ts-live,
        .ts-app.ts-dark .ts-check-button,
        .ts-app.ts-dark .ts-sheet-tab.active,
        .ts-app.ts-dark .ts-sheet-tab button.active,
        .ts-app.ts-dark .ts-tab.active {
          background: #8fd3ff !important;
          color: #04111c !important;
          border-color: #8fd3ff !important;
        }
        .ts-app.ts-dark .ts-live span { background: #04111c !important; }
        .ts-app.ts-dark .ts-check-button svg { color: #04111c !important; }
        .ts-app.ts-dark .ts-check-button.checkin,
        .ts-app.ts-dark .ts-check-button.checkout-ready,
        .ts-app.ts-dark .ts-check-button.completed,
        .ts-app.ts-dark .ts-check-button.checkout-wait {
          background: #8fd3ff !important;
          color: #04111c !important;
          border: 1px solid #8fd3ff !important;
          box-shadow: none !important;
        }
        .ts-app.ts-dark .ts-status,
        .ts-app.ts-dark .ts-select { accent-color: #8fd3ff !important; }
        .ts-app.ts-dark .ts-sheet-bar,
        .ts-app.ts-dark .ts-bottom-tools,
        .ts-app.ts-dark .ts-sheet-tabs {
          background: #091a2b !important;
          color: #ffffff !important;
          border-color: rgba(255,255,255,.32) !important;
        }
        .ts-app.ts-dark .ts-sheet-tab,
        .ts-app.ts-dark .ts-sheet-tab button {
          background: #0d2439 !important;
          color: #ffffff !important;
          border-color: rgba(255,255,255,.38) !important;
        }
        .ts-app.ts-dark .ts-sheet-tab.active,
        .ts-app.ts-dark .ts-sheet-tab.active button {
          background: #8fd3ff !important;
          color: #04111c !important;
          border-color: #8fd3ff !important;
        }
        .ts-app.ts-dark .ts-live,
        .ts-app.ts-dark .ts-live span { box-shadow: none !important; }

        /* Keep all native form controls in the same dark blue system */
        .ts-app.ts-dark select,
        .ts-app.ts-dark input,
        .ts-app.ts-dark textarea,
        .ts-app.ts-dark button { color-scheme: dark; }
        .ts-app.ts-dark input::placeholder,
        .ts-app.ts-dark textarea::placeholder { color: #c5d7e6 !important; }

        /* =========================================================
           SODAH DARK MODE PALETTES
           One background family per selected user preference.
           ========================================================= */
        .ts-app.ts-dark { --palette-bg:#061522; --palette-surface:#0b2235; --palette-surface-2:#123b59; --palette-accent:#8fd3ff; --palette-border:rgba(255,255,255,.42); }
        .ts-app.ts-dark.ts-dark-blue { --palette-bg:#061522; --palette-surface:#0b2235; --palette-surface-2:#123b59; --palette-accent:#8fd3ff; --palette-border:rgba(255,255,255,.42); }
        .ts-app.ts-dark.ts-dark-black { --palette-bg:#050505; --palette-surface:#0d0d0d; --palette-surface-2:#181818; --palette-accent:#ffffff; --palette-border:rgba(255,255,255,.38); }
        .ts-app.ts-dark.ts-dark-green { --palette-bg:#061a14; --palette-surface:#0a2a20; --palette-surface-2:#104435; --palette-accent:#67e8b5; --palette-border:rgba(255,255,255,.38); }
        .ts-app.ts-dark.ts-dark-gray { --palette-bg:#15181c; --palette-surface:#20252b; --palette-surface-2:#2c333b; --palette-accent:#d7dde4; --palette-border:rgba(255,255,255,.42); }

        .ts-app.ts-dark,
        .ts-app.ts-dark .ts-main,
        .ts-app.ts-dark .ts-heading,
        .ts-app.ts-dark .ts-sheet-bar,
        .ts-app.ts-dark .ts-bottom-tools {
          background:var(--palette-bg) !important;
          color:#fff !important;
        }
        .ts-app.ts-dark .ts-topbar,
        .ts-app.ts-dark .ts-panel,
        .ts-app.ts-dark .ts-grid-wrap,
        .ts-app.ts-dark .ts-chart-card,
        .ts-app.ts-dark .ts-stat,
        .ts-app.ts-dark .ts-detail-box,
        .ts-app.ts-dark .ts-analytics-detail,
        .ts-app.ts-dark .ts-week-record,
        .ts-app.ts-dark .ts-week-summary-table-wrap,
        .ts-app.ts-dark .ts-record-sheet {
          background:var(--palette-surface) !important;
          color:#fff !important;
          border-color:var(--palette-border) !important;
        }
        .ts-app.ts-dark .ts-panel-header,
        .ts-app.ts-dark .ts-report-head,
        .ts-app.ts-dark .ts-analytics-period-title,
        .ts-app.ts-dark .ts-week-report-title,
        .ts-app.ts-dark .ts-record-top,
        .ts-app.ts-dark .ts-record-calendar,
        .ts-app.ts-dark .ts-record-actions {
          background:var(--palette-surface-2) !important;
          color:#fff !important;
          border-color:var(--palette-border) !important;
        }

        /* Analytics */
        .ts-app.ts-dark .ts-analytics-controls { background:transparent !important; }
        .ts-app.ts-dark .ts-analytics-controls select,
        .ts-app.ts-dark .ts-analytics-controls input,
        .ts-app.ts-dark .ts-analytics-controls button {
          background:var(--palette-surface-2) !important;
          color:#fff !important;
          border:1px solid var(--palette-border) !important;
        }
        .ts-app.ts-dark .ts-analytics-controls button:hover { background:var(--palette-accent) !important; color:#06111d !important; }
        .ts-app.ts-dark .ts-analytics-presets { grid-column:1 / -1; display:flex; flex-wrap:wrap; gap:8px; }
        .ts-app.ts-dark .ts-analytics-presets button { min-height:34px; padding:0 12px; border-radius:10px; background:var(--palette-surface-2) !important; color:#fff !important; border:1px solid var(--palette-border) !important; cursor:pointer; }
        .ts-app.ts-dark .ts-analytics-presets button:hover { background:var(--palette-accent) !important; color:#06111d !important; }
        .ts-app.ts-dark .ts-analytics-period-title { border:1px solid var(--palette-border) !important; }
        .ts-app.ts-dark .ts-stat { min-height:90px; }
        .ts-app.ts-dark .ts-stat span,
        .ts-app.ts-dark .ts-stat strong,
        .ts-app.ts-dark .ts-chart-title,
        .ts-app.ts-dark .ts-analytics-detail-head h3,
        .ts-app.ts-dark .ts-analytics-detail-head p,
        .ts-app.ts-dark .ts-analytics-detail-head strong { color:#fff !important; }
        .ts-app.ts-dark .ts-stat-icon { background:var(--palette-surface-2) !important; color:var(--palette-accent) !important; }
        .ts-app.ts-dark .ts-bar { background:var(--palette-accent) !important; }
        .ts-app.ts-dark .ts-bar-value { color:#fff !important; }

        /* Reports: all metric cards, toolbar, summary and expanded week */
        .ts-app.ts-dark .ts-report-toolbar,
        .ts-app.ts-dark .ts-report-metrics,
        .ts-app.ts-dark .ts-report-actions { background:transparent !important; }
        .ts-app.ts-dark .ts-report-toolbar select,
        .ts-app.ts-dark .ts-report-toolbar input {
          background:var(--palette-surface-2) !important;
          color:#fff !important;
          border:1px solid var(--palette-border) !important;
        }
        .ts-app.ts-dark .ts-report-head div,
        .ts-app.ts-dark .ts-report-metric {
          background:var(--palette-surface-2) !important;
          color:#fff !important;
          border:1px solid var(--palette-border) !important;
          border-radius:14px !important;
        }
        .ts-app.ts-dark .ts-report-head span,
        .ts-app.ts-dark .ts-report-head strong,
        .ts-app.ts-dark .ts-report-metric span,
        .ts-app.ts-dark .ts-report-metric strong,
        .ts-app.ts-dark .ts-report-metric svg { color:#fff !important; }
        .ts-app.ts-dark .ts-report-actions button,
        .ts-app.ts-dark .ts-record-actions button {
          background:var(--palette-surface-2) !important;
          color:#fff !important;
          border:1px solid var(--palette-border) !important;
        }
        .ts-app.ts-dark .ts-report-actions button:hover,
        .ts-app.ts-dark .ts-record-actions button:hover { background:var(--palette-accent) !important; color:#06111d !important; }
        .ts-app.ts-dark .ts-report-actions button.ai,
        .ts-app.ts-dark .ts-report-actions button.download,
        .ts-app.ts-dark .ts-record-actions button:first-child { background:var(--palette-accent) !important; color:#06111d !important; border-color:var(--palette-accent) !important; }
        .ts-app.ts-dark .ts-report-collapsed { background:var(--palette-surface-2) !important; color:#fff !important; border:1px solid var(--palette-border) !important; }
        .ts-app.ts-dark .ts-week-report-title strong { color:#fff !important; }

        /* Every table: black/blue surface, white text and visible white lines */
        .ts-app.ts-dark table,
        .ts-app.ts-dark table thead,
        .ts-app.ts-dark table tbody,
        .ts-app.ts-dark table tfoot { background:var(--palette-surface) !important; color:#fff !important; }
        .ts-app.ts-dark table th,
        .ts-app.ts-dark table td { color:#fff !important; border-color:var(--palette-border) !important; }
        .ts-app.ts-dark table thead th { background:var(--palette-surface-2) !important; color:#fff !important; }
        .ts-app.ts-dark table tfoot th,
        .ts-app.ts-dark table tfoot td { background:var(--palette-surface-2) !important; color:#fff !important; }

        /* Records: premium modal and exact daily result */
        .ts-app.ts-dark .ts-modal-bg { background:rgba(0,0,0,.78) !important; backdrop-filter:blur(10px); }
        .ts-app.ts-dark .ts-record-top h2,
        .ts-app.ts-dark .ts-record-top span,
        .ts-app.ts-dark .ts-record-top p { color:#fff !important; }
        .ts-app.ts-dark .ts-record-top button,
        .ts-app.ts-dark .ts-mini-nav button { background:var(--palette-surface-2) !important; color:#fff !important; border:1px solid var(--palette-border) !important; }
        .ts-app.ts-dark .ts-record-summary { background:var(--palette-surface) !important; }
        .ts-app.ts-dark .ts-record-summary > div { background:var(--palette-surface-2) !important; border:1px solid var(--palette-border) !important; color:#fff !important; }
        .ts-app.ts-dark .ts-record-summary span,
        .ts-app.ts-dark .ts-record-summary b { color:#fff !important; }
        .ts-app.ts-dark .ts-mini-grid span { color:#fff !important; }
        .ts-app.ts-dark .ts-mini-grid button { background:var(--palette-surface) !important; color:#fff !important; border-color:var(--palette-border) !important; }
        .ts-app.ts-dark .ts-mini-grid button.selected { background:var(--palette-accent) !important; color:#06111d !important; border-color:var(--palette-accent) !important; }

        /* Settings palette selector */
        .ts-app.ts-dark .ts-theme-picker-wrap { grid-column:1 / -1; padding:14px 0 4px; }
        .ts-app.ts-dark .ts-theme-picker-label { display:block; margin-bottom:9px; color:#fff !important; font-size:12px; font-weight:800; text-transform:uppercase; letter-spacing:.05em; }
        .ts-app.ts-dark .ts-theme-picker { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:10px; }
        .ts-app.ts-dark .ts-theme-swatch { min-height:68px; display:flex; align-items:center; gap:10px; padding:10px 12px; border-radius:14px; background:var(--palette-surface-2) !important; color:#fff !important; border:1px solid var(--palette-border) !important; cursor:pointer; font-weight:700; }
        .ts-app.ts-dark .ts-theme-swatch:hover { transform:translateY(-1px); }
        .ts-app.ts-dark .ts-theme-swatch.active { border:2px solid var(--palette-accent) !important; box-shadow:0 0 0 2px rgba(255,255,255,.10); }
        .ts-app.ts-dark .ts-theme-swatch-color { width:34px; height:34px; border-radius:10px; flex:none; border:1px solid rgba(255,255,255,.65); }
        .ts-app.ts-dark .ts-theme-swatch.blue .ts-theme-swatch-color { background:linear-gradient(135deg,#061522,#123b59,#8fd3ff); }
        .ts-app.ts-dark .ts-theme-swatch.black .ts-theme-swatch-color { background:linear-gradient(135deg,#050505,#181818,#ffffff); }
        .ts-app.ts-dark .ts-theme-swatch.green .ts-theme-swatch-color { background:linear-gradient(135deg,#061a14,#104435,#67e8b5); }
        .ts-app.ts-dark .ts-theme-swatch.gray .ts-theme-swatch-color { background:linear-gradient(135deg,#15181c,#2c333b,#d7dde4); }

        /* Palette-specific active buttons / live accent */
        .ts-app.ts-dark .ts-top-action.active,
        .ts-app.ts-dark .ts-search-check,
        .ts-app.ts-dark .ts-sheet-tab.active,
        .ts-app.ts-dark .ts-sheet-tab.active button { background:var(--palette-accent) !important; border-color:var(--palette-accent) !important; color:#06111d !important; }
      `}</style>
      <style>{`

        /* FINAL TABLE GRID / TOOL REGISTER POLISH */
        .ts-grid, .ts-grid th, .ts-grid td,
        .ts-equipment-table, .ts-equipment-table th, .ts-equipment-table td,
        .ts-record-table, .ts-record-table th, .ts-record-table td,
        .ts-week-summary-table, .ts-week-summary-table th, .ts-week-summary-table td,
        .ts-week-record table, .ts-week-record table th, .ts-week-record table td,
        .ts-analytics-detail table, .ts-analytics-detail table th, .ts-analytics-detail table td {
          border-color: rgba(255,255,255,.42) !important;
        }
        .ts-grid, .ts-equipment-table, .ts-record-table, .ts-week-summary-table, .ts-week-record table, .ts-analytics-detail table {
          border-collapse: collapse !important;
          width: 100%;
        }
        .ts-grid th, .ts-grid td, .ts-equipment-table th, .ts-equipment-table td,
        .ts-record-table th, .ts-record-table td, .ts-week-summary-table th, .ts-week-summary-table td,
        .ts-week-record table th, .ts-week-record table td, .ts-analytics-detail table th, .ts-analytics-detail table td {
          border: 1px solid rgba(255,255,255,.42) !important;
        }
        .ts-equipment-table-wrap { border: 1px solid rgba(255,255,255,.42) !important; }
        .ts-equipment-empty { padding: 28px !important; text-align:center; color:#94a3b8; }
        .ts-equipment-import-names { display:flex; gap:8px; align-items:center; flex-wrap:wrap; }
        .ts-equipment-import-names select { min-width:190px; }
        .ts-equipment-action.returned { background:var(--palette-accent) !important; color:#06111d !important; }
        .ts-app.ts-dark .ts-equipment-table th, .ts-app.ts-dark .ts-equipment-table td { color:#fff !important; border-color:rgba(255,255,255,.52) !important; }
        .ts-app.ts-dark .ts-equipment-table input { color:#fff !important; }
        .ts-app.ts-dark .ts-equipment-empty { color:#fff !important; }
        /* FINAL DARK PALETTE LAYER — the selected background controls the whole workspace */
        .ts-app.ts-dark { background:var(--palette-bg) !important; color:#fff !important; }
        .ts-app.ts-dark .ts-topbar,
        .ts-app.ts-dark .ts-heading,
        .ts-app.ts-dark .ts-main,
        .ts-app.ts-dark .ts-panel,
        .ts-app.ts-dark .ts-sheet-bar,
        .ts-app.ts-dark .ts-grid-wrap,
        .ts-app.ts-dark .ts-bottom-tools,
        .ts-app.ts-dark .ts-summary-card,
        .ts-app.ts-dark .ts-stat,
        .ts-app.ts-dark .ts-chart-card,
        .ts-app.ts-dark .ts-detail-box,
        .ts-app.ts-dark .ts-record-sheet,
        .ts-app.ts-dark .ts-equipment-panel { background:var(--palette-bg) !important; color:#fff !important; border-color:var(--palette-border) !important; }
        .ts-app.ts-dark .ts-topbar,
        .ts-app.ts-dark .ts-sheet-bar,
        .ts-app.ts-dark .ts-grid-wrap,
        .ts-app.ts-dark .ts-panel,
        .ts-app.ts-dark .ts-record-sheet { box-shadow:none !important; }
        .ts-app.ts-dark .ts-search,
        .ts-app.ts-dark .ts-search input,
        .ts-app.ts-dark input,
        .ts-app.ts-dark select,
        .ts-app.ts-dark textarea,
        .ts-app.ts-dark .ts-cell,
        .ts-app.ts-dark .ts-status,
        .ts-app.ts-dark .ts-select { background:var(--palette-surface) !important; color:#fff !important; border-color:var(--palette-border) !important; }
        .ts-app.ts-dark .ts-top-action,
        .ts-app.ts-dark .ts-icon-tool,
        .ts-app.ts-dark .ts-bottom-tools button,
        .ts-app.ts-dark .ts-report-actions button,
        .ts-app.ts-dark .ts-record-actions button,
        .ts-app.ts-dark .ts-calendar-head button,
        .ts-app.ts-dark .ts-mini-nav button,
        .ts-app.ts-dark .ts-theme-swatch,
        .ts-app.ts-dark .ts-mode-button { background:var(--palette-surface) !important; color:#fff !important; border-color:var(--palette-border) !important; }
        .ts-app.ts-dark .ts-top-action.active,
        .ts-app.ts-dark .ts-search-check,
        .ts-app.ts-dark .ts-sheet-tab.active,
        .ts-app.ts-dark .ts-sheet-tab.active button,
        .ts-app.ts-dark .ts-report-actions button.ai,
        .ts-app.ts-dark .ts-record-actions button:first-child,
        .ts-app.ts-dark .ts-mini-grid button.selected { background:var(--palette-accent) !important; color:#06111d !important; border-color:var(--palette-accent) !important; }
        .ts-app.ts-dark .ts-grid,
        .ts-app.ts-dark .ts-grid thead,
        .ts-app.ts-dark .ts-grid tbody,
        .ts-app.ts-dark .ts-grid tfoot,
        .ts-app.ts-dark .ts-record-table,
        .ts-app.ts-dark .ts-record-table thead,
        .ts-app.ts-dark .ts-record-table tbody,
        .ts-app.ts-dark .ts-record-table tfoot,
        .ts-app.ts-dark .ts-equipment-table { background:var(--palette-surface) !important; color:#fff !important; }
        .ts-app.ts-dark table th,
        .ts-app.ts-dark table td { color:#fff !important; border-color:var(--palette-border) !important; }
        .ts-app.ts-dark table thead th,
        .ts-app.ts-dark table tfoot th,
        .ts-app.ts-dark table tfoot td { background:var(--palette-surface-2) !important; color:#fff !important; }
        .ts-app.ts-dark .ts-grid tbody tr:hover,
        .ts-app.ts-dark .ts-record-table tbody tr:hover,
        .ts-app.ts-dark .ts-equipment-table tbody tr:hover { background:var(--palette-surface-2) !important; }
        .ts-app.ts-dark .ts-day-cell { background:var(--palette-surface-2) !important; color:#fff !important; border-color:var(--palette-border) !important; }
        .ts-app.ts-dark .ts-check-button.checkin,
        .ts-app.ts-dark .ts-check-button.checkout-ready,
        .ts-app.ts-dark .ts-equipment-action.give { background:var(--palette-accent) !important; color:#06111d !important; border-color:var(--palette-accent) !important; }
        .ts-app.ts-dark .ts-check-button.checkout-wait { background:var(--palette-surface-2) !important; color:#fff !important; border-color:var(--palette-border) !important; }
        .ts-app.ts-dark .ts-check-button.completed,
        .ts-app.ts-dark .ts-equipment-action.returned { background:var(--palette-surface-2) !important; color:#fff !important; border-color:var(--palette-border) !important; }
        .ts-app.ts-dark .ts-equipment-action.return { background:var(--palette-accent) !important; color:#06111d !important; border-color:var(--palette-accent) !important; }
        .ts-app.ts-dark .ts-equipment-help,
        .ts-app.ts-dark .ts-settings-appearance,
        .ts-app.ts-dark .ts-setting-help { background:var(--palette-surface) !important; color:#fff !important; border-color:var(--palette-border) !important; }
        .ts-app.ts-dark .ts-theme-swatch.active,
        .ts-app.ts-dark .ts-mode-button.active { background:var(--palette-accent) !important; color:#06111d !important; border-color:var(--palette-accent) !important; }
        .ts-app.ts-dark .ts-equipment-status.pending,
        .ts-app.ts-dark .ts-equipment-status.returned,
        .ts-app.ts-dark .ts-equipment-status.ready { color:#fff !important; }
        .ts-app.ts-dark .ts-theme-swatch.gray .ts-theme-swatch-color { background:linear-gradient(135deg,#15181c,#2c333b,#d7dde4) !important; }
        /* FINAL TOOLS GRID OVERRIDES */
        .ts-app.ts-dark .ts-equipment-table-wrap { background:#050b12 !important; border:1px solid #fff !important; }
        .ts-app.ts-dark .ts-equipment-table th, .ts-app.ts-dark .ts-equipment-table td { border:1px solid rgba(255,255,255,.78) !important; color:#fff !important; }
        .ts-app.ts-dark .ts-equipment-table th { background:#0d2b45 !important; }
        .ts-app.ts-dark .ts-equipment-table td { background:#071827 !important; }
        .ts-app.ts-dark .ts-equipment-table tbody tr:nth-child(even) td { background:#0a2135 !important; }
        .ts-app.ts-dark .ts-equipment-table .ts-cell { background:#0b2439 !important; color:#fff !important; border:1px solid rgba(255,255,255,.62) !important; }
        .ts-app.ts-dark .ts-equipment-main-btn, .ts-app.ts-dark .ts-equipment-sheet-tabs button, .ts-app.ts-dark .ts-equipment-import-names select { color:#fff !important; border-color:rgba(255,255,255,.5) !important; }
      `}
</style>
      <style>{`
        /* EXCEL-STYLE TABLE SYSTEM — NORMAL MODE */
        .ts-app:not(.ts-dark) .ts-grid-wrap,
        .ts-app:not(.ts-dark) .ts-equipment-table-wrap {
          background:#ffffff !important;
          border:1px solid #9aa7b5 !important;
          border-radius:10px !important;
          overflow:auto !important;
          box-shadow:0 2px 8px rgba(15,23,42,.06) !important;
        }
        .ts-app:not(.ts-dark) .ts-grid,
        .ts-app:not(.ts-dark) .ts-equipment-table {
          width:100% !important;
          border-collapse:collapse !important;
          table-layout:fixed !important;
          background:#ffffff !important;
          color:#172033 !important;
        }
        .ts-app:not(.ts-dark) .ts-grid th,
        .ts-app:not(.ts-dark) .ts-grid td,
        .ts-app:not(.ts-dark) .ts-equipment-table th,
        .ts-app:not(.ts-dark) .ts-equipment-table td {
          border:1px solid #aab5c1 !important;
          border-right:1px solid #aab5c1 !important;
          border-bottom:1px solid #aab5c1 !important;
          background:#ffffff !important;
          color:#172033 !important;
          height:54px !important;
          padding:9px 10px !important;
          vertical-align:middle !important;
        }
        .ts-app:not(.ts-dark) .ts-grid thead th,
        .ts-app:not(.ts-dark) .ts-equipment-table thead th {
          position:sticky !important;
          top:0 !important;
          z-index:20 !important;
          background:#eef3f7 !important;
          color:#172033 !important;
          border:1px solid #8997a6 !important;
          font-weight:900 !important;
          font-size:11px !important;
          letter-spacing:.04em !important;
          text-transform:uppercase !important;
          height:48px !important;
          box-shadow:0 1px 0 #8997a6 !important;
        }
        .ts-app:not(.ts-dark) .ts-grid tbody tr:nth-child(even) td,
        .ts-app:not(.ts-dark) .ts-equipment-table tbody tr:nth-child(even) td {
          background:#f8fafc !important;
        }
        .ts-app:not(.ts-dark) .ts-grid tbody tr:hover td,
        .ts-app:not(.ts-dark) .ts-equipment-table tbody tr:hover td {
          background:#edf6ff !important;
        }
        .ts-app:not(.ts-dark) .ts-grid .ts-row-num,
        .ts-app:not(.ts-dark) .ts-equipment-table .ts-row-num {
          background:#f1f5f9 !important;
          color:#475569 !important;
          font-weight:800 !important;
        }
        .ts-app:not(.ts-dark) .ts-grid .ts-cell,
        .ts-app:not(.ts-dark) .ts-equipment-table .ts-cell {
          width:100% !important;
          min-height:36px !important;
          box-sizing:border-box !important;
          background:#ffffff !important;
          color:#172033 !important;
          border:1px solid #9aa7b5 !important;
          border-radius:7px !important;
          padding:0 9px !important;
          outline:none !important;
        }
        .ts-app:not(.ts-dark) .ts-grid .ts-cell:focus,
        .ts-app:not(.ts-dark) .ts-equipment-table .ts-cell:focus {
          border-color:#2563eb !important;
          box-shadow:0 0 0 2px rgba(37,99,235,.14) !important;
        }
        .ts-app:not(.ts-dark) .ts-grid select,
        .ts-app:not(.ts-dark) .ts-grid input,
        .ts-app:not(.ts-dark) .ts-equipment-table select,
        .ts-app:not(.ts-dark) .ts-equipment-table input {
          color:#172033 !important;
          background:#ffffff !important;
        }
        .ts-app:not(.ts-dark) .ts-day-cell {
          background:#f1f7f4 !important;
          color:#172033 !important;
          border:1px solid #aab5c1 !important;
        }
        .ts-app:not(.ts-dark) .ts-equipment-action.give {
          background:#10b981 !important;
          color:#052015 !important;
          border:1px solid #078b66 !important;
        }
        .ts-app:not(.ts-dark) .ts-equipment-action.return {
          background:#2563eb !important;
          color:#ffffff !important;
          border:1px solid #1d4ed8 !important;
        }
        .ts-app:not(.ts-dark) .ts-equipment-status.ready { color:#2563eb !important; }
        .ts-app:not(.ts-dark) .ts-equipment-status.pending { color:#b45309 !important; }
        .ts-app:not(.ts-dark) .ts-equipment-status.returned { color:#047857 !important; }
        .ts-app:not(.ts-dark) .ts-equipment-main-btn {
          background:#e8eef5 !important;
          color:#172033 !important;
          border:1px solid #8f9dad !important;
        }
        .ts-app:not(.ts-dark) .ts-equipment-main-btn.add {
          background:#10b981 !important;
          color:#052015 !important;
          border-color:#078b66 !important;
        }
        .ts-app:not(.ts-dark) .ts-equipment-main-btn.remove {
          background:#172033 !important;
          color:#ffffff !important;
          border-color:#172033 !important;
        }
        .ts-app:not(.ts-dark) .ts-equipment-main-btn.import {
          background:#2563eb !important;
          color:#ffffff !important;
          border-color:#1d4ed8 !important;
        }
        .ts-app:not(.ts-dark) .ts-equipment-sheet-tabs button {
          background:#ffffff !important;
          color:#172033 !important;
          border:1px solid #8f9dad !important;
        }
        .ts-app:not(.ts-dark) .ts-equipment-sheet-tabs button.active {
          background:#dbeafe !important;
          color:#1d4ed8 !important;
          border-color:#2563eb !important;
        }
        .ts-app:not(.ts-dark) .ts-equipment-sheet-tabs .ts-equipment-add-sheet {
          background:#172033 !important;
          color:#ffffff !important;
          border-color:#172033 !important;
        }
        .ts-app:not(.ts-dark) .ts-equipment-import-names select {
          background:#ffffff !important;
          color:#172033 !important;
          border:1px solid #8f9dad !important;
        }
        .ts-app:not(.ts-dark) .ts-equipment-stats .ts-equipment-stat {
          color:#ffffff !important;
          border-width:1px !important;
        }
        .ts-app:not(.ts-dark) .ts-equipment-panel { background:#ffffff !important; color:#172033 !important; }
        .ts-app:not(.ts-dark) .ts-equipment-panel .ts-panel-header { background:#ffffff !important; color:#172033 !important; border-bottom:1px solid #c4ccd5 !important; }
        .ts-app:not(.ts-dark) .ts-equipment-panel .ts-panel-header h2 { color:#172033 !important; }
        .ts-app:not(.ts-dark) .ts-equipment-panel .ts-panel-header p { color:#64748b !important; }

        /* Make the normal Time Sheet itself read as a true spreadsheet. */
        .ts-app:not(.ts-dark) .ts-grid-wrap { min-height:320px !important; }
        .ts-app:not(.ts-dark) .ts-grid { min-width:1080px !important; }
        .ts-app:not(.ts-dark) .ts-equipment-table { min-width:1080px !important; }
        .ts-app:not(.ts-dark) .ts-grid thead th:first-child,
        .ts-app:not(.ts-dark) .ts-grid tbody td:first-child { border-left:1px solid #8997a6 !important; }
        .ts-app:not(.ts-dark) .ts-grid thead th:last-child,
        .ts-app:not(.ts-dark) .ts-grid tbody td:last-child { border-right:1px solid #8997a6 !important; }
        .ts-app:not(.ts-dark) .ts-equipment-table thead th:first-child,
        .ts-app:not(.ts-dark) .ts-equipment-table tbody td:first-child { border-left:1px solid #8997a6 !important; }
        .ts-app:not(.ts-dark) .ts-equipment-table thead th:last-child,
        .ts-app:not(.ts-dark) .ts-equipment-table tbody td:last-child { border-right:1px solid #8997a6 !important; }
      `}</style>
      <div className={`ts-app ${pageScrolled ? "ts-page-scrolled" : ""} ${settings.theme === "dark" ? `ts-dark ts-dark-${settings.backgroundTheme || "blue"}` : ""}`} data-workspace-shell={openPanel === null || openPanel === "general" ? "sheet" : "panel"}>
      <div className="ts-stable-subtitle-bar" data-subtitle-layer="stable">
        <p className="ts-page-subtitle">{openPanel === "general" ? "Business data sheets and spreadsheet workspace" : "Employee timesheets, attendance, hours and earnings workspace"}</p>
      </div>
      <nav className="ts-soda-commandbar" aria-label="Sodah worksheet tools">
        {!faceKioskLocked && <div className="ts-soda-tools-menu-wrap" ref={sodaToolsRef}>
          <button type="button" className={`ts-soda-tools-trigger ${sodaToolsOpen ? "active" : ""}`} onClick={() => setSodaToolsOpen(v => !v)} aria-expanded={sodaToolsOpen}>
            <Package size={16}/><span>Soda Tools</span><ChevronDown size={13}/>
          </button>
          {sodaToolsOpen && <div className="ts-soda-tools-menu">
            <button type="button" onClick={() => { setOpenPanel(null); setSodaToolsOpen(false); }}><FileText size={15}/> Employee Timesheet</button>
            <button type="button" onClick={() => { setOpenPanel("general"); setSodaToolsOpen(false); }}><SlidersHorizontal size={15}/> General Sheets</button>
            <button type="button" onClick={() => { setOpenPanel("face"); setSodaToolsOpen(false); }}><ScanFace size={15}/> Face Recognition</button>
            <button type="button" onClick={() => { setOpenPanel("analytics"); setSodaToolsOpen(false); }}><BarChart3 size={15}/> Analytics</button>
            <button type="button" onClick={() => { setOpenPanel("calendar"); setSodaToolsOpen(false); }}><CalendarDays size={15}/> Calendar</button>
            <button type="button" onClick={() => { setOpenPanel("reports"); setSodaToolsOpen(false); }}><FileText size={15}/> Reports</button>
            <button type="button" onClick={() => { setOpenPanel("settings"); setSodaToolsOpen(false); }}><Settings2 size={15}/> Settings</button>
            <button type="button" onClick={() => { setOpenPanel("equipment"); setSodaToolsOpen(false); }}><Package size={15}/> Tools</button>
            <button type="button" onClick={() => { addAttendanceSheet(); setOpenPanel(null); setSodaToolsOpen(false); }}><Plus size={15}/> Add Employee Timesheet</button>
          </div>}
        </div>}
        <div className="ts-soda-command-title"><strong>Sodah Worksheet</strong><span>{openPanel === "general" ? "General Sheets" : openPanel === null ? (sheet?.name || "Employee Timesheet") : ({face:"Face Recognition",analytics:"Analytics",calendar:"Calendar",reports:"Reports",settings:"Settings",equipment:"Tools"}[openPanel] || "Workspace")}</span></div>
        <label className="ts-autosave-control"><span className="ts-autosave-label">Auto save</span><input className="ts-autosave-input" type="checkbox" checked={autoSaveEnabled} onChange={e => setAutoSaveEnabled(e.target.checked)} aria-label="Toggle auto save" /><span className="ts-autosave-switch" aria-hidden="true"><b>{autoSaveEnabled ? "ON" : "OFF"}</b><i /></span></label>
        {!faceKioskLocked && <div className="ts-soda-employee-search">
          <Search size={16}/>
          <input value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === "Enter" && checkSearch()} placeholder="Search employee name or ID" aria-label="Search employee name or ID" />
          <button type="button" onClick={checkSearch} className="ts-search-check">{search.trim() ? searchActionLabel : "Check In"}</button>
        </div>}
      </nav>


      <div className="ts-main">
        {openPanel === "general" && (
          <GeneralSheetPanel onClose={() => setOpenPanel(null)} autoSaveEnabled={autoSaveEnabled} />
        )}

        {openPanel === "face" && (
          <FaceAttendancePanel employees={employees.map(r => ({ key: r.employeeId || r.name, name: r.name || r.employeeId, employeeId: r.employeeId || "" }))} onAttendanceAction={handleFaceRecognized} onClose={() => setOpenPanel(null)} kioskLocked={faceKioskLocked} onKioskLockChange={setFaceKioskLocked} />
        )}

        {openPanel === "analytics" && (
          <AnalyticsPanel sheets={sheets} settings={settings} totals={totals} onClose={() => setOpenPanel(null)} />
        )}

        {openPanel === "calendar" && (
          <CalendarPanel
            rows={sheets.flatMap(s => s.rows)}
            cursor={calendarCursor}
            setCursor={setCalendarCursor}
            onClose={() => setOpenPanel(null)}
            onSelect={openDate}
          />
        )}

        {openPanel === "settings" && (
          <SettingsPanel settings={settings} setSettings={setSettings} onClose={() => setOpenPanel(null)} />
        )}

        {openPanel === "equipment" && (
          <EquipmentPanel
            rows={equipmentRows}
            sheets={sheets}
            equipmentSheets={equipmentSheets}
            activeEquipmentSheetId={activeEquipmentSheetId}
            onSelectSheet={setActiveEquipmentSheetId}
            onUpdate={updateEquipmentRow}
            onAction={equipmentAction}
            onAdd={addEquipmentRow}
            onRemove={removeEquipmentRow}
            onAddColumn={addEquipmentColumn}
            onRemoveColumn={removeEquipmentColumn}
            onUpdateColumn={updateEquipmentColumn}
            onUpdateCell={updateEquipmentCell}
            onAddSheet={addEquipmentSheet}
            onImportNames={importEquipmentNames}
            onClose={() => setOpenPanel(null)}
          />
        )}

        {openPanel === "reports" && (
          <ReportsPanel
            rows={reportRows}
            settings={settings}
            period={reportPeriod}
            setPeriod={setReportPeriod}
            day={reportDay}
            setDay={setReportDay}
            employee={reportEmployee}
            setEmployee={setReportEmployee}
            employees={employees}
            more={reportMore}
            setMore={setReportMore}
            text={reportText}
            setText={setReportText}
            onClose={() => setOpenPanel(null)}
            onDownload={(selectedRows) => exportRowsXlsx(selectedRows, `sodah-${reportPeriod}-${reportDay}-report.xlsx`)}
          />
        )}

        {openPanel === null && (
        <>

        <div className="ts-sheet-bar ts-employee-sheet-tabs-bar">
          <div className="ts-sheet-tabs">
            {sheets.map((s, i) => (
              <div
                key={s.id}
                className={`ts-sheet-tab ${s.id === activeId ? "active" : ""} ${attendanceSelectedSheetIds.includes(s.id) && attendanceSelectedSheetIds.length > 1 ? "ts-sheet-multi-selected" : ""}`}
                style={{ "--ts-tab-color": s.tabColor || "#9ca3af" }}
                onContextMenu={e => { e.preventDefault(); setSheetTabMenu({ id: s.id, x: e.clientX, y: e.clientY }); }}
                onDoubleClick={e => setSheetTabMenu({ id: s.id, x: e.clientX, y: e.clientY, palette: true })}
              >
                <button onClick={() => { setActiveId(s.id); setOpenPanel(null); }}>{s.name}</button>
                {sheets.length > 1 && <button className="ts-sheet-x" onClick={() => deleteSheet(s.id )}><X size={12}/></button>}
              </div>
            ))}
            <button className="ts-add-sheet" onClick={addSheet} disabled={sheets.length >= MAX_SHEETS}><Plus size={15}/></button>
          </div>
          <div className="ts-sheet-settings">
            <span>Sheet hours</span>
            <select
              value={sheet?.rows?.[0]?.hours ?? settings.defaultHours}
              onChange={e => updateSheet(s => ({...s, rows:s.rows.map(r => ({...r, hours:Number(e.target.value)}))}))}
            >
              {Array.from({length:24},(_,i)=><option key={i+1} value={i+1}>{i+1} H</option>)}
            </select>
          </div>
        </div>

        {sheetTabMenu && (() => {
          const target = sheets.find(s => s.id === sheetTabMenu.id);
          if (!target) return null;
          const colors = ["#9ca3af","#ef4444","#f59e0b","#10b981","#06b6d4","#3b82f6","#8b5cf6","#ec4899","#111827","#ffffff"];
          return (
            <div
              className="ts-sheet-context-menu"
              style={{ left: Math.min(sheetTabMenu.x, window.innerWidth - 250), top: Math.min(sheetTabMenu.y, window.innerHeight - 320) }}
              onMouseLeave={() => setSheetTabMenu(null)}
            >
              <strong>{target.name}</strong>
              <button onClick={() => renameAttendanceSheet(target.id)}>Rename</button>
              <button onClick={() => duplicateAttendanceSheet(target.id)}>Duplicate</button>
              <button onClick={() => moveAttendanceSheet(target.id, -1)}>Move Left</button>
              <button onClick={() => moveAttendanceSheet(target.id, 1)}>Move Right</button>
              <div className="ts-sheet-context-label">TAB COLOR</div>
              <div className="ts-sheet-context-colors">
                {colors.map(c => <button key={c} aria-label={`Tab color ${c}`} style={{ background:c }} onClick={() => setAttendanceSheetColor(target.id, c)} />)}
              </div>
              <button className="danger" onClick={() => deleteSheet(target.id)}>Delete Sheet</button>
            </div>
          );
        })()}

        <div
          className={`ts-grid-wrap ${freezeHeader ? "ts-freeze-header" : ""}`}
          style={{ "--ts-active-sheet-color": sheet?.tabColor || "#10b981" }}
        >
          <table className="ts-grid ts-attendance-table">
            <thead>
              <tr>
                <th className="ts-row-num">#</th>
                <th className="col-action">CHECK-IN / OUT</th>
                <th className="col-name">EMPLOYEE NAME</th>
                <th className="col-id">EMPLOYEE ID</th>
                {/* CUSTOM COLUMNS ARE INSERTED HERE — immediately after Employee ID. */}
                {(sheet?.columns || []).map(c => (
                  <th key={c.id} className="ts-custom-header">
                    <div className="ts-custom-head-inner">
                      <input value={c.label} onChange={e => updateCustomColumn(c.id, e.target.value)} title="Edit column name" />
                    </div>
                  </th>
                ))}
                <th className="col-day">DAY</th>
                <th className="col-hours">HOURS</th>
                <th className="col-ot">O.T</th>
                <th className="col-rate">HOURLY EARNING</th>
                <th className="col-status">STATUS</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((r, i) => {
                const canCheckout = r.checkIn && !r.checkOut &&
                  minutesSince(r.checkIn, localTime()) >= (settings.mode === "manual"
                    ? Number(settings.minimumCheckoutMinutes)
                    : Number(r.hours || settings.defaultHours) * 60);
                const actionLabel = r.checkIn && !r.checkOut ? "Check Out" : "Check In";
                return (
                  <tr key={r.id}>
                    <td className="ts-row-num">{i + 1}</td>
                    <td>
                      <button className={`ts-check-button ${r.checkIn && !r.checkOut ? (canCheckout ? "checkout-ready" : "checkout-wait") : "checkin"}`} onClick={() => checkAction(r)}>
                        {r.checkIn && !r.checkOut ? <CheckCircle2 size={15}/> : <Clock3 size={15}/>}
                        {actionLabel}
                      </button>
                    </td>
                    <td className={`${isAttendanceSelected(i,0) ? "ts-attendance-selected " : ""}ts-attendance-formatted`} style={attendanceCellVars(r.styles?.name)} onMouseDown={e => startAttendanceSelection(i,0,e.shiftKey)} onMouseEnter={() => extendAttendanceSelection(i,0 )}><input className="ts-cell ts-text-center" style={r.styles?.name} value={r.name} onChange={e => updateCell(r.id,"name",e.target.value)} /></td>
                    <td className={`${isAttendanceSelected(i,1) ? "ts-attendance-selected " : ""}ts-attendance-formatted`} style={attendanceCellVars(r.styles?.employeeId)} onMouseDown={e => startAttendanceSelection(i,1,e.shiftKey)} onMouseEnter={() => extendAttendanceSelection(i,1 )}><input className="ts-cell ts-text-center" style={r.styles?.employeeId} value={r.employeeId} onChange={e => updateCell(r.id,"employeeId",e.target.value)} /></td>
                    {(sheet?.columns || []).map((c,ci) => { const colIndex = ci + 2; return <td key={c.id} className={`${isAttendanceSelected(i,colIndex) ? "ts-attendance-selected " : ""}ts-attendance-formatted`} style={attendanceCellVars(r.styles?.[`custom:${c.id}`])} onMouseDown={e => startAttendanceSelection(i,colIndex,e.shiftKey)} onMouseEnter={() => extendAttendanceSelection(i,colIndex )}><input className="ts-cell" style={r.styles?.[`custom:${c.id}`]} value={r.custom?.[c.id] ?? ""} onChange={e => updateCustomCell(r.id,c.id,e.target.value)} /></td>; })}
                    <td className="ts-attendance-formatted" style={attendanceCellVars(r.styles?.day)}><button className="ts-day-cell" onDoubleClick={() => openDate(r.date)} title="Double-click to open the calendar date">{dayName(r.date)}</button></td>
                    <td className="ts-attendance-formatted" style={attendanceCellVars(r.styles?.hours)}><select className="ts-cell ts-select" style={r.styles?.hours} value={r.hours} onChange={e => updateCell(r.id,"hours",Number(e.target.value))}>{Array.from({length:24},(_,j)=><option key={j+1} value={j+1}>{j+1} H</option>)}</select></td>
                    <td className="ts-attendance-formatted" style={attendanceCellVars(r.styles?.ot)}><input className="ts-cell ts-number" style={r.styles?.ot} type="number" min="0" step="0.5" value={r.ot} onChange={e => updateCell(r.id,"ot",Number(e.target.value))}/></td>
                    <td className="ts-attendance-formatted" style={attendanceCellVars(r.styles?.rate)}>{money(settings.defaultHourlyRate, settings.currency)}</td>
                    <td className="ts-attendance-formatted" style={attendanceCellVars(r.styles?.status)}><select className={`ts-status ${r.status.toLowerCase().replaceAll("-","")}`} style={r.styles?.status} value={r.status} onChange={e => updateCell(r.id,"status",e.target.value )}><option>Present</option><option>Off-day</option><option>Absent</option></select></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="ts-bottom-tools ts-spreadsheet-tools">
          <button type="button" onClick={addRow}><Plus size={15}/> Add Row</button>
          <button type="button" onClick={removeRow}><Minus size={15}/> Remove Row</button>
          <button
            type="button"
            className="ts-add-column-bottom"
            onClick={addColumn}
            title="Add a new column after Employee ID"
          >
            <Plus size={15}/> Add Column
          </button>
          <button
            type="button"
            onClick={removeColumn}
            disabled={!sheet?.columns?.length}
            title="Remove the last custom column"
          >
            <Minus size={15}/> Remove Column
          </button>
          <button onClick={() => updateSheetName(prompt("Sheet name", sheet.name) || sheet.name )}><SlidersHorizontal size={15}/> Rename Sheet</button>
          <span className="ts-bottom-note">Custom columns can be renamed from their headers. Colors are managed in Settings.</span>
        </div>

        <div className="ts-summary">
          <SummaryCard icon={Users} label="Employees" value={totals.employees} />
          <SummaryCard icon={Clock3} label="Worked Hours" value={`${totals.worked.toFixed(2)} / ${totals.scheduled.toFixed(2)} H`} />
          <SummaryCard icon={TimerReset} label="O.T Hours" value={`${totals.ot.toFixed(2)} H`} />
          <SummaryCard icon={Users} label="Absents" value={totals.absents} />
          <SummaryCard icon={CircleDollarSign} label="Actual / Expected Earning" value={`${money(totals.earning, settings.currency)} / ${money(totals.expectedEarning, settings.currency)}`} accent />
        </div>
        </>
        )}
      </div>

      {binOpen && (
        <UnifiedBinPanel
          data={unifiedBin}
          onClose={() => setBinOpen(false)}
          onRestore={restoreBinItem}
          onPermanentDelete={permanentlyDeleteBinItem}
          onEmpty={emptyUnifiedBin}
        />
      )}

      {toast && <Toast {...toast} />}
      {celebrate && <Celebration data={celebrate} currency={settings.currency} />}
      </div>

      <style>{`
        /* BUSINESS DATA WORKSPACE — unified Excel-inspired command ribbon */
        /* PREMIUM EXCEL-LIKE RIBBON: stable grouped tools + visible sub-heads */
        .ts-app .ts-unified-toolbar {
          position: sticky !important;
          top: 123px !important;
          z-index: 950 !important;
          display: flex !important;
          align-items: stretch !important;
          gap: 6px !important;
          width: 100% !important;
          min-height: 66px !important;
          box-sizing: border-box !important;
          overflow: visible !important;
          white-space: nowrap !important;
          padding: 4px 8px 3px !important;
          background: linear-gradient(180deg,#eef2f4 0%,#dfe4e7 100%) !important;
          border-top: 1px solid #ffffff !important;
          border-bottom: 1px solid #aeb7be !important;
          box-shadow: 0 4px 14px rgba(15,23,42,.14) !important;
          scrollbar-width: thin;
          scrollbar-color: #aeb8bf transparent;
        }
        .ts-app .ts-unified-group {
          position: relative !important;
          flex: 0 0 auto !important;
          display: flex !important;
          align-items: center !important;
          gap: 4px !important;
          min-height: 58px !important;
          padding: 15px 7px 3px !important;
          border-right: 1px solid #b7c0c6 !important;
          border-left: 1px solid rgba(255,255,255,.72) !important;
          border-radius: 5px !important;
        }
        .ts-app .ts-unified-group:nth-child(1) { background:rgba(16,185,129,.055) !important; }
        .ts-app .ts-unified-group:nth-child(2) { background:rgba(59,130,246,.045) !important; }
        .ts-app .ts-unified-group:nth-child(3) { background:rgba(245,158,11,.045) !important; }
        .ts-app .ts-unified-group:nth-child(4) { background:rgba(139,92,246,.045) !important; }
        .ts-app .ts-unified-group:nth-child(5) { background:rgba(6,182,212,.045) !important; }
        .ts-app .ts-unified-group:nth-child(6) { background:rgba(16,185,129,.04) !important; }
        .ts-app .ts-unified-label {
          position: absolute !important;
          top: 3px !important;
          left: 8px !important;
          transform: none !important;
          font-size: 8px !important;
          line-height: 10px !important;
          font-weight: 950 !important;
          letter-spacing: .105em !important;
          color: #56636c !important;
          pointer-events: none !important;
          text-transform: uppercase !important;
        }
        .ts-app .ts-unified-group button,
        .ts-app .ts-toolbar-pop > button {
          min-height: 31px !important;
          height: 31px !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          gap: 5px !important;
          padding: 0 8px !important;
          border: 1px solid #b8c1c7 !important;
          border-radius: 6px !important;
          background: linear-gradient(180deg,#ffffff 0%,#f3f5f6 100%) !important;
          color: #27313a !important;
          font-size: 10px !important;
          font-weight: 850 !important;
          cursor: pointer !important;
          box-shadow: 0 1px 1px rgba(15,23,42,.04) !important;
        }
        .ts-app .ts-unified-group button:hover,
        .ts-app .ts-toolbar-pop > button:hover { background:#ffffff !important; border-color:#10b981 !important; color:#08734e !important; box-shadow:0 2px 7px rgba(16,185,129,.12) !important; }
        .ts-app .ts-unified-group button.format-active { background:#d7f7e9 !important; border-color:#55c998 !important; color:#08734e !important; }
        .ts-app .ts-unified-group:first-child button:first-of-type { border-color:#7bd8b3 !important; background:#e9fbf3 !important; color:#08734e !important; }
        .ts-app .ts-unified-current { margin-left:auto !important; min-width:190px !important; flex:0 0 auto !important; padding:5px 12px !important; display:flex !important; flex-direction:column !important; justify-content:center !important; border-left:1px solid #b8bec4 !important; background:rgba(255,255,255,.58) !important; border-radius:7px !important; }
        .ts-app .ts-unified-current span { font-size:11px !important; font-weight:900 !important; color:#1f2933 !important; overflow:hidden !important; text-overflow:ellipsis !important; }
        .ts-app .ts-unified-current small { font-size:8px !important; color:#68737c !important; margin-top:2px !important; }
        .ts-app .ts-main { position:relative !important; }
        /* Sheet tabs remain directly under the ribbon and never disappear behind it. */
        .ts-app .ts-sheet-bar {
          position: sticky !important;
          top: 189px !important;
          z-index: 940 !important;
          min-height: 49px !important;
          display:flex !important;
          align-items:flex-end !important;
          gap:10px !important;
          padding:6px 8px 5px !important;
          background:linear-gradient(180deg,#f9fbfc 0%,#edf2f4 100%) !important;
          border:1px solid #c8d0d7 !important;
          border-top:0 !important;
          box-shadow:0 3px 10px rgba(15,23,42,.09) !important;
        }
        .ts-app .ts-sheet-tabs { align-items:flex-end !important; gap:4px !important; min-width:0 !important; flex:1 1 auto !important; }
        .ts-app .ts-sheet-tab { border-top:3px solid transparent !important; }
        .ts-app .ts-sheet-tab.active { background:linear-gradient(180deg,#ffffff 0%,#f2fffa 100%) !important; border-top-color:var(--ts-tab-color,#10b981) !important; box-shadow:0 -1px 0 rgba(255,255,255,.9), 0 2px 6px rgba(15,23,42,.08) !important; }
        .ts-app .ts-sheet-settings { flex:0 0 auto !important; margin-left:auto !important; padding:4px 7px !important; border:1px solid #d4dce1 !important; border-radius:7px !important; background:#ffffff !important; box-shadow:0 1px 4px rgba(15,23,42,.05) !important; }
        .ts-app .ts-sheet-settings span { color:#5b6871 !important; font-weight:800 !important; font-size:9px !important; text-transform:uppercase !important; letter-spacing:.06em !important; }
        .ts-app .ts-grid-wrap { border:2px solid var(--ts-active-sheet-color, #10b981) !important; box-shadow: inset 0 2px 0 color-mix(in srgb, var(--ts-active-sheet-color, #10b981) 22%, transparent) !important; }
        .ts-app .ts-sheet-tab.active { background: color-mix(in srgb, var(--ts-tab-color, #10b981) 12%, white) !important; border-color: var(--ts-tab-color, #10b981) !important; }
        .ts-app .ts-grid td.ts-attendance-formatted { background: var(--ts-cell-fill, transparent) !important; color: var(--ts-cell-text, inherit) !important; font-size: var(--ts-cell-font-size, inherit) !important; font-family: var(--ts-cell-font-family, inherit) !important; font-weight: var(--ts-cell-font-weight, inherit) !important; font-style: var(--ts-cell-font-style, inherit) !important; }
        .ts-app .ts-grid td.ts-attendance-formatted .ts-cell { background: inherit !important; color: inherit !important; font-size: inherit !important; font-family: inherit !important; font-weight: inherit !important; font-style: inherit !important; }
        .ts-app .ts-grid td.ts-attendance-formatted .ts-status { background: inherit !important; color: inherit !important; font-size: inherit !important; font-family: inherit !important; font-weight: inherit !important; font-style: inherit !important; }
        .ts-app .ts-grid-wrap.ts-freeze-header .ts-grid thead th { position:sticky !important; top:0 !important; z-index:30 !important; }
        .ts-app .ts-grid-wrap.ts-freeze-header .ts-grid .ts-row-num { position:sticky !important; left:0 !important; z-index:35 !important; }
        .ts-app .ts-grid-wrap.ts-freeze-header .ts-grid thead .ts-row-num { z-index:40 !important; }
        /* Premium settings surface */
        .ts-app .ts-settings-panel, .ts-app .ts-panel.ts-settings-panel { border:1px solid #d2d8de !important; border-radius:18px !important; background:linear-gradient(180deg,#ffffff 0%,#f7f9fb 100%) !important; box-shadow:0 20px 55px rgba(15,23,42,.12) !important; overflow:hidden !important; }
        .ts-app .ts-settings-panel .ts-panel-header, .ts-app .ts-settings-panel .ts-panel-header { padding:20px 22px !important; background:linear-gradient(135deg,#f8fafc,#eef3f6) !important; border-bottom:1px solid #d6dde3 !important; }
        .ts-app .ts-settings-grid { gap:16px !important; padding:18px !important; }
        .ts-app .ts-setting { padding:14px !important; border:1px solid #dce2e7 !important; border-radius:12px !important; background:#fff !important; box-shadow:0 4px 14px rgba(15,23,42,.04) !important; }
        .ts-app .ts-setting span { font-size:9px !important; font-weight:900 !important; letter-spacing:.09em !important; color:#65717b !important; text-transform:uppercase !important; }
        .ts-app .ts-setting input, .ts-app .ts-setting select { min-height:40px !important; border:1px solid #cbd4db !important; border-radius:9px !important; background:#f9fafb !important; color:#172033 !important; }
        .ts-app .ts-setting input:focus, .ts-app .ts-setting select:focus { border-color:#10b981 !important; box-shadow:0 0 0 3px rgba(16,185,129,.12) !important; }
        @media(max-width:900px){ .ts-app .ts-unified-toolbar { top:123px !important; min-height:62px !important; } .ts-app .ts-sheet-bar { top:189px !important; } .ts-app .ts-unified-current { display:none !important; } }

        /* FINAL STABLE WORKSHEET STACK + DROPDOWN VISIBILITY */
        .ts-app .ts-topbar {
          position:sticky !important;
          top:0 !important;
          z-index:1200 !important;
          min-height:123px !important;
          height:123px !important;
          box-sizing:border-box !important;
        }
        .ts-app .ts-unified-toolbar {
          position:sticky !important;
          top:123px !important;
          z-index:1100 !important;
          min-height:66px !important;
          height:66px !important;
          overflow:visible !important;
        }
        .ts-app .ts-sheet-bar {
          position:sticky !important;
          top:189px !important;
          z-index:1050 !important;
          min-height:49px !important;
          height:49px !important;
        }

        .ts-app .ts-general-sheet-panel > .ts-panel-header{display:none!important}
        /* Compact Sodah command bar replaces the old duplicated navigation header. */
        .ts-app .ts-soda-commandbar{position:relative;z-index:4900;display:flex;align-items:center;gap:12px;min-height:58px;padding:8px 14px;background:#eef2f5;border:1px solid #c8d0d8;border-radius:0;box-sizing:border-box;color:#172033;}
        .ts-app .ts-soda-tools-menu-wrap{position:relative;flex:0 0 auto;z-index:5001}
        .ts-app .ts-soda-tools-trigger{height:38px;display:inline-flex;align-items:center;gap:8px;padding:0 13px;border:1px solid #aab7c4;border-radius:7px;background:#fff;color:#142334;font-weight:800;white-space:nowrap;cursor:pointer}
        .ts-app .ts-soda-tools-trigger.active,.ts-app .ts-soda-tools-trigger:hover{background:#dff8ec;border-color:#10b981;color:#047857}
        .ts-app .ts-soda-tools-menu{position:absolute;top:43px;left:0;z-index:9000;display:flex;flex-direction:column;gap:3px;min-width:230px;padding:7px;background:#fff;border:1px solid #cbd5e1;border-radius:9px;box-shadow:0 14px 35px rgba(15,23,42,.2)}
        .ts-app .ts-soda-tools-menu button{display:flex;align-items:center;gap:9px;width:100%;min-height:35px;padding:7px 9px;border:0;border-radius:5px;background:#fff;color:#1e293b;text-align:left;cursor:pointer}
        .ts-app .ts-soda-tools-menu button:hover{background:#ecfdf5;color:#047857}
        .ts-app .ts-soda-command-title{display:flex;flex-direction:column;gap:2px;min-width:130px;flex:1 1 auto;color:#172033}
        .ts-app .ts-soda-command-title strong{font-size:13px;font-weight:850}
        .ts-app .ts-soda-command-title span{font-size:11px;color:#64748b}
        .ts-app .ts-soda-employee-search{display:flex;align-items:center;gap:7px;flex:0 1 430px;min-width:240px;height:38px;padding:3px 4px 3px 10px;border:1px solid #c3ccd6;border-radius:7px;background:#fff;color:#64748b;box-sizing:border-box}
        .ts-app .ts-soda-employee-search input{flex:1 1 auto;min-width:70px;width:100%;border:0!important;outline:none!important;background:transparent!important;color:#172033!important;font-size:12px!important;box-shadow:none!important}
        .ts-app .ts-soda-employee-search .ts-search-check{height:30px;min-width:106px;padding:0 11px;border:0;border-radius:5px;background:#10b981;color:#fff;font-size:12px;font-weight:850;white-space:nowrap;cursor:pointer}
        .ts-app .ts-stable-subtitle-bar{margin-top:0!important}
        @media(max-width:850px){.ts-app .ts-soda-commandbar{flex-wrap:wrap;gap:7px;padding:7px}.ts-app .ts-soda-command-title{min-width:100px}.ts-app .ts-soda-employee-search{order:3;flex:1 1 100%;min-width:0}}

        .ts-app .ts-toolbar-pop { position:relative !important; z-index:2000 !important; }
        .ts-app .ts-toolbar-menu,
        .ts-app .ts-toolbar-colors {
          position:absolute !important;
          top:36px !important;
          left:0 !important;
          z-index:50000 !important;
          display:flex !important;
          background:#ffffff !important;
          border:1px solid #b9c4cc !important;
          border-radius:8px !important;
          box-shadow:0 16px 40px rgba(15,23,42,.22) !important;
        }
        .ts-app .ts-toolbar-menu { flex-direction:column !important; min-width:150px !important; padding:5px !important; }
        .ts-app .ts-toolbar-colors { flex-wrap:wrap !important; width:190px !important; padding:8px !important; gap:6px !important; }
        .ts-app .ts-toolbar-menu button { width:100% !important; justify-content:flex-start !important; background:#fff !important; color:#1f2937 !important; border:0 !important; }
        .ts-app .ts-toolbar-colors button { width:24px !important; min-width:24px !important; height:24px !important; min-height:24px !important; padding:0 !important; border:1px solid #94a3b8 !important; border-radius:5px !important; }

        /* The selected sheet color belongs to the OUTER worksheet frame only.
           The actual spreadsheet canvas stays white. */
        .ts-app .ts-grid-wrap {
          border:0 !important;
          padding:3px !important;
          background:var(--ts-active-sheet-color,#10b981) !important;
          box-shadow:none !important;
          border-radius:5px !important;
        }
        .ts-app .ts-grid-wrap > .ts-grid {
          background:#ffffff !important;
          border:1px solid rgba(100,116,139,.45) !important;
        }
        .ts-app.ts-dark .ts-grid-wrap {
          background:var(--ts-active-sheet-color,#10b981) !important;
        }
        .ts-app.ts-dark .ts-grid-wrap > .ts-grid {
          background:#0d1115 !important;
        }

        /* Keep the entire Check In / Check Out label inside its button. */
        .ts-app .ts-grid .ts-check-button {
          width:96px !important;
          min-width:96px !important;
          max-width:96px !important;
          white-space:nowrap !important;
          overflow:hidden !important;
          text-overflow:clip !important;
          display:inline-flex !important;
          flex-wrap:nowrap !important;
        }
        .ts-app .ts-grid .col-action { min-width:112px !important; width:112px !important; }
        .ts-app .ts-grid .ts-check-button svg { flex:0 0 auto !important; }
        .ts-app .ts-grid .ts-check-button span { white-space:nowrap !important; }

        /* Status colors are applied to the actual select, not the cell wrapper. */
        .ts-app:not(.ts-dark) .ts-grid td.ts-attendance-formatted .ts-status.present {
          background:#dcfce7 !important; color:#047857 !important; border:1px solid #86efac !important; font-weight:900 !important;
        }
        .ts-app:not(.ts-dark) .ts-grid td.ts-attendance-formatted .ts-status.offday,
        .ts-app:not(.ts-dark) .ts-grid td.ts-attendance-formatted .ts-status.off-day {
          background:#fef3c7 !important; color:#b45309 !important; border:1px solid #fcd34d !important; font-weight:900 !important;
        }
        .ts-app:not(.ts-dark) .ts-grid td.ts-attendance-formatted .ts-status.absent {
          background:#fee2e2 !important; color:#b91c1c !important; border:1px solid #fca5a5 !important; font-weight:900 !important;
        }

        /* FINAL TIMESHEET COLOR POLISH */
        .ts-app:not(.ts-dark) .ts-check-button.checkin,
        .ts-app:not(.ts-dark) .ts-check-button.checkout-ready {
          background:#10b981 !important;
          border-color:#059669 !important;
          color:#ffffff !important;
        }
        .ts-app:not(.ts-dark) .ts-check-button.checkin *,
        .ts-app:not(.ts-dark) .ts-check-button.checkout-ready * {
          color:#ffffff !important;
        }

        /* Hourly earning amount */
        .ts-app:not(.ts-dark) .ts-grid tbody td:nth-last-child(2) {
          color:#059669 !important;
          font-weight:900 !important;
        }

        /* Present = green */
        .ts-app:not(.ts-dark) .ts-status.present {
          color:#047857 !important;
          background:#dcfce7 !important;
          border-color:#86efac !important;
          font-weight:900 !important;
        }

        /* Off-day = yellow */
        .ts-app:not(.ts-dark) .ts-status.offday,
        .ts-app:not(.ts-dark) .ts-status.off-day {
          color:#b45309 !important;
          background:#fef3c7 !important;
          border-color:#fcd34d !important;
          font-weight:900 !important;
        }

        /* Absent = red */
        .ts-app:not(.ts-dark) .ts-status.absent {
          color:#b91c1c !important;
          background:#fee2e2 !important;
          border-color:#fca5a5 !important;
          font-weight:900 !important;
        }

        /* Keep the same semantic colors in dark mode. */
        .ts-app.ts-dark .ts-check-button.checkin,
        .ts-app.ts-dark .ts-check-button.checkout-ready {
          color:#ffffff !important;
        }
        .ts-app.ts-dark .ts-grid tbody td:nth-last-child(2) {
          color:#34d399 !important;
          font-weight:900 !important;
        }
        .ts-app.ts-dark .ts-status.present { color:#34d399 !important; }
        .ts-app.ts-dark .ts-status.offday,
        .ts-app.ts-dark .ts-status.off-day { color:#fbbf24 !important; }
        .ts-app.ts-dark .ts-status.absent { color:#f87171 !important; }
        /* FINAL RIBBON/TABS LAYOUT — ONE-LINE EXCEL RIBBON WITH HORIZONTAL ACCESS */
        .ts-app .ts-unified-toolbar {
          position:sticky !important;
          top:123px !important;
          z-index:1100 !important;
          width:100% !important;
          min-height:66px !important;
          height:66px !important;
          box-sizing:border-box !important;
          display:flex !important;
          flex-wrap:nowrap !important;
          align-items:stretch !important;
          overflow-x:auto !important;
          overflow-y:hidden !important;
          white-space:nowrap !important;
          padding:5px 8px 4px !important;
          gap:5px !important;
          overscroll-behavior-x:contain !important;
          scrollbar-width:thin !important;
          scrollbar-color:#94a3ad #e5eaee !important;
        }
        .ts-app .ts-unified-group {
          flex:0 0 auto !important;
          min-width:max-content !important;
          width:auto !important;
          max-width:none !important;
          min-height:54px !important;
          height:54px !important;
          padding:15px 6px 3px !important;
          gap:4px !important;
          overflow:visible !important;
          white-space:nowrap !important;
        }
        .ts-app .ts-unified-group button,
        .ts-app .ts-toolbar-pop > button {
          flex:0 0 auto !important;
          min-width:max-content !important;
          white-space:nowrap !important;
          padding:0 8px !important;
          font-size:10px !important;
        }
        .ts-app .ts-unified-current {
          flex:0 0 180px !important;
          min-width:180px !important;
          margin-left:auto !important;
        }

        /* The sheet-management/tabs row remains directly below the one-line ribbon.
           Tabs may scroll horizontally; they never disappear underneath the ribbon. */
        .ts-app .ts-sheet-bar {
          position:sticky !important;
          top:189px !important;
          z-index:1050 !important;
          min-height:49px !important;
          height:49px !important;
          box-sizing:border-box !important;
          display:flex !important;
          flex-wrap:nowrap !important;
          align-items:center !important;
          overflow:hidden !important;
          padding:5px 8px !important;
        }
        .ts-app .ts-sheet-tabs {
          display:flex !important;
          flex:1 1 auto !important;
          min-width:0 !important;
          flex-wrap:nowrap !important;
          align-items:flex-end !important;
          gap:4px !important;
          overflow-x:auto !important;
          overflow-y:hidden !important;
          white-space:nowrap !important;
          scrollbar-width:thin !important;
        }
        .ts-app .ts-sheet-tab,
        .ts-app .ts-add-sheet { flex:0 0 auto !important; }
        .ts-app .ts-sheet-settings { flex:0 0 auto !important; margin-left:8px !important; }

        /* Keep toolbar dropdowns above the worksheet. The toolbar itself is a
           horizontal command ribbon; the menus remain visible within the ribbon. */
        .ts-app .ts-toolbar-pop { position:relative !important; z-index:20000 !important; }
        .ts-app .ts-toolbar-menu,
        .ts-app .ts-toolbar-colors {
          position:absolute !important;
          top:calc(100% + 5px) !important;
          left:0 !important;
          z-index:99999 !important;
        }

        /* TABLE HEADER: page scrolling happens underneath the fixed ribbon + sheet row.
           The worksheet itself keeps its own vertical body scroll, so these headings
           stay attached to the top of the visible table instead of disappearing. */
        .ts-app .ts-grid-wrap {
          position:relative !important;
          overflow-x:auto !important;
          overflow-y:auto !important;
          scroll-padding-top:0 !important;
          overscroll-behavior:contain !important;
        }
        .ts-app .ts-grid thead th,
        .ts-app .ts-grid-wrap.ts-freeze-header .ts-grid thead th {
          position:sticky !important;
          top:0 !important;
          z-index:30 !important;
          background:#eef3f7 !important;
        }
        .ts-app .ts-grid thead .ts-row-num,
        .ts-app .ts-grid-wrap.ts-freeze-header .ts-grid thead .ts-row-num {
          position:sticky !important;
          left:0 !important;
          top:0 !important;
          z-index:40 !important;
        }
        .ts-app .ts-grid tbody .ts-row-num {
          position:sticky !important;
          left:0 !important;
          z-index:35 !important;
        }

        /* Desktop: all ribbon groups stay on one line and are reached by horizontal
           movement. No group is squeezed into a second row. */
        @media (min-width:901px) {
          .ts-app .ts-unified-toolbar { min-height:66px !important; height:66px !important; }
          .ts-app .ts-unified-group { flex:0 0 auto !important; }
        }
        @media (max-width:1200px) {
          .ts-app .ts-unified-group button,
          .ts-app .ts-toolbar-pop > button {
            font-size:9px !important;
            padding:0 6px !important;
          }
          .ts-app .ts-unified-label { font-size:7px !important; }
        }
        @media (max-width:900px) {
          .ts-app .ts-unified-toolbar {
            top:123px !important;
            min-height:66px !important;
            height:66px !important;
          }
          .ts-app .ts-sheet-bar { top:189px !important; }
          .ts-app .ts-unified-current { display:none !important; }
        }
        /* FINAL TABLE HEADER + COMPACT ROW HEIGHT — KEEP HEADINGS BELOW THE STICKY WORKSPACE RIBBON */
        /* The page scrolls behind the toolbar/sheet-management stack. The table header
           therefore docks below that stack instead of disappearing underneath it. */
        .ts-app .ts-grid-wrap {
          overflow-x:auto !important;
          overflow-y:visible !important;
          max-height:none !important;
          min-height:280px !important;
          scrollbar-width:thin !important;
        }
        .ts-app .ts-grid thead th,
        .ts-app .ts-grid-wrap.ts-freeze-header .ts-grid thead th {
          position:sticky !important;
          top:238px !important;
          z-index:1030 !important;
          height:42px !important;
          min-height:42px !important;
          padding:7px 9px !important;
          background:#eef3f7 !important;
          box-shadow:0 2px 5px rgba(15,23,42,.14) !important;
        }
        .ts-app .ts-grid thead .ts-row-num,
        .ts-app .ts-grid-wrap.ts-freeze-header .ts-grid thead .ts-row-num {
          position:sticky !important;
          left:0 !important;
          top:238px !important;
          z-index:1040 !important;
        }
        .ts-app .ts-grid tbody .ts-row-num {
          position:sticky !important;
          left:0 !important;
          z-index:1020 !important;
        }

        /* Compact, standard spreadsheet row proportions. */
        .ts-app:not(.ts-dark) .ts-grid th,
        .ts-app:not(.ts-dark) .ts-grid td {
          height:42px !important;
          min-height:42px !important;
          padding:6px 8px !important;
          line-height:1.15 !important;
        }
        .ts-app:not(.ts-dark) .ts-grid thead th {
          height:42px !important;
          min-height:42px !important;
          padding:7px 8px !important;
          font-size:10px !important;
        }
        .ts-app:not(.ts-dark) .ts-grid .ts-cell {
          min-height:30px !important;
          height:30px !important;
          padding:0 8px !important;
          border-radius:6px !important;
        }
        .ts-app:not(.ts-dark) .ts-grid select.ts-status,
        .ts-app:not(.ts-dark) .ts-grid .ts-status {
          min-height:30px !important;
          height:30px !important;
          padding:0 7px !important;
        }

        /* Slightly larger check-in/check-out control while keeping the row compact. */
        .ts-app .ts-grid .col-action {
          min-width:126px !important;
          width:126px !important;
        }
        .ts-app .ts-grid .ts-check-button {
          width:110px !important;
          min-width:110px !important;
          max-width:110px !important;
          height:32px !important;
          min-height:32px !important;
          padding:0 9px !important;
          font-size:11px !important;
          line-height:1 !important;
          white-space:nowrap !important;
        }

        /* FINAL WORKSHEET SCROLLER: keep the table header permanently visible at the
           top of the worksheet viewport. The body scrolls inside the worksheet,
           while the Tools + Sheet Management bars remain above it. */
        .ts-app .ts-grid-wrap {
          position:relative !important;
          overflow-x:auto !important;
          overflow-y:auto !important;
          height:calc(100vh - 365px) !important;
          max-height:calc(100vh - 365px) !important;
          min-height:360px !important;
          overscroll-behavior:contain !important;
          scrollbar-width:thin !important;
        }
        .ts-app .ts-grid {
          border-collapse:separate !important;
          border-spacing:0 !important;
        }
        .ts-app .ts-grid thead th,
        .ts-app .ts-grid-wrap.ts-freeze-header .ts-grid thead th {
          position:sticky !important;
          top:0 !important;
          z-index:80 !important;
          background:#eef3f7 !important;
          box-shadow:0 2px 6px rgba(15,23,42,.16) !important;
        }
        .ts-app .ts-grid thead .ts-row-num,
        .ts-app .ts-grid-wrap.ts-freeze-header .ts-grid thead .ts-row-num {
          position:sticky !important;
          left:0 !important;
          top:0 !important;
          z-index:90 !important;
          background:#eef3f7 !important;
        }
        .ts-app .ts-grid tbody .ts-row-num {
          position:sticky !important;
          left:0 !important;
          z-index:70 !important;
          background:#f7f9fb !important;
        }
        /* Compact, standard spreadsheet rows. */
        .ts-app:not(.ts-dark) .ts-grid th,
        .ts-app:not(.ts-dark) .ts-grid td {
          height:42px !important;
          min-height:42px !important;
          padding:5px 8px !important;
          line-height:1.1 !important;
        }
        .ts-app:not(.ts-dark) .ts-grid thead th {
          height:42px !important;
          min-height:42px !important;
          padding:7px 8px !important;
          font-size:10px !important;
        }
        .ts-app:not(.ts-dark) .ts-grid .ts-cell,
        .ts-app:not(.ts-dark) .ts-grid select.ts-status,
        .ts-app:not(.ts-dark) .ts-grid .ts-status {
          min-height:30px !important;
          height:30px !important;
        }
        /* Larger, readable check-in/check-out control without making rows tall. */
        .ts-app .ts-grid .col-action {
          min-width:128px !important;
          width:128px !important;
        }
        .ts-app .ts-grid .ts-check-button {
          width:112px !important;
          min-width:112px !important;
          max-width:112px !important;
          height:32px !important;
          min-height:32px !important;
          padding:0 10px !important;
          font-size:11px !important;
          line-height:1 !important;
          white-space:nowrap !important;
        }
        @media (max-width:900px) {
          .ts-app .ts-grid-wrap {
            height:calc(100vh - 330px) !important;
            max-height:calc(100vh - 330px) !important;
            min-height:300px !important;
          }
        }

        /* FINAL EXACT LAYOUT — stable title/subtitle + compact worksheet */
        .ts-app .ts-stable-heading {
          position:sticky !important;
          top:189px !important;
          z-index:1000 !important;
          width:100% !important;
          max-width:none !important;
          min-width:0 !important;
          min-height:58px !important;
          box-sizing:border-box !important;
          display:flex !important;
          align-items:center !important;
          gap:18px !important;
          margin:0 !important;
          padding:7px 12px !important;
          background:#f5f7f9 !important;
          border-bottom:1px solid #d7dde2 !important;
        }
        .ts-app .ts-stable-heading .ts-heading-content {
          flex:1 1 auto !important;
          min-width:0 !important;
          width:auto !important;
          max-width:none !important;
        }
        .ts-app .ts-stable-heading .ts-title-row {
          min-width:0 !important;
          display:flex !important;
          align-items:center !important;
          gap:8px !important;
        }
        .ts-app .ts-stable-heading .ts-title-row h1 {
          min-width:0 !important;
          margin:0 !important;
          font-size:18px !important;
          line-height:1.15 !important;
          white-space:nowrap !important;
          overflow:hidden !important;
          text-overflow:ellipsis !important;
        }
        .ts-app .ts-stable-heading .ts-page-subtitle {
          display:block !important;
          width:100% !important;
          max-width:none !important;
          min-width:0 !important;
          margin:3px 0 0 !important;
          padding:0 !important;
          color:#6b7280 !important;
          font-size:11px !important;
          line-height:1.3 !important;
          font-weight:500 !important;
          white-space:normal !important;
          overflow:visible !important;
          text-overflow:clip !important;
        }
        .ts-app .ts-stable-heading .ts-current-day {
          flex:0 0 auto !important;
          width:auto !important;
          min-width:132px !important;
          margin-left:auto !important;
          padding:5px 10px !important;
          box-sizing:border-box !important;
        }
        .ts-app.ts-dark .ts-stable-heading {
          background:#0d1115 !important;
          border-bottom-color:#3f4851 !important;
        }
        .ts-app.ts-dark .ts-stable-heading .ts-page-subtitle { color:#9ca3af !important; }

        /* Sheet tabs stay immediately below the stable title/subtitle strip. */
        .ts-app .ts-sheet-bar {
          position:sticky !important;
          top:247px !important;
          z-index:990 !important;
          width:100% !important;
          max-width:none !important;
          min-width:0 !important;
          box-sizing:border-box !important;
          overflow-x:auto !important;
          overflow-y:visible !important;
        }

        /* Stable worksheet header: only employee rows scroll inside this viewport. */
        .ts-app .ts-grid-wrap {
          position:relative !important;
          height:calc(100vh - 365px) !important;
          max-height:calc(100vh - 365px) !important;
          min-height:300px !important;
          overflow:auto !important;
          isolation:isolate !important;
        }
        .ts-app .ts-grid thead th,
        .ts-app .ts-grid-wrap.ts-freeze-header .ts-grid thead th {
          position:sticky !important;
          top:0 !important;
          z-index:120 !important;
          height:30px !important;
          min-height:30px !important;
          padding:3px 6px !important;
          background:#eef3f7 !important;
          color:#26313a !important;
          box-shadow:0 2px 6px rgba(15,23,42,.16) !important;
          font-size:10px !important;
          line-height:1.1 !important;
        }
        .ts-app .ts-grid thead .ts-row-num,
        .ts-app .ts-grid-wrap.ts-freeze-header .ts-grid thead .ts-row-num {
          position:sticky !important;
          left:0 !important;
          top:0 !important;
          z-index:130 !important;
        }
        .ts-app .ts-grid tbody .ts-row-num {
          position:sticky !important;
          left:0 !important;
          z-index:110 !important;
        }
        /* Normal spreadsheet row density — compact, not card-sized. */
        .ts-app .ts-grid tbody tr td {
          height:30px !important;
          min-height:30px !important;
          padding:2px 5px !important;
          line-height:1.1 !important;
        }
        .ts-app .ts-grid .ts-cell,
        .ts-app .ts-grid .ts-status,
        .ts-app .ts-grid .ts-select {
          height:26px !important;
          min-height:26px !important;
          padding:0 5px !important;
          font-size:11px !important;
        }
        /* Check-in/out is larger than the old compact button, while the row remains compact. */
        .ts-app .ts-grid .col-action {
          min-width:126px !important;
          width:126px !important;
        }
        .ts-app .ts-grid .ts-check-button {
          width:108px !important;
          min-width:108px !important;
          max-width:108px !important;
          height:28px !important;
          min-height:28px !important;
          padding:0 9px !important;
          font-size:11px !important;
          border-radius:4px !important;
          white-space:nowrap !important;
        }
        .ts-app .ts-grid .ts-check-button svg { flex:0 0 auto !important; }
        .ts-app .ts-grid .ts-check-button span { white-space:nowrap !important; }
        @media (max-width:900px) {
          .ts-app .ts-stable-heading { top:123px !important; min-height:58px !important; }
          .ts-app .ts-sheet-bar { top:181px !important; }
          .ts-app .ts-stable-heading .ts-current-day { min-width:112px !important; }
          .ts-app .ts-grid-wrap { height:calc(100vh - 325px) !important; max-height:calc(100vh - 325px) !important; }
        }



/* =========================================================
   SODAH FINAL STACK — SINGLE SOURCE OF TRUTH
   Order while scrolling:
   TOP NAV -> TOOLS -> SHEET MANAGEMENT -> SUBTITLE -> WORKSHEET
   The sheet title is normal content and disappears on scroll;
   the subtitle remains as the stable fourth layer.
   ========================================================= */
.ts-app {
  --ts-final-topbar: 123px;
  --ts-final-tools: 66px;
  --ts-final-sheetbar: 49px;
  --ts-final-subtitle: 34px;
}

/* Top navigation */
.ts-app .ts-topbar {
  position: sticky !important;
  top: 0 !important;
  z-index: 5000 !important;
}

/* One-line tools ribbon: stable, horizontally scrollable */
.ts-app .ts-unified-toolbar {
  position: sticky !important;
  top: var(--ts-final-topbar) !important;
  z-index: 4900 !important;
  width: 100% !important;
  min-width: 0 !important;
  height: var(--ts-final-tools) !important;
  min-height: var(--ts-final-tools) !important;
  max-height: var(--ts-final-tools) !important;
  box-sizing: border-box !important;
  display: flex !important;
  flex-wrap: nowrap !important;
  align-items: stretch !important;
  overflow-x: auto !important;
  overflow-y: visible !important;
  white-space: nowrap !important;
  scrollbar-width: thin !important;
}
.ts-app .ts-unified-group {
  flex: 0 0 auto !important;
  min-width: max-content !important;
  white-space: nowrap !important;
  overflow: visible !important;
}

/* Sheet management / tabs: always immediately below tools */
.ts-app .ts-sheet-bar {
  position: sticky !important;
  top: calc(var(--ts-final-topbar) + var(--ts-final-tools)) !important;
  z-index: 4800 !important;
  width: 100% !important;
  min-width: 0 !important;
  height: var(--ts-final-sheetbar) !important;
  min-height: var(--ts-final-sheetbar) !important;
  max-height: var(--ts-final-sheetbar) !important;
  box-sizing: border-box !important;
  overflow-x: auto !important;
  overflow-y: visible !important;
  scrollbar-width: thin !important;
}
.ts-app .ts-sheet-tabs {
  min-width: max-content !important;
  flex: 0 0 auto !important;
  overflow-x: auto !important;
  overflow-y: hidden !important;
  white-space: nowrap !important;
}

/* The generic heading must NOT compete with the stable subtitle layer. */
.ts-app .ts-heading {
  position: relative !important;
  top: auto !important;
}

/* Page heading: title is normal/temporary; subtitle is the stable layer. */
.ts-app .ts-stable-heading {
  position: sticky !important;
  top: calc(
    var(--ts-final-topbar) +
    var(--ts-final-tools) +
    var(--ts-final-sheetbar)
  ) !important;
  z-index: 4700 !important;
  width: 100% !important;
  max-width: none !important;
  min-width: 0 !important;
  min-height: 58px !important;
  height: 58px !important;
  box-sizing: border-box !important;
  padding: 7px 12px !important;
  margin: 0 !important;
  background: #f5f7f9 !important;
  border-bottom: 1px solid #d7dde2 !important;
  display: flex !important;
  align-items: center !important;
  gap: 18px !important;
}

.ts-app .ts-stable-heading .ts-heading-content {
  flex: 1 1 auto !important;
  min-width: 0 !important;
  width: auto !important;
  max-width: none !important;
}
.ts-app .ts-stable-heading .ts-title-row {
  display: flex !important;
  align-items: center !important;
  gap: 8px !important;
  max-height: 24px !important;
  margin: 0 !important;
  overflow: hidden !important;
  opacity: 1 !important;
  transform: none !important;
  transition: max-height .15s ease, opacity .12s ease, transform .15s ease !important;
}
.ts-app .ts-stable-heading .ts-title-row h1 {
  min-width: 0 !important;
  margin: 0 !important;
  font-size: 18px !important;
  line-height: 1.15 !important;
  white-space: nowrap !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
}
.ts-app .ts-stable-heading .ts-page-subtitle {
  display: block !important;
  width: 100% !important;
  max-width: none !important;
  min-width: 0 !important;
  margin: 3px 0 0 !important;
  padding: 0 !important;
  color: #6b7280 !important;
  font-size: 11px !important;
  line-height: 1.3 !important;
  font-weight: 500 !important;
  white-space: nowrap !important;
  overflow: visible !important;
  text-overflow: clip !important;
}
.ts-app .ts-stable-heading .ts-current-day {
  flex: 0 0 auto !important;
  min-width: 132px !important;
  margin-left: auto !important;
  padding: 5px 10px !important;
  box-sizing: border-box !important;
}

/* On scroll: only the title collapses. The subtitle stays visible and stable. */
.ts-app.ts-page-scrolled .ts-stable-heading {
  min-height: var(--ts-final-subtitle) !important;
  height: var(--ts-final-subtitle) !important;
  padding: 4px 12px !important;
  align-items: center !important;
}
.ts-app.ts-page-scrolled .ts-stable-heading .ts-title-row {
  max-height: 0 !important;
  margin: 0 !important;
  opacity: 0 !important;
  transform: translateY(-6px) !important;
  pointer-events: none !important;
}
.ts-app.ts-page-scrolled .ts-stable-heading .ts-page-subtitle {
  margin: 0 !important;
  line-height: 24px !important;
  color: #6b7280 !important;
}

/* Never move Sheet Management when the page is scrolled. */
.ts-app.ts-page-scrolled .ts-sheet-bar,
.ts-app:not(.ts-page-scrolled) .ts-sheet-bar {
  top: calc(var(--ts-final-topbar) + var(--ts-final-tools)) !important;
}

/* Worksheet remains below the stable chrome. Its own header sticks inside it. */
.ts-app .ts-grid-wrap {
  position: relative !important;
  z-index: 1 !important;
  overflow: auto !important;
  isolation: isolate !important;
}
.ts-app .ts-grid-wrap .ts-grid thead th {
  position: sticky !important;
  top: 0 !important;
  z-index: 120 !important;
}
.ts-app .ts-grid-wrap .ts-grid thead .ts-row-num {
  position: sticky !important;
  left: 0 !important;
  top: 0 !important;
  z-index: 130 !important;
}
.ts-app .ts-grid-wrap .ts-grid tbody .ts-row-num {
  position: sticky !important;
  left: 0 !important;
  z-index: 110 !important;
}

/* Selected sheet color belongs to the outer gutter/frame, never the white cells. */
.ts-app .ts-grid-wrap {
  background: var(--ts-active-sheet-color, #10b981) !important;
  padding: 4px !important;
  border: 0 !important;
}
.ts-app .ts-grid-wrap > .ts-grid {
  background: #fff !important;
}

/* Preserve the compact spreadsheet proportions and larger check button. */
.ts-app .ts-grid-wrap .ts-grid th,
.ts-app .ts-grid-wrap .ts-grid td {
  height: 27px !important;
  min-height: 27px !important;
  padding: 1px 4px !important;
}
.ts-app .ts-grid-wrap .ts-grid .ts-check-button {
  width: 108px !important;
  min-width: 108px !important;
  max-width: 108px !important;
  height: 28px !important;
  min-height: 28px !important;
  white-space: nowrap !important;
}

/* Dropdowns/popovers always escape the stable bars. */
.ts-app .ts-toolbar-pop,
.ts-app .ts-toolbar-menu,
.ts-app .ts-toolbar-colors {
  z-index: 50000 !important;
}
.ts-app .ts-toolbar-menu,
.ts-app .ts-toolbar-colors {
  position: absolute !important;
}

/* Dark mode equivalent */
.ts-app.ts-dark .ts-stable-heading {
  background: #0d1115 !important;
  border-bottom-color: #3f4851 !important;
}
.ts-app.ts-dark .ts-stable-heading .ts-page-subtitle,
.ts-app.ts-dark.ts-page-scrolled .ts-stable-heading .ts-page-subtitle {
  color: #9ca3af !important;
}
.ts-app.ts-dark .ts-grid-wrap > .ts-grid {
  background: #0d1115 !important;
}

@media (max-width: 900px) {
  .ts-app {
    --ts-final-topbar: 123px;
    --ts-final-tools: 66px;
    --ts-final-sheetbar: 49px;
  }
  .ts-app .ts-stable-heading {
    min-height: 58px !important;
    height: 58px !important;
  }
  .ts-app.ts-page-scrolled .ts-stable-heading {
    min-height: var(--ts-final-subtitle) !important;
    height: var(--ts-final-subtitle) !important;
  }
  .ts-app .ts-stable-heading .ts-current-day {
    min-width: 112px !important;
  }
}
      `}</style>

      <style>{`
        /* FINAL WORKSHEET FIX: restore independent spreadsheet scrolling. */
        .ts-app .ts-topbar{position:sticky!important;top:0!important;z-index:5000!important}
        .ts-app .ts-unified-toolbar{position:sticky!important;top:123px!important;z-index:4900!important;height:66px!important;min-height:66px!important;max-height:66px!important;overflow-x:auto!important;overflow-y:visible!important;flex-wrap:nowrap!important}
        .ts-app .ts-sheet-bar{position:sticky!important;top:189px!important;z-index:4800!important;height:49px!important;min-height:49px!important;max-height:49px!important;overflow-x:auto!important;overflow-y:visible!important}
        .ts-app .ts-stable-heading{position:sticky!important;top:238px!important;z-index:4700!important;width:100%!important;min-height:34px!important;height:34px!important;max-height:34px!important;box-sizing:border-box!important;padding:4px 12px!important;margin:0!important;background:#f5f7f9!important;border-bottom:1px solid #d7dde2!important;display:flex!important;align-items:center!important}
        .ts-app .ts-stable-heading .ts-title-row{display:none!important}
        .ts-app .ts-stable-heading .ts-page-subtitle{display:block!important;width:100%!important;max-width:none!important;margin:0!important;padding:0!important;color:#6b7280!important;font-size:11px!important;line-height:24px!important;white-space:nowrap!important;overflow:visible!important;text-overflow:clip!important}
        .ts-app .ts-stable-heading .ts-current-day{display:none!important}

        /* Employee sheet: rows scroll inside the worksheet; header sticks to its viewport. */
        .ts-app .ts-grid-wrap,.ts-app .ts-grid-wrap.ts-freeze-header{position:relative!important;display:block!important;width:100%!important;height:clamp(320px,58vh,560px)!important;min-height:320px!important;max-height:560px!important;overflow:auto!important;overflow-x:auto!important;overflow-y:auto!important;resize:both!important;box-sizing:border-box!important;isolation:isolate!important;scrollbar-gutter:stable both-edges!important;background:var(--ts-active-sheet-color,#10b981)!important;padding:4px!important}
        .ts-app .ts-grid-wrap>.ts-attendance-table{width:max-content!important;min-width:100%!important;border-collapse:collapse!important;border-spacing:0!important;background:#fff!important}
        .ts-app .ts-grid-wrap .ts-attendance-table thead{position:static!important;display:table-header-group!important}
        .ts-app .ts-grid-wrap .ts-attendance-table thead th,.ts-app .ts-grid-wrap.ts-freeze-header .ts-attendance-table thead th{position:sticky!important;top:0!important;z-index:120!important;background:#eef3f7!important;color:#26313a!important;box-shadow:0 1px 4px rgba(15,23,42,.16)!important}
        .ts-app .ts-grid-wrap .ts-attendance-table thead .ts-row-num{position:sticky!important;left:0!important;top:0!important;z-index:140!important}
        .ts-app .ts-grid-wrap .ts-attendance-table tbody .ts-row-num{position:sticky!important;left:0!important;z-index:110!important;background:#f5f7f9!important}
        .ts-app .ts-grid-wrap .ts-attendance-table th,.ts-app .ts-grid-wrap .ts-attendance-table td{height:30px!important;min-height:30px!important;padding:2px 5px!important}
        .ts-app .ts-grid-wrap .ts-attendance-table .ts-check-button{width:108px!important;min-width:108px!important;max-width:108px!important;height:28px!important;min-height:28px!important;white-space:nowrap!important}

        /* General sheet: preserve its own spreadsheet viewport and scrolling. */
        .ts-app .ts-general-grid-wrap{position:relative!important;display:block!important;height:clamp(320px,62vh,650px)!important;min-height:320px!important;max-height:650px!important;overflow:auto!important;overflow-x:auto!important;overflow-y:auto!important;resize:both!important;box-sizing:border-box!important;scrollbar-gutter:stable both-edges!important}
        .ts-app .ts-general-grid{min-width:max-content!important;width:max-content!important}
        .ts-app .ts-general-grid thead th,.ts-app .ts-general-grid th{position:sticky!important;top:0!important;z-index:20!important}
        .ts-app .ts-general-grid th.row-head{position:sticky!important;left:0!important;top:0!important;z-index:30!important}

        .ts-app .ts-grid-wrap>.ts-attendance-table,.ts-app .ts-general-grid-wrap{background:#fff!important}
        .ts-app.ts-dark .ts-stable-heading{background:#0d1115!important;border-bottom-color:#3f4851!important}
        .ts-app.ts-dark .ts-stable-heading .ts-page-subtitle{color:#9ca3af!important}
        .ts-app.ts-dark .ts-grid-wrap>.ts-attendance-table,.ts-app.ts-dark .ts-general-grid-wrap{background:#0d1115!important}
        @media(max-width:900px){
          .ts-app .ts-unified-toolbar{top:123px!important}
          .ts-app .ts-sheet-bar{top:189px!important}
          .ts-app .ts-stable-heading{top:238px!important}
          .ts-app .ts-grid-wrap{height:48vh!important;min-height:300px!important}
          .ts-app .ts-general-grid-wrap{height:55vh!important;min-height:300px!important}
        }
      `}</style>
    </>
  );
}

function UnifiedWorkbookToolbar({ activeSheetName, openPanel, fontSize, setFontSize, font, setFont, textColor, setTextColor, fillColor, setFillColor, onNewSheet, onDeleteSheet, onRename, onBin, onCopy, onPaste, onClear, onInsertRow, onDeleteRow, onInsertColumn, onDeleteColumn, onAutoFit, onSortAsc, onSortDesc, freezeHeader, onFreezeHeader, onBold, onItalic, onFontSize, onFont, onTextColor, onFillColor, onPrint }) {
  const [fontOpen, setFontOpen] = useState(false);
  const [sizeOpen, setSizeOpen] = useState(false);
  const [textOpen, setTextOpen] = useState(false);
  const [fillOpen, setFillOpen] = useState(false);
  const colors = ["#ffffff","#111827","#ef4444","#f59e0b","#10b981","#06b6d4","#3b82f6","#8b5cf6","#ec4899","#e5e7eb","#d1d5db","#fef3c7"];
  const fonts = ["Inter, Arial, sans-serif","Arial, sans-serif","Roboto, Arial, sans-serif","Georgia, serif","Times New Roman, serif","Courier New, monospace"];
  const sizes = [10,11,12,14,16,18,20,24,28,32];
  const pick = (fn, close) => (value) => { fn(value); close(false); };
  return <div className="ts-unified-toolbar">
    <div className="ts-unified-group"><span className="ts-unified-label">SHEET MANAGEMENT</span><button onClick={onNewSheet}><Plus size={14}/> New Sheet</button><button onClick={onDeleteSheet}><Trash2 size={14}/> Delete Sheet</button><button onClick={onRename}>Rename</button><button onClick={onBin}><Trash2 size={14}/> Bin</button></div>
    <div className="ts-unified-group"><span className="ts-unified-label">EDIT</span><button onClick={onCopy}><Copy size={14}/> Copy</button><button onClick={onPaste}><Clipboard size={14}/> Paste</button><button onClick={onClear}><Trash2 size={14}/> Clear</button></div>
    <div className="ts-unified-group"><span className="ts-unified-label">INSERT</span><button onClick={onInsertRow}><Rows3 size={14}/> Insert Row</button><button onClick={onDeleteRow}><Minus size={14}/> Delete Row</button><button onClick={onInsertColumn}><Columns3 size={14}/> Insert Column</button><button onClick={onDeleteColumn}><Minus size={14}/> Delete Column</button><button onClick={onAutoFit}><ChevronsUpDown size={14}/> AutoFit</button></div>
    <div className="ts-unified-group"><span className="ts-unified-label">FONT & TEXT</span><div className="ts-toolbar-pop"><button onClick={() => {setFontOpen(v=>!v);setSizeOpen(false);setTextOpen(false);setFillOpen(false)}}>{font.split(",")[0]} <ChevronDown size={11}/></button>{fontOpen&&<div className="ts-toolbar-menu">{fonts.map(f=><button key={f} style={{fontFamily:f}} onClick={()=>pick(onFont,setFontOpen)(f)}>{f.split(",")[0]}</button>)}</div>}</div><div className="ts-toolbar-pop"><button onClick={() => {setSizeOpen(v=>!v);setFontOpen(false);setTextOpen(false);setFillOpen(false)}}>{fontSize}px <ChevronDown size={11}/></button>{sizeOpen&&<div className="ts-toolbar-menu">{sizes.map(n=><button key={n} onClick={()=>pick(onFontSize,setSizeOpen)(n)}>{n}px</button>)}</div>}</div><button onClick={onBold}><Bold size={15}/></button><button onClick={onItalic}><Italic size={15}/></button><div className="ts-toolbar-pop"><button onClick={() => {setTextOpen(v=>!v);setFontOpen(false);setSizeOpen(false);setFillOpen(false)}}><Type size={14}/> Text</button>{textOpen&&<div className="ts-toolbar-colors">{colors.map(c=><button key={c} title={c} style={{background:c}} onClick={()=>pick(onTextColor,setTextOpen)(c)}/>)}</div>}</div></div>
    <div className="ts-unified-group"><span className="ts-unified-label">FILL & FORMAT</span><div className="ts-toolbar-pop"><button onClick={() => {setFillOpen(v=>!v);setFontOpen(false);setSizeOpen(false);setTextOpen(false)}}><Palette size={14}/> Fill <ChevronDown size={11}/></button>{fillOpen&&<div className="ts-toolbar-colors">{colors.map(c=><button key={c} title={c} style={{background:c}} onClick={()=>pick(onFillColor,setFillOpen)(c)}/>)}</div>}</div><button onClick={onPrint}><Printer size={14}/> Print</button></div>
    <div className="ts-unified-group"><span className="ts-unified-label">DATA</span><button onClick={onSortAsc}>A → Z</button><button onClick={onSortDesc}>Z → A</button><button className={freezeHeader ? "format-active" : ""} onClick={onFreezeHeader}>Freeze Header</button></div>
    <div className="ts-unified-current"><span>{activeSheetName}</span><small>Tools apply to the active sheet</small></div>
  </div>;
}

function UnifiedBinPanel({ data, onClose, onRestore, onPermanentDelete, onEmpty }) {
  const items = [...(data.attendance || []).map(item => ({...item, __type:"attendance"})), ...(data.general || []).map(item => ({...item, __type:"general"}))].sort((a,b)=>(b.deletedAt||0)-(a.deletedAt||0));
  return <aside className="ts-unified-bin-panel">
    <div className="ts-unified-bin-header"><div><strong><Trash2 size={16}/> Bin ({items.length})</strong><span>Deleted sheets are saved here. Restore them or permanently delete them.</span></div><button onClick={onClose}><X size={18}/></button></div>
    <div className="ts-unified-bin-list">{items.length ? items.map(item => <div className="ts-unified-bin-item" key={`${item.__type}-${item.id}`}><div><strong>{item.name}</strong><small>{item.__type === "general" ? "General Sheet" : "Employee Timesheet"} • {item.deletedAt ? new Date(item.deletedAt).toLocaleString() : "—"}</small></div><div><button onClick={()=>onRestore(item.__type,item.id )}><Undo2 size={14}/> Restore</button><button className="danger" onClick={()=>onPermanentDelete(item.__type,item.id )}><Trash2 size={14}/> Delete Permanently</button></div></div>) : <div className="ts-unified-bin-empty">Bin is empty.</div>}</div>
    <button className="ts-unified-empty-bin" onClick={onEmpty} disabled={!items.length}><Trash2 size={15}/> Empty Bin</button>
  </aside>;
}

function SheetSwitcher({ sheets, activeId, open, onToggle, onSelectAttendance, onAddAttendance }) {
  return (
    <div className="ts-sheet-switcher">
      <button type="button" className={`ts-top-action ts-sheet-switcher-btn ${open ? "active" : ""}`} onClick={onToggle}>
        <FileText size={17}/>
        <span>Data Sheet</span>
        <ChevronDown size={12}/>
      </button>
      {open && (
        <div className="ts-sheet-switcher-menu">
          <div className="ts-sheet-switcher-title">DATA SHEETS</div>
          {sheets.map((item) => (
            <button type="button" key={item.id} className={item.id === activeId ? "selected" : ""} onClick={() => onSelectAttendance(item.id)}>
              <FileText size={15}/> <span>{item.name}</span>
            </button>
          ))}
          <div className="ts-sheet-switcher-divider"/>
          <button type="button" onClick={onAddAttendance}><Plus size={15}/> <span>Add Data Sheet</span></button>
        </div>
      )}
    </div>
  );
}

function TopAction({icon:Icon,label,active,onClick,extraClass="",showCaret=true}) {
  return <button className={`ts-top-action ${extraClass} ${active ? "active" : ""}`} onClick={onClick}><Icon size={17}/><span>{label}</span>{showCaret && (active ? <ChevronUp size={11}/> : <ChevronDown size={11}/>)}</button>;
}

function SummaryCard({icon:Icon,label,value,accent}) {
  return <div className={`ts-summary-card ${accent ? "accent" : ""}`}><div className="ts-summary-icon"><Icon size={18}/></div><div><span>{label}</span><strong>{value}</strong></div></div>;
}


function Toast({title,message,type}) {
  return <div className={`ts-toast ${type}`}><div className="ts-toast-icon">{type==="success"?<CheckCircle2/>:<X/>}</div><div><strong>{title}</strong><span>{message}</span></div></div>;
}

function Celebration({data,currency}) {
  const moneyPieces = ["💸","💵","💰","💸","✨","💵","💰","🎉","💸","💵","✨","💰","💸","💵","💰","✨"];
  return <div className="ts-celebrate-bg" aria-live="polite">
    <div className="ts-money-rain">{moneyPieces.map((item,i)=><span key={i} style={{left:`${5+(i*6)%90}%`,animationDelay:`${(i%7)*0.14}s`,animationDuration:`${2.4+(i%5)*0.35}s`}}>{item}</span>)}</div>
    <div className="ts-celebrate">
      <div className="ts-celebrate-icon"><CheckCircle2/></div>
      <h2>Congratulations! 🎉</h2><p>Successful check-out</p><strong>{data.name}</strong>
      <div className="ts-celebrate-stats"><span>{data.worked.toFixed(2)} H worked</span><span>{data.ot.toFixed(2)} H O.T</span><b>{money(data.earning,currency)}</b></div>
      <small>Next duty is ready for Check In • {data.nextDate}</small>
    </div>
  </div>;

}
