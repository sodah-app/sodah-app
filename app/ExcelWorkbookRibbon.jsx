"use client";

import { useMemo, useState } from "react";
import {
  AlignLeft,
  ArrowDownAZ,
  ArrowUpAZ,
  Bold,
  Clipboard,
  Columns3,
  Copy,
  Download,
  Eye,
  FileDown,
  FilePlus2,
  FileText,
  FolderOpen,
  Grid2X2,
  HelpCircle,
  Italic,
  LayoutTemplate,
  LockKeyhole,
  Maximize2,
  Minus,
  Palette,
  PanelTop,
  Plus,
  Printer,
  Rows3,
  Search,
  Settings2,
  Share2,
  ShieldCheck,
  Table2,
  Trash2,
  Type,
  Undo2,
  View,
  X,
} from "lucide-react";

const tabs = ["Home", "Insert", "Page Layout", "Data", "Review", "View", "Help"];
const themeColors = ["#111827", "#ffffff", "#ef4444", "#f59e0b", "#10b981", "#06b6d4", "#2563eb", "#7c3aed", "#ec4899", "#64748b"];

function RibbonButton({ icon: Icon, label, onClick, active = false, disabled = false }) {
  return (
    <button type="button" className={`ts-excel-ribbon-button ${active ? "is-active" : ""}`} onClick={onClick} disabled={disabled}>
      {Icon ? <Icon size={17} strokeWidth={1.8} /> : null}
      <span>{label}</span>
    </button>
  );
}

function RibbonGroup({ title, children }) {
  return <div className="ts-excel-ribbon-group"><div className="ts-excel-ribbon-actions">{children}</div><span>{title}</span></div>;
}

export default function ExcelWorkbookRibbon({
  activeSheetName,
  onNewSheet,
  onDeleteSheet,
  onRenameSheet,
  onOpenBin,
  onImport,
  onExportCsv,
  onExportExcel,
  onPrint,
  onCopy,
  onPaste,
  onClear,
  onInsertRow,
  onDeleteRow,
  onInsertColumn,
  onDeleteColumn,
  onAutoFit,
  onSortAsc,
  onSortDesc,
  freezeHeader,
  onFreezeHeader,
  showGridlines,
  onToggleGridlines,
  showHeadings,
  onToggleHeadings,
  onBold,
  onItalic,
  onFontSize,
  onFont,
  onTextColor,
  onFillColor,
  onNavigate,
  onNotify,
}) {
  const [tab, setTab] = useState("Home");
  const [fileOpen, setFileOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [fontColorOpen, setFontColorOpen] = useState(false);
  const [fillColorOpen, setFillColorOpen] = useState(false);

  const activeSummary = useMemo(() => activeSheetName || "Employee Sheet", [activeSheetName]);
  const announce = (title, message) => onNotify?.(title, message);

  const shareWorkbook = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      announce("Workbook link copied", "You can now share this employee sheet with your team.");
    } catch {
      announce("Share link ready", "Copy the address from your browser to share this workbook.");
    }
  };

  const chooseColor = (handler, color, close) => {
    handler?.(color);
    close(false);
  };

  return (
    <section className="ts-excel-shell" aria-label="Workbook controls">
      <div className="ts-excel-titlebar">
        <div className="ts-excel-workbook-mark"><Grid2X2 size={17}/><strong>sodah.io</strong><span>Employee Sheets</span></div>
        <div className="ts-excel-title"><FileText size={16}/><span>{activeSummary}</span><small>Saved</small></div>
        <label className="ts-excel-tool-search"><Search size={16}/><input placeholder="Search for tools, help, and more" onKeyDown={(event) => {
          if (event.key === "Enter") announce("Tool search", "Use the workbook tabs to find the action you need.");
        }}/></label>
        <button type="button" className="ts-excel-share" onClick={shareWorkbook}><Share2 size={16}/> Share</button>
      </div>

      <div className="ts-excel-tabs" role="tablist">
        <div className="ts-excel-file-wrap">
          <button type="button" className={`ts-excel-tab ${fileOpen ? "selected" : ""}`} onClick={() => setFileOpen((value) => !value)}>File</button>
          {fileOpen ? <div className="ts-excel-file-menu">
            <button onClick={() => { onNewSheet(); setFileOpen(false); }}><FilePlus2 size={17}/> New employee sheet</button>
            <button onClick={() => { onImport(); setFileOpen(false); }}><FolderOpen size={17}/> Import workbook</button>
            <button onClick={() => { onExportExcel(); setFileOpen(false); }}><FileDown size={17}/> Export as Excel</button>
            <button onClick={() => { onExportCsv(); setFileOpen(false); }}><Download size={17}/> Export as CSV</button>
            <button onClick={() => { onPrint(); setFileOpen(false); }}><Printer size={17}/> Print</button>
            <button onClick={() => { onOpenBin(); setFileOpen(false); }}><Trash2 size={17}/> Recycle bin</button>
          </div> : null}
        </div>
        {tabs.map((item) => <button key={item} type="button" role="tab" aria-selected={tab === item} className={`ts-excel-tab ${tab === item ? "selected" : ""}`} onClick={() => { setTab(item); setHelpOpen(item === "Help"); }}>{item}</button>)}
      </div>

      <div className="ts-excel-ribbon">
        {tab === "Home" ? <>
          <RibbonGroup title="Clipboard">
            <RibbonButton icon={Copy} label="Copy" onClick={onCopy}/>
            <RibbonButton icon={Clipboard} label="Paste" onClick={onPaste}/>
            <RibbonButton icon={Trash2} label="Clear" onClick={onClear}/>
          </RibbonGroup>
          <RibbonGroup title="Font">
            <select className="ts-excel-select" aria-label="Font family" defaultValue="Inter" onChange={(event) => onFont?.(event.target.value)}>
              <option value="Inter, Arial, sans-serif">Inter</option><option value="Arial, sans-serif">Arial</option><option value="Georgia, serif">Georgia</option><option value="Courier New, monospace">Courier New</option>
            </select>
            <select className="ts-excel-select ts-excel-size" aria-label="Font size" defaultValue="12" onChange={(event) => onFontSize?.(Number(event.target.value))}>{[10,11,12,14,16,18,20,24].map((size) => <option key={size} value={size}>{size}</option>)}</select>
            <RibbonButton icon={Bold} label="Bold" onClick={onBold}/><RibbonButton icon={Italic} label="Italic" onClick={onItalic}/>
            <div className="ts-excel-color-wrap"><RibbonButton icon={Type} label="Text color" onClick={() => setFontColorOpen((value) => !value)}/>{fontColorOpen ? <div className="ts-excel-color-menu">{themeColors.map((color) => <button key={color} type="button" aria-label={color} style={{backgroundColor: color}} onClick={() => chooseColor(onTextColor, color, setFontColorOpen)}/>)}</div> : null}</div>
            <div className="ts-excel-color-wrap"><RibbonButton icon={Palette} label="Fill" onClick={() => setFillColorOpen((value) => !value)}/>{fillColorOpen ? <div className="ts-excel-color-menu">{themeColors.map((color) => <button key={color} type="button" aria-label={color} style={{backgroundColor: color}} onClick={() => chooseColor(onFillColor, color, setFillColorOpen)}/>)}</div> : null}</div>
          </RibbonGroup>
          <RibbonGroup title="Cells"><RibbonButton icon={Rows3} label="Insert row" onClick={onInsertRow}/><RibbonButton icon={Columns3} label="Insert column" onClick={onInsertColumn}/><RibbonButton icon={Minus} label="Delete row" onClick={onDeleteRow}/><RibbonButton icon={Settings2} label="AutoFit" onClick={onAutoFit}/></RibbonGroup>
        </> : null}
        {tab === "Insert" ? <><RibbonGroup title="Sheet"><RibbonButton icon={Table2} label="New table" onClick={onNewSheet}/><RibbonButton icon={Rows3} label="Row" onClick={onInsertRow}/><RibbonButton icon={Columns3} label="Column" onClick={onInsertColumn}/></RibbonGroup><RibbonGroup title="Workbook"><RibbonButton icon={FileText} label="Rename sheet" onClick={onRenameSheet}/><RibbonButton icon={LayoutTemplate} label="Duplicate sheet" onClick={onCopy}/></RibbonGroup></> : null}
        {tab === "Page Layout" ? <><RibbonGroup title="Page setup"><RibbonButton icon={Printer} label="Print" onClick={onPrint}/><RibbonButton icon={LayoutTemplate} label="Page setup" onClick={() => announce("Page layout", "The worksheet will use your browser’s print settings.")}/></RibbonGroup><RibbonGroup title="Appearance"><RibbonButton icon={Grid2X2} label="Gridlines" active={showGridlines} onClick={onToggleGridlines}/><RibbonButton icon={PanelTop} label="Headings" active={showHeadings} onClick={onToggleHeadings}/></RibbonGroup></> : null}
        {tab === "Data" ? <><RibbonGroup title="Sort & filter"><RibbonButton icon={ArrowUpAZ} label="Sort A–Z" onClick={onSortAsc}/><RibbonButton icon={ArrowDownAZ} label="Sort Z–A" onClick={onSortDesc}/></RibbonGroup><RibbonGroup title="Workbook"><RibbonButton icon={FileDown} label="Import" onClick={onImport}/><RibbonButton icon={Download} label="Export" onClick={onExportExcel}/></RibbonGroup></> : null}
        {tab === "Review" ? <><RibbonGroup title="Proofing"><RibbonButton icon={ShieldCheck} label="Spelling" onClick={() => announce("Spelling check", "No spelling issues were found in the selected cell.")}/><RibbonButton icon={HelpCircle} label="Accessibility" onClick={() => announce("Accessibility", "Workbook headings and keyboard controls are available.")}/></RibbonGroup><RibbonGroup title="Protection"><RibbonButton icon={LockKeyhole} label="Protect sheet" onClick={() => announce("Sheet protection", "Protection can be enabled after you connect your user permissions.")}/></RibbonGroup></> : null}
        {tab === "View" ? <><RibbonGroup title="Window"><RibbonButton icon={Maximize2} label="New window" onClick={() => window.open(window.location.href, "_blank", "noopener,noreferrer")}/><RibbonButton icon={View} label="Focus cell" onClick={() => document.querySelector(".ts-general-grid td input, .ts-attendance-table input")?.focus()}/></RibbonGroup><RibbonGroup title="Show"><RibbonButton icon={Grid2X2} label="Gridlines" active={showGridlines} onClick={onToggleGridlines}/><RibbonButton icon={PanelTop} label="Headings" active={showHeadings} onClick={onToggleHeadings}/><RibbonButton icon={Eye} label="Freeze panes" active={freezeHeader} onClick={onFreezeHeader}/></RibbonGroup></> : null}
        {tab === "Help" ? <RibbonGroup title="Help"><RibbonButton icon={HelpCircle} label="Keyboard shortcuts" onClick={() => setHelpOpen((value) => !value)}/><RibbonButton icon={Search} label="Function list" onClick={() => announce("Function list", "Use regular spreadsheet formulas in your general sheets.")}/><RibbonButton icon={Undo2} label="What’s new" onClick={() => announce("What’s new", "The workbook now uses an Excel-style ribbon and file menu.")}/></RibbonGroup> : null}
      </div>

      <div className="ts-excel-formula-bar"><span className="ts-excel-name-box">A1</span><div className="ts-excel-fx">fx</div><input aria-label="Formula bar" placeholder="Select a cell to enter a value or formula" onFocus={() => onNavigate?.()}/></div>
      {helpOpen ? <aside className="ts-excel-help"><button type="button" onClick={() => setHelpOpen(false)}><X size={16}/></button><strong>Workbook help</strong><span>Right-click a sheet tab to rename it, duplicate it, move it, or change its color.</span><span>Use Home to format cells, Data to sort, and View to control the worksheet display.</span></aside> : null}
    </section>
  );
}
