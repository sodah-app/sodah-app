"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { FileText, Plus, Download, Printer, X, ChevronDown, ChevronUp, RotateCcw, Copy, Clipboard, Trash2, Rows3, Columns3, Bold, Italic, Type, Palette, Paintbrush, Undo2, ChevronsUpDown, FilePlus2, Maximize2, MoreHorizontal, AlignLeft, AlignCenter, AlignRight } from "lucide-react";

const STORAGE_KEY = "sodah-general-sheet-v2";
const MAX_SHEETS = 20;
const MAX_ROWS = 50;
const ROW_GROWTH = 10;
const MAX_COLS = 40;
const DEFAULT_ROWS = 20;
const DEFAULT_COLS = 10;
const DEFAULT_COL_WIDTH = 110;
const DEFAULT_ROW_HEIGHT = 24;
const COLORS = ["#ffffff", "#fff2cc", "#e2f0d9", "#d9eaf7", "#fce4ec", "#e4dfec", "#d9ead3", "#e7e6e6", "#f4cccc", "#d9d2e9", "#cfe2f3", "#d0e0e3"];

function columnLabel(index) {
  let n = index + 1;
  let out = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    out = String.fromCharCode(65 + rem) + out;
    n = Math.floor((n - 1) / 26);
  }
  return out;
}

function makeCell(value = "", color = "", extra = {}) {
  return {
    value: String(value ?? ""),
    color: color || "",
    textColor: extra.textColor || "",
    fontSize: Number(extra.fontSize) || 12,
    fontFamily: extra.fontFamily || "Inter, Arial, sans-serif",
    fontWeight: extra.fontWeight || 400,
    fontStyle: extra.fontStyle || "normal",
    textDecoration: extra.textDecoration || "none"
  };
}

function makeSheet(number) {
  const columns = Array.from({ length: DEFAULT_COLS }, (_, i) => columnLabel(i));
  return {
    id: `general-${Date.now()}-${number}-${Math.random().toString(36).slice(2)}`,
    name: `General Sheet ${number}`,
    columns,
    widths: columns.map(() => DEFAULT_COL_WIDTH),
    rowHeights: Array.from({ length: DEFAULT_ROWS }, () => DEFAULT_ROW_HEIGHT),
    tabColor: "#10b981",
    rows: Array.from({ length: DEFAULT_ROWS }, () => columns.map(() => makeCell()))
  };
}

function normalizeSheet(source, number) {
  const fallback = makeSheet(number);
  const sourceCols = Array.isArray(source?.columns) && source.columns.length ? source.columns.slice(0, MAX_COLS) : fallback.columns;
  const columnCount = Math.max(1, sourceCols.length);
  const columns = Array.from({ length: columnCount }, (_, i) => String(sourceCols[i] || columnLabel(i)));
  const sourceRows = Array.isArray(source?.rows) && source.rows.length ? source.rows.slice(0, MAX_ROWS) : fallback.rows;
  const rows = sourceRows.map(row => Array.from({ length: columnCount }, (_, i) => {
    const cell = row?.[i];
    return typeof cell === "object" && cell !== null ? makeCell(cell.value, cell.color, cell) : makeCell(cell);
  }));
  const widths = Array.from({ length: columnCount }, (_, i) => Math.max(54, Math.min(360, Number(source?.widths?.[i]) || DEFAULT_COL_WIDTH)));
  const rowHeights = Array.from({ length: rows.length }, (_, i) => Math.max(18, Math.min(120, Number(source?.rowHeights?.[i]) || DEFAULT_ROW_HEIGHT)));
  return {
    id: source?.id || fallback.id,
    name: source?.name || `General Sheet ${number}`,
    columns,
    widths,
    rowHeights,
    tabColor: source?.tabColor || fallback.tabColor,
    rows: rows.length ? rows : fallback.rows
  };
}

const safeGeneralStorageWrite = (key, value) => {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.setItem(key, value);
      return true;
    }
  } catch (error) {
    console.warn(`Unable to save ${key} locally`, error);
  }
  return false;
};

function GeneralSheetPanel({ onClose, autoSaveEnabled = true }) {
  const [sheets, setSheets] = useState([]);
  const [activeId, setActiveId] = useState("");
  const [selected, setSelected] = useState({ row: 0, col: 0 });
  const [selectionEnd, setSelectionEnd] = useState({ row: 0, col: 0 });
  const [dragSelecting, setDragSelecting] = useState(false);
  const [clipboard, setClipboard] = useState(null);
  const [trash, setTrash] = useState([]);
  const [trashOpen, setTrashOpen] = useState(false);
  const [undoStack, setUndoStack] = useState([]);
  const [redoStack, setRedoStack] = useState([]);
  const [fontSizeValue, setFontSizeValue] = useState(12);
  const [fontFamilyValue, setFontFamilyValue] = useState("Arial");
  const [fontOpen, setFontOpen] = useState(false);
  const [fontSizeOpen, setFontSizeOpen] = useState(false);
  const [textColorOpen, setTextColorOpen] = useState(false);
  const [colorOpen, setColorOpen] = useState(false);
  const [sheetColorOpen, setSheetColorOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [sheetContext, setSheetContext] = useState(null);
  const [ribbonTab, setRibbonTab] = useState("Home");
  const [resize, setResize] = useState(null);
  const [palettePosition, setPalettePosition] = useState({ top: 180, left: 700 });
  const gridRef = useRef(null);
  const autoSaveEnabledRef = useRef(autoSaveEnabled);
  autoSaveEnabledRef.current = autoSaveEnabled;

  const openPalette = (kind, event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const width = 230;
    const left = Math.max(12, Math.min(rect.left, window.innerWidth - width - 12));
    const top = Math.max(12, Math.min(rect.bottom + 8, window.innerHeight - 190));
    setPalettePosition({ top, left });
    if (kind === "text") {
      setTextColorOpen(value => !value);
      setColorOpen(false);
    } else {
      setColorOpen(value => !value);
      setTextColorOpen(false);
    }
  };

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || localStorage.getItem("sodah-general-sheet-v1") || "null");
      const savedTrash = JSON.parse(localStorage.getItem("sodah-general-sheet-trash-v1") || "[]");
      setTrash(Array.isArray(savedTrash) ? savedTrash : []);
      const list = Array.isArray(saved) && saved.length
        ? saved.slice(0, MAX_SHEETS).map((s, i) => normalizeSheet(s, i + 1))
        : [makeSheet(1)];
      setSheets(list);
      setActiveId(list[0].id);
    } catch {
      const first = makeSheet(1);
      setSheets([first]);
      setActiveId(first.id);
    }
  }, []);

  useEffect(() => {
    if (!autoSaveEnabledRef.current || !sheets.length) return;
    safeGeneralStorageWrite(STORAGE_KEY, JSON.stringify(sheets));
  }, [sheets]);

  useEffect(() => {
    if (!autoSaveEnabledRef.current) return;
    safeGeneralStorageWrite("sodah-general-sheet-trash-v1", JSON.stringify(trash));
  }, [trash]);

  useEffect(() => {
    const handleCommand = (event) => {
      const { command, payload } = event.detail || {};
      if (command === "newSheet") addSheet();
      else if (command === "deleteSheet") deleteSheet();
      else if (command === "rename") renameSheet();
      else if (command === "insertRow") insertRow();
      else if (command === "deleteRow") removeRow();
      else if (command === "insertColumn") insertColumn();
      else if (command === "deleteColumn") removeColumn();
      else if (command === "autoFit") autoFitAllColumns();
      else if (command === "copy") copyCell();
      else if (command === "paste") pasteCell();
      else if (command === "clear") clearCell();
      else if (command === "format") updateSelectionCells(payload || {});
      else if (command === "print") window.print();
      else if (command === "openBin") setTrashOpen(true);
      else if (command === "saveNow") {
        safeGeneralStorageWrite(STORAGE_KEY, JSON.stringify(sheets));
        safeGeneralStorageWrite("sodah-general-sheet-trash-v1", JSON.stringify(trash));
      }
    };
    const refresh = () => {
      try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
        const savedTrash = JSON.parse(localStorage.getItem("sodah-general-sheet-trash-v1") || "[]");
        if (Array.isArray(saved) && saved.length) {
          const list = saved.slice(0, MAX_SHEETS).map((item, i) => normalizeSheet(item, i + 1));
          setSheets(list);
          setActiveId(prev => list.some(item => item.id === prev) ? prev : list[0].id);
        }
        setTrash(Array.isArray(savedTrash) ? savedTrash : []);
      } catch {}
    };
    window.addEventListener("sodah-general-sheet-command", handleCommand);
    window.addEventListener("sodah-general-sheet-refresh", refresh);
    return () => {
      window.removeEventListener("sodah-general-sheet-command", handleCommand);
      window.removeEventListener("sodah-general-sheet-refresh", refresh);
    };
  });

  useEffect(() => {
    const stop = () => setDragSelecting(false);
    window.addEventListener("mouseup", stop);
    return () => window.removeEventListener("mouseup", stop);
  }, []);

  const sheet = sheets.find(s => s.id === activeId) || sheets[0];
  const activeCell = sheet?.rows?.[selected.row]?.[selected.col] || makeCell();
  const range = useMemo(() => ({
    minRow: Math.min(selected.row, selectionEnd.row),
    maxRow: Math.max(selected.row, selectionEnd.row),
    minCol: Math.min(selected.col, selectionEnd.col),
    maxCol: Math.max(selected.col, selectionEnd.col)
  }), [selected, selectionEnd]);
  const address = range.minRow === range.maxRow && range.minCol === range.maxCol
    ? `${columnLabel(range.minCol)}${range.minRow + 1}`
    : `${columnLabel(range.minCol)}${range.minRow + 1}:${columnLabel(range.maxCol)}${range.maxRow + 1}`;
  const isInSelection = (row, col) => row >= range.minRow && row <= range.maxRow && col >= range.minCol && col <= range.maxCol;

  const updateSheet = (fn) => {
    if (!sheet) return;
    const snapshot = JSON.parse(JSON.stringify(sheets));
    setUndoStack(prev => [...prev.slice(-49), snapshot]);
    setRedoStack([]);
    setSheets(prev => prev.map(item => item.id === sheet.id ? fn(item) : item));
  };
  const undoSheet = () => {
    if (!undoStack.length) return;
    setRedoStack(prev => [...prev, JSON.parse(JSON.stringify(sheets))]);
    const previous = undoStack[undoStack.length - 1];
    setUndoStack(prev => prev.slice(0, -1));
    setSheets(previous);
    setActiveId(previous.some(x => x.id === activeId) ? activeId : previous[0]?.id || "");
  };
  const redoSheet = () => {
    if (!redoStack.length) return;
    setUndoStack(prev => [...prev, JSON.parse(JSON.stringify(sheets))]);
    const next = redoStack[redoStack.length - 1];
    setRedoStack(prev => prev.slice(0, -1));
    setSheets(next);
    setActiveId(next.some(x => x.id === activeId) ? activeId : next[0]?.id || "");
  };

  const clampCell = (row, col) => ({
    row: Math.max(0, Math.min((sheet?.rows?.length || 1) - 1, row)),
    col: Math.max(0, Math.min((sheet?.columns?.length || 1) - 1, col))
  });

  const setSelection = (row, col) => {
    const next = clampCell(row, col);
    setSelected(next);
    setSelectionEnd(next);
    setColorOpen(false);
    setSheetColorOpen(false);
    setFontOpen(false);
    setFontSizeOpen(false);
    setTextColorOpen(false);
    const selectedCell = sheet?.rows?.[next.row]?.[next.col];
    if (selectedCell) { setFontSizeValue(Number(selectedCell.fontSize) || 12); setFontFamilyValue(selectedCell.fontFamily || "Arial"); }
  };

  const startRangeSelection = (row, col) => {
    const next = clampCell(row, col);
    setSelected(next);
    setSelectionEnd(next);
    setDragSelecting(true);
    const selectedCell = sheet?.rows?.[next.row]?.[next.col];
    if (selectedCell) {
      setFontSizeValue(Number(selectedCell.fontSize) || 12);
      setFontFamilyValue(selectedCell.fontFamily || "Arial");
    }
  };

  const extendRangeSelection = (row, col) => {
    if (!dragSelecting) return;
    setSelectionEnd(clampCell(row, col));
  };

  const updateCell = (row, col, value) => updateSheet(s => {
    let rows = s.rows.map((r, ri) => ri === row ? r.map((c, ci) => ci === col ? { ...c, value } : c) : r);
    const hasValue = String(value ?? "").trim() !== "";
    if (hasValue && row === rows.length - 1 && rows.length < MAX_ROWS) {
      const count = Math.min(ROW_GROWTH, MAX_ROWS - rows.length);
      const extra = Array.from({ length: count }, () => s.columns.map(() => makeCell()));
      rows = [...rows, ...extra];
    }
    const rowHeights = rows.map((_, i) => s.rowHeights?.[i] || DEFAULT_ROW_HEIGHT);
    return { ...s, rows, rowHeights };
  });

  const updateSelectionCells = (patch) => updateSheet(s => ({
    ...s,
    rows: s.rows.map((r, ri) => r.map((c, ci) => isInSelection(ri, ci) ? { ...c, ...patch } : c))
  }));

  const updateColor = (color) => {
    updateSelectionCells({ color });
    setColorOpen(false);
  };

  const updateTextColor = (textColor) => {
    updateSelectionCells({ textColor });
    setTextColorOpen(false);
  };

  const updateFontSize = (fontSize) => {
    updateSelectionCells({ fontSize: Number(fontSize) || 12 });
    setFontSizeOpen(false);
  };

  const updateFontFamily = (fontFamily) => {
    updateSelectionCells({ fontFamily });
    setFontOpen(false);
  };

  const toggleFontWeight = () => updateSelectionCells({ fontWeight: Number(activeCell.fontWeight) === 700 ? 400 : 700 });
  const toggleFontStyle = () => updateSelectionCells({ fontStyle: activeCell.fontStyle === "italic" ? "normal" : "italic" });

  const setSheetColor = (color) => {
    updateSheet(s => ({ ...s, tabColor: color }));
    setSheetColorOpen(false);
  };

  const insertRow = () => updateSheet(s => {
    if (s.rows.length >= MAX_ROWS) return s;
    const row = Array.from({ length: s.columns.length }, () => makeCell());
    const rows = [...s.rows];
    rows.splice(Math.min(selected.row, rows.length), 0, row);
    const rowHeights = [...(s.rowHeights || [])];
    rowHeights.splice(Math.min(selected.row, rowHeights.length), 0, DEFAULT_ROW_HEIGHT);
    return { ...s, rows, rowHeights };
  });

  const removeRow = () => updateSheet(s => {
    if (s.rows.length <= 1) return s;
    return { ...s, rows: s.rows.filter((_, i) => i !== selected.row), rowHeights: (s.rowHeights || []).filter((_, i) => i !== selected.row) };
  });

  const insertColumn = () => updateSheet(s => {
    if (s.columns.length >= MAX_COLS) return s;
    const index = Math.min(selected.col, s.columns.length);
    const columns = [...s.columns];
    columns.splice(index, 0, columnLabel(index));
    const widths = [...(s.widths || [])];
    widths.splice(index, 0, DEFAULT_COL_WIDTH);
    return { ...s, columns, widths, rows: s.rows.map(r => { const next = [...r]; next.splice(index, 0, makeCell()); return next; }) };
  });

  const removeColumn = () => updateSheet(s => {
    if (s.columns.length <= 1) return s;
    const index = Math.min(selected.col, s.columns.length - 1);
    return { ...s, columns: s.columns.filter((_, i) => i !== index), widths: (s.widths || []).filter((_, i) => i !== index), rows: s.rows.map(r => r.filter((_, i) => i !== index)) };
  });

  const addSheet = () => {
    if (sheets.length >= MAX_SHEETS) return;
    const next = makeSheet(sheets.length + 1);
    setSheets(prev => [...prev, next]);
    setActiveId(next.id);
    setSelected({ row: 0, col: 0 });
  };

  const renameSheet = () => {
    const name = window.prompt("Sheet name", sheet?.name || "General Sheet");
    if (name?.trim()) updateSheet(s => ({ ...s, name: name.trim() }));
  };

  const deleteSheet = (id = sheet?.id) => {
    const target = sheets.find(item => item.id === id);
    if (!target) return;
    const deleted = { ...target, deletedAt: Date.now(), deletedFrom: "General Sheet" };
    let next = sheets.filter(item => item.id !== target.id);
    if (!next.length) next = [makeSheet(1)];
    setTrash(prev => [deleted, ...prev]);
    setSheets(next);
    if (activeId === target.id) setActiveId(next[0].id);
    setSelected({ row: 0, col: 0 });
    setSelectionEnd({ row: 0, col: 0 });
    setSheetContext(null);
  };

  const restoreSheet = (id) => {
    if (sheets.length >= MAX_SHEETS) return;
    const item = trash.find(s => s.id === id);
    if (!item) return;
    const restored = { ...item };
    delete restored.deletedAt;
    delete restored.deletedFrom;
    setSheets(prev => [...prev, restored]);
    setTrash(prev => prev.filter(s => s.id !== id));
    setActiveId(restored.id);
    setSelected({ row: 0, col: 0 });
    setSelectionEnd({ row: 0, col: 0 });
    setTrashOpen(false);
  };

  const permanentlyDeleteSheet = (id) => setTrash(prev => prev.filter(s => s.id !== id));
  const emptyTrash = () => setTrash([]);

  const copyCell = async () => {
    if (!sheet) return;
    const matrix = [];
    for (let r = range.minRow; r <= range.maxRow; r += 1) {
      matrix.push(sheet.rows[r].slice(range.minCol, range.maxCol + 1).map(cell => ({ ...cell })));
    }
    setClipboard({ type: "range", rows: matrix });
    const text = matrix.map(row => row.map(cell => cell.value || "").join("\t")).join("\n");
    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(text);
      else {
        const helper = document.createElement("textarea");
        helper.value = text;
        helper.style.position = "fixed";
        helper.style.opacity = "0";
        document.body.appendChild(helper);
        helper.select();
        document.execCommand("copy");
        helper.remove();
      }
    } catch {}
  };

  const pasteCell = async () => {
    let payload = clipboard;
    if (!payload) {
      try {
        const text = await navigator.clipboard?.readText();
        if (typeof text === "string" && text.length) {
          payload = { type: "range", rows: text.replace(/\r/g, "").split("\n").filter((line, i, all) => !(i === all.length - 1 && line === "")).map(line => line.split("\t").map(value => makeCell(value))) };
        }
      } catch {}
    }
    if (!payload?.rows?.length || !sheet) return;
    const startRow = selected.row;
    const startCol = selected.col;
    updateSheet(s => {
      const rows = s.rows.map(r => r.map(c => ({ ...c })));
      const neededRows = Math.min(MAX_ROWS, startRow + payload.rows.length);
      while (rows.length < neededRows) rows.push(s.columns.map(() => makeCell()));
      payload.rows.forEach((sourceRow, ri) => sourceRow.forEach((cell, ci) => {
        const rr = startRow + ri;
        const cc = startCol + ci;
        if (rr < MAX_ROWS && cc < s.columns.length && rows[rr]) {
          rows[rr][cc] = typeof cell === "object" && cell !== null
            ? { ...makeCell(cell.value, cell.color, cell), ...cell }
            : makeCell(cell);
        }
      }));
      return { ...s, rows, rowHeights: rows.map((_, i) => s.rowHeights?.[i] || DEFAULT_ROW_HEIGHT) };
    });
    const end = clampCell(Math.min(MAX_ROWS - 1, startRow + payload.rows.length - 1), Math.min(sheet.columns.length - 1, startCol + Math.max(...payload.rows.map(r => r.length)) - 1));
    setSelected({ row: startRow, col: startCol });
    setSelectionEnd(end);
  };

  const clearCell = () => updateSelectionCells({ value: "" });
  const moveSelection = (dr, dc, extend = false) => {
    const next = clampCell(selected.row + dr, selected.col + dc);
    if (extend) setSelectionEnd(next);
    else { setSelected(next); setSelectionEnd(next); }
  };

  const selectWholeSheet = () => {
    setSelected({ row: 0, col: 0 });
    setSelectionEnd({ row: Math.max(0, (sheet?.rows?.length || 1) - 1), col: Math.max(0, (sheet?.columns?.length || 1) - 1) });
  };

  const handleKeyDown = (e, row, col) => {
    const mod = e.ctrlKey || e.metaKey;
    if (mod && e.key.toLowerCase() === "a") { e.preventDefault(); selectWholeSheet(); return; }
    if (mod && e.key.toLowerCase() === "c") { e.preventDefault(); copyCell(); return; }
    if (mod && e.key.toLowerCase() === "x") { e.preventDefault(); copyCell(); clearCell(); return; }
    if (mod && e.key.toLowerCase() === "v") { e.preventDefault(); pasteCell(); return; }
    if (e.key === "Delete" || e.key === "Backspace") { e.preventDefault(); clearCell(); return; }
    if (e.key === "ArrowDown") { e.preventDefault(); moveSelection(1, 0, e.shiftKey); }
    if (e.key === "ArrowUp") { e.preventDefault(); moveSelection(-1, 0, e.shiftKey); }
    if (e.key === "ArrowRight" || e.key === "Tab") { e.preventDefault(); moveSelection(0, 1, e.shiftKey); }
    if (e.key === "ArrowLeft") { e.preventDefault(); moveSelection(0, -1, e.shiftKey); }
    if (e.key === "Enter") { e.preventDefault(); moveSelection(1, 0, e.shiftKey); }
  };

  const startColumnResize = (e, col) => {
    e.preventDefault();
    e.stopPropagation();
    setResize({ type: "column", index: col, start: e.clientX, base: Number(sheet?.widths?.[col] || DEFAULT_COL_WIDTH) });
  };

  const startRowResize = (e, row) => {
    e.preventDefault();
    e.stopPropagation();
    setResize({ type: "row", index: row, start: e.clientY, base: Number(sheet?.rowHeights?.[row] || DEFAULT_ROW_HEIGHT) });
  };

  useEffect(() => {
    if (!resize) return undefined;
    const move = (e) => {
      if (resize.type === "column") {
        const width = Math.max(54, Math.min(360, resize.base + e.clientX - resize.start));
        updateSheet(s => ({ ...s, widths: s.widths.map((w, i) => i === resize.index ? width : w) }));
      } else {
        const height = Math.max(18, Math.min(120, resize.base + e.clientY - resize.start));
        updateSheet(s => ({ ...s, rowHeights: s.rowHeights.map((h, i) => i === resize.index ? height : h) }));
      }
    };
    const up = () => setResize(null);
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up, { once: true });
    return () => { window.removeEventListener("mousemove", move); window.removeEventListener("mouseup", up); };
  }, [resize]);

  const autoFitColumn = (col) => updateSheet(s => {
    const maxText = Math.max(
      String(s.columns[col] || "").length,
      ...s.rows.map(r => String(r?.[col]?.value || "").length)
    );
    const width = Math.max(64, Math.min(360, 18 + maxText * 7));
    return { ...s, widths: s.widths.map((w, i) => i === col ? width : w) };
  });

  const autoFitRow = (row) => updateSheet(s => {
    const maxLines = Math.max(1, ...s.rows[row].map(c => String(c?.value || "").split(/\n/).length));
    const height = Math.max(18, Math.min(120, 18 + maxLines * 14));
    return { ...s, rowHeights: s.rowHeights.map((h, i) => i === row ? height : h) };
  });

  const autoFitAllColumns = () => updateSheet(s => ({
    ...s,
    widths: s.columns.map((_, col) => {
      const maxText = Math.max(String(s.columns[col] || "").length, ...s.rows.map(r => String(r?.[col]?.value || "").length));
      return Math.max(64, Math.min(300, 18 + maxText * 7));
    })
  }));

  const selectSheet = (id) => {
    setActiveId(id);
    setSelected({ row: 0, col: 0 });
    setSelectionEnd({ row: 0, col: 0 });
    setSheetContext(null);
  };

  const setTabColorForSheet = (id, color) => {
    setSheets(prev => prev.map(s => s.id === id ? { ...s, tabColor: color } : s));
    setSheetContext(null);
  };

  const duplicateSheet = (id) => {
    if (sheets.length >= MAX_SHEETS) return;
    const source = sheets.find(s => s.id === id);
    if (!source) return;
    const next = {
      ...source,
      id: `general-${Date.now()}-copy-${Math.random().toString(36).slice(2)}`,
      name: `${source.name} Copy`,
      columns: [...source.columns],
      widths: [...source.widths],
      rowHeights: [...source.rowHeights],
      rows: source.rows.map(row => row.map(cell => ({ ...cell })))
    };
    setSheets(prev => [...prev, next]);
    setActiveId(next.id);
    setSelected({ row: 0, col: 0 });
    setSelectionEnd({ row: 0, col: 0 });
    setSheetContext(null);
  };

  const moveSheet = (id, direction) => {
    setSheets(prev => {
      const index = prev.findIndex(s => s.id === id);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
    setSheetContext(null);
  };

  const selectedColumn = useMemo(() => columnLabel(selected.col), [selected.col]);

  return (
    <section className="ts-panel ts-general-sheet-panel">
      <div className="ts-panel-header">
        <div><h2>General Sheet</h2><p>Advanced spreadsheet workspace — compact cells, data entry, formatting, resizing and print tools.</p></div>
        <button type="button" onClick={onClose} aria-label="Close"><X size={18}/></button>
      </div>

      <div className="ts-excel-ribbon" role="tablist" aria-label="Worksheet ribbon">
        {["Files", "Home", "Insert", "Page Layout", "Formulas", "Data", "Review", "View", "Help", "Draw"].map(tab => (
          <button key={tab} type="button" role="tab" aria-selected={ribbonTab === tab} className={ribbonTab === tab ? "active" : ""} onClick={() => setRibbonTab(tab)}>{tab}</button>
        ))}
      </div>
      <div className="ts-excel-ribbon-tools" aria-label={`${ribbonTab} tools`}>
        {ribbonTab === "Files" && <><button type="button" onClick={() => { const name = window.prompt("New workbook sheet name", `General Sheet ${sheets.length + 1}`); if (name?.trim()) { addSheet(); window.setTimeout(() => setSheets(prev => prev.map((item, i) => i === prev.length - 1 ? { ...item, name: name.trim() } : item)), 0); } }}><Plus size={14}/> New sheet</button><button type="button" onClick={() => window.print()}><Printer size={14}/> Print / Export PDF</button><button type="button" onClick={() => { const blob = new Blob([JSON.stringify(sheets, null, 2)], { type: "application/json" }); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = "sodah-workbook.json"; a.click(); URL.revokeObjectURL(url); }}><Download size={14}/> Download workbook</button></>}
        {ribbonTab === "Home" && <>
          <button type="button" onClick={undoSheet} disabled={!undoStack.length} title="Undo"><Undo2 size={14}/> Undo</button>
          <button type="button" onClick={redoSheet} disabled={!redoStack.length} title="Redo"><RotateCcw size={14}/> Redo</button>
          <button type="button" onClick={copyCell}><Copy size={14}/> Copy</button><button type="button" onClick={pasteCell}><Clipboard size={14}/> Paste</button><button type="button" onClick={clearCell}><Trash2 size={14}/> Clear cell</button>
          <label className="ts-ribbon-field">Font size <select aria-label="Font size" value={fontSizeValue} onChange={e => { const n=Number(e.target.value); setFontSizeValue(n); updateFontSize(n); }}><option value={8}>8px</option><option value={9}>9px</option><option value={10}>10px</option><option value={11}>11px</option><option value={12}>12px</option><option value={14}>14px</option><option value={16}>16px</option><option value={18}>18px</option><option value={20}>20px</option><option value={24}>24px</option><option value={28}>28px</option><option value={32}>32px</option><option value={36}>36px</option><option value={48}>48px</option></select></label>
          <label className="ts-ribbon-field">Font <select aria-label="Font family" value={fontFamilyValue} onChange={e => { setFontFamilyValue(e.target.value); updateFontFamily(e.target.value); }}><option>Arial</option><option>Roboto</option><option>Inter</option><option>Verdana</option><option>Tahoma</option><option>Trebuchet MS</option><option>Georgia</option><option>Times New Roman</option><option>Courier New</option><option>Lucida Console</option><option>Palatino Linotype</option></select></label>
          <button type="button" onClick={toggleFontWeight}><Bold size={14}/> Bold</button><button type="button" onClick={toggleFontStyle}><Italic size={14}/> Italic</button>
          <span className="ts-ribbon-divider" aria-hidden="true"/>
          <div className="ts-text-align-tools" role="group" aria-label="Text alignment">
            <button type="button" className={activeCell.textAlign === "left" || !activeCell.textAlign ? "active" : ""} title="Align text left" aria-label="Align text left" onClick={() => updateSelectionCells({ textAlign: "left" })}><AlignLeft size={15}/></button>
            <button type="button" className={activeCell.textAlign === "center" ? "active" : ""} title="Center text" aria-label="Center text" onClick={() => updateSelectionCells({ textAlign: "center" })}><AlignCenter size={15}/></button>
            <button type="button" className={activeCell.textAlign === "right" ? "active" : ""} title="Align text right" aria-label="Align text right" onClick={() => updateSelectionCells({ textAlign: "right" })}><AlignRight size={15}/></button>
          </div>
          <div className="ts-ribbon-pop"><button type="button" aria-expanded={textColorOpen} onClick={e => openPalette("text", e)}><Type size={14}/> Text color</button></div>
          <div className="ts-ribbon-pop"><button type="button" aria-expanded={colorOpen} onClick={e => openPalette("cell", e)}><Palette size={14}/> Cell color</button></div>
          <button type="button" onClick={() => setTrashOpen(true)}><Trash2 size={14}/> Bin ({trash.length})</button>
        </>}
        {ribbonTab === "Insert" && <><button type="button" onClick={insertRow}><Rows3 size={14}/> Insert row</button><button type="button" onClick={insertColumn}><Columns3 size={14}/> Insert column</button><button type="button" onClick={addSheet}><FilePlus2 size={14}/> Insert sheet</button></>}
        {ribbonTab === "Page Layout" && <><button type="button" onClick={() => window.print()}><Printer size={14}/> Print layout</button><button type="button" onClick={autoFitAllColumns}><ChevronsUpDown size={14}/> Auto-fit columns</button></>}
        {ribbonTab === "Formulas" && <><span className="ts-ribbon-note">Enter formulas beginning with = in a cell. Formula calculation is not enabled in this worksheet yet.</span></>}
        {ribbonTab === "Data" && <><button type="button" onClick={() => { const rows = sheet?.rows || []; const sorted = [...rows].sort((a,b) => String(a[selected.col]?.value || "").localeCompare(String(b[selected.col]?.value || ""), undefined, { numeric: true })); setSheets(prev => prev.map(item => item.id === sheet?.id ? { ...item, rows: sorted } : item)); }}><ChevronDown size={14}/> Sort A to Z</button><button type="button" onClick={() => { const rows = sheet?.rows || []; const sorted = [...rows].sort((a,b) => String(b[selected.col]?.value || "").localeCompare(String(a[selected.col]?.value || ""), undefined, { numeric: true })); setSheets(prev => prev.map(item => item.id === sheet?.id ? { ...item, rows: sorted } : item)); }}><ChevronDown size={14}/> Sort Z to A</button><button type="button" onClick={autoFitAllColumns}><ChevronsUpDown size={14}/> Auto-fit</button></>}
        {ribbonTab === "Review" && <><button type="button" onClick={() => { const note = window.prompt("Add a note to the selected cell", activeCell?.note || ""); if (note !== null) updateSelectionCells({ note }); }}><FileText size={14}/> Cell note</button><button type="button" onClick={() => window.alert("Your workbook is saved automatically in this browser on this device.")}>Workbook status</button></>}
        {ribbonTab === "View" && <><button type="button" onClick={() => gridRef.current?.scrollTo({ top: 0, left: 0, behavior: "smooth" })}><ChevronUp size={14}/> Go to top</button><button type="button" onClick={autoFitAllColumns}><Maximize2 size={14}/> Fit columns</button></>}
        {ribbonTab === "Help" && <span className="ts-ribbon-note">Select a cell to edit it. Drag column or row borders to resize. Double-click a border to auto-fit. Use the + tab to add sheets.</span>}
        {ribbonTab === "Draw" && <><button type="button" onClick={() => setColorOpen(v => !v)}><Paintbrush size={14}/> Cell highlight</button><button type="button" onClick={() => updateSelectionCells({ textDecoration: "underline" })}><Type size={14}/> Underline text</button></>}
      </div>

      <div className="ts-general-sheet-tabs">
        {sheets.map(s => (
          <button
            type="button"
            key={s.id}
            className={s.id === sheet?.id ? "active" : ""}
            style={{ borderBottomColor: s.tabColor || undefined, "--ts-tab-color": s.tabColor || "#10b981" }}
            onClick={() => selectSheet(s.id)}
            onDoubleClick={e => { e.preventDefault(); setSheetContext({ id:s.id, x:e.clientX, y:e.clientY }); setActiveId(s.id); }}
            onContextMenu={e => { e.preventDefault(); setSheetContext({ id:s.id, x:e.clientX, y:e.clientY }); setActiveId(s.id); }}
            title="Click to select • Double-click or right-click for sheet options"
          >
            <span className="ts-sheet-tab-color-dot" />
            <span className="ts-sheet-tab-name">{s.name}</span>
            <span
              className="ts-sheet-close"
              role="button"
              tabIndex={0}
              title={`Move ${s.name} to Bin`}
              aria-label={`Delete ${s.name}`}
              onClick={e => { e.preventDefault(); e.stopPropagation(); deleteSheet(s.id); }}
              onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); deleteSheet(s.id); } }}
            >×</span>
          </button>
        ))}
        <button type="button" onClick={addSheet} disabled={sheets.length >= MAX_SHEETS}><Plus size={15}/></button>
      </div>

      {sheetContext && (() => {
        const target = sheets.find(s => s.id === sheetContext.id);
        if (!target) return null;
        const colors = ["#9ca3af","#ef4444","#f59e0b","#10b981","#06b6d4","#3b82f6","#8b5cf6","#ec4899","#111827","#ffffff"];
        return (
          <div
            className="ts-general-sheet-context"
            style={{ left: Math.min(sheetContext.x, window.innerWidth - 250), top: Math.min(sheetContext.y, window.innerHeight - 330) }}
            onMouseLeave={() => setSheetContext(null)}
          >
            <strong>{target.name}</strong>
            <button type="button" onClick={() => { const name=window.prompt("Sheet name",target.name); if(name?.trim()) setSheets(prev=>prev.map(s=>s.id===target.id?{...s,name:name.trim()}:s)); setSheetContext(null); }}>Rename</button>
            <button type="button" onClick={() => duplicateSheet(target.id)}>Duplicate</button>
            <button type="button" onClick={() => moveSheet(target.id,-1)}>Move Left</button>
            <button type="button" onClick={() => moveSheet(target.id,1)}>Move Right</button>
            <div className="ts-general-sheet-context-label">TAB COLOR</div>
            <div className="ts-general-sheet-context-colors">
              {colors.map(c => <button type="button" key={c} aria-label={`Tab color ${c}`} title={c} style={{background:c}} onClick={() => setTabColorForSheet(target.id,c)} />)}
            </div>
            <button type="button" className="danger" onClick={() => deleteSheet(target.id)}>Delete Sheet</button>
          </div>
        );
      })()}


      {trashOpen && <div className="ts-general-trash-backdrop" onMouseDown={e => { if(e.target===e.currentTarget) setTrashOpen(false); }}><div className="ts-general-trash-panel" role="dialog" aria-modal="true" aria-label="Trash Bin">
        <div className="ts-general-trash-header">
          <div><strong>Trash Bin</strong><span>Deleted sheets can be restored or permanently deleted.</span></div>
          <div className="ts-general-trash-actions">
            <button type="button" onClick={emptyTrash} disabled={!trash.length}>Empty Bin</button>
            <button type="button" onClick={() => setTrashOpen(false)}><X size={15}/></button>
          </div>
        </div>
        {trash.length ? <div className="ts-general-trash-table-wrap"><table className="ts-general-trash-table"><thead><tr><th>Sheet</th><th>Deleted</th><th>Rows</th><th>Columns</th><th>Actions</th></tr></thead><tbody>{trash.map(item => <tr key={item.id}><td><strong>{item.name}</strong></td><td>{item.deletedAt ? new Date(item.deletedAt).toLocaleString() : "—"}</td><td>{item.rows?.length || 0}</td><td>{item.columns?.length || 0}</td><td><button type="button" className="restore" onClick={() => restoreSheet(item.id)} disabled={sheets.length >= MAX_SHEETS}><Undo2 size={14}/> Restore</button><button type="button" className="permanent" onClick={() => permanentlyDeleteSheet(item.id)}><Trash2 size={14}/> Delete permanently</button></td></tr>)}</tbody></table></div> : <div className="ts-general-trash-empty">Trash bin is empty.</div>}
      </div></div>}

      <style>{`
        .ts-app .ts-general-sheet-panel .ts-general-grid tbody tr > td {
          background-color: var(--gs-cell-color, transparent) !important;
        }
        .ts-app .ts-general-sheet-panel .ts-general-grid tbody tr > td > input,
        .ts-app.ts-dark .ts-general-sheet-panel .ts-general-grid tbody tr > td > input {
          color: var(--gs-text-color, #202a33) !important;
          -webkit-text-fill-color: var(--gs-text-color, #202a33) !important;
          font-size: var(--gs-font-size, 12px) !important;
          font-family: var(--gs-font-family, Inter, Arial, sans-serif) !important;
          font-weight: var(--gs-font-weight, 400) !important;
          font-style: var(--gs-font-style, normal) !important;
          text-decoration: var(--gs-text-decoration, none) !important;
          background: transparent !important;
          min-width: 0 !important;
          max-width: 100% !important;
        }
        .ts-general-color-portal {
          position: fixed; z-index: 2147483000; width: 230px; padding: 12px;
          border: 1px solid #cbd5e1; border-radius: 12px; background: #fff;
          box-shadow: 0 16px 48px rgba(15,23,42,.24); color: #172033;
          display: grid; grid-template-columns: repeat(6, 1fr); gap: 8px;
        }
        .ts-general-color-portal button.swatch {
          width: 28px; height: 28px; border: 1px solid #94a3b8; border-radius: 7px;
          cursor: pointer; padding: 0;
        }
        .ts-general-sheet-panel .ts-text-align-tools{display:inline-flex;align-items:center;gap:3px;padding:3px;border:1px solid #d7e0ea;border-radius:8px;background:#f8fafc}
        .ts-general-sheet-panel .ts-text-align-tools button{display:inline-flex;align-items:center;justify-content:center;width:29px;height:27px;padding:0;border:0;border-radius:5px;background:transparent;color:#334155;cursor:pointer}
        .ts-general-sheet-panel .ts-text-align-tools button.active{background:#dbeafe;color:#1d4ed8;box-shadow:inset 0 0 0 1px #bfdbfe}
        .ts-general-sheet-panel .ts-ribbon-divider{width:1px;height:24px;background:#dbe3ec;margin:0 3px}
        .ts-general-sheet-panel .ts-ribbon-tools{align-items:center}
        .ts-general-color-portal label { grid-column: 1 / -1; display:flex; align-items:center; justify-content:space-between; gap:10px; font-size:12px; font-weight:600; }
        .ts-general-color-portal input[type=color] { width:48px; height:30px; border:1px solid #cbd5e1; border-radius:6px; padding:2px; cursor:pointer; }
        .ts-general-color-portal button.clear { grid-column:1 / -1; min-height:30px; border:1px solid #cbd5e1; border-radius:7px; background:#f8fafc; cursor:pointer; }
      `}</style>
      {typeof document !== "undefined" && (textColorOpen || colorOpen) && createPortal(
        <div className="ts-general-color-portal" role="dialog" aria-label={textColorOpen ? "Choose text color" : "Choose cell color"} style={{ top: palettePosition.top, left: palettePosition.left }} onMouseDown={e => e.stopPropagation()}>
          {(textColorOpen
            ? ["#111827","#ffffff","#dc2626","#ea580c","#d97706","#16a34a","#0891b2","#2563eb","#7c3aed","#db2777","#64748b"]
            : ["#ffffff","#fee2e2","#ffedd5","#fef3c7","#dcfce7","#cffafe","#dbeafe","#ede9fe","#fce7f3","#e2e8f0","#94a3b8","#fecaca"]
          ).map(c => <button className="swatch" type="button" key={c} title={c} aria-label={`Apply ${c}`} style={{ backgroundColor:c }} onClick={() => textColorOpen ? updateTextColor(c) : updateColor(c)} />)}
          <label>{textColorOpen ? "Custom text colour" : "Custom cell colour"}<input type="color" value={textColorOpen ? (activeCell.textColor || "#111827") : (activeCell.color || "#ffffff")} onChange={e => updateSelectionCells(textColorOpen ? { textColor:e.target.value } : { color:e.target.value })} /></label>
          {!textColorOpen && <button className="clear" type="button" onClick={() => updateColor("")}>Clear cell colour</button>}
        </div>,
        document.body
      )}
      <div className="ts-general-grid-wrap" ref={gridRef}>
        <table className="ts-general-grid">
          <colgroup>
            <col style={{ width: 42 }} />
            {(sheet?.columns || []).map((_, ci) => <col key={ci} style={{ width: `${sheet?.widths?.[ci] || DEFAULT_COL_WIDTH}px` }} />)}
          </colgroup>
          <thead>
            <tr>
              <th className="row-head corner">#</th>
              {(sheet?.columns || []).map((label, ci) => <th key={ci} className={ci >= range.minCol && ci <= range.maxCol ? "active-header" : ""} style={{ width: `${sheet?.widths?.[ci] || DEFAULT_COL_WIDTH}px` }}>
                <input aria-label={`Column ${columnLabel(ci)}`} value={label} onChange={e => updateSheet(s => ({ ...s, columns: s.columns.map((c,i) => i === ci ? e.target.value : c) }))} />
                <span className="ts-col-resizer" onMouseDown={e => startColumnResize(e, ci)} onDoubleClick={() => autoFitColumn(ci)} title="Drag to resize • Double-click to AutoFit" />
              </th>)}
            </tr>
          </thead>
          <tbody>
            {(sheet?.rows || []).map((row, ri) => <tr key={ri} style={{ height: `${sheet?.rowHeights?.[ri] || DEFAULT_ROW_HEIGHT}px` }}>
              <th className={`row-head ${ri >= range.minRow && ri <= range.maxRow ? "active-header" : ""}`} style={{ height: `${sheet?.rowHeights?.[ri] || DEFAULT_ROW_HEIGHT}px` }}>
                {ri + 1}
                <span className="ts-row-resizer" onMouseDown={e => startRowResize(e, ri)} onDoubleClick={() => autoFitRow(ri)} title="Drag to resize • Double-click to AutoFit" />
              </th>
              {row.map((cell, ci) => <td key={ci} className={isInSelection(ri, ci) ? "selected" : ""} style={{ "--gs-cell-color": cell.color || "transparent", backgroundColor: cell.color || "transparent", height: `${sheet?.rowHeights?.[ri] || DEFAULT_ROW_HEIGHT}px`, padding: 0 }} onMouseDown={() => startRangeSelection(ri, ci)} onMouseEnter={() => extendRangeSelection(ri, ci)} onContextMenu={e => { e.preventDefault(); setSelection(ri, ci); const rect=e.currentTarget.getBoundingClientRect(); setPalettePosition({ top: Math.max(12, Math.min(rect.bottom + 6, window.innerHeight - 190)), left: Math.max(12, Math.min(rect.left, window.innerWidth - 230)) }); setColorOpen(true); setTextColorOpen(false); }} onDoubleClick={e => { const rect=e.currentTarget.getBoundingClientRect(); setPalettePosition({ top: Math.max(12, Math.min(rect.bottom + 6, window.innerHeight - 190)), left: Math.max(12, Math.min(rect.left, window.innerWidth - 230)) }); setColorOpen(true); setTextColorOpen(false); }}>
                <input value={cell.value} style={{ "--gs-text-color": cell.textColor || "#202a33", "--gs-font-size": `${Number(cell.fontSize) || 12}px`, "--gs-font-family": cell.fontFamily || "Inter, Arial, sans-serif", "--gs-font-weight": Number(cell.fontWeight) || 400, "--gs-font-style": cell.fontStyle || "normal", "--gs-text-decoration": cell.textDecoration || "none", color: cell.textColor || "#202a33", fontSize: `${Number(cell.fontSize) || 12}px`, fontFamily: cell.fontFamily || "Inter, Arial, sans-serif", fontWeight: Number(cell.fontWeight) || 400, fontStyle: cell.fontStyle || "normal", textDecoration: cell.textDecoration || "none", textAlign: cell.textAlign || "left", backgroundColor: "transparent", width: "100%", height: "100%", boxSizing: "border-box", border: 0, outline: "none", padding: "2px 4px", display: "block" }} onChange={e => updateCell(ri, ci, e.target.value)} onFocus={() => { setSelection(ri, ci); setFontSizeValue(Number(cell.fontSize) || 12); setFontFamilyValue(cell.fontFamily || "Arial"); }} onKeyDown={e => handleKeyDown(e, ri, ci)} />
              </td>)}
            </tr>)}
          </tbody>
        </table>
      </div>
    </section>
  );
}
export { GeneralSheetPanel };
