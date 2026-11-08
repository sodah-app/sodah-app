"use client";
import React from "react";
import { Building2, Clock3, Palette, Settings2, WalletCards, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { hrs, money, todayISO } from "@/lib/time";

const { SettingsPanel } = (() => {
/* ---------------------------------------------------------
   DARK BACKGROUND PALETTES
--------------------------------------------------------- */

const DARK_PALETTES = {
  blue: {
    label: "Light Blue",
  },
  black: {
    label: "Black",
  },
  green: {
    label: "Green",
  },
  gray: {
    label: "Gray",
  },
};

/* ---------------------------------------------------------
   HELPERS
--------------------------------------------------------- */

function shiftEndFromStart(start, hours) {
  if (!start) return "16:00";

  const [h, m] = String(start)
    .split(":")
    .map(Number);

  const totalMinutes = h * 60 + m + Number(hours || 0) * 60;

  const endMinutes = totalMinutes % (24 * 60);

  const endH = Math.floor(endMinutes / 60);
  const endM = endMinutes % 60;

  return `${String(endH).padStart(2, "0")}:${String(endM).padStart(
    2,
    "0"
  )}`;
}

/* ---------------------------------------------------------
   PANEL HEADER
--------------------------------------------------------- */


const SETTINGS_PREMIUM_CSS = `
.ts-settings-panel{background:#f8fafc!important;border:1px solid #e2e8f0!important;border-radius:18px!important;box-shadow:0 16px 40px rgba(15,23,42,.08)!important;color:#0f172a!important}
.ts-settings-panel .ts-panel-header{background:linear-gradient(120deg,#fff,#f0fdf4)!important;border-bottom:1px solid #e2e8f0!important;padding:22px 24px!important}
.ts-settings-panel .ts-settings-content{padding:20px!important;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px;align-items:start}
.ts-settings-panel .ts-settings-section{margin:0!important;border:1px solid #e2e8f0!important;border-radius:15px!important;box-shadow:0 4px 14px rgba(15,23,42,.035)!important;min-width:0}
.ts-settings-panel .ts-settings-section-head{background:#fff!important;border-bottom:1px solid #edf2f7!important;padding:16px!important;display:flex;align-items:center;gap:12px}
.ts-settings-panel .ts-settings-section-body{padding:18px!important}
.ts-settings-panel .ts-settings-field{min-width:0;display:flex;flex-direction:column;gap:7px}
.ts-settings-panel .ts-settings-field-label{font-size:11px!important;letter-spacing:0!important;text-transform:none!important;color:#334155!important}
.ts-settings-panel .ts-settings-field input,.ts-settings-panel .ts-settings-field select,.ts-settings-panel .ts-settings-field textarea{box-sizing:border-box;width:100%;min-width:0;min-height:43px!important;border:1px solid #cbd5e1!important;border-radius:9px!important;font-size:13px!important;padding:10px 12px!important;line-height:1.4!important;white-space:normal;overflow-wrap:anywhere}
.ts-settings-panel .ts-settings-section:nth-child(1){grid-column:1}
.ts-settings-panel .ts-settings-section:nth-child(2){grid-column:1/-1}
.ts-settings-panel .ts-settings-section:nth-child(3){grid-column:1}
.ts-settings-panel .ts-settings-section:nth-child(4){grid-column:2}
.ts-settings-panel .ts-settings-row{gap:14px!important}
.ts-settings-panel .ts-settings-row.two{grid-template-columns:repeat(2,minmax(0,1fr))!important}
.ts-settings-panel .ts-settings-row.five{grid-template-columns:repeat(auto-fit,minmax(150px,1fr))!important}
.ts-settings-panel .ts-settings-section-icon{flex:0 0 38px;width:38px;height:38px;border-radius:11px!important;background:#dcfce7!important;color:#059669!important}
.ts-settings-panel .ts-settings-section-head h3{font-size:14px!important;line-height:1.35!important;margin:0!important}
.ts-settings-panel .ts-settings-section-head p{font-size:12px!important;line-height:1.5!important;margin-top:3px!important}
.ts-settings-panel .ts-panel-close{flex-shrink:0}
.ts-settings-panel .ts-work-target-panel{display:flex;align-items:center;justify-content:space-between;gap:14px;padding:13px 14px;margin-bottom:14px;border:1px solid #dbe4ee;border-radius:12px;background:#f8fafc}
.ts-settings-panel .ts-work-target-panel>div:first-child{display:flex;flex-direction:column;gap:4px;min-width:0}
.ts-settings-panel .ts-work-target-panel strong{font-size:12px;color:#0f172a}
.ts-settings-panel .ts-work-target-panel small,.ts-settings-panel .ts-work-sheet-select>small{font-size:10px;color:#64748b;line-height:1.5}
.ts-settings-panel .ts-work-target-actions{display:flex;gap:6px;flex-wrap:wrap}
.ts-settings-panel .ts-work-target-actions button{min-height:34px;padding:0 11px;border:1px solid #cbd5e1;border-radius:8px;background:#fff;color:#334155;font-size:11px;font-weight:800;cursor:pointer}
.ts-settings-panel .ts-work-target-actions button.active{background:#2563eb;border-color:#2563eb;color:#fff}
.ts-settings-panel .ts-work-sheet-select{display:grid;grid-template-columns:minmax(180px,1fr) 2fr;align-items:end;gap:12px;padding:12px;margin-bottom:14px;border:1px solid #bfdbfe;border-radius:11px;background:#eff6ff}
.ts-settings-panel .ts-work-save-row{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:16px;padding-top:13px;border-top:1px solid #e2e8f0}
.ts-settings-panel .ts-work-save-row small{font-size:10px;color:#64748b}
.ts-settings-panel .ts-work-save-button{min-height:40px;padding:0 16px;border:0;border-radius:9px;background:#2563eb;color:#fff;font-size:11px;font-weight:850;cursor:pointer}
.ts-settings-panel .ts-work-save-button.saved{background:#059669}
.ts-settings-panel .ts-work-save-button.error{background:#dc2626}
.ts-settings-panel .ts-work-save-button:disabled{opacity:.55;cursor:not-allowed}
@media(max-width:700px){.ts-settings-panel .ts-work-target-panel{align-items:flex-start;flex-direction:column}.ts-settings-panel .ts-work-sheet-select{grid-template-columns:1fr}.ts-settings-panel .ts-work-save-row{align-items:stretch;flex-direction:column}.ts-settings-panel .ts-work-save-button{width:100%}}

@media(max-width:900px){.ts-settings-panel .ts-settings-content{grid-template-columns:minmax(0,1fr)}.ts-settings-panel .ts-settings-section:nth-child(n){grid-column:1}.ts-settings-panel .ts-settings-row.two{grid-template-columns:minmax(0,1fr)!important}}

.ts-settings-panel{background:#fff;border:2px solid #cbd5e1;border-radius:18px;overflow:hidden;box-shadow:0 14px 34px rgba(15,23,42,.10)}
.ts-settings-panel .ts-panel-header{min-height:84px;padding:20px 24px;background:linear-gradient(135deg,#fff,#f1f5f9 60%,#ecfdf5);border-bottom:2px solid #cbd5e1}
.ts-settings-header-icon,.ts-settings-section-icon{display:flex;align-items:center;justify-content:center;color:#fff!important;background:linear-gradient(135deg,#2563eb,#0ea5e9)!important;border:0!important}
.ts-settings-header-icon{width:40px;height:40px;border-radius:11px}
.ts-settings-section{margin-bottom:16px;border:2px solid #cbd5e1!important;border-radius:14px!important;background:#fff!important;overflow:hidden;box-shadow:0 4px 12px rgba(15,23,42,.045)}
.ts-settings-section:nth-of-type(2) .ts-settings-section-icon{background:linear-gradient(135deg,#7c3aed,#a855f7)!important}
.ts-settings-section:nth-of-type(3) .ts-settings-section-icon{background:linear-gradient(135deg,#ea580c,#f59e0b)!important}
.ts-settings-section:nth-of-type(4) .ts-settings-section-icon{background:linear-gradient(135deg,#059669,#10b981)!important}
.ts-settings-section-head{padding:15px 17px!important;background:#f8fafc!important;border-bottom:2px solid #cbd5e1!important}
.ts-settings-section-head h3{color:#0f172a!important;font-size:14px!important;font-weight:850!important}.ts-settings-section-head p{color:#64748b!important;font-size:10px!important}
.ts-settings-section-body{padding:18px!important}
.ts-settings-field-label{color:#334155!important;font-size:10px!important;font-weight:850!important;text-transform:uppercase;letter-spacing:.045em}
.ts-settings-field input,.ts-settings-field select{min-height:42px!important;border:2px solid #cbd5e1!important;border-radius:9px!important;background:#fff!important;color:#0f172a!important;font-size:12px!important;font-weight:650!important;outline:none}
.ts-settings-field input:focus,.ts-settings-field select:focus{border-color:#2563eb!important;box-shadow:0 0 0 3px rgba(37,99,235,.10)}
.ts-input-with-prefix,.ts-input-with-suffix{border:2px solid #cbd5e1!important;border-radius:9px!important;background:#fff!important;overflow:hidden}
.ts-input-with-prefix:focus-within,.ts-input-with-suffix:focus-within{border-color:#2563eb!important;box-shadow:0 0 0 3px rgba(37,99,235,.10)}
.ts-input-with-prefix span,.ts-input-with-suffix span{background:#eff6ff!important;color:#1d4ed8!important;border-right:1px solid #bfdbfe!important;font-weight:800!important}
.ts-mode-buttons{display:flex!important;gap:8px!important}.ts-mode-buttons button{min-height:42px!important;padding:0 16px!important;border:2px solid #cbd5e1!important;border-radius:9px!important;background:#fff!important;color:#334155!important;font-weight:800!important}
.ts-mode-buttons button.active{color:#fff!important;background:#2563eb!important;border-color:#2563eb!important}
.ts-theme-swatch{border:2px solid #cbd5e1!important;border-radius:10px!important;background:#fff!important}.ts-theme-swatch.active{border-color:#2563eb!important;box-shadow:0 0 0 3px rgba(37,99,235,.10)}
.ts-color-control{border:2px solid #cbd5e1!important;border-radius:9px!important;background:#fff!important}
.ts-settings-information{margin-top:16px;padding:18px!important;border:2px solid #cbd5e1!important;border-radius:14px!important;background:linear-gradient(135deg,#f8fafc,#fff)!important}
.ts-settings-information-title{color:#0f172a!important;font-size:13px!important;font-weight:850!important;padding-bottom:12px;border-bottom:2px solid #cbd5e1}
.ts-settings-information-grid>div{padding:12px!important;border:1px solid #cbd5e1!important;border-radius:10px;background:#fff}.ts-settings-information-grid strong{color:#2563eb!important;font-weight:850!important}.ts-settings-information-grid span{color:#475569!important}

/* Approved premium settings layout */
.ts-settings-panel .ts-settings-content{
  grid-template-columns:minmax(0,1fr) minmax(0,1fr)!important;
  gap:16px!important;
}
.ts-settings-panel .ts-settings-section:nth-child(1){grid-column:1!important}
.ts-settings-panel .ts-settings-section:nth-child(2){grid-column:2!important}
.ts-settings-panel .ts-settings-section:nth-child(3){grid-column:1!important}
.ts-settings-panel .ts-settings-section:nth-child(4){grid-column:2!important}
.ts-settings-panel .ts-settings-section:nth-child(1) .ts-settings-section-head{background:linear-gradient(120deg,#ecfdf5,#fff)!important}
.ts-settings-panel .ts-settings-section:nth-child(2) .ts-settings-section-head{background:linear-gradient(120deg,#faf5ff,#fff)!important}
.ts-settings-panel .ts-settings-section:nth-child(3) .ts-settings-section-head{background:linear-gradient(120deg,#fff7ed,#fff)!important}
.ts-settings-panel .ts-settings-section:nth-child(4) .ts-settings-section-head{background:linear-gradient(120deg,#ecfdf5,#fff)!important}
.ts-settings-panel .ts-settings-section:nth-child(2) .ts-settings-row.five{grid-template-columns:repeat(2,minmax(0,1fr))!important}
.ts-settings-panel .ts-settings-section:nth-child(3) .ts-settings-row.four{grid-template-columns:repeat(2,minmax(0,1fr))!important}
.ts-settings-panel .ts-settings-section:nth-child(3) .ts-settings-row.two{grid-template-columns:repeat(2,minmax(0,1fr))!important}
.ts-settings-panel .ts-settings-section:nth-child(3) .ts-settings-section-body{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:14px;align-items:start}
.ts-settings-panel .ts-settings-section:nth-child(3) .ts-settings-row.four{grid-column:1}
.ts-settings-panel .ts-settings-section:nth-child(3) .ts-settings-row.two{grid-column:1}
.ts-settings-panel .ts-auto-sync-card{grid-column:2;grid-row:1 / span 2;border-radius:14px;padding:18px;background:linear-gradient(145deg,#ecfdf5,#eff6ff);border:1px solid #dbeafe;color:#0f172a}
.ts-settings-panel .ts-auto-sync-title{display:flex;align-items:center;gap:10px;font-weight:850;font-size:14px;margin-bottom:12px;color:#064e3b}
.ts-settings-panel .ts-auto-sync-bubble{width:38px;height:38px;border-radius:50%;display:grid;place-items:center;background:#a7f3d0;color:#047857;flex:none}
.ts-settings-panel .ts-auto-sync-equation{display:flex;align-items:center;justify-content:space-between;gap:6px;padding:12px 8px;margin:12px 0;border-radius:10px;background:#fff;border:1px solid #d1fae5;font-size:11px;text-align:center}
.ts-settings-panel .ts-auto-sync-equation span{display:block;padding:8px;border-radius:8px;background:#eff6ff;flex:1}
.ts-settings-panel .ts-auto-sync-equation span:last-child{background:#d1fae5}
.ts-settings-panel .ts-auto-sync-note{background:#dbeafe;border:1px solid #bfdbfe;border-radius:10px;padding:12px;font-size:12px;line-height:1.5;color:#1e40af}
.ts-settings-panel .ts-auto-checkout{display:flex;align-items:flex-start;gap:10px;padding:12px;margin-top:12px;border:1px solid #a7f3d0;border-radius:10px;background:#fff}
.ts-settings-panel .ts-auto-checkout input{width:18px;height:18px;min-height:18px!important;margin-top:2px;accent-color:#059669;flex:none}
.ts-settings-panel .ts-auto-checkout strong{display:block;color:#065f46;font-size:12px}
.ts-settings-panel .ts-auto-checkout small{display:block;color:#64748b;font-size:11px;line-height:1.45;margin-top:3px}
.ts-settings-panel .ts-settings-information{grid-column:1/-1;margin-top:0!important;background:linear-gradient(120deg,#fff,#f8fafc)!important}
.ts-settings-panel .ts-settings-information-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}
.ts-settings-panel .ts-settings-information-grid>div{display:flex;flex-direction:column;gap:6px}
.ts-settings-panel .ts-settings-information-grid strong{font-size:12px}
.ts-settings-panel .ts-settings-information-grid span{font-size:11px;line-height:1.5}
@media(max-width:900px){
 .ts-settings-panel .ts-settings-content{grid-template-columns:minmax(0,1fr)!important}
 .ts-settings-panel .ts-settings-section:nth-child(n){grid-column:1!important}
 .ts-settings-panel .ts-settings-section:nth-child(3) .ts-settings-section-body{grid-template-columns:minmax(0,1fr)}
 .ts-settings-panel .ts-settings-section:nth-child(3) .ts-auto-sync-card{grid-column:1;grid-row:auto}
 .ts-settings-panel .ts-settings-information{grid-column:1}
 .ts-settings-panel .ts-settings-information-grid{grid-template-columns:repeat(2,minmax(0,1fr))}
}
@media(max-width:560px){
 .ts-settings-panel .ts-settings-section:nth-child(2) .ts-settings-row.five,
 .ts-settings-panel .ts-settings-section:nth-child(3) .ts-settings-row.four,
 .ts-settings-panel .ts-settings-section:nth-child(3) .ts-settings-row.two{grid-template-columns:minmax(0,1fr)!important}
 .ts-settings-panel .ts-settings-information-grid{grid-template-columns:minmax(0,1fr)}
}

  .ts-settings-panel .ts-pay-settings-toolbar{display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap;padding:13px 15px;margin-bottom:14px;border:1px solid #dbe4ef;border-radius:12px;background:linear-gradient(135deg,#f8fbff,#f4f7fb)}
  .ts-settings-panel .ts-pay-scope-copy{display:grid;gap:3px}
  .ts-settings-panel .ts-pay-scope-copy strong{font-size:13px;color:#172033}
  .ts-settings-panel .ts-pay-scope-copy span,.ts-settings-panel .ts-pay-sheet-select small,.ts-settings-panel .ts-pay-save-row small{font-size:11px;color:#64748b}
  .ts-settings-panel .ts-pay-scope-actions{display:flex;gap:7px;flex-wrap:wrap}
  .ts-settings-panel .ts-pay-scope-actions button{min-height:36px;padding:0 13px;border:1px solid #cbd5e1;border-radius:8px;background:#fff;color:#334155;font-size:12px;font-weight:800;cursor:pointer}
  .ts-settings-panel .ts-pay-scope-actions button.active{border-color:#2563eb;background:#2563eb;color:#fff;box-shadow:0 3px 8px rgba(37,99,235,.18)}
  .ts-settings-panel .ts-pay-sheet-select{display:grid;grid-template-columns:1fr;gap:6px;padding:12px 14px;margin-bottom:14px;border:1px solid #bfdbfe;border-radius:11px;background:#eff6ff}
  .ts-settings-panel .ts-pay-sheet-select label{font-size:11px;font-weight:800;color:#334155}
  .ts-settings-panel .ts-pay-sheet-select select{width:100%;min-height:40px;border:1px solid #cbd5e1;border-radius:8px;background:#fff;padding:0 11px;color:#0f172a;font-size:13px;font-weight:700}
  .ts-settings-panel .ts-pay-fields-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
  .ts-settings-panel .ts-pay-fields-grid .ts-settings-field{min-width:0}
  .ts-settings-panel .ts-pay-save-row{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-top:14px;padding-top:13px;border-top:1px solid #e2e8f0}
  .ts-settings-panel .ts-pay-save-row small{margin-right:auto}
  .ts-settings-panel .ts-pay-save-row button{min-height:39px;padding:0 17px;border:0;border-radius:9px;background:#2563eb;color:#fff;font-size:12px;font-weight:800;cursor:pointer}
  .ts-settings-panel .ts-pay-save-row button:disabled{background:#94a3b8;cursor:not-allowed}
  .ts-settings-panel .ts-pay-save-row button.saved{background:#059669}
  .ts-settings-panel .ts-pay-save-row button.error{background:#dc2626}
  .ts-settings-panel .ts-pay-save-row button.saving{background:#64748b}
  .ts-settings-panel .ts-save-spinner{display:inline-block;width:13px;height:13px;border:2px solid rgba(255,255,255,.4);border-top-color:#fff;border-radius:50%;animation:ts-save-spin .7s linear infinite;vertical-align:-2px}
  @keyframes ts-save-spin{to{transform:rotate(360deg)}}
  .ts-settings-panel .ts-pay-empty-state{padding:22px 14px;text-align:center;border:1px dashed #cbd5e1;border-radius:10px;color:#64748b;font-size:12px}
  @media(max-width:680px){.ts-settings-panel .ts-pay-fields-grid{grid-template-columns:minmax(0,1fr)}}
/* Reference layout: full-width stacked sections with split inner content */
.ts-settings-panel .ts-settings-content{display:flex!important;flex-direction:column!important;gap:16px!important;padding:18px!important;align-items:stretch!important}
.ts-settings-panel .ts-settings-section{width:100%!important;margin:0!important}
.ts-settings-panel .ts-settings-section:nth-child(1),.ts-settings-panel .ts-settings-section:nth-child(2),.ts-settings-panel .ts-settings-section:nth-child(3),.ts-settings-panel .ts-settings-section:nth-child(4){grid-column:auto!important}
.ts-settings-panel .ts-settings-section:nth-child(1) .ts-settings-row.two{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:18px!important}
.ts-settings-panel .ts-pay-layout{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.08fr);gap:18px;align-items:start}
.ts-settings-panel .ts-pay-target-column{display:flex;flex-direction:column;gap:12px;min-width:0}
.ts-settings-panel .ts-pay-values-column{min-width:0;padding-left:18px;border-left:1px solid #dbe4ee}
.ts-settings-panel .ts-pay-values-column .ts-pay-fields-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}
.ts-settings-panel .ts-pay-save-row{display:flex;justify-content:flex-end;align-items:center;gap:12px}
.ts-settings-panel .ts-settings-section:nth-child(3) .ts-settings-section-body{display:grid!important;grid-template-columns:minmax(0,1fr) minmax(0,1fr)!important;gap:14px 18px!important;align-items:start!important}
.ts-settings-panel .ts-work-target-panel,.ts-settings-panel .ts-work-sheet-select,.ts-settings-panel .ts-settings-section:nth-child(3) .ts-settings-row.four,.ts-settings-panel .ts-settings-section:nth-child(3) .ts-settings-row.two{grid-column:1!important}
.ts-settings-panel .ts-settings-section:nth-child(3) .ts-auto-sync-card{grid-column:2!important;grid-row:1 / span 4!important;align-self:start}
.ts-settings-panel .ts-work-save-row{grid-column:1 / -1!important}
.ts-settings-panel .ts-settings-section:nth-child(3) .ts-settings-row.four,.ts-settings-panel .ts-settings-section:nth-child(3) .ts-settings-row.two{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:12px!important}
.ts-settings-panel .ts-settings-appearance-layout{display:grid!important;grid-template-columns:minmax(0,1fr) minmax(0,1fr)!important;gap:22px!important;align-items:start!important}
.ts-settings-panel .ts-appearance-help-column{min-width:0;padding-left:20px;border-left:1px solid #dbe4ee}
.ts-settings-panel .ts-appearance-help-column .ts-settings-information{margin:0!important;padding:0!important;border:0!important;background:transparent!important}
.ts-settings-panel .ts-appearance-help-column .ts-settings-information-title{padding:0 0 12px;border:0}
.ts-settings-panel .ts-appearance-help-column .ts-settings-information-grid{display:flex!important;flex-direction:column;gap:10px}
.ts-settings-panel .ts-appearance-help-column .ts-settings-information-grid>div{display:grid;grid-template-columns:110px minmax(0,1fr);align-items:center;gap:12px;padding:10px 12px!important;background:#fff}
.ts-settings-panel .ts-appearance-help-column .ts-settings-information-grid strong{padding:7px 10px;border-radius:8px;background:#eff6ff;text-align:center}
@media(max-width:900px){
 .ts-settings-panel .ts-pay-layout,.ts-settings-panel .ts-settings-section:nth-child(3) .ts-settings-section-body,.ts-settings-panel .ts-settings-appearance-layout{grid-template-columns:minmax(0,1fr)!important}
 .ts-settings-panel .ts-pay-values-column,.ts-settings-panel .ts-appearance-help-column{border-left:0!important;padding-left:0!important;border-top:1px solid #dbe4ee;padding-top:16px}
 .ts-settings-panel .ts-settings-section:nth-child(3) .ts-auto-sync-card{grid-column:1!important;grid-row:auto!important}
 .ts-settings-panel .ts-settings-section:nth-child(1) .ts-settings-row.two,.ts-settings-panel .ts-settings-section:nth-child(3) .ts-settings-row.four,.ts-settings-panel .ts-settings-section:nth-child(3) .ts-settings-row.two{grid-template-columns:repeat(2,minmax(0,1fr))!important}
}
@media(max-width:560px){
 .ts-settings-panel .ts-settings-section:nth-child(1) .ts-settings-row.two,.ts-settings-panel .ts-pay-values-column .ts-pay-fields-grid,.ts-settings-panel .ts-settings-section:nth-child(3) .ts-settings-row.four,.ts-settings-panel .ts-settings-section:nth-child(3) .ts-settings-row.two{grid-template-columns:minmax(0,1fr)!important}
 .ts-settings-panel .ts-appearance-help-column .ts-settings-information-grid>div{grid-template-columns:minmax(0,1fr)}
}

`;

function PanelHeader({ title, subtitle, onClose }) {
  return (
    <div className="ts-panel-header ts-settings-header">
      <div className="ts-settings-header-left">
        <div className="ts-settings-header-icon">
          <Settings2 size={20} />
        </div>

        <div>
          <h2>{title}</h2>
          <p>{subtitle}</p>
        </div>
      </div>

      {onClose && (
        <button
          type="button"
          className="ts-panel-close"
          onClick={onClose}
          aria-label="Close settings"
        >
          <X size={18} />
        </button>
      )}
    </div>
  );
}

/* ---------------------------------------------------------
   SECTION
--------------------------------------------------------- */

function SettingsSection({
  icon: Icon,
  title,
  description,
  children,
}) {
  return (
    <section className="ts-settings-section">
      <div className="ts-settings-section-head">
        <div className="ts-settings-section-icon">
          <Icon size={17} />
        </div>

        <div>
          <h3>{title}</h3>
          {description && <p>{description}</p>}
        </div>
      </div>

      <div className="ts-settings-section-body">
        {children}
      </div>
    </section>
  );
}

/* ---------------------------------------------------------
   FIELD
--------------------------------------------------------- */

function Field({
  label,
  children,
  className = "",
}) {
  return (
    <label className={`ts-settings-field ${className}`}>
      <span className="ts-settings-field-label">{label}</span>
      {children}
    </label>
  );
}

/* ---------------------------------------------------------
   SETTINGS PANEL
--------------------------------------------------------- */

function SettingsPanel({
  settings,
  setSettings,
  sheets = [],
  onApplySheetSettings,
  paySettingsSelection,
  setPaySettingsSelection,
  workSettingsSelection,
  setWorkSettingsSelection,
  onApplySheetWorkSettings,
  onClose,
}) {
  // Parent-owned selection survives closing and reopening the Settings panel.
  const scope = paySettingsSelection?.scope || "all";
  const selectedSheetId = paySettingsSelection?.selectedSheetId || "";
  const setScope = value => setPaySettingsSelection?.(current => ({ ...current, scope: value }));
  const setSelectedSheetId = value => setPaySettingsSelection?.(current => ({ ...current, selectedSheetId: value }));
  const selectedPaySheet = sheets.find(item => item.id === selectedSheetId);
  const paySettings = scope === "selected" && selectedPaySheet
    ? { ...settings, ...(selectedPaySheet.paySettings || {}) }
    : settings;
  const [paySaveStatus, setPaySaveStatus] = useState("idle");
  const [payDraft, setPayDraft] = useState({
    defaultHourlyRate: paySettings.defaultHourlyRate ?? 0,
    otRate: paySettings.otRate ?? 0,
    offDayEarning: paySettings.offDayEarning ?? 0,
    absentEarning: paySettings.absentEarning ?? 0,
    currency: paySettings.currency || settings.currency || "AED",
  });
  useEffect(() => {
    setPayDraft({
      defaultHourlyRate: paySettings.defaultHourlyRate ?? 0,
      otRate: paySettings.otRate ?? 0,
      offDayEarning: paySettings.offDayEarning ?? 0,
      absentEarning: paySettings.absentEarning ?? 0,
      currency: paySettings.currency || settings.currency || "AED",
    });
  }, [scope, selectedPaySheet?.id, selectedPaySheet?.paySettings, settings.defaultHourlyRate, settings.otRate, settings.offDayEarning, settings.absentEarning, settings.currency]);
  const updatePay = (key, value) => {
    setPayDraft(current => ({ ...current, [key]: value }));
    setPaySaveStatus("idle");
  };
  const savePaySettings = () => {
    if (scope === "selected" && !selectedPaySheet) return;
    setPaySaveStatus("saving");
    try {
      if (scope === "all") {
        const nextSettings = { ...settings, ...payDraft };
        setSettings(nextSettings);
        localStorage.setItem("sodah-timesheet-settings", JSON.stringify(nextSettings));
        onApplySheetSettings?.("all", sheets.map(item => item.id), payDraft);
      } else {
        onApplySheetSettings?.("selected", [selectedSheetId], payDraft);
      }
      setPaySaveStatus("saved");
      window.setTimeout(() => setPaySaveStatus(current => current === "saved" ? "idle" : current), 2400);
    } catch (error) {
      console.error("Unable to save pay settings", error);
      setPaySaveStatus("error");
    }
  };
  const workScope = workSettingsSelection?.scope || "all";
  const selectedWorkSheetId = workSettingsSelection?.selectedSheetId || "";
  const setWorkScope = value => {
    setWorkSettingsSelection?.(current => ({ ...current, scope: value }));
    setWorkSaveStatus("idle");
  };
  const setSelectedWorkSheetId = value => {
    setWorkSettingsSelection?.(current => ({ ...current, selectedSheetId: value }));
    setWorkSaveStatus("idle");
  };
  const selectedWorkSheet = sheets.find(item => item.id === selectedWorkSheetId);
  const effectiveWorkSettings = workScope === "selected" && selectedWorkSheet
    ? { ...settings, ...(selectedWorkSheet.workSettings || {}) }
    : settings;
  const [workDraft, setWorkDraft] = useState(() => ({
    mode: effectiveWorkSettings.mode || "manual",
    defaultHours: effectiveWorkSettings.defaultHours ?? 8,
    workStart: effectiveWorkSettings.workStart || "08:00",
    workEnd: effectiveWorkSettings.workEnd || shiftEndFromStart(effectiveWorkSettings.workStart || "08:00", effectiveWorkSettings.defaultHours ?? 8),
    autoRule: effectiveWorkSettings.autoRule || "hour-to-hour",
    autoCheckout: Boolean(effectiveWorkSettings.autoCheckout),
    minimumCheckoutMinutes: effectiveWorkSettings.minimumCheckoutMinutes ?? 30,
    lateCheckInTime: effectiveWorkSettings.lateCheckInTime || "08:15",
    latePendingMinutes: effectiveWorkSettings.latePendingMinutes ?? 30,
  }));
  const [workSaveStatus, setWorkSaveStatus] = useState("idle");
  useEffect(() => {
    setWorkDraft({
      mode: effectiveWorkSettings.mode || "manual",
      defaultHours: effectiveWorkSettings.defaultHours ?? 8,
      workStart: effectiveWorkSettings.workStart || "08:00",
      workEnd: effectiveWorkSettings.workEnd || shiftEndFromStart(effectiveWorkSettings.workStart || "08:00", effectiveWorkSettings.defaultHours ?? 8),
      autoRule: effectiveWorkSettings.autoRule || "hour-to-hour",
      autoCheckout: Boolean(effectiveWorkSettings.autoCheckout),
      minimumCheckoutMinutes: effectiveWorkSettings.minimumCheckoutMinutes ?? 30,
      lateCheckInTime: effectiveWorkSettings.lateCheckInTime || "08:15",
      latePendingMinutes: effectiveWorkSettings.latePendingMinutes ?? 30,
    });
  }, [workScope, selectedWorkSheet?.id, selectedWorkSheet?.workSettings, settings]);
  const updateWorkDraft = (key, value) => {
    setWorkDraft(current => {
      const next = { ...current, [key]: value };
      if (next.mode === "automatic" && next.autoRule === "hour-to-hour" && ["workStart", "defaultHours", "mode", "autoRule"].includes(key)) {
        next.workEnd = shiftEndFromStart(next.workStart, next.defaultHours);
      }
      if (key === "workEnd" && next.mode === "automatic") {
        const [sh, sm] = String(next.workStart || "08:00").split(":").map(Number);
        const [eh, em] = String(value).split(":").map(Number);
        let duration = (eh * 60 + em) - (sh * 60 + sm);
        if (duration < 0) duration += 24 * 60;
        next.defaultHours = Math.max(0.5, Math.min(24, Math.round((duration / 60) * 2) / 2));
      }
      return next;
    });
    setWorkSaveStatus("idle");
  };
  const saveWorkSettings = () => {
    if (workScope === "selected" && !selectedWorkSheet) return;
    setWorkSaveStatus("saving");
    try {
      const values = {
        ...workDraft,
        defaultHours: Number(workDraft.defaultHours),
        minimumCheckoutMinutes: Number(workDraft.minimumCheckoutMinutes),
        latePendingMinutes: Number(workDraft.latePendingMinutes),
        workEnd: workDraft.mode === "automatic" && workDraft.autoRule === "hour-to-hour"
          ? shiftEndFromStart(workDraft.workStart, workDraft.defaultHours)
          : workDraft.workEnd,
      };
      const saved = onApplySheetWorkSettings?.(workScope, workScope === "all" ? sheets.map(item => item.id) : [selectedWorkSheetId], values);
      if (saved === false || !onApplySheetWorkSettings) throw new Error("Working-hours save handler is unavailable.");
      setWorkSaveStatus("saved");
      window.setTimeout(() => setWorkSaveStatus(current => current === "saved" ? "idle" : current), 2400);
    } catch (error) {
      console.error("Unable to save working-hours settings", error);
      setWorkSaveStatus("error");
    }
  };
  const u = (key, value) => {
    setSettings((s) => ({
      ...s,
      [key]: value,
    }));
  };

  return (
    <><style>{SETTINGS_PREMIUM_CSS}</style><section className="ts-panel ts-settings-panel">
      <PanelHeader
        title="Time Sheet Settings"
        subtitle="Configure your workspace, payroll rules and attendance behavior"
        onClose={onClose}
      />

      <div className="ts-settings-content">

        {/* =================================================
            COMPANY INFORMATION
        ================================================= */}

        <SettingsSection
          icon={Building2}
          title="Company Information"
          description="Basic information used throughout the time sheet workspace"
        >
          <div className="ts-settings-row two">
            <Field label="Company Name">
              <input
                type="text"
                value={settings.companyName || ""}
                onChange={(e) =>
                  u("companyName", e.target.value)
                }
                placeholder="Company name"
              />
            </Field>

            <Field label="Agency">
              <input
                type="text"
                value={settings.agencyName || ""}
                onChange={(e) =>
                  u("agencyName", e.target.value)
                }
                placeholder="Agency"
              />
            </Field>
          </div>
        </SettingsSection>

        {/* =================================================
            EARNINGS & PAY
        ================================================= */}

        <SettingsSection
          icon={WalletCards}
          title="Earnings & Pay"
          description="Set hourly, overtime and special attendance earnings for all sheets or one sheet"
        >
          <div className="ts-pay-layout"><div className="ts-pay-target-column">
          <div className="ts-pay-settings-toolbar">
            <div className="ts-pay-scope-copy">
              <strong>Apply pay settings to</strong>
              <span>{scope === "all" ? "One shared pay setup for every sheet" : "Edit the selected sheet only"}</span>
            </div>
            <div className="ts-pay-scope-actions">
              <button type="button" className={scope === "all" ? "active" : ""} onClick={() => setScope("all")}>All sheets</button>
              <button type="button" className={scope === "selected" ? "active" : ""} onClick={() => setScope("selected")}>Choose sheet to edit</button>
            </div>
          </div>

          {scope === "selected" && (
            <div className="ts-pay-sheet-select">
              <label htmlFor="ts-pay-sheet-select">Choose one sheet</label>
              <select id="ts-pay-sheet-select" value={selectedSheetId}
                onChange={event => setSelectedSheetId(event.target.value)}>
                <option value="">Select a sheet…</option>
                {sheets.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
              <small>{selectedPaySheet ? `Editing ${selectedPaySheet.name}. Other sheets will not be changed.` : "Select a sheet to load its individual pay settings."}</small>
            </div>
          )}

          </div><div className="ts-pay-values-column">
          {scope === "all" || selectedPaySheet ? (
            <>
              <div className="ts-pay-fields-grid">
                <Field label="Hourly Earning">
                  <div className="ts-input-with-prefix"><span>{payDraft.currency}</span><input type="number" min="0" step=".001" value={payDraft.defaultHourlyRate} onChange={e => updatePay("defaultHourlyRate", Number(e.target.value))}/></div>
                </Field>
                <Field label="O.T. Rate / Hour">
                  <div className="ts-input-with-prefix"><span>{payDraft.currency}</span><input type="number" min="0" step=".01" value={payDraft.otRate} onChange={e => updatePay("otRate", Number(e.target.value))}/></div>
                </Field>
                <Field label="Off-day Earning">
                  <div className="ts-input-with-prefix"><span>{payDraft.currency}</span><input type="number" min="0" step=".01" value={payDraft.offDayEarning} onChange={e => updatePay("offDayEarning", Number(e.target.value))}/></div>
                </Field>
                <Field label="Absent Earning">
                  <div className="ts-input-with-prefix"><span>{payDraft.currency}</span><input type="number" step=".01" value={payDraft.absentEarning} onChange={e => updatePay("absentEarning", Number(e.target.value))}/></div>
                </Field>
                <Field label="Currency">
                  <select value={payDraft.currency} onChange={e => updatePay("currency", e.target.value)}>
                    <option value="AED">AED</option><option value="USD">USD</option><option value="EUR">EUR</option><option value="GBP">GBP</option><option value="GHS">GHS</option>
                  </select>
                </Field>
              </div>
              <div className="ts-pay-save-row">
                <small aria-live="polite">{paySaveStatus === "saved" ? "All changes have been saved successfully." : paySaveStatus === "saving" ? "Saving your pay settings…" : paySaveStatus === "error" ? "Save failed. Please try again." : scope === "all" ? "Saving updates the shared rates for every sheet." : `Saving updates only ${selectedPaySheet.name}.`}</small>
                <button type="button" className={`ts-pay-save-button ${paySaveStatus}`} onClick={savePaySettings} disabled={(scope === "selected" && !selectedPaySheet) || paySaveStatus === "saving"}>
                  {paySaveStatus === "saving" ? <><span className="ts-save-spinner"/> Saving…</> : paySaveStatus === "saved" ? "✓ Saved" : paySaveStatus === "error" ? "Retry save" : "Save pay settings"}
                </button>
              </div>
            </>
          ) : (
            <div className="ts-pay-empty-state">Select a sheet above to view and edit its saved pay rates.</div>
          )}
          </div></div>
        </SettingsSection>

        {/* =================================================
            WORKING HOURS & ATTENDANCE
        ================================================= */}

        <SettingsSection
          icon={Clock3}
          title="Working Hours & Attendance"
          description="Configure independent shift hours, attendance rules and automatic check-out for each sheet"
        >
          <div className="ts-work-target-panel">
            <div>
              <strong>Apply working hours to</strong>
              <small>{workScope === "all" ? "All sheets will use the same working-hour rules." : selectedWorkSheet ? `Only ${selectedWorkSheet.name} will be updated.` : "Choose a sheet to edit its working-hour rules."}</small>
            </div>
            <div className="ts-work-target-actions">
              <button type="button" className={workScope === "all" ? "active" : ""} onClick={() => setWorkScope("all")}>All sheets</button>
              <button type="button" className={workScope === "selected" ? "active" : ""} onClick={() => setWorkScope("selected")}>Choose sheet to edit</button>
            </div>
          </div>
          {workScope === "selected" && (
            <div className="ts-work-sheet-select">
              <Field label="Choose one sheet">
                <select value={selectedWorkSheetId} onChange={e => setSelectedWorkSheetId(e.target.value)}>
                  <option value="">Select a sheet</option>
                  {sheets.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
                </select>
              </Field>
              <small>{selectedWorkSheet ? `Editing ${selectedWorkSheet.name}. Other sheets will not be changed.` : "Select a sheet to load its saved working-hour settings."}</small>
            </div>
          )}
          {workScope === "all" || selectedWorkSheet ? (
            <>
              <div className="ts-settings-row four">
                <Field label="Operation Mode">
                  <select value={workDraft.mode} onChange={e => updateWorkDraft("mode", e.target.value)}>
                    <option value="manual">Manual</option><option value="automatic">Automatic</option>
                  </select>
                </Field>
                <Field label="Duty Hours">
                  <select value={workDraft.defaultHours} onChange={e => updateWorkDraft("defaultHours", Number(e.target.value))}>
                    {Array.from({ length: 48 }, (_, i) => { const hours = (i + 1) / 2; return <option key={hours} value={hours}>{hours} {hours === 1 ? "Hour" : "Hours"}</option>; })}
                  </select>
                </Field>
                <Field label="Work Start">
                  <input type="time" value={workDraft.workStart} onChange={e => updateWorkDraft("workStart", e.target.value)}/>
                </Field>
                <Field label="Work End">
                  <input type="time" value={workDraft.workEnd} disabled={workDraft.mode === "automatic" && workDraft.autoRule === "hour-to-hour"} onChange={e => updateWorkDraft("workEnd", e.target.value)}/>
                  {workDraft.mode === "automatic" && <small className="ts-field-note">{workDraft.autoRule === "hour-to-hour" ? "Calculated from Work Start + Duty Hours." : "Employees check out manually."}</small>}
                </Field>
              </div>
              {workDraft.mode === "automatic" && (
                <div className="ts-auto-sync-card">
                  <div className="ts-auto-sync-title"><span className="ts-auto-sync-bubble"><Clock3 size={20}/></span><span>Automatic Mode Sync</span></div>
                  <div style={{fontSize:12,lineHeight:1.5,color:"#475569"}}>{workDraft.autoRule === "hour-to-hour" ? "Work End is calculated from Work Start + Duty Hours." : "Employees finish with a manual check-out."}</div>
                  <div className="ts-auto-sync-equation">
                    <span>Work Start<strong>{workDraft.workStart}</strong></span><b>+</b>
                    <span>Duty Hours<strong>{workDraft.defaultHours} {Number(workDraft.defaultHours) === 1 ? "Hour" : "Hours"}</strong></span><b>=</b>
                    <span>Work End<strong>{workDraft.workEnd}</strong></span>
                  </div>
                  <div className="ts-auto-sync-note">Changing Duty Hours or Work Start recalculates Work End automatically.</div>
                  <label className="ts-auto-checkout">
                    <input type="checkbox" checked={workDraft.autoCheckout} onChange={e => updateWorkDraft("autoCheckout", e.target.checked)}/>
                    <span><strong>Enable Automatic Check-out</strong><small>Automatically check out employees at the configured Work End time.</small></span>
                  </label>
                </div>
              )}
              <div className="ts-settings-row two compact-row">
                {workDraft.mode === "automatic" && (
                  <Field label="Automatic Rule">
                    <select value={workDraft.autoRule} onChange={e => updateWorkDraft("autoRule", e.target.value)}>
                      <option value="hour-to-hour">Hour to Hour — exact duty time</option><option value="hour-to-any">Hour to Any — actual worked time</option>
                    </select>
                  </Field>
                )}
                <Field label="Late Check-in Time">
                  <input type="time" value={workDraft.lateCheckInTime} onChange={e => updateWorkDraft("lateCheckInTime", e.target.value)}/>
                </Field>
                <Field label="Late Check-in Grace Period">
                  <input type="number" min="1" value={workDraft.latePendingMinutes} onChange={e => updateWorkDraft("latePendingMinutes", Number(e.target.value))}/>
                </Field>
                <Field label="Minimum Check-out">
                  <div className="ts-input-with-suffix"><input type="number" min="1" value={workDraft.minimumCheckoutMinutes} onChange={e => updateWorkDraft("minimumCheckoutMinutes", Number(e.target.value))}/><span>minutes</span></div>
                </Field>
              </div>
              <div className="ts-work-save-row">
                <small aria-live="polite">
                  {workSaveStatus === "saved" ? "Working-hour settings saved successfully." : workSaveStatus === "saving" ? "Saving working-hour settings…" : workSaveStatus === "error" ? "Save failed. Please try again." : workScope === "all" ? "Save to apply these working hours to every sheet." : `Save changes for ${selectedWorkSheet.name} only.`}
                </small>
                <button type="button" className={`ts-work-save-button ${workSaveStatus}`} onClick={saveWorkSettings} disabled={(workScope === "selected" && !selectedWorkSheet) || workSaveStatus === "saving"}>
                  {workSaveStatus === "saving" ? <><span className="ts-save-spinner"/> Saving…</> : workSaveStatus === "saved" ? "✓ Saved" : workSaveStatus === "error" ? "Retry save" : "Save working hours"}
                </button>
              </div>
            </>
          ) : <div className="ts-pay-empty-state">Select a sheet above to view and edit its working-hour settings.</div>}
        </SettingsSection>

        {/* =================================================
            WORKSPACE APPEARANCE
        ================================================= */}

        <SettingsSection
          icon={Palette}
          title="Workspace Appearance"
          description="Customize the visual appearance of the time sheet workspace"
        >

          <div className="ts-settings-appearance-layout">

            <div className="ts-appearance-mode-block">
              <span className="ts-settings-field-label">
                Display Mode
              </span>

              <div className="ts-mode-buttons">
                <button
                  type="button"
                  className={
                    settings.theme === "light"
                      ? "active"
                      : ""
                  }
                  onClick={() =>
                    u("theme", "light")
                  }
                >
                  Normal Mode
                </button>

                <button
                  type="button"
                  className={
                    settings.theme === "dark"
                      ? "active"
                      : ""
                  }
                  onClick={() =>
                    u("theme", "dark")
                  }
                >
                  Dark Mode
                </button>
              </div>
            </div>

            {settings.theme === "dark" && (
              <div className="ts-dark-background-block">

                <span className="ts-settings-field-label">
                  Background
                </span>

                <div className="ts-theme-picker">
                  {Object.entries(
                    DARK_PALETTES
                  ).map(
                    ([key, palette]) => (
                      <button
                        type="button"
                        key={key}
                        className={`ts-theme-swatch ${
                          settings.backgroundTheme ===
                          key
                            ? "active"
                            : ""
                        } ${key}`}
                        onClick={() =>
                          u(
                            "backgroundTheme",
                            key
                          )
                        }
                        title={palette.label}
                      >
                        <span className="ts-theme-swatch-color" />
                        <span>
                          {palette.label}
                        </span>
                      </button>
                    )
                  )}
                </div>

              </div>
            )}

            <div className="ts-brand-colors-block">

              <Field label="Primary Color">
                <div className="ts-color-control">
                  <input
                    type="color"
                    value={
                      settings.accent ||
                      "#10B981"
                    }
                    onChange={(e) =>
                      u(
                        "accent",
                        e.target.value
                      )
                    }
                  />

                  <span>
                    {settings.accent ||
                      "#10B981"}
                  </span>
                </div>
              </Field>

              <Field label="Secondary Color">
                <div className="ts-color-control">
                  <input
                    type="color"
                    value={
                      settings.accent2 ||
                      "#2563EB"
                    }
                    onChange={(e) =>
                      u(
                        "accent2",
                        e.target.value
                      )
                    }
                  />

                  <span>
                    {settings.accent2 ||
                      "#2563EB"}
                  </span>
                </div>
              </Field>

            </div>

          <div className="ts-appearance-help-column">        <div className="ts-settings-information">

          <div className="ts-settings-information-title">
            How these settings work
          </div>

          <div className="ts-settings-information-grid">

            <div>
              <strong>Manual</strong>
              <span>
                The selected Duty Hours value is
                used for scheduled earning.
                Check-out still follows the
                configured minimum wait time.
              </span>
            </div>

            <div>
              <strong>Automatic</strong>
              <span>
                Work Start + Duty Hours
                automatically calculate Work End.
                Existing and next-duty rows follow
                the same rule.
              </span>
            </div>

            <div>
              <strong>O.T.</strong>
              <span>
                Enter overtime hours in the O.T.
                column. The system multiplies those
                hours by the O.T. hourly rate.
              </span>
            </div>

            <div>
              <strong>Appearance</strong>
              <span>
                Your selected workspace appearance
                is remembered on this device.
              </span>
            </div>

          </div>

        </div></div>
          </div>

        </SettingsSection>

        {/* =================================================
            INFORMATION
        ================================================= */}



      </div>
    </section></>
  );
}
return { SettingsPanel };
})();
export { SettingsPanel };
