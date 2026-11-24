import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { Download, FileSpreadsheet, X } from "lucide-react";

function safeSheetName(value, used) {
  const base = String(value || "Data")
    .replace(/[\\/?*:[\]]/g, " ")
    .trim()
    .slice(0, 31) || "Data";
  let name = base;
  let index = 2;
  while (used.has(name.toLowerCase())) {
    const suffix = ` ${index++}`;
    name = `${base.slice(0, 31 - suffix.length)}${suffix}`;
  }
  used.add(name.toLowerCase());
  return name;
}

export default function ExcelExportButton({
  sections = [],
  fileName = "dashboard-export.xlsx",
  label = "Download Excel Dashboard",
}) {
  const available = useMemo(
    () => sections.filter((section) => Array.isArray(section.rows) && section.rows.length > 0),
    [sections]
  );
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(() => available.map((section) => section.key));

  useEffect(() => {
    setSelected((previous) => {
      const keys = available.map((section) => section.key);
      const next = previous.filter((key) => keys.includes(key));
      return previous.length === next.length && previous.every((key, index) => key === next[index]) ? previous : next;
    });
  }, [available]);

  function toggle(key) {
    setSelected((previous) =>
      previous.includes(key)
        ? previous.filter((item) => item !== key)
        : [...previous, key]
    );
  }

  function download() {
    const chosen = available.filter((section) => selected.includes(section.key));
    if (!chosen.length) {
      window.alert("Select at least one chart or table to export.");
      return;
    }

    const workbook = XLSX.utils.book_new();
    const usedNames = new Set();

    chosen.forEach((section) => {
      const rows = section.rows.map((row) => ({ ...row }));
      const sheet = XLSX.utils.json_to_sheet(rows);
      if (section.columns?.length) {
        sheet["!cols"] = section.columns.map((column) => ({ wch: Math.min(36, Math.max(12, String(column).length + 3)) }));
      }
      XLSX.utils.book_append_sheet(
        workbook,
        sheet,
        safeSheetName(section.label, usedNames)
      );
    });

    XLSX.writeFile(workbook, fileName);
    setOpen(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
      >
        <Download size={16} />
        {label}
      </button>

      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/40 p-4">
          <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-slate-900">
                  <FileSpreadsheet size={20} className="text-emerald-600" />
                  <h3 className="text-lg font-bold">Build Excel dashboard</h3>
                </div>
                <p className="mt-1 text-sm text-slate-500">
                  Choose the filtered charts, tables and records to include.
                </p>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100" aria-label="Close export dialog">
                <X size={18} />
              </button>
            </div>

            <div className="mt-5 flex items-center justify-between border-b border-slate-100 pb-3 text-sm">
              <span className="font-semibold text-slate-700">Available sheets ({available.length})</span>
              <div className="flex gap-3">
                <button type="button" onClick={() => setSelected(available.map((section) => section.key))} className="font-medium text-indigo-600 hover:text-indigo-800">Select all</button>
                <button type="button" onClick={() => setSelected([])} className="font-medium text-slate-500 hover:text-slate-800">Clear</button>
              </div>
            </div>

            <div className="mt-3 max-h-[50vh] space-y-2 overflow-y-auto pr-1">
              {available.map((section) => (
                <label key={section.key} className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-3 hover:bg-slate-50">
                  <input type="checkbox" checked={selected.includes(section.key)} onChange={() => toggle(section.key)} className="mt-1 h-4 w-4 accent-indigo-600" />
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-slate-800">{section.label}</span>
                    <span className="mt-0.5 block text-xs text-slate-500">{section.description || `${section.rows.length.toLocaleString("en-IN")} rows`}</span>
                  </span>
                </label>
              ))}
              {!available.length && <p className="py-8 text-center text-sm text-slate-500">No exportable data is available.</p>}
            </div>

            <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
              <span className="text-xs text-slate-500">{selected.length} of {available.length} sheets selected</span>
              <div className="flex gap-2">
                <button type="button" onClick={() => setOpen(false)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
                <button type="button" onClick={download} disabled={!selected.length} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50">
                  <Download size={15} /> Download .xlsx
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
