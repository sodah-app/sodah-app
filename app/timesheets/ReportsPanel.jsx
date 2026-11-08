"use client";
import React from "react";
import { createPortal } from "react-dom";
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, CalendarDays, CircleDollarSign, Clock3, DollarSign, Download, Plus, Printer, Search, Share2, Sparkles, TimerReset, Users, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { hrs, money, todayISO } from "@/lib/time";

const { ReportsPanel } = (() => {
const WEEK = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const REPORT_MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const MAX_SHEETS = 20;
const MAX_ROWS = 50;
const ROW_GROWTH = 10;
const MAX_COLUMNS = 30;
const DEFAULT_CUSTOM_COLUMNS = [];

function nextDutyDate(iso) {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + 1);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

function blankRow(settings, i = 0) {
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

function newSheet(number, settings) {
  return {
    id: `sheet-${Date.now()}-${number}-${Math.random().toString(36).slice(2)}`,
    name: `Sheet ${number}`,
    columns: [...DEFAULT_CUSTOM_COLUMNS],
    rows: Array.from({ length: 10 }, (_, i) => blankRow(settings, i))
  };
}

function normalizeSheet(source, settings, index = 0) {
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
  return { ...safe, id: safe.id || `sheet-${Date.now()}-${index}`, name: safe.name || `Sheet ${index + 1}`, columns, rows };
}

function localTime() {
  const d = new Date();
  return d.toTimeString().slice(0,5);
}

function dayName(iso) {
  return WEEK[new Date(`${iso}T12:00:00`).getDay()];
}

function minutesSince(a, b) {
  if (!a || !b) return 0;
  const [ah, am] = a.split(":").map(Number);
  const [bh, bm] = b.split(":").map(Number);
  let x = ah * 60 + am, y = bh * 60 + bm;
  if (y < x) y += 1440;
  return y - x;
}

function workedFor(row, settings) {
  if (row.status !== "Present") return 0;
  if (settings.mode === "manual") return Number(row.hours || 0);
  return hrs(row.checkIn, row.checkOut);
}

function actualWorkedFor(row) {
  if (row.status !== "Present") return 0;
  const accumulated = Number(row.workedHours || 0);
  if (!row.checkIn) return accumulated;
  return accumulated + hrs(row.checkIn, row.checkOut || localTime());
}

function earningFor(row, settings) {
  if (!row.name && !row.employeeId) return 0;
  if (row.status === "Off-day") return Number(settings.offDayEarning || 0);
  if (row.status === "Absent") return Number(settings.absentEarning || 0);
  const actualHours = actualWorkedFor(row);
  return actualHours * Number(settings.defaultHourlyRate || 0)
    + Number(row.ot || 0) * Number(settings.otRate || 0);
}

function expectedEarningFor(row, settings) {
  if (row.status === "Off-day") return Number(settings.offDayEarning || 0);
  if (row.status === "Absent") return Number(settings.absentEarning || 0);
  return Number(row.hours || settings.defaultHours || 0) * Number(settings.defaultHourlyRate || 0)
    + Number(row.ot || 0) * Number(settings.otRate || 0);
}

function shiftEndFromStart(start, hours) {
  const [h, m] = String(start || "08:00").split(":").map(Number);
  const total = ((h || 0) * 60 + (m || 0) + Number(hours || 0) * 60) % 1440;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
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
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-01`;
}

function monthEndISO(iso) {
  const d = new Date(`${iso}T12:00:00`);
  d.setMonth(d.getMonth() + 1, 0);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0,10);
}

function hourShortFor(row, settings) {
  if (row.status !== "Present") return 0;
  if (settings.mode !== "automatic") return 0;
  return Math.max(0, Number(row.hours || 0) - workedFor(row, settings));
}

function createEquipmentRow(i = 0) {
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

function normalizeEquipmentSheet(source, index = 0) {
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




const REPORT_PREMIUM_CSS = `
.ts-report-panel{width:100%;background:#fff;border:2px solid #dbe7f3;border-radius:20px;overflow:visible;box-shadow:0 14px 34px rgba(15,23,42,.08);color:#10213f}
.ts-report-hero{position:relative;min-height:142px;margin:14px 14px 12px;padding:24px 28px;display:flex;align-items:center;overflow:hidden;border-radius:18px;background:linear-gradient(90deg,rgba(239,247,255,.99) 0%,rgba(239,247,255,.94) 42%,rgba(239,247,255,.12) 78%),url("https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=1500&q=85") center 38%/cover no-repeat}
.ts-report-hero-copy{position:relative;z-index:1;max-width:650px}
.ts-report-hero h2{margin:0;color:#0b1736;font-size:clamp(22px,2.3vw,34px);line-height:1.12;font-weight:900;letter-spacing:-.03em}
.ts-report-hero p{margin:8px 0 0;color:#4c6288;font-size:15px;font-weight:500}
.ts-report-hero-note{margin-left:auto;position:relative;z-index:1;max-width:240px;padding:15px 18px;border-radius:16px;background:rgba(209,250,229,.94);color:#123b34;font-size:13px;line-height:1.45;font-weight:700;box-shadow:0 8px 24px rgba(15,23,42,.08)}
.ts-report-panel .ts-panel-header{min-height:82px;padding:20px 24px;display:flex;align-items:center;justify-content:space-between;background:linear-gradient(135deg,#fff,#f1f5f9 60%,#ecfdf5);border-bottom:2px solid #cbd5e1}
.ts-report-panel .ts-panel-header h2{margin:0;color:#0f172a;font-size:21px;font-weight:850}
.ts-report-panel .ts-panel-header p{margin:5px 0 0;color:#475569;font-size:12px}
.ts-report-panel .ts-panel-header button{width:38px;height:38px;border:2px solid #cbd5e1;border-radius:10px;background:#fff;color:#334155}
.ts-report-toolbar{display:grid!important;grid-template-columns:1fr 1fr 180px;gap:10px;padding:16px 20px!important;background:#f8fafc;border-bottom:2px solid #cbd5e1!important}
.ts-report-toolbar select,.ts-report-toolbar input{height:42px!important;border:2px solid #94a3b8!important;border-radius:9px!important;background:#fff!important;color:#0f172a!important;font-weight:700!important;padding:0 11px!important}
.ts-report-toolbar select:focus,.ts-report-toolbar input:focus{border-color:#2563eb!important;box-shadow:0 0 0 3px rgba(37,99,235,.12)}
.ts-report-head{display:grid!important;grid-template-columns:1fr 1fr 2fr;gap:12px;padding:14px 20px!important;background:#fff}
.ts-report-head>div{min-height:58px;padding:11px 14px;border:2px solid #cbd5e1!important;border-radius:10px;background:#f8fafc}
.ts-report-head span{display:block;margin-bottom:5px;color:#64748b!important;font-size:10px!important;font-weight:850!important;text-transform:uppercase}
.ts-report-head strong{color:#0f172a!important;font-size:13px!important;font-weight:850!important}
.ts-report-metrics{display:flex!important;flex-wrap:nowrap!important;gap:8px;padding:0 12px 16px!important;background:#fff;overflow-x:auto;overflow-y:hidden;scrollbar-width:thin;scrollbar-color:#93c5fd #eff6ff;overscroll-behavior-x:contain}
.ts-report-metrics::-webkit-scrollbar,.ts-report-actions::-webkit-scrollbar{height:8px}
.ts-report-metrics::-webkit-scrollbar-thumb,.ts-report-actions::-webkit-scrollbar-thumb{background:#93c5fd;border-radius:999px}
.ts-report-metrics::-webkit-scrollbar-track,.ts-report-actions::-webkit-scrollbar-track{background:#eff6ff;border-radius:999px}
.ts-report-metric{position:relative;flex:1 0 190px;min-width:190px;min-height:112px;padding:16px!important;display:grid;grid-template-columns:42px minmax(0,1fr);grid-template-rows:auto auto;align-content:center;align-items:center;column-gap:10px;row-gap:8px;border:0!important;border-radius:14px!important;color:#fff!important;box-shadow:0 7px 15px rgba(15,23,42,.13)!important;overflow:hidden}
.ts-report-metric:after{content:"";position:absolute;right:12px;bottom:8px;width:46px;height:35px;opacity:.24;background:linear-gradient(to top,rgba(255,255,255,.9) 0 35%,transparent 35% 42%,rgba(255,255,255,.9) 42% 62%,transparent 62% 69%,rgba(255,255,255,.9) 69% 100%);clip-path:polygon(0 100%,0 65%,20% 65%,20% 100%,30% 100%,30% 40%,50% 40%,50% 100%,60% 100%,60% 10%,80% 10%,80% 100%,100% 100%)}
.ts-report-metric:nth-child(1){background:linear-gradient(120deg,#00bd70,#00a95f)!important}
.ts-report-metric:nth-child(2){background:linear-gradient(120deg,#168bff,#0862ed)!important}
.ts-report-metric:nth-child(3){background:linear-gradient(120deg,#ffb300,#ff9200)!important}
.ts-report-metric:nth-child(4){background:linear-gradient(120deg,#ff2e9a,#ed1680)!important}
.ts-report-metric:nth-child(5){background:linear-gradient(120deg,#a020ff,#6f1bfa)!important}
.ts-report-metric:nth-child(6){background:linear-gradient(120deg,#12b8f5,#078fdf)!important}
.ts-report-metric:nth-child(7){background:linear-gradient(120deg,#ff536b,#f12d50)!important}
.ts-report-metric svg{grid-column:1;grid-row:1 / span 2;width:42px;height:42px;padding:10px;border-radius:50%;background:rgba(255,255,255,.18);color:#fff!important;box-sizing:border-box}
.ts-report-metric span{grid-column:2;grid-row:1;color:#fff!important;font-size:12px!important;font-weight:800!important}
.ts-report-metric strong{grid-column:2;grid-row:2;color:#fff!important;font-size:22px!important;font-weight:900!important;white-space:nowrap}
.ts-report-metric:nth-child(1){border-color:#60a5fa!important;background:linear-gradient(135deg,#eff6ff,#fff)!important}
.ts-report-metric:nth-child(2){border-color:#4ade80!important;background:linear-gradient(135deg,#f0fdf4,#fff)!important}
.ts-report-metric:nth-child(3){border-color:#fbbf24!important;background:linear-gradient(135deg,#fffbeb,#fff)!important}
.ts-report-metric:nth-child(4){border-color:#fb923c!important;background:linear-gradient(135deg,#fff7ed,#fff)!important}
.ts-report-metric:nth-child(5){border-color:#a78bfa!important;background:linear-gradient(135deg,#f5f3ff,#fff)!important}
.ts-report-metric:nth-child(6){border-color:#22d3ee!important;background:linear-gradient(135deg,#ecfeff,#fff)!important}
.ts-report-metric:nth-child(7){border-color:#fb7185!important;background:linear-gradient(135deg,#fff1f2,#fff)!important}
.ts-report-metric span{color:#475569!important;font-size:10px!important;font-weight:800!important}
.ts-report-metric strong{color:#0f172a!important;font-size:20px!important;font-weight:850!important}
.ts-report-metric svg{color:#2563eb}.ts-report-metric:nth-child(2) svg{color:#16a34a}.ts-report-metric:nth-child(3) svg{color:#d97706}.ts-report-metric:nth-child(4) svg{color:#ea580c}.ts-report-metric:nth-child(5) svg{color:#7c3aed}.ts-report-metric:nth-child(6) svg{color:#0891b2}.ts-report-metric:nth-child(7) svg{color:#e11d48}
.ts-report-actions{position:sticky;top:0;z-index:30;display:flex!important;flex-wrap:nowrap!important;align-items:center;gap:9px!important;padding:12px 20px 14px!important;background:rgba(255,255,255,.97);backdrop-filter:blur(12px);border-bottom:2px solid #d4e1f0!important;overflow-x:auto;overflow-y:hidden;white-space:nowrap;scrollbar-width:thin;scrollbar-color:#93c5fd #eff6ff;overscroll-behavior-x:contain}
.ts-report-actions button{flex:0 0 auto;min-height:44px!important;padding:0 16px!important;display:inline-flex!important;align-items:center;justify-content:center;gap:8px;border:2px solid #cbd5e1!important;border-radius:10px!important;background:#fff!important;color:#1e293b!important;font-size:12px!important;font-weight:850!important;cursor:pointer;white-space:nowrap}
.ts-report-actions button:first-child{color:#fff!important;background:#2563eb!important;border-color:#2563eb!important}
.ts-report-actions button:nth-child(2){color:#075985!important;background:#e0f2fe!important;border-color:#7dd3fc!important}
.ts-report-actions button:nth-child(3){background:#f1f5f9!important}
.ts-report-actions button:nth-child(4){color:#047857!important;background:#ecfdf5!important;border-color:#6ee7b7!important}
.ts-report-actions button:nth-child(5){color:#9a3412!important;background:#fff7ed!important;border-color:#fdba74!important}
.ts-report-actions button.ai{color:#fff!important;background:linear-gradient(135deg,#059669,#16a34a)!important;border-color:#059669!important}
.ts-report-actions button:last-child{color:#3730a3!important;background:#eef2ff!important;border-color:#a5b4fc!important}
.ts-detail-box{margin:18px 20px 20px!important;padding:0!important;background:#fff!important;border:2px solid #94a3b8!important;border-radius:14px!important;overflow:hidden;box-shadow:0 5px 16px rgba(15,23,42,.06)}
.ts-week-report-title{min-height:68px;padding:15px 17px;display:flex;align-items:center;justify-content:space-between;background:linear-gradient(135deg,#f8fafc,#eff6ff);border-bottom:2px solid #94a3b8}
.ts-week-report-title h3{margin:0;color:#0f172a;font-size:14px;font-weight:850}.ts-week-report-title p{margin:4px 0 0;color:#64748b;font-size:10px}
.ts-week-report-title>strong{padding:7px 10px;border-radius:999px;color:#1d4ed8;background:#dbeafe;border:1px solid #93c5fd;font-size:10px}
.ts-week-summary-table-wrap{padding:14px;overflow-x:auto}
.ts-week-summary-table,.ts-week-record table,.ts-detail-box>table{width:100%;border-collapse:separate!important;border-spacing:0!important;border:2px solid #64748b!important;min-width:760px}
.ts-week-summary-table th,.ts-week-record table th,.ts-detail-box>table th{height:43px;padding:0 12px!important;background:#dbeafe!important;color:#172033!important;border-right:1px solid #94a3b8!important;border-bottom:2px solid #64748b!important;font-size:9px!important;font-weight:850!important;text-align:left;text-transform:uppercase}
.ts-week-summary-table td,.ts-week-record table td,.ts-detail-box>table td{height:46px;padding:0 12px!important;background:#fff!important;color:#1e293b!important;border-right:1px solid #cbd5e1!important;border-bottom:1px solid #cbd5e1!important;font-size:11px!important;font-weight:600!important}
.ts-week-summary-table tbody tr:hover td,.ts-week-record table tbody tr:hover td,.ts-detail-box>table tbody tr:hover td{background:#f8fafc!important}
.ts-week-summary-table tfoot th,.ts-week-record table tfoot th{background:#dcfce7!important;color:#166534!important;border-top:2px solid #4ade80!important}
.ts-week-summary-table .empty{height:100px!important;text-align:center!important;color:#64748b!important}
.ts-week-record{margin:14px;border:2px solid #cbd5e1;border-radius:12px;overflow:hidden}
.ts-week-record-head{display:grid;grid-template-columns:2fr 1fr 1fr 1.3fr;background:#f8fafc;border-bottom:2px solid #cbd5e1}
.ts-week-record-head>div{min-height:66px;padding:12px 14px;border-right:1px solid #cbd5e1}.ts-week-record-head>div:last-child{border-right:0}
.ts-week-record-head strong{display:block;color:#0f172a;font-size:13px;font-weight:850}.ts-week-record-head span{display:block;margin-top:4px;color:#64748b;font-size:9px}
.ts-report-collapsed{margin:18px 20px;padding:26px;text-align:center;color:#64748b;border:2px dashed #94a3b8;border-radius:12px;background:#f8fafc}
.ts-detail-box>h3{margin:0;padding:17px 18px;color:#0f172a;background:linear-gradient(135deg,#f8fafc,#eff6ff);border-bottom:2px solid #94a3b8;font-size:14px;font-weight:850}
.ts-detail-box>textarea{width:calc(100% - 28px);min-height:100px;margin:14px;padding:12px;border:2px solid #cbd5e1!important;border-radius:10px;background:#fff;outline:none}
@media(max-width:900px){.ts-report-head{grid-template-columns:1fr 1fr!important}.ts-week-record-head{grid-template-columns:1fr 1fr}.ts-report-hero{min-height:125px;padding:20px}.ts-report-hero-note{display:none}}
@media(max-width:650px){.ts-report-toolbar{grid-template-columns:1fr!important}.ts-report-head{grid-template-columns:1fr!important}.ts-report-actions{display:flex!important;flex-wrap:nowrap!important}.ts-report-metric{flex-basis:170px;min-width:170px;min-height:100px}.ts-report-hero{margin:8px;min-height:125px;padding:18px;background-position:60% center}.ts-report-hero h2{font-size:24px}.ts-report-hero p{max-width:260px;font-size:12px}.ts-week-record-head{grid-template-columns:1fr}}

/* Single-line report metrics and actions: no wrapping on desktop. */
.ts-report-panel .ts-report-metrics{
  display:grid!important;
  grid-template-columns:repeat(7,minmax(0,1fr))!important;
  gap:8px!important;
  width:100%!important;
  box-sizing:border-box!important;
  overflow:visible!important;
  padding:0 14px 16px!important;
}
.ts-report-panel .ts-report-metrics>.ts-report-metric{
  min-width:0!important;
  width:100%!important;
  flex:none!important;
  box-sizing:border-box!important;
  padding:12px 9px!important;
  grid-template-columns:30px minmax(0,1fr)!important;
  column-gap:7px!important;
}
.ts-report-panel .ts-report-metrics>.ts-report-metric svg{
  width:30px!important;height:30px!important;padding:7px!important;
}
.ts-report-panel .ts-report-metrics>.ts-report-metric span{
  font-size:9px!important;white-space:normal!important;line-height:1.2!important;
}
.ts-report-panel .ts-report-metrics>.ts-report-metric strong{
  font-size:clamp(11px,1.15vw,16px)!important;white-space:nowrap!important;
}
.ts-report-panel .ts-report-actions{
  display:grid!important;
  grid-template-columns:repeat(7,minmax(0,1fr))!important;
  flex-wrap:nowrap!important;
  gap:8px!important;
  width:100%!important;
  box-sizing:border-box!important;
  overflow:visible!important;
  padding:12px 16px 14px!important;
}
.ts-report-panel .ts-report-actions>button{
  width:100%!important;
  min-width:0!important;
  flex:none!important;
  padding:0 7px!important;
  gap:5px!important;
  font-size:clamp(9px,.85vw,11px)!important;
  white-space:nowrap!important;
}
.ts-report-panel .ts-report-actions>button svg{
  width:15px!important;height:15px!important;flex:0 0 15px!important;
}
@media(max-width:900px){
  .ts-report-panel .ts-report-metrics{
    display:flex!important;flex-wrap:nowrap!important;overflow-x:auto!important;
  }
  .ts-report-panel .ts-report-metrics>.ts-report-metric{
    flex:0 0 160px!important;min-width:160px!important;
  }
  .ts-report-panel .ts-report-actions{
    display:flex!important;flex-wrap:nowrap!important;overflow-x:auto!important;
  }
  .ts-report-panel .ts-report-actions>button{
    flex:0 0 auto!important;width:auto!important;padding:0 12px!important;font-size:11px!important;
  }
}

/* Print only the selected report sheet/table, never the surrounding app UI. */
@media print{
  @page{size:landscape;margin:10mm}
  html,body{background:#fff!important;margin:0!important;padding:0!important}
  body *{visibility:hidden!important}
  .ts-report-panel .ts-report-print-area,
  .ts-report-panel .ts-report-print-area *{visibility:visible!important}
  .ts-report-panel .ts-report-print-area{
    position:absolute!important;left:0!important;top:0!important;
    width:100%!important;max-width:none!important;margin:0!important;padding:0!important;
    border:0!important;border-radius:0!important;box-shadow:none!important;
    background:#fff!important;overflow:visible!important;
  }
  .ts-report-panel .ts-report-print-area .ts-detail-box{
    display:block!important;width:100%!important;min-width:0!important;
    margin:0!important;padding:0!important;border:0!important;border-radius:0!important;
    box-shadow:none!important;overflow:visible!important;
    break-inside:auto!important;page-break-inside:auto!important;
  }
  .ts-report-panel .ts-report-print-area .ts-week-report-title{
    break-after:avoid!important;page-break-after:avoid!important;
  }
  .ts-report-panel .ts-report-print-area table{
    width:100%!important;min-width:0!important;border-collapse:collapse!important;
    table-layout:auto!important;
  }
  .ts-report-panel .ts-report-print-area thead{display:table-header-group!important}
  .ts-report-panel .ts-report-print-area tfoot{display:table-footer-group!important}
  .ts-report-panel .ts-report-print-area tr{
    break-inside:avoid!important;page-break-inside:avoid!important;
  }
  .ts-report-panel .ts-report-print-area th,
  .ts-report-panel .ts-report-print-area td{
    color:#111827!important;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;
  }
  .ts-report-panel .ts-report-print-area textarea{display:none!important}
}



.ts-report-toolbar{grid-template-columns:minmax(190px,1fr) minmax(240px,1fr) minmax(155px,180px)!important;align-items:start}
.ts-report-employee-picker{position:relative;min-width:0;z-index:50}
.ts-report-employee-trigger{width:100%;height:42px;display:flex;align-items:center;gap:9px;padding:0 11px;border:2px solid #94a3b8;border-radius:9px;background:#fff;color:#0f172a;font-size:13px;font-weight:750;text-align:left;cursor:pointer}
.ts-report-employee-trigger:focus-visible{outline:3px solid rgba(37,99,235,.2);border-color:#2563eb}
.ts-report-employee-trigger .ts-report-employee-current{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ts-report-employee-trigger>svg{flex:0 0 auto;color:#475569}
.ts-report-employee-popover{position:absolute;z-index:9999;top:calc(100% + 7px);left:0;right:0;min-width:230px;max-height:340px;display:flex;flex-direction:column;padding:8px;border:1px solid #cbd5e1;border-radius:12px;background:#fff;box-shadow:0 16px 38px rgba(15,23,42,.22)}
.ts-report-employee-search{height:38px;flex:0 0 auto;display:flex;align-items:center;gap:8px;padding:0 9px;border:1px solid #cbd5e1;border-radius:8px;background:#f8fafc;color:#64748b}
.ts-report-employee-search input{width:100%;min-width:0;height:32px!important;padding:0!important;border:0!important;outline:0!important;box-shadow:none!important;background:transparent!important;color:#0f172a!important;font-size:12px!important;font-weight:600!important}
.ts-report-employee-options{overflow:auto;overscroll-behavior:contain;padding-top:6px}
.ts-report-employee-options button{width:100%;min-height:38px;display:flex;align-items:center;justify-content:space-between;gap:8px;padding:8px 10px;border:0;border-radius:7px;background:#fff;color:#0f172a;text-align:left;font-size:12px;font-weight:700;cursor:pointer}
.ts-report-employee-options button:hover,.ts-report-employee-options button[aria-selected="true"]{background:#eff6ff;color:#1d4ed8}
.ts-report-employee-options small{color:#64748b;font-size:10px;font-weight:600}
.ts-report-employee-no-results{padding:12px;color:#64748b;font-size:12px}
.ts-report-panel .ts-report-toolbar{position:relative;z-index:40;overflow:visible}
.ts-report-panel 
.ts-report-employee-popover-portal{
  box-sizing:border-box!important;
  margin:0!important;
  overflow:hidden!important;
  isolation:isolate;
  pointer-events:auto!important;
  box-shadow:0 22px 60px rgba(15,23,42,.32),0 4px 14px rgba(15,23,42,.12)!important;
}
.ts-report-employee-popover-portal .ts-report-employee-options{
  min-height:0!important;
  max-height:calc(100% - 48px)!important;
  overflow-y:auto!important;
  overscroll-behavior:contain!important;
}

.ts-report-date-control{position:relative;display:flex;align-items:center;gap:8px;min-width:0;height:42px;padding:0 10px;border:2px solid #94a3b8;border-radius:9px;background:#fff;color:#475569;box-sizing:border-box}
.ts-report-date-control>span{flex:0 0 auto;font-size:10px;font-weight:850;text-transform:uppercase;letter-spacing:.03em;color:#64748b}
.ts-report-date-control input,.ts-report-date-control select{flex:1;min-width:0;width:100%;height:36px!important;padding:0 2px!important;border:0!important;outline:0!important;box-shadow:none!important;background:transparent!important;color:#0f172a!important;font-size:13px!important;font-weight:800!important}
.ts-report-date-control:focus-within{border-color:#2563eb;box-shadow:0 0 0 3px rgba(37,99,235,.12)}
@media print{
  .ts-report-panel .ts-report-print-area .ts-report-ai-editor,
  .ts-report-panel .ts-report-print-area .ts-report-collapsed{display:none!important}
  .ts-report-panel .ts-report-print-area .ts-detail-box>h3{display:block!important;margin:0 0 8px!important;padding:8px 0!important;background:#fff!important;border:0!important;color:#111827!important;font-size:15pt!important}
  .ts-report-panel .ts-report-print-area .ts-week-report-title{background:#fff!important}
  .ts-report-panel .ts-report-print-area .ts-week-report-title p{color:#374151!important}
}

.ts-report-toolbar input[type="month"]{cursor:pointer}
.ts-week-summary-table tbody tr[role="button"]{cursor:pointer}
.ts-week-summary-table tbody tr[role="button"]:focus-visible{outline:2px solid #2563eb;outline-offset:-2px}
@media(max-width:650px){.ts-report-toolbar{grid-template-columns:1fr!important}.ts-report-employee-popover{max-height:260px}}


.ts-report-employee-popover-portal{
  box-sizing:border-box!important;
  margin:0!important;
  overflow:hidden!important;
  isolation:isolate;
  pointer-events:auto!important;
  box-shadow:0 22px 60px rgba(15,23,42,.32),0 4px 14px rgba(15,23,42,.12)!important;
}
.ts-report-employee-popover-portal .ts-report-employee-options{
  min-height:0!important;
  max-height:calc(100% - 48px)!important;
  overflow-y:auto!important;
  overscroll-behavior:contain!important;
}

.ts-report-toolbar input[type="month"]{height:42px!important;min-width:0!important;border:2px solid #94a3b8!important;border-radius:9px!important;background:#fff!important;color:#0f172a!important;font-weight:700!important;padding:0 11px!important}

.ts-report-month-trigger{
  width:100%;min-width:0;height:42px;display:flex;align-items:center;gap:9px;
  padding:0 11px;border:2px solid #94a3b8;border-radius:9px;background:#fff;
  color:#0f172a;font-size:13px;font-weight:800;text-align:left;cursor:pointer;
}
.ts-report-month-trigger:focus-visible{outline:3px solid rgba(37,99,235,.18);border-color:#2563eb}
.ts-report-month-trigger .ts-report-month-current{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ts-report-month-trigger svg{flex:0 0 auto;color:#475569}
.ts-report-month-popover{
  box-sizing:border-box!important;display:flex;flex-direction:column;gap:12px;
  padding:14px;border:1px solid #cbd5e1;border-radius:13px;background:#fff;
  color:#0f172a;box-shadow:0 22px 60px rgba(15,23,42,.28),0 4px 14px rgba(15,23,42,.1);
  overflow:auto;isolation:isolate;pointer-events:auto;
}
.ts-report-month-popover-head{display:flex;align-items:center;justify-content:space-between;gap:10px}
.ts-report-month-popover-head strong{font-size:13px;font-weight:850}
.ts-report-month-year{height:36px;min-width:104px;padding:0 9px;border:1px solid #cbd5e1;border-radius:8px;background:#f8fafc;color:#0f172a;font-size:13px;font-weight:850}
.ts-report-month-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
.ts-report-month-grid button{
  min-height:38px;border:1px solid #cbd5e1;border-radius:8px;background:#fff;
  color:#1e293b;font-size:12px;font-weight:750;cursor:pointer;
}
.ts-report-month-grid button:hover{border-color:#60a5fa;background:#eff6ff;color:#1d4ed8}
.ts-report-month-grid button[aria-pressed="true"]{border-color:#2563eb;background:#2563eb;color:#fff;box-shadow:0 2px 6px rgba(37,99,235,.2)}

.ts-report-ai-editor{margin:14px 16px 16px;padding:13px;border:1px solid #cbd5e1;border-radius:12px;background:#f8fafc}
.ts-report-ai-editor-heading{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:9px;color:#0f172a;font-size:12px}
.ts-report-ai-editor-heading span{color:#64748b;font-size:11px;font-weight:600}
.ts-report-ai-editor textarea{display:block;width:100%;min-height:112px;box-sizing:border-box;resize:vertical;padding:12px;border:2px solid #cbd5e1;border-radius:10px;background:#fff;color:#0f172a;font:14px/1.55 inherit}
.ts-report-ai-error{margin:8px 0 0;color:#b91c1c;font-size:12px;font-weight:700}
.ts-report-actions button.ai:disabled{opacity:.7;cursor:wait}

`;

function PanelHeader({title,subtitle,onClose}) { return <div className="ts-panel-header"><div><h2>{title}</h2><p>{subtitle}</p></div><button onClick={onClose}><X size={18}/></button></div>; }
function Stat({color,icon:Icon,label,value}) { return <div className={`ts-stat ${color}`}><div className="ts-stat-icon"><Icon size={20}/></div><span>{label}</span><strong>{value}</strong></div>; }
function Setting({label,children}) { return <label className="ts-setting"><span>{label}</span>{children}</label>; }
function ReportMetric({icon:Icon,label,value}) { return <div className="ts-report-metric"><Icon size={18}/><span>{label}</span><strong>{value}</strong></div>; }
function CalendarMini({date,cursor,setCursor,onSelect}) {
  const WEEK=["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
  const first=new Date(cursor.getFullYear(),cursor.getMonth(),1),start=new Date(first);start.setDate(1-first.getDay());
  return <div><div className="ts-mini-nav"><button onClick={()=>setCursor(new Date(cursor.getFullYear(),cursor.getMonth()-1,1))}><ChevronLeft/></button><b>{cursor.toLocaleDateString("en-US",{month:"long",year:"numeric"})}</b><button onClick={()=>setCursor(new Date(cursor.getFullYear(),cursor.getMonth()+1,1))}><ChevronRight/></button></div><div className="ts-mini-grid">{WEEK.map(d=><span key={d}>{d.slice(0,1)}</span>)}{Array.from({length:42},(_,i)=>{let d=new Date(start);d.setDate(start.getDate()+i);let iso=new Date(d-d.getTimezoneOffset()*60000).toISOString().slice(0,10);return <button key={iso} className={iso===date?"selected":d.getMonth()===cursor.getMonth()?"":"muted"} onClick={()=>onSelect(iso)}>{d.getDate()}</button>})}</div></div>;
}
function ReportsPanel({rows,settings,period,setPeriod,day,setDay,employee,setEmployee,employees,more,setMore,text,setText,onClose,onDownload}) {
  const [aiImproving, setAiImproving] = useState(false);
  const [aiError, setAiError] = useState("");
  const improveReportWithAI = async () => {
    if (aiImproving) return;
    setAiImproving(true);
    setAiError("");
    setMore(true);
    try {
      const reportPayload = {
        period,
        periodLabel,
        companyName: settings.companyName || "Company",
        agencyName: settings.agencyName || "Agency",
        currency: settings.currency || "",
        employee: employee === "all" ? "All employees" : (selectedEmployee?.name || employee),
        summary: {
          employeeCount: new Set(reportRows.map(r => r.employeeId || r.name).filter(Boolean)).size,
          daysWorked,
          actualHours: Number(hours.toFixed(2)),
          scheduledHours: Number(scheduled.toFixed(2)),
          overtimeHours: Number(ot.toFixed(2)),
          actualEarnings: Number(earning.toFixed(2)),
          expectedEarnings: Number(expected.toFixed(2)),
          earningCut: Number(Math.max(0, expected - earning).toFixed(2)),
          presentCount: reportRows.filter(r => r.status === "Present").length,
          absentCount: reportRows.filter(r => r.status === "Absent").length,
          offDayCount: reportRows.filter(r => r.status === "Off-day").length
        },
        records: reportRows.slice(0, 500).map(r => ({
          date: r.date || "",
          employee: r.name || "",
          employeeId: r.employeeId || "",
          checkIn: r.checkIn || "",
          checkOut: r.checkOut || "",
          scheduledHours: Number(r.hours || settings.defaultHours || 0),
          actualHours: Number(actualWorkedFor(r).toFixed(2)),
          overtimeHours: Number(r.ot || 0),
          status: r.status || "Unknown",
          actualEarning: Number(earningFor(r, settings).toFixed(2)),
          expectedEarning: Number(expectedEarningFor(r, settings).toFixed(2))
        })),
        draftText: String(text || "").slice(0, 12000)
      };

      const response = await fetch("/api/timesheets/report-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(reportPayload)
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result?.success || !result?.improvedText) {
        throw new Error(result?.error || "The AI could not improve this report. Please try again.");
      }
      setText(result.improvedText);
    } catch (error) {
      setAiError(error?.message || "Unable to improve the report right now.");
    } finally {
      setAiImproving(false);
    }
  };
  const [printAfterExpand, setPrintAfterExpand] = useState(false);

  const reportRows = useMemo(() => {
    if (employee === "all") return rows;
    return rows.filter(r => (r.employeeId || r.name) === employee);
  }, [rows, employee]);

  useEffect(() => {
    if (!printAfterExpand) return;
    const timer = window.setTimeout(() => {
      window.print();
      setPrintAfterExpand(false);
    }, 120);
    return () => window.clearTimeout(timer);
  }, [printAfterExpand]);

  const handleReportPrint = () => {
    if (period !== "weekly" && !more) {
      setMore(true);
      setPrintAfterExpand(true);
      return;
    }
    window.print();
  };

  const weekStart = weekStartISO(day);
  const weekEnd = weekEndISO(day);
  const daysWorked = reportRows.filter(r=>r.status === "Present" && (r.checkIn || r.checkOut)).length;
  const hours = reportRows.reduce((a,r)=>a+actualWorkedFor(r),0);
  const scheduled = reportRows.filter(r=>r.status !== "Absent").reduce((a,r)=>a+Number(r.hours||settings.defaultHours||0),0);
  const ot = reportRows.reduce((a,r)=>a+Number(r.ot||0),0);
  const earning = reportRows.reduce((a,r)=>a+earningFor(r,settings),0);
  const expected = reportRows.reduce((a,r)=>a+expectedEarningFor(r,settings),0);

  const [employeePickerOpen, setEmployeePickerOpen] = useState(false);
  const [employeeQuery, setEmployeeQuery] = useState("");
  const employeePickerRef = useRef(null);
  const employeeTriggerRef = useRef(null);
  const [employeePickerPosition, setEmployeePickerPosition] = useState(null);
  const [monthPickerOpen, setMonthPickerOpen] = useState(false);
  const monthTriggerRef = useRef(null);
  const [monthPickerPosition, setMonthPickerPosition] = useState(null);
  const reportMonthYear = Number(String(day || todayISO()).slice(0, 4));
  const reportMonthIndex = Math.max(0, Math.min(11, Number(String(day || todayISO()).slice(5, 7)) - 1));

  useEffect(() => {
    if (!monthPickerOpen) return;
    const updatePosition = () => {
      const anchor = monthTriggerRef.current;
      if (!anchor) return;
      const rect = anchor.getBoundingClientRect();
      const width = Math.min(Math.max(rect.width, 280), window.innerWidth - 24);
      const left = Math.max(12, Math.min(rect.left, window.innerWidth - width - 12));
      const height = Math.min(340, window.innerHeight - 24);
      const below = window.innerHeight - rect.bottom;
      const top = below >= height + 8
        ? rect.bottom + 8
        : Math.max(12, rect.top - height - 8);
      setMonthPickerPosition({ top, left, width, maxHeight: height });
    };
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [monthPickerOpen]);

  useEffect(() => {
    if (!monthPickerOpen) return;
    const closeOnOutside = event => {
      const target = event.target;
      if (
        monthTriggerRef.current && !monthTriggerRef.current.contains(target) &&
        !document.getElementById("ts-report-month-popover")?.contains(target)
      ) setMonthPickerOpen(false);
    };
    const closeOnEscape = event => {
      if (event.key === "Escape") setMonthPickerOpen(false);
    };
    document.addEventListener("mousedown", closeOnOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [monthPickerOpen]);

  const selectReportMonth = monthIndex => {
    setDay(`${reportMonthYear}-${String(monthIndex + 1).padStart(2, "0")}-01`);
    setMonthPickerOpen(false);
    setMore(true);
  };

  useEffect(() => {
    if (!employeePickerOpen) return;
    const updatePosition = () => {
      const anchor = employeeTriggerRef.current;
      if (!anchor) return;
      const rect = anchor.getBoundingClientRect();
      const width = Math.min(Math.max(rect.width, 280), window.innerWidth - 24);
      const left = Math.max(12, Math.min(rect.left, window.innerWidth - width - 12));
      const maxHeight = Math.max(180, Math.min(360, window.innerHeight - 24));
      const below = window.innerHeight - rect.bottom;
      const top = below >= Math.min(280, maxHeight) || rect.top < maxHeight
        ? Math.min(rect.bottom + 8, window.innerHeight - maxHeight - 12)
        : Math.max(12, rect.top - maxHeight - 8);
      setEmployeePickerPosition({ top, left, width, maxHeight });
    };
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [employeePickerOpen]);

  const employeeList = useMemo(() => {
    const map = new Map();
    (employees || []).forEach(r => {
      const key = r.employeeId || r.name;
      if (key) map.set(key, r);
    });
    rows.forEach(r => {
      const key = r.employeeId || r.name;
      if (key && !map.has(key)) map.set(key, r);
    });
    return [...map.values()]
      .filter(r => r.name || r.employeeId)
      .sort((a,b) => String(a.name || a.employeeId).localeCompare(String(b.name || b.employeeId)));
  }, [employees, rows]);

  const selectedEmployee = employee === "all"
    ? null
    : employeeList.find(r => (r.employeeId || r.name) === employee) || null;
  const selectedEmployeeLabel = selectedEmployee
    ? (selectedEmployee.name || selectedEmployee.employeeId)
    : "All employees";

  const employeeMatches = useMemo(() => {
    const query = employeeQuery.trim().toLocaleLowerCase();
    if (!query) return employeeList;
    return employeeList.filter(r =>
      String(r.name || "").toLocaleLowerCase().includes(query) ||
      String(r.employeeId || "").toLocaleLowerCase().includes(query)
    );
  }, [employeeList, employeeQuery]);

  useEffect(() => {
    if (!employeePickerOpen) return;
    const closeOnOutside = event => {
      const target = event.target;
      if (
        employeePickerRef.current && !employeePickerRef.current.contains(target) &&
        !document.getElementById("ts-report-employee-popover")?.contains(target)
      ) {
        setEmployeePickerOpen(false);
      }
    };
    document.addEventListener("mousedown", closeOnOutside);
    return () => document.removeEventListener("mousedown", closeOnOutside);
  }, [employeePickerOpen]);

  const chooseEmployee = value => {
    setEmployee(value);
    setEmployeePickerOpen(false);
    setEmployeeQuery("");
    setMore(true);
  };

  const weeklyEmployees = useMemo(() => employeeList.map(emp => {
    const key = emp.employeeId || emp.name;
    const personRows = reportRows.filter(r=>(r.employeeId||r.name)===key);
    const daily = WEEK.map((_,index)=>{
      const d = new Date(`${weekStart}T12:00:00`);
      d.setDate(d.getDate()+index);
      const iso = new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,10);
      return personRows.find(r=>r.date===iso) || null;
    });
    const presentRows=daily.filter(Boolean);
    return {
      key,
      name:emp.name||emp.employeeId||"—",
      employeeId:emp.employeeId||"—",
      daily,
      hours:presentRows.reduce((a,r)=>a+actualWorkedFor(r),0),
      scheduled:presentRows.filter(r=>r.status!=="Absent").reduce((a,r)=>a+Number(r.hours||settings.defaultHours||0),0),
      ot:presentRows.reduce((a,r)=>a+Number(r.ot||0),0),
      earning:presentRows.reduce((a,r)=>a+earningFor(r,settings),0),
      expected:presentRows.reduce((a,r)=>a+expectedEarningFor(r,settings),0),
      status:presentRows.some(r=>r.status==="Present" && (r.checkIn||r.checkOut)) ? "Present" : presentRows.some(r=>r.status==="Off-day") ? "Off-day" : "Absent",
      firstCheckIn: presentRows.filter(r=>r.checkIn).sort((a,b)=>`${a.date} ${a.checkIn}`.localeCompare(`${b.date} ${b.checkIn}`))[0]?.checkIn || "—",
      lastCheckOut: presentRows.filter(r=>r.checkOut).sort((a,b)=>`${b.date} ${b.checkOut}`.localeCompare(`${a.date} ${a.checkOut}`))[0]?.checkOut || "—"
    };
  }).filter(g => employee === "all" || g.key === employee), [employeeList, reportRows, weekStart, settings, employee]);

  const periodLabel = period === "daily"
    ? `${dayName(day)} • ${day}`
    : period === "weekly"
      ? `Sunday ${weekStart} → Saturday ${weekEnd}`
      : period === "monthly"
        ? new Date(`${day}T12:00:00`).toLocaleDateString("en-US",{month:"long",year:"numeric"})
        : `${new Date(`${day}T12:00:00`).getFullYear()}`;

  const weeklySummary = (
    <div className="ts-detail-box">
      <div className="ts-week-report-title">
        <div><h3>Weekly Sheet • Sunday → Saturday</h3><p>{employee === "all" ? "All employees are shown. Use Show All to split the report into individual employee sheets." : `Showing ${selectedEmployeeLabel} only. Use Show All to view this employee’s daily records.`}</p></div>
        <strong>{weeklyEmployees.length} employees</strong>
      </div>
      {!more ? (
        <div className="ts-week-summary-table-wrap">
          <table className="ts-week-summary-table">
            <thead><tr><th>Employee</th><th>Employee ID</th><th>Check In</th><th>Check Out</th><th>O.T</th><th>Status</th><th>Earning</th></tr></thead>
            <tbody>
              {weeklyEmployees.length ? weeklyEmployees.map(g => (
                <tr key={g.key} role="button" tabIndex={0} title="Double-click to view this employee's report" onDoubleClick={()=>chooseEmployee(g.key)} onKeyDown={e=>{if(e.key==="Enter")chooseEmployee(g.key);}}><td><strong>{g.name}</strong></td><td>{g.employeeId}</td><td>{g.firstCheckIn}</td><td>{g.lastCheckOut}</td><td>{g.ot.toFixed(2)} H</td><td>{g.status}</td><td>{money(g.earning,settings.currency)}</td></tr>
              )) : <tr><td colSpan="7" className="empty">No employees found.</td></tr>}
            </tbody>
            <tfoot><tr><th colSpan="4">Weekly Total</th><th>{weeklyEmployees.reduce((a,g)=>a+g.ot,0).toFixed(2)} H</th><th>{weeklyEmployees.length} Employees</th><th>{money(weeklyEmployees.reduce((a,g)=>a+g.earning,0),settings.currency)}</th></tr></tfoot>
          </table>
        </div>
      ) : (
        <div className="ts-week-all-list">
          {weeklyEmployees.map(g => (
            <div className="ts-week-record" key={g.key}>
              <div className="ts-week-record-head">
                <div><strong>{g.name}</strong><span>Employee ID: {g.employeeId}</span></div>
                <div><strong>{g.hours.toFixed(2)} H</strong><span>Actual / {g.scheduled.toFixed(2)} scheduled</span></div>
                <div><strong>{g.ot.toFixed(2)} H</strong><span>O.T</span></div>
                <div><strong>{money(g.earning,settings.currency)}</strong><span>Actual / {money(g.expected,settings.currency)} expected</span></div>
              </div>
              <table>
                <thead><tr><th>Day</th><th>Date</th><th>Check In</th><th>Check Out</th><th>Scheduled</th><th>Actual</th><th>O.T</th><th>Status</th><th>Earning</th></tr></thead>
                <tbody>
                  {WEEK.map((dayValue,index) => {
                    const d = new Date(`${weekStart}T12:00:00`);
                    d.setDate(d.getDate()+index);
                    const iso = new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,10);
                    const r = g.daily[index];
                    return <tr key={iso}><td>{dayValue}</td><td>{iso}</td><td>{r?.checkIn||"—"}</td><td>{r?.checkOut||"—"}</td><td>{r?Number(r.hours||settings.defaultHours||0).toFixed(2):"0.00"}</td><td>{r?actualWorkedFor(r).toFixed(2):"0.00"}</td><td>{r?Number(r.ot||0).toFixed(2):"0.00"}</td><td>{r?.status||"Absent"}</td><td>{r?money(earningFor(r,settings),settings.currency):money(0,settings.currency)}</td></tr>;
                  })}
                </tbody>
                <tfoot><tr><th colSpan="5">Weekly Total</th><th>{g.hours.toFixed(2)} H</th><th>{g.ot.toFixed(2)} H</th><th>{g.status}</th><th>{money(g.earning,settings.currency)}</th></tr></tfoot>
              </table>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const otherDetails = more ? (
    <div className="ts-detail-box">
      <h3>{period === "daily" ? "Daily Details" : period === "monthly" ? "Monthly Details" : "Yearly Details"}</h3>
      <table><thead><tr><th>Date</th><th>Day</th><th>Employee</th><th>Employee ID</th><th>Check In</th><th>Check Out</th><th>Hours</th><th>O.T</th><th>Status</th><th>Actual Earning</th><th>Expected Earning</th></tr></thead>
        <tbody>{reportRows.map(r=><tr key={r.id}><td>{r.date}</td><td>{dayName(r.date)}</td><td>{r.name||r.employeeId||"—"}</td><td>{r.employeeId||"—"}</td><td>{r.checkIn||"—"}</td><td>{r.checkOut||"—"}</td><td>{actualWorkedFor(r).toFixed(2)}</td><td>{Number(r.ot||0).toFixed(2)}</td><td>{r.status}</td><td>{money(earningFor(r,settings),settings.currency)}</td><td>{money(expectedEarningFor(r,settings),settings.currency)}</td></tr>)}</tbody>
      </table>
      <div className="ts-report-ai-editor">
        <div className="ts-report-ai-editor-heading">
          <strong>Report narrative</strong>
          <span>{aiImproving ? "AI is analysing the selected report..." : text ? "AI-generated text is editable" : "Add your notes or use Improve with AI"}</span>
        </div>
        <textarea value={text} onChange={e=>{setText(e.target.value);setAiError("");}} placeholder="Your improved report will appear here. You can edit it before sharing or printing..."/>
        {aiError && <p className="ts-report-ai-error" role="alert">{aiError}</p>}
      </div>
    </div>
  ) : <div className="ts-report-collapsed"><p>Click <strong>Show All</strong> to inspect every record for the selected {period}.</p></div>;

  return <><style>{REPORT_PREMIUM_CSS}</style><section className="ts-panel ts-report-panel">
    <div className="ts-report-hero">
      <div className="ts-report-hero-copy"><h2>Employee Timesheets</h2><p>Track attendance, working hours and earnings in one workspace.</p></div>
      <div className="ts-report-hero-note">Manage your team<br/>Track attendance<br/>Calculate earnings<br/>Grow your business</div>
    </div>
    <PanelHeader title="Attendance & Earnings Report" subtitle="Simple weekly sheets with Sunday–Saturday totals plus daily, monthly and yearly views" onClose={onClose}/>
    <div className="ts-report-toolbar">
      <select value={period} onChange={e=>{
        const nextPeriod=e.target.value;
        setPeriod(nextPeriod);
        // Entering a month/year view starts at the current calendar period.
        if(nextPeriod==="monthly") setDay(`${todayISO().slice(0,7)}-01`);
        if(nextPeriod==="yearly") setDay(`${todayISO().slice(0,4)}-01-01`);
      }}>
        <option value="weekly">Weekly • Sunday–Saturday</option>
        <option value="monthly">Monthly</option>
        <option value="yearly">Yearly</option>
        <option value="daily">Single Day</option>
      </select>
      <div className="ts-report-employee-picker" ref={employeePickerRef}>
        <button ref={employeeTriggerRef} type="button" className="ts-report-employee-trigger"
          aria-haspopup="listbox" aria-expanded={employeePickerOpen}
          onClick={()=>{setEmployeePickerOpen(v=>!v);setEmployeeQuery("");}}
          onDoubleClick={()=>{setEmployeePickerOpen(true);setEmployeeQuery("");}}>
          <span className="ts-report-employee-current">{selectedEmployeeLabel}</span>
          <ChevronDown size={17}/>
        </button>
        {employeePickerOpen && employeePickerPosition && typeof document !== "undefined" && createPortal(
          <div
            id="ts-report-employee-popover"
            className="ts-report-employee-popover ts-report-employee-popover-portal"
            style={{
              position: "fixed",
              top: employeePickerPosition.top,
              left: employeePickerPosition.left,
              width: employeePickerPosition.width,
              maxHeight: employeePickerPosition.maxHeight,
              zIndex: 2147483000
            }}
          >
          <div className="ts-report-employee-search"><Search size={16}/>
            <input autoFocus type="search" aria-label="Search employees"
              placeholder="Search employee name or ID..." value={employeeQuery}
              onChange={e=>setEmployeeQuery(e.target.value)}
              onKeyDown={e=>{
                if(e.key==="Escape")setEmployeePickerOpen(false);
                if(e.key==="Enter" && employeeMatches.length===1){
                  const r=employeeMatches[0];chooseEmployee(r.employeeId||r.name);
                }
              }}/>
          </div>
          <div className="ts-report-employee-options" role="listbox" aria-label="Employees">
            <button type="button" role="option" aria-selected={employee==="all"} onClick={()=>chooseEmployee("all")}>
              <span>All employees</span><small>Combined report</small>
            </button>
            {employeeMatches.map(r=>{
              const key=r.employeeId||r.name;
              return <button type="button" role="option" aria-selected={employee===key} key={key} onClick={()=>chooseEmployee(key)}>
                <span>{r.name||r.employeeId}</span><small>{r.employeeId?`ID: ${r.employeeId}`:"Employee"}</small>
              </button>;
            })}
            {employeeMatches.length===0 && <div className="ts-report-employee-no-results">No matching employees found.</div>}
          </div>
        </div>,
          document.body
        )}
      </div>
      {period === "monthly" ? (
        <div className="ts-report-date-control" ref={monthTriggerRef} aria-label="Choose report month">
          <button
            type="button"
            className="ts-report-month-trigger"
            aria-haspopup="dialog"
            aria-expanded={monthPickerOpen}
            onClick={() => setMonthPickerOpen(open => !open)}
          >
            <CalendarDays size={16}/>
            <span className="ts-report-month-current">{REPORT_MONTHS[reportMonthIndex]} {reportMonthYear}</span>
            {monthPickerOpen ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
          </button>
          {monthPickerOpen && monthPickerPosition && typeof document !== "undefined" && createPortal(
            <div
              id="ts-report-month-popover"
              className="ts-report-month-popover"
              role="dialog"
              aria-label="Select month and year"
              style={{
                position: "fixed",
                top: monthPickerPosition.top,
                left: monthPickerPosition.left,
                width: monthPickerPosition.width,
                maxHeight: monthPickerPosition.maxHeight,
                zIndex: 2147483001
              }}
            >
              <div className="ts-report-month-popover-head">
                <strong>Select Month &amp; Year</strong>
                <select
                  className="ts-report-month-year"
                  aria-label="Select report year"
                  value={reportMonthYear}
                  onChange={e => {
                    const nextYear = Number(e.target.value);
                    setDay(`${nextYear}-${String(reportMonthIndex + 1).padStart(2, "0")}-01`);
                    setMore(true);
                  }}
                >
                  {Array.from({length: 61}, (_, i) => new Date().getFullYear() + 20 - i).map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>
              <div className="ts-report-month-grid">
                {REPORT_MONTHS.map((month, index) => (
                  <button
                    key={month}
                    type="button"
                    aria-pressed={index === reportMonthIndex}
                    onClick={() => selectReportMonth(index)}
                  >
                    {month.slice(0, 3)}
                  </button>
                ))}
              </div>
            </div>,
            document.body
          )}
        </div>
      ) : period === "yearly" ? (
        <label className="ts-report-date-control" aria-label="Choose report year">
          <span>Year</span>
          <select aria-label="Select report year" value={String(day || todayISO()).slice(0,4)} onChange={e=>{if(e.target.value)setDay(`${e.target.value}-01-01`);}}>
            {Array.from({length:21},(_,i)=>new Date().getFullYear()+5-i).map(year=><option key={year} value={String(year)}>{year}</option>)}
          </select>
        </label>
      ) : (
        <label className="ts-report-date-control" aria-label={period === "weekly" ? "Choose week" : "Choose day"}>
          <span>{period === "weekly" ? "Week of" : "Date"}</span>
          <input aria-label={period === "weekly" ? "Select week date" : "Select report date"} type="date" value={day} onChange={e=>setDay(e.target.value)} />
        </label>
      )}
    </div>
    <div className="ts-report-head"><div><span>Company</span><strong>{settings.companyName}</strong></div><div><span>Agency</span><strong>{settings.agencyName}</strong></div><div><span>Period</span><strong>{periodLabel}</strong></div></div>
    <div className="ts-report-metrics">
      <ReportMetric icon={Users} label="Employees" value={period === "weekly" ? weeklyEmployees.length : new Set(rows.map(r=>r.employeeId||r.name).filter(Boolean)).size}/>
      <ReportMetric icon={Users} label="Days Worked" value={daysWorked}/>
      <ReportMetric icon={Clock3} label="Actual / Scheduled" value={`${hours.toFixed(2)} / ${scheduled.toFixed(2)} H`}/>
      <ReportMetric icon={TimerReset} label="Overtime (O.T)" value={`${ot.toFixed(2)} H`}/>
      <ReportMetric icon={DollarSign} label="Actual Earning" value={money(earning,settings.currency)}/>
      <ReportMetric icon={CircleDollarSign} label="Expected Earning" value={money(expected,settings.currency)}/>
      <ReportMetric icon={DollarSign} label="Earning Cut" value={money(Math.max(0,expected-earning),settings.currency)}/>
    </div>
    <div className="ts-report-actions">
      <button onClick={()=>setMore(!more)}>{more?<ChevronUp/>:<ChevronDown/>}{more?"Show Less":"Show All"}</button>
      <button onClick={()=>navigator.share?.({title:"Sodah Report",text:`${settings.companyName} — ${periodLabel} — ${money(earning,settings.currency)}`})}><Share2/>Share</button>
      <button onClick={handleReportPrint}><Printer/>Print</button>
      <button onClick={()=>onDownload(reportRows)}><Download/>Download Excel</button>
      <button onClick={()=>setText(text || "Please improve this attendance and earnings report with AI.")}><Plus/>Add Text</button>
      <button className="ai" onClick={improveReportWithAI} disabled={aiImproving}><Sparkles/>{aiImproving ? "Improving..." : "Improve with AI"}</button>
      <button onClick={()=>{ const headers=["Date","Day","Employee","Employee ID","Check In","Check Out","Scheduled Hours","Actual Hours","O.T","Status","Actual Earning","Expected Earning","Earning Cut"]; const data=reportRows.map(r=>[r.date,dayName(r.date),r.name,r.employeeId,r.checkIn,r.checkOut,Number(r.hours||settings.defaultHours||0),actualWorkedFor(r),Number(r.ot||0),r.status,earningFor(r,settings),expectedEarningFor(r,settings),Math.max(0,expectedEarningFor(r,settings)-earningFor(r,settings))]); const body=[headers,...data].map(a=>a.map(v=>`"${String(v??"").replaceAll('"','""')}"`).join(",")).join("\n"); const url=URL.createObjectURL(new Blob([body],{type:"text/csv;charset=utf-8"})); const a=document.createElement("a");a.href=url;a.download=`sodah-${period}-${day}.csv`;a.click();URL.revokeObjectURL(url); }}><Download/>CSV</button>
    </div>
    <div className="ts-report-print-area">{period === "weekly" ? weeklySummary : otherDetails}</div>
  </section></>;
}
return { ReportsPanel };
})();
export { ReportsPanel };
