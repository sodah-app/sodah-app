"use client";
import { Activity, CalendarDays, CheckCircle2, CircleDollarSign, Clock3, ChevronLeft, ChevronRight, DollarSign, Download, Printer, RefreshCw, Sparkles, TimerReset, Trophy, Users, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { hrs, money, todayISO } from "@/lib/time";

const { AnalyticsPanel } = (() => {
const WEEK = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function dayName(iso) {
  return WEEK[new Date(`${iso}T12:00:00`).getDay()];
}

function weekStartISO(iso) {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() - d.getDay());
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

function weekEndISO(iso) {
  const d = new Date(`${weekStartISO(iso)}T12:00:00`);
  d.setDate(d.getDate() + 6);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

function monthStartISO(iso) {
  const d = new Date(`${iso}T12:00:00`);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

function monthEndISO(iso) {
  const d = new Date(`${iso}T12:00:00`);
  d.setMonth(d.getMonth() + 1, 0);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

function actualWorkedFor(row, now = new Date()) {
  const status = String(row.status || "").trim().toLowerCase();
  if (!["present", "working", "waiting"].includes(status)) return 0;
  const accumulated = Number(row.workedHours || 0);
  // A completed shift is already stored in workedHours; never count it twice.
  if (row.checkOut) return accumulated || hrs(row.checkIn, row.checkOut);
  if (!row.checkIn) return accumulated;
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  // An old, unclosed row must not keep accumulating hours on later days.
  if (row.date && row.date !== today) return accumulated;
  const start = status === "waiting" ? (row.earningStartAt || row.checkIn) : row.checkIn;
  return accumulated + hrs(start, now.toTimeString().slice(0, 5));
}

function earningFor(row, settings, now = new Date()) {
  if (!row.name && !row.employeeId) return 0;
  if (row.status === "Off-day") return Number(settings.offDayEarning || 0);
  if (row.status === "Absent") return Number(settings.absentEarning || 0);
  return actualWorkedFor(row, now) * Number(settings.defaultHourlyRate || 0)
    + Number(row.ot || 0) * Number(settings.otRate || 0);
}

function expectedEarningFor(row, settings) {
  if (row.status === "Off-day") return Number(settings.offDayEarning || 0);
  if (row.status === "Absent") return Number(settings.absentEarning || 0);
  return Number(row.hours || settings.defaultHours || 0) * Number(settings.defaultHourlyRate || 0)
    + Number(row.ot || 0) * Number(settings.otRate || 0);
}

function PanelHeader({title,subtitle,onClose}) { return <div className="ts-panel-header"><div><h2>{title}</h2><p>{subtitle}</p></div><button onClick={onClose}><X size={18}/></button></div>; }
function Stat({color,icon:Icon,label,value}) { return <div className={`ts-stat ${color}`}><div className="ts-stat-icon"><Icon size={20}/></div><span>{label}</span><strong>{value}</strong></div>; }
function Setting({label,children}) { return <label className="ts-setting"><span>{label}</span>{children}</label>; }
function ReportMetric({icon:Icon,label,value}) { return <div className="ts-report-metric"><Icon size={18}/><span>{label}</span><strong>{value}</strong></div>; }
function CalendarMini({date,cursor,setCursor,onSelect}) {
  const WEEK=["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
  const first=new Date(cursor.getFullYear(),cursor.getMonth(),1),start=new Date(first);start.setDate(1-first.getDay());
  return <div><div className="ts-mini-nav"><button onClick={()=>setCursor(new Date(cursor.getFullYear(),cursor.getMonth()-1,1))}><ChevronLeft/></button><b>{cursor.toLocaleDateString("en-US",{month:"long",year:"numeric"})}</b><button onClick={()=>setCursor(new Date(cursor.getFullYear(),cursor.getMonth()+1,1))}><ChevronRight/></button></div><div className="ts-mini-grid">{WEEK.map(d=><span key={d}>{d.slice(0,1)}</span>)}{Array.from({length:42},(_,i)=>{let d=new Date(start);d.setDate(start.getDate()+i);let iso=new Date(d-d.getTimezoneOffset()*60000).toISOString().slice(0,10);return <button key={iso} className={iso===date?"selected":d.getMonth()===cursor.getMonth()?"":"muted"} onClick={()=>onSelect(iso)}>{d.getDate()}</button>})}</div></div>;
}
function AnalyticsPanel({ sheets, settings, onClose }) {
  const [period, setPeriod] = useState("month");
  const [anchor, setAnchor] = useState(todayISO());
  const [employee, setEmployee] = useState("all");
  const [refreshKey, setRefreshKey] = useState(0);
  const [liveClock, setLiveClock] = useState(() => new Date());

  // Keep open check-in shifts moving without requiring a manual refresh.
  useEffect(() => {
    const timer = window.setInterval(() => setLiveClock(new Date()), 15000);
    return () => window.clearInterval(timer);
  }, []);

  const allRows = useMemo(
    () => (sheets || []).flatMap(s => Array.isArray(s.rows) ? s.rows : []).filter(r => (r.name || r.employeeId) && r.date),
    [sheets]
  );

  const employeeOptions = useMemo(() => {
    const map = new Map();
    allRows.forEach(r => {
      const key = r.employeeId || r.name;
      if (key && !map.has(key)) map.set(key, { key, name: r.name || r.employeeId, employeeId: r.employeeId || "—" });
    });
    return [...map.values()].sort((a, b) => String(a.name).localeCompare(String(b.name)));
  }, [allRows]);

  const range = useMemo(() => {
    const d = new Date(`${anchor}T12:00:00`);
    if (period === "day") return { start: anchor, end: anchor };
    if (period === "week") return { start: weekStartISO(anchor), end: weekEndISO(anchor) };
    if (period === "month") return { start: monthStartISO(anchor), end: monthEndISO(anchor) };
    return { start: `${d.getFullYear()}-01-01`, end: `${d.getFullYear()}-12-31` };
  }, [period, anchor]);

  const periodRows = useMemo(() => {
    let rows = allRows.filter(r => r.date >= range.start && r.date <= range.end);
    if (employee !== "all") rows = rows.filter(r => (r.employeeId || r.name) === employee);
    return rows;
  }, [allRows, range, employee, refreshKey]);

  const statusOf = (row) => String(row.status || "").trim().toLowerCase();
  const isOffDay = (row) => statusOf(row) === "off-day" || statusOf(row) === "off day";
  const isAbsent = (row) => statusOf(row) === "absent";

  const liveActiveRows = useMemo(() => {
    const today = `${liveClock.getFullYear()}-${String(liveClock.getMonth() + 1).padStart(2, "0")}-${String(liveClock.getDate()).padStart(2, "0")}`;
    return allRows.filter(row => {
      const matchesEmployee = employee === "all" || (row.employeeId || row.name) === employee;
      const status = String(row.status || "").trim().toLowerCase();
      return matchesEmployee && row.date === today && ["present", "working", "waiting"].includes(status) && Boolean(row.checkIn) && !row.checkOut;
    });
  }, [allRows, employee, liveClock]);
  const liveActiveHours = liveActiveRows.reduce((sum, row) => sum + actualWorkedFor(row, liveClock), 0);
  const liveUpdatedAt = liveClock.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });

  const periodEmployees = useMemo(
    () => new Set(periodRows.map(r => r.employeeId || r.name).filter(Boolean)).size,
    [periodRows]
  );
  const actualHours = periodRows.reduce((a, r) => a + actualWorkedFor(r, liveClock), 0);
  const scheduledHours = periodRows.filter(r => !isAbsent(r) && !isOffDay(r))
    .reduce((a, r) => a + Number(r.hours || settings.defaultHours || 0), 0);
  const otHours = periodRows.reduce((a, r) => a + Number(r.ot || 0), 0);
  const actualEarning = periodRows.reduce((a, r) => a + earningFor(r, settings, liveClock), 0);
  const expectedEarning = periodRows.reduce((a, r) => a + expectedEarningFor(r, settings), 0);
  const earningCut = Math.max(0, expectedEarning - actualEarning);
  const currency = settings.currency;

  const breakdown = useMemo(() => {
    const makeSummary = (label, date, rows) => ({
      label, date,
      employees: new Set(rows.map(r => r.employeeId || r.name).filter(Boolean)).size,
      hours: rows.reduce((a, r) => a + actualWorkedFor(r, liveClock), 0),
      scheduled: rows.filter(r => !isAbsent(r) && !isOffDay(r))
        .reduce((a, r) => a + Number(r.hours || settings.defaultHours || 0), 0),
      ot: rows.reduce((a, r) => a + Number(r.ot || 0), 0),
      earning: rows.reduce((a, r) => a + earningFor(r, settings, liveClock), 0),
      expected: rows.reduce((a, r) => a + expectedEarningFor(r, settings), 0)
    });
    if (period === "year") {
      const year = Number(range.start.slice(0, 4));
      return Array.from({ length: 12 }, (_, i) => {
        const month = String(i + 1).padStart(2, "0");
        const rows = periodRows.filter(r => String(r.date).startsWith(`${year}-${month}`));
        return makeSummary(new Date(year, i, 1).toLocaleDateString("en-US", { month: "long" }), `${year}-${month}`, rows);
      });
    }
    const out = [];
    const start = new Date(`${range.start}T12:00:00`);
    const end = new Date(`${range.end}T12:00:00`);
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const iso = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
      const rows = periodRows.filter(r => r.date === iso);
      out.push(makeSummary(dayName(iso), iso, rows));
    }
    return out;
  }, [period, periodRows, range, settings, liveClock]);

  const trendBuckets = useMemo(() => {
    if (period === "year") return breakdown.map(b => ({ label: b.label.slice(0, 3), hours: b.hours, scheduled: b.scheduled, earning: b.earning, expected: b.expected }));
    if (period === "month") {
      const groups = new Map();
      breakdown.forEach(b => {
        const key = weekStartISO(b.date);
        const current = groups.get(key) || { hours: 0, scheduled: 0, earning: 0, expected: 0, label: `Week ${groups.size + 1}` };
        current.hours += b.hours; current.scheduled += b.scheduled; current.earning += b.earning; current.expected += b.expected;
        groups.set(key, current);
      });
      return [...groups.values()];
    }
    return breakdown.map(b => ({
      label: period === "day" ? "Selected day" : new Date(`${b.date}T12:00:00`).toLocaleDateString("en-US", { weekday: "short", day: "2-digit" }),
      hours: b.hours, scheduled: b.scheduled, earning: b.earning, expected: b.expected
    }));
  }, [period, breakdown]);

  const employeePerformance = useMemo(() => {
    const map = new Map();
    periodRows.forEach(r => {
      const key = r.employeeId || r.name;
      if (!key) return;
      const item = map.get(key) || { key, name: r.name || r.employeeId || "Employee", employeeId: r.employeeId || "—", hours: 0, ot: 0, earning: 0 };
      item.hours += actualWorkedFor(r, liveClock);
      item.ot += Number(r.ot || 0);
      item.earning += earningFor(r, settings, liveClock);
      map.set(key, item);
    });
    return [...map.values()].sort((a, b) => b.hours - a.hours || b.earning - a.earning).slice(0, 5);
  }, [periodRows, settings, liveClock]);

  const periodTitle = period === "day"
    ? `${dayName(anchor)} • ${anchor}`
    : period === "week" ? `Week • ${range.start} → ${range.end}`
    : period === "month" ? new Date(`${anchor}T12:00:00`).toLocaleDateString("en-US", { month: "long", year: "numeric" })
    : `${new Date(`${anchor}T12:00:00`).getFullYear()} • Full Year`;

  const shiftPeriod = (delta) => {
    const d = new Date(`${anchor}T12:00:00`);
    if (period === "day") d.setDate(d.getDate() + delta);
    if (period === "week") d.setDate(d.getDate() + delta * 7);
    if (period === "month") d.setMonth(d.getMonth() + delta);
    if (period === "year") d.setFullYear(d.getFullYear() + delta);
    setAnchor(new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10));
  };

  const handleExport = () => {
    const headers = ["Period", "Date", "Employees", "Actual Hours", "Scheduled Hours", "Overtime", "Actual Earning", "Expected Earning", "Earning Difference"];
    const lines = breakdown.map(b => [b.label, b.date || "", b.employees, b.hours.toFixed(2), b.scheduled.toFixed(2), b.ot.toFixed(2), b.earning.toFixed(2), b.expected.toFixed(2), Math.max(0, b.expected - b.earning).toFixed(2)]);
    const csv = [headers, ...lines].map(row => row.map(value => `"${String(value ?? "").replace(/"/g, '""')}"`).join(",")).join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `sodah-analytics-${range.start}-to-${range.end}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const maxTrendHours = Math.max(1, ...trendBuckets.flatMap(p => [p.hours || 0, p.scheduled || 0]));
  const maxTrendEarnings = Math.max(1, ...trendBuckets.flatMap(p => [p.earning || 0, p.expected || 0]));
  const maxEmployeeHours = Math.max(1, ...employeePerformance.map(p => p.hours || 0));
  const actualBarPct = scheduledHours > 0 ? Math.min(100, (actualHours / scheduledHours) * 100) : 0;
  const hoursAchievement = scheduledHours > 0 ? (actualHours / scheduledHours) * 100 : 0;
  const linePoints = (field, maxValue) => trendBuckets.map((point, index) => {
    const x = trendBuckets.length <= 1 ? 300 : 42 + (index * 516) / (trendBuckets.length - 1);
    const y = 164 - (Math.max(0, Number(point[field] || 0)) / maxValue) * 128;
    return { x, y, label: point.label };
  });
  const hoursActualPoints = linePoints("hours", maxTrendHours);
  const hoursScheduledPoints = linePoints("scheduled", maxTrendHours);
  const earningsActualPoints = linePoints("earning", maxTrendEarnings);
  const earningsExpectedPoints = linePoints("expected", maxTrendEarnings);
  const pointsString = points => points.map(point => `${point.x},${point.y}`).join(" ");
  const insightItems = periodRows.length ? [
    `${actualHours.toFixed(2)} actual working hours recorded against ${scheduledHours.toFixed(2)} scheduled hours${scheduledHours ? ` (${hoursAchievement.toFixed(1)}%)` : ""}.`,
    `${otHours.toFixed(2)} overtime hours recorded during this period.`,
    `Actual earnings: ${money(actualEarning, currency)}; expected earnings: ${money(expectedEarning, currency)}.`,
    earningCut > 0 ? `Earnings are ${money(earningCut, currency)} below expected.` : "Actual earnings meet or exceed expected earnings."
  ] : ["No timesheet data was found for this period and employee selection."];


  return <section className="ts-panel ts-analytics">
    <style>{`
.ts-analytics { padding: 16px !important; background:linear-gradient(180deg,#fbfdff,#f5f9ff) !important; }
.ts-analytics .ts-analytics-heading { display:flex;align-items:center;justify-content:space-between;gap:16px;margin:2px 0 18px;min-width:0; }
.ts-analytics .ts-analytics-heading-copy { display:flex;align-items:center;gap:12px;min-width:0; }
.ts-analytics .ts-analytics-heading-actions { display:flex;align-items:center;justify-content:flex-end;gap:8px;flex:0 0 auto;white-space:nowrap; }
.ts-analytics .ts-analytics-heading-actions > button { display:inline-flex;align-items:center;justify-content:center;gap:7px;height:44px;padding:0 15px;border:1px solid #cbd9eb;border-radius:10px;background:#fff;color:#14213d;font-weight:850;white-space:nowrap; }
.ts-analytics .ts-analytics-heading-actions > button:hover { background:#eff6ff;border-color:#93b4e5; }
.ts-analytics .ts-analytics-heading-icon { display:grid;place-items:center;width:48px;height:48px;border-radius:13px;background:linear-gradient(135deg,#2563eb,#7c3aed);color:white;box-shadow:0 5px 14px #2563eb30; }
.ts-analytics .ts-analytics-heading h2 { margin:0;color:#101b3b;font-size:24px;font-weight:900;letter-spacing:-.5px; }
.ts-analytics .ts-analytics-heading p { margin:3px 0 0;color:#64748b;font-size:13px; }
.ts-analytics .ts-analytics-live { margin-left:0;display:flex;align-items:center;gap:7px;padding:8px 11px;border:1px solid #b7ebce;border-radius:999px;background:#edfff4;color:#087443;font-size:11px;font-weight:850;white-space:nowrap; }
.ts-analytics .ts-analytics-live small { color:#4b8067;font-weight:650; }
.ts-analytics .ts-analytics-live-dot { display:inline-block;width:8px;height:8px;border-radius:50%;background:#08b45b;box-shadow:0 0 0 4px #08b45b20;animation:ts-live-pulse 1.7s ease-out infinite; }
.ts-analytics .ts-analytics-active-strip { display:flex;justify-content:space-between;align-items:center;gap:12px;padding:9px 13px;margin:-4px 0 13px;border:1px solid #ccebd9;border-radius:10px;background:linear-gradient(90deg,#effdf5,#f5fbff);color:#145b3a;font-size:11px; }
.ts-analytics .ts-analytics-active-strip > div { display:flex;align-items:center;gap:9px; }
.ts-analytics .ts-analytics-active-strip strong { font-size:12px;font-weight:900; }
.ts-analytics .ts-analytics-active-strip small { color:#55766a;font-weight:700; }
@keyframes ts-live-pulse { 0%{box-shadow:0 0 0 0 #08b45b45;} 100%{box-shadow:0 0 0 7px #08b45b00;} }

.ts-analytics .ts-analytics-toolbar { display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;align-items:center;margin-bottom:16px; }
.ts-analytics .ts-analytics-toolbar select,.ts-analytics .ts-analytics-toolbar input { width:100%;height:44px;min-width:0;border:1px solid #cbd9eb;border-radius:10px;background:#fff;padding:0 12px;color:#14213d;font-weight:700;box-shadow:0 1px 2px #0f172a08; }
.ts-analytics .ts-analytics-toolbar-actions { display:none; }
.ts-analytics .ts-analytics-toolbar button { display:inline-flex;align-items:center;justify-content:center;gap:7px;height:44px;padding:0 14px;border:1px solid #cbd9eb;border-radius:10px;background:#fff;color:#14213d;font-weight:800;white-space:nowrap; }
.ts-analytics .ts-analytics-toolbar button:hover { background:#eff6ff;border-color:#93b4e5; }

.ts-analytics .ts-analytics-period-title { display:flex;justify-content:space-between;align-items:center;gap:12px;padding:12px 16px;margin-bottom:14px;border:1px solid #cce9e8;border-radius:12px;background:linear-gradient(100deg,#eafaf5,#eff6ff);color:#14213d; }
.ts-analytics .ts-analytics-period-title strong { font-size:14px;font-weight:900; }
.ts-analytics .ts-analytics-period-title span { color:#475569;font-weight:800; }
.ts-analytics .ts-stat-grid { display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:9px;margin:0 0 14px; }
.ts-analytics .ts-stat { position:relative;display:grid;grid-template-columns:42px minmax(0,1fr);grid-template-rows:auto auto;align-items:center;column-gap:9px;min-width:0;min-height:82px;padding:11px;border:1px solid transparent;border-radius:12px;overflow:hidden;box-shadow:0 4px 12px #0f172a14;color:#fff !important; }
.ts-analytics .ts-stat::after { content:"";position:absolute;right:7px;bottom:6px;width:42px;height:32px;opacity:.2;background:repeating-linear-gradient(90deg,#fff 0 6px,transparent 6px 12px);clip-path:polygon(0 70%,15% 70%,15% 45%,30% 45%,30% 25%,45% 25%,45% 0,60% 0,60% 35%,75% 35%,75% 10%,90% 10%,90% 70%,100% 70%,100% 100%,0 100%);pointer-events:none; }
.ts-analytics .ts-stat .ts-stat-icon { grid-column:1;grid-row:1 / span 2;display:grid;place-items:center;width:40px;height:40px;border-radius:11px;background:#ffffff30;color:inherit !important; }
.ts-analytics .ts-stat span { grid-column:2;grid-row:1;font-size:11px;font-weight:800;line-height:1.25;color:inherit !important; }
.ts-analytics .ts-stat strong { grid-column:2;grid-row:2;margin-top:5px;font-size:clamp(14px,1.2vw,20px);line-height:1.12;font-weight:950;color:inherit !important;overflow-wrap:anywhere; }
.ts-analytics .ts-stat.metric-green {background:linear-gradient(135deg,#00c878,#009b55)!important;border-color:#00b96d!important;}
.ts-analytics .ts-stat.metric-blue {background:linear-gradient(135deg,#1598ff,#075eea)!important;border-color:#1685f6!important;}
.ts-analytics .ts-stat.metric-orange {background:linear-gradient(135deg,#ffb51b,#f57b00)!important;border-color:#f69a0a!important;}
.ts-analytics .ts-stat.metric-pink {background:linear-gradient(135deg,#ff55aa,#e60072)!important;border-color:#f03291!important;}
.ts-analytics .ts-stat.metric-purple {background:linear-gradient(135deg,#b44dff,#7621e8)!important;border-color:#9637f4!important;}
.ts-analytics .ts-stat.metric-yellow {background:linear-gradient(135deg,#ffe53c,#ffc000)!important;border-color:#f6c500!important;color:#14213d!important;}
.ts-analytics .ts-stat.metric-yellow .ts-stat-icon {background:#ffffff55;}

.ts-analytics .ts-trend-bars { display:flex;align-items:flex-end;gap:10px;min-height:195px;padding:8px 4px 0;overflow-x:auto; }
.ts-analytics .ts-trend-bar-col { flex:1;min-width:34px;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;gap:7px;height:190px; }
.ts-analytics .ts-trend-bar-col strong {font-size:10px;color:#334155;white-space:nowrap;}
.ts-analytics .ts-trend-bar-track {height:150px;width:100%;display:flex;align-items:flex-end;justify-content:center;background:linear-gradient(180deg,#f8fbff,#eef5ff);border-radius:7px 7px 3px 3px;overflow:hidden;}
.ts-analytics .ts-trend-bar-track span {display:block;width:min(28px,75%);background:linear-gradient(180deg,#29b6f6,#1769e8);border-radius:6px 6px 0 0;}
.ts-analytics .ts-trend-bar-col small {font-size:10px;color:#64748b;white-space:nowrap;}
.ts-analytics .ts-earnings-overview {display:grid;gap:18px;padding:12px 2px;}
.ts-analytics .ts-earnings-overview>div {display:grid;grid-template-columns:1fr auto;gap:8px;align-items:center;}
.ts-analytics .ts-earnings-overview span {font-size:12px;color:#64748b;font-weight:750;}
.ts-analytics .ts-earnings-overview strong {font-size:14px;color:#14213d;font-weight:900;}
.ts-analytics .ts-earnings-overview i {grid-column:1 / -1;height:9px;border-radius:99px;background:#e8eef6;overflow:hidden;}
.ts-analytics .ts-earnings-overview i b {display:block;height:100%;border-radius:99px;background:linear-gradient(90deg,#16c784,#0878ff);}

.ts-analytics .ts-analytics-charts {display:grid;grid-template-columns:1.35fr .95fr 1.05fr;gap:12px;margin-bottom:14px;}
.ts-analytics .ts-chart-card,.ts-analytics .ts-analytics-detail,.ts-analytics .ts-performance-card,.ts-analytics .ts-insights-card {min-width:0;border:1px solid #d5e2f2;border-radius:14px;background:#fff;box-shadow:0 3px 12px #0f172a08;overflow:hidden;}
.ts-analytics .ts-chart-card {padding:14px 16px;min-height:250px;}
.ts-analytics .ts-chart-legend{display:flex;gap:16px;align-items:center;flex-wrap:wrap;margin:-2px 0 2px;color:#334155;font-size:11px;font-weight:750;}
.ts-analytics .ts-chart-legend i,.ts-analytics .ts-legend-item>i{display:inline-block;width:10px;height:10px;border-radius:4px;margin-right:6px;vertical-align:middle;background:#0878f9;}
.ts-analytics .ts-chart-legend i.scheduled,.ts-analytics .ts-legend-item>i.scheduled{background:#91c7ff;}
.ts-analytics .ts-chart-legend i.earning{background:#8b35f4;}
.ts-analytics .ts-chart-legend i.expected{background:#d8a4ff;}
.ts-analytics .ts-legend-item>i.overtime{background:#a855f7;}
.ts-analytics .ts-chart-footnote{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-top:-2px;color:#64748b;font-size:11px;}
.ts-analytics .ts-chart-footnote strong{color:#14213d;font-size:14px;font-weight:950;}
.ts-analytics .ts-payroll-list{display:grid;gap:10px;margin-top:20px;}
.ts-analytics .ts-payroll-list>div{display:flex;justify-content:space-between;align-items:center;gap:8px;padding:13px 12px;border-radius:10px;color:#14213d;font-size:12px;font-weight:800;}
.ts-analytics .ts-payroll-list>div span{display:flex;align-items:center;gap:8px;}
.ts-analytics .ts-payroll-list>div strong{font-size:15px;font-weight:950;white-space:nowrap;}
.ts-analytics .ts-payroll-list .actual{background:#dcfce7;}
.ts-analytics .ts-payroll-list .actual svg{color:#0ba968;}
.ts-analytics .ts-payroll-list .scheduled{background:#e0f2fe;}
.ts-analytics .ts-payroll-list .scheduled svg{color:#1685f6;}
.ts-analytics .ts-payroll-list .difference{background:#fef3c7;}
.ts-analytics .ts-payroll-list .difference svg{color:#d97706;}
.ts-analytics .ts-payroll-foot{margin-top:15px;color:#64748b;font-size:10px;line-height:1.4;}
.ts-analytics .ts-earnings-card{min-width:0;}
.ts-analytics .ts-chart-title {margin-bottom:12px;color:#101b3b;font-size:15px;font-weight:950;}
.ts-analytics .ts-trend-svg {display:block;width:100%;height:180px;overflow:visible;}
.ts-analytics .ts-chart-axis {stroke:#dbe5f1;stroke-width:1;}
.ts-analytics .ts-chart-gridline {stroke:#e8eef6;stroke-width:1;stroke-dasharray:3 4;}
.ts-analytics .ts-chart-label {fill:#64748b;font-size:11px;font-weight:700;}
.ts-analytics .ts-chart-point-label {fill:#14213d;font-size:11px;font-weight:900;}
.ts-analytics .ts-donut-layout {display:flex;align-items:center;justify-content:center;gap:18px;min-height:180px;}
.ts-analytics .ts-donut {display:grid;place-items:center;width:150px;height:150px;flex:0 0 150px;border-radius:50%;position:relative;}
.ts-analytics .ts-donut::after {content:"";position:absolute;inset:19px;border-radius:50%;background:#fff;}
.ts-analytics .ts-donut-center {position:relative;z-index:1;text-align:center;color:#14213d;}
.ts-analytics .ts-donut-center strong {display:block;font-size:23px;font-weight:950;}
.ts-analytics .ts-donut-center span {font-size:11px;color:#64748b;font-weight:700;}
.ts-analytics .ts-legend {display:grid;gap:10px;min-width:110px;}
.ts-analytics .ts-legend-item {display:grid;grid-template-columns:10px 1fr;gap:8px;align-items:start;color:#14213d;font-size:12px;font-weight:800;}
.ts-analytics .ts-legend-dot {width:10px;height:10px;margin-top:3px;border-radius:50%;}
.ts-analytics .ts-legend-item small {display:block;color:#64748b;font-weight:650;margin-top:2px;}
.ts-analytics .ts-hours-summary {display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:4px 0 15px;}
.ts-analytics .ts-hours-pill {display:flex;align-items:center;gap:10px;padding:12px;border-radius:10px;background:#eff6ff;color:#14213d;}
.ts-analytics .ts-hours-pill:nth-child(2){background:#f4efff;}
.ts-analytics .ts-hours-pill svg{color:#2563eb;flex:0 0 auto;}
.ts-analytics .ts-hours-pill strong{display:block;font-size:16px;font-weight:950;}
.ts-analytics .ts-hours-pill span{display:block;font-size:11px;color:#64748b;font-weight:700;margin-top:2px;}
.ts-analytics .ts-hours-track {height:15px;border-radius:20px;background:#e8eef7;overflow:hidden;margin:10px 0 8px;}
.ts-analytics .ts-hours-track span {display:block;height:100%;border-radius:20px;background:linear-gradient(90deg,#0d75f5,#48a7ff);}
.ts-analytics .ts-hours-legend {display:flex;flex-wrap:wrap;gap:12px;color:#475569;font-size:11px;font-weight:750;}
.ts-analytics .ts-hours-legend i {display:inline-block;width:9px;height:9px;border-radius:3px;margin-right:5px;}
.ts-analytics .ts-analytics-lower {display:grid;grid-template-columns:minmax(0,1.35fr) minmax(210px,.95fr) minmax(230px,.95fr);gap:12px;}
.ts-analytics .ts-performance-card,.ts-analytics .ts-insights-card {padding:14px;}
.ts-analytics .ts-lower-title {display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:12px;color:#101b3b;font-size:15px;font-weight:950;}
.ts-analytics .ts-lower-title span {font-size:11px;color:#2563eb;font-weight:800;}
.ts-analytics .ts-analytics-table-wrap {width:100%;overflow:auto;border:1px solid #dce6f2;border-radius:9px;}
.ts-analytics .ts-analytics-table-wrap table {width:100%;min-width:700px;border-collapse:collapse;font-size:11px;}
.ts-analytics .ts-analytics-table-wrap th {padding:10px 9px;text-align:left;background:#eaf2ff;color:#172554;font-size:10px;font-weight:900;white-space:nowrap;border-bottom:1px solid #cbd9eb;}
.ts-analytics .ts-analytics-table-wrap td {padding:9px;background:#fff;color:#24324b;border-bottom:1px solid #e8eef6;white-space:nowrap;}
.ts-analytics .ts-analytics-table-wrap tr:last-child td {border-bottom:0;}
.ts-analytics .ts-analytics-table-wrap tfoot td {background:#e1faeb;color:#087443;font-weight:950;border-top:2px solid #31c879;}
.ts-analytics .ts-performer-list {display:grid;gap:11px;}
.ts-analytics .ts-performer {display:grid;grid-template-columns:32px minmax(0,1fr) auto;gap:8px;align-items:center;}
.ts-analytics .ts-performer-avatar {display:grid;place-items:center;width:30px;height:30px;border-radius:50%;background:linear-gradient(135deg,#c084fc,#7c3aed);color:white;font-weight:900;font-size:12px;}
.ts-analytics .ts-performer-name {font-size:12px;color:#14213d;font-weight:900;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.ts-analytics .ts-performer-track {height:7px;margin-top:5px;background:#e8eef6;border-radius:20px;overflow:hidden;}
.ts-analytics .ts-performer-track span {display:block;height:100%;border-radius:20px;background:linear-gradient(90deg,#00a85a,#22c55e);}
.ts-analytics .ts-performer-rate {font-size:12px;color:#14213d;font-weight:950;}
.ts-analytics .ts-insights-card {background:linear-gradient(150deg,#fff,#f7f1ff);border-color:#dfd0ff;}
.ts-analytics .ts-insight-list {display:grid;gap:12px;}
.ts-analytics .ts-insight {display:grid;grid-template-columns:19px 1fr;gap:8px;align-items:start;color:#26334a;font-size:12px;line-height:1.45;font-weight:650;}
.ts-analytics .ts-insight svg {color:#0ba968;margin-top:1px;}
.ts-analytics .ts-empty {padding:26px 12px;text-align:center;color:#64748b;font-size:12px;}
@media(max-width:1250px){.ts-analytics .ts-stat-grid{grid-template-columns:repeat(4,minmax(0,1fr));}.ts-analytics .ts-analytics-charts{grid-template-columns:1fr 1fr;}.ts-analytics .ts-chart-card:last-child{grid-column:1/-1;}.ts-analytics .ts-analytics-lower{grid-template-columns:1fr 1fr;}.ts-analytics .ts-performance-card{grid-column:1/-1;}}
/* Desktop KPI strip: all seven metric tiles stay on one straight row. */
/* Match the approved reference: all seven KPI tiles stay in one horizontal row on desktop/tablet. */
@media(min-width:761px){
  .ts-analytics .ts-stat-grid{
    display:grid !important;
    grid-template-columns:repeat(7,minmax(0,1fr)) !important;
    grid-auto-flow:column !important;
    grid-auto-columns:minmax(0,1fr) !important;
    width:100% !important;
    min-width:0 !important;
  }
  .ts-analytics .ts-stat-grid > .ts-stat{
    width:100% !important;
    min-width:0 !important;
    max-width:none !important;
  }
}
@media(max-width:760px){.ts-analytics .ts-analytics-heading{align-items:flex-start;flex-direction:column;}.ts-analytics .ts-analytics-heading-actions{width:100%;flex-wrap:wrap;justify-content:flex-start;}.ts-analytics .ts-analytics-live{margin:0;}.ts-analytics .ts-analytics-toolbar{grid-template-columns:1fr 1fr;}.ts-analytics .ts-stat-grid{grid-template-columns:repeat(2,minmax(0,1fr));}.ts-analytics .ts-analytics-charts,.ts-analytics .ts-analytics-lower{grid-template-columns:1fr;}.ts-analytics .ts-chart-card:last-child,.ts-analytics .ts-performance-card{grid-column:auto;}.ts-analytics .ts-analytics-heading h2{font-size:20px;}}
@media print {
  body * { visibility:hidden !important; }
  .ts-analytics, .ts-analytics * { visibility:visible !important; }
  .ts-analytics { position:absolute !important;left:0 !important;top:0 !important;width:100% !important;padding:0 !important;margin:0 !important;border:0 !important;box-shadow:none !important;background:#fff !important; }
  .ts-analytics .ts-analytics-toolbar-actions,.ts-analytics .ts-panel-close {display:none !important;}
  .ts-analytics .ts-analytics-table-wrap {overflow:visible !important;}
  .ts-analytics .ts-analytics-table-wrap table {min-width:0 !important;font-size:8px !important;}
  .ts-analytics .ts-analytics-table-wrap th,.ts-analytics .ts-analytics-table-wrap td {padding:5px !important;}
}
`}</style>

    <div className="ts-analytics-heading">
      <div className="ts-analytics-heading-copy">
        <div className="ts-analytics-heading-icon"><Activity size={27}/></div>
        <div><h2>Analytics Dashboard</h2><p>Business performance, working hours and payroll overview</p></div>
      </div>
      <div className="ts-analytics-heading-actions">
        <div className="ts-analytics-live" role="status" aria-live="polite">
          <span className="ts-analytics-live-dot" />
          <strong>LIVE</strong>
          <span>{liveActiveRows.length} active now</span>
          <small>Updated {liveUpdatedAt}</small>
        </div>
        <button type="button" onClick={() => setRefreshKey(v => v + 1)}><RefreshCw size={16}/> Refresh</button>
        <button type="button" onClick={handleExport}><Download size={16}/> Export <ChevronRight size={14}/></button>
        <button type="button" onClick={() => window.print()}><Printer size={16}/> Print</button>
        <button className="ts-panel-close" onClick={onClose} aria-label="Close analytics"><X size={18}/></button>
      </div>
    </div>

    <div className="ts-analytics-toolbar">
      <select value={period} onChange={e => setPeriod(e.target.value)} aria-label="Analytics period">
        <option value="day">Daily</option>
        <option value="week">Weekly • Sunday–Saturday</option>
        <option value="month">Monthly</option>
        <option value="year">Yearly</option>
      </select>
      <select value={employee} onChange={e => setEmployee(e.target.value)} aria-label="Filter employee">
        <option value="all">All employees</option>
        {employeeOptions.map(e => <option key={e.key} value={e.key}>{e.name}{e.employeeId && e.employeeId !== "—" ? ` • ${e.employeeId}` : ""}</option>)}
      </select>
      {period === "month" ? (
        <input type="month" value={anchor.slice(0, 7)} onChange={e => e.target.value && setAnchor(`${e.target.value}-01`)} aria-label="Select month"/>
      ) : period === "year" ? (
        <input type="number" min="2000" max="2100" value={Number(anchor.slice(0, 4))} onChange={e => { if (e.target.value.length === 4) setAnchor(`${e.target.value}-01-01`); }} aria-label="Select year"/>
      ) : (
        <input type="date" value={anchor} onChange={e => e.target.value && setAnchor(e.target.value)} aria-label="Select date"/>
      )}
    </div>

    <div className="ts-stat-grid">
      <Stat color="metric-green" icon={Users} label="Employees" value={periodEmployees}/>
      <Stat color="metric-blue" icon={Clock3} label="Actual Hours" value={`${actualHours.toFixed(2)} H`}/>
      <Stat color="metric-orange" icon={CalendarDays} label="Scheduled Hours" value={`${scheduledHours.toFixed(2)} H`}/>
      <Stat color="metric-pink" icon={TimerReset} label="Overtime (O.T)" value={`${otHours.toFixed(2)} H`}/>
      <Stat color="metric-purple" icon={DollarSign} label="Actual Earnings" value={money(actualEarning, currency)}/>
      <Stat color="metric-yellow" icon={CircleDollarSign} label="Expected Payroll" value={money(expectedEarning, currency)}/>
      <Stat color="metric-blue" icon={DollarSign} label="Earnings Difference" value={money(earningCut, currency)}/>
    </div>

    <div className="ts-analytics-charts">
      <div className="ts-chart-card">
        <div className="ts-chart-title">Working Hours Trend</div>
        {trendBuckets.length ? <>
          <div className="ts-chart-legend"><span><i className="actual"/>Actual hours</span><span><i className="scheduled"/>Scheduled hours</span></div>
          <svg className="ts-trend-svg" viewBox="0 0 600 210" role="img" aria-label="Actual and scheduled working hours trend">
            {[36,68,100,132,164].map(y=><line key={y} x1="42" x2="570" y1={y} y2={y} className="ts-chart-gridline"/>)}
            <line x1="42" x2="570" y1="164" y2="164" className="ts-chart-axis"/>
            <polyline points={pointsString(hoursScheduledPoints)} fill="none" stroke="#91c7ff" strokeWidth="3" strokeDasharray="7 6" strokeLinecap="round" strokeLinejoin="round"/>
            <polyline points={pointsString(hoursActualPoints)} fill="none" stroke="#0878f9" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
            {hoursActualPoints.map((point,i)=><circle key={i} cx={point.x} cy={point.y} r="5" fill="#fff" stroke="#0878f9" strokeWidth="3"/>)}
            {trendBuckets.map((point,i)=>{const x=trendBuckets.length<=1?300:42+(i*516)/(trendBuckets.length-1);return <text key={`${point.label}-${i}`} x={x} y="190" textAnchor="middle" className="ts-chart-label">{point.label}</text>;})}
          </svg>
          <div className="ts-chart-footnote"><strong>{actualHours.toFixed(2)} H</strong><span>Actual hours in selected period</span></div>
        </> : <div className="ts-empty">No working-hour data for this period.</div>}
      </div>

      <div className="ts-chart-card">
        <div className="ts-chart-title">Hours Performance</div>
        <div className="ts-donut-layout">
          <div className="ts-donut" style={{background:`conic-gradient(#0878f9 0 ${Math.max(0,Math.min(100,hoursAchievement))}%,#e8eef7 ${Math.max(0,Math.min(100,hoursAchievement))}% 100%)`}}>
            <div className="ts-donut-center"><strong>{scheduledHours ? `${hoursAchievement.toFixed(0)}%` : "—"}</strong><span>Hours<br/>Utilization</span></div>
          </div>
          <div className="ts-legend">
            <div className="ts-legend-item"><i className="actual"/><div>Actual Hours<small>{actualHours.toFixed(2)} H</small></div></div>
            <div className="ts-legend-item"><i className="scheduled"/><div>Scheduled Hours<small>{scheduledHours.toFixed(2)} H</small></div></div>
            <div className="ts-legend-item"><i className="overtime"/><div>Overtime<small>{otHours.toFixed(2)} H</small></div></div>
          </div>
        </div>
      </div>

      <div className="ts-chart-card">
        <div className="ts-chart-title">Payroll Overview</div>
        <div className="ts-payroll-list">
          <div className="actual"><span><CheckCircle2 size={17}/>Actual Earnings</span><strong>{money(actualEarning,currency)}</strong></div>
          <div className="scheduled"><span><CheckCircle2 size={17}/>Expected Payroll</span><strong>{money(expectedEarning,currency)}</strong></div>
          <div className="difference"><span><CircleDollarSign size={17}/>Earnings Difference</span><strong>{money(earningCut,currency)}</strong></div>
        </div>
        <div className="ts-payroll-foot">Calculated from the selected timesheet records and current pay settings.</div>
      </div>
    </div>

    <div className="ts-analytics-lower">
      <div className="ts-performance-card ts-earnings-card">
        <div className="ts-lower-title"><span style={{color:"#14213d"}}>Earnings Trend</span><span>{range.start} – {range.end}</span></div>
        {trendBuckets.length ? <>
          <div className="ts-chart-legend"><span><i className="earning"/>Actual earning</span><span><i className="expected"/>Expected earning</span></div>
          <svg className="ts-trend-svg" viewBox="0 0 600 210" role="img" aria-label="Actual and expected earnings trend">
            {[36,68,100,132,164].map(y=><line key={y} x1="42" x2="570" y1={y} y2={y} className="ts-chart-gridline"/>)}
            <line x1="42" x2="570" y1="164" y2="164" className="ts-chart-axis"/>
            <polyline points={pointsString(earningsExpectedPoints)} fill="none" stroke="#d8a4ff" strokeWidth="3" strokeDasharray="7 6" strokeLinecap="round" strokeLinejoin="round"/>
            <polyline points={pointsString(earningsActualPoints)} fill="none" stroke="#8b35f4" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
            {earningsActualPoints.map((point,i)=><circle key={i} cx={point.x} cy={point.y} r="5" fill="#fff" stroke="#8b35f4" strokeWidth="3"/>)}
            {trendBuckets.map((point,i)=>{const x=trendBuckets.length<=1?300:42+(i*516)/(trendBuckets.length-1);return <text key={`${point.label}-${i}`} x={x} y="190" textAnchor="middle" className="ts-chart-label">{point.label}</text>;})}
          </svg>
          <div className="ts-chart-footnote"><strong>{money(actualEarning,currency)}</strong><span>Actual earnings in selected period</span></div>
        </> : <div className="ts-empty">No earnings data for this period.</div>}
      </div>

      <div className="ts-performance-card">
        <div className="ts-lower-title"><span style={{color:"#14213d"}}><Trophy size={17} style={{verticalAlign:"middle",color:"#0ba968",marginRight:6}}/>Top Performers</span><span>Working hours</span></div>
        {employeePerformance.length ? <div className="ts-performer-list">{employeePerformance.map((person, i) => <div className="ts-performer" key={person.key}>
          <div className="ts-performer-avatar" style={{background:i===0?"linear-gradient(135deg,#fbbf24,#f59e0b)":undefined}}>{person.name.slice(0,1).toUpperCase()}</div>
          <div><div className="ts-performer-name">{person.name}</div><div className="ts-performer-track"><span style={{width:`${Math.max(0,Math.min(100,maxEmployeeHours?person.hours/maxEmployeeHours*100:0))}%`}}/></div></div>
          <div className="ts-performer-rate">{person.hours.toFixed(2)} H</div>
        </div>)}</div> : <div className="ts-empty">No employee performance data for this period.</div>}
      </div>

      <div className="ts-insights-card">
        <div className="ts-lower-title"><span style={{color:"#14213d"}}><Sparkles size={17} style={{verticalAlign:"middle",color:"#9333ea",marginRight:6}}/>Performance Insights</span></div>
        <div className="ts-insight-list">{insightItems.map((item, i) => <div className="ts-insight" key={i}><CheckCircle2 size={17}/><span>{item}</span></div>)}
          <div className="ts-insight"><CheckCircle2 size={17}/><span>{liveActiveRows.length} employee{liveActiveRows.length===1?" is":"s are"} currently clocked in, with {liveActiveHours.toFixed(2)} live working hours.</span></div>
          {employeePerformance[0] && <div className="ts-insight"><CheckCircle2 size={17}/><span>Top performer: {employeePerformance[0].name} ({employeePerformance[0].hours.toFixed(2)} H).</span></div>}
        </div>
      </div>
    </div>
  </section>;
}
return { AnalyticsPanel };
})();
export { AnalyticsPanel };
