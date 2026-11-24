import { useEffect, useMemo, useState } from "react";
import ExcelJS from "exceljs";
import { toPng } from "html-to-image";
import { Download, FileSpreadsheet, X, BarChart3, Table2 } from "lucide-react";

function safeSheetName(value, used) {
  const base = String(value || "Data").replace(/[\\/?*:[\]]/g, " ").trim().slice(0, 31) || "Data";
  let name = base;
  let index = 2;
  while (used.has(name.toLowerCase())) {
    const suffix = ` ${index++}`;
    name = `${base.slice(0, 31 - suffix.length)}${suffix}`;
  }
  used.add(name.toLowerCase());
  return name;
}

function getPageGraphs() {
  return Array.from(document.querySelectorAll('[data-dashboard-chart-card="true"]'))
    .map((card, index) => {
      const chart = card.querySelector(".recharts-wrapper");
      const svg = chart?.querySelector("svg");
      if (!chart || !svg) return null;

      const rect = chart.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return null;

      const title = card.querySelector("h3")?.textContent?.trim() || `Graph ${index + 1}`;
      return {
        key: `graph-${index}-${title}`,
        title,
        element: chart,
      };
    })
    .filter(Boolean);
}

async function captureGraph(element) {
  // html-to-image copies computed styles into the generated image.
  // Serializing the raw Recharts SVG alone drops CSS-driven fills, text and axes.
  return toPng(element, {
    pixelRatio: 2,
    backgroundColor: "#ffffff",
    cacheBust: true,
    skipAutoScale: true,
  });
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
  const [selectedData, setSelectedData] = useState(() => available.map((section) => section.key));
  const [selectedGraphs, setSelectedGraphs] = useState([]);
  const [graphOptions, setGraphOptions] = useState([]);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    setSelectedData((previous) => {
      const keys = available.map((section) => section.key);
      const next = previous.filter((key) => keys.includes(key));
      return previous.length === next.length && previous.every((key, index) => key === next[index])
        ? previous
        : next;
    });
  }, [available]);

  function openDialog() {
    const currentGraphs = getPageGraphs().map(({ key, title }) => ({ key, title }));
    setGraphOptions(currentGraphs);
    setSelectedGraphs(currentGraphs.map((graph) => graph.key));
    setOpen(true);
  }

  function toggleData(key) {
    setSelectedData((previous) =>
      previous.includes(key) ? previous.filter((item) => item !== key) : [...previous, key]
    );
  }

  function toggleGraph(key) {
    setSelectedGraphs((previous) =>
      previous.includes(key) ? previous.filter((item) => item !== key) : [...previous, key]
    );
  }

  async function download() {
    const chosenData = available.filter((section) => selectedData.includes(section.key));
    const chosenGraphs = getPageGraphs().filter((graph) => selectedGraphs.includes(graph.key));

    if (!chosenData.length && !chosenGraphs.length) {
      window.alert("Select at least one graph or data sheet to export.");
      return;
    }

    setExporting(true);
    try {
      const workbook = new ExcelJS.Workbook();
      workbook.creator = "Sales Intelligence Dashboard";
      workbook.created = new Date();
      const usedNames = new Set();

      chosenData.forEach((section) => {
        const rows = section.rows.map((row) => ({ ...row }));
        const sheet = workbook.addWorksheet(safeSheetName(section.label, usedNames));
        const columns = section.columns?.length
          ? section.columns.map((column) => ({ header: String(column), key: String(column) }))
          : Array.from(new Set(rows.flatMap((row) => Object.keys(row)))).map((key) => ({
              header: key,
              key,
            }));

        sheet.columns = columns.map((column) => ({
          ...column,
          width: Math.min(36, Math.max(14, String(column.header || column.key).length + 3)),
        }));
        sheet.addRows(rows);
        sheet.views = [{ state: "frozen", ySplit: 1 }];
        sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
        sheet.getRow(1).fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FF3730A3" },
        };
        if (columns.length) {
          sheet.autoFilter = {
            from: { row: 1, column: 1 },
            to: { row: 1, column: columns.length },
          };
        }
      });

      if (chosenGraphs.length) {
        const graphSheet = workbook.addWorksheet(safeSheetName("Graphs", usedNames));
        graphSheet.getColumn(1).width = 30;
        let row = 1;

        for (const graph of chosenGraphs) {
          const dataUrl = await captureGraph(graph.element);
          const imageId = workbook.addImage({
            base64: dataUrl.split(",")[1],
            extension: "png",
          });

          graphSheet.getCell(`A${row}`).value = graph.title;
          graphSheet.getCell(`A${row}`).font = {
            bold: true,
            size: 14,
            color: { argb: "FF1E293B" },
          };
          graphSheet.addImage(imageId, {
            tl: { col: 0, row },
            ext: { width: 900, height: 420 },
          });
          row += 24;
        }
      }

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = fileName;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      setOpen(false);
    } catch (error) {
      console.error("Excel dashboard export failed:", error);
      window.alert(`Excel export failed: ${error?.message || "Unknown error"}`);
    } finally {
      setExporting(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={openDialog}
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
                  Select the graphs and data sheets from this page that you want in the workbook.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
                aria-label="Close export dialog"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-5 flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                <BarChart3 size={17} className="text-indigo-600" />
                Graphs ({graphOptions.length})
              </div>
              <div className="flex gap-3 text-sm">
                <button type="button" onClick={() => setSelectedGraphs(graphOptions.map((graph) => graph.key))} className="font-medium text-indigo-600">Select all</button>
                <button type="button" onClick={() => setSelectedGraphs([])} className="font-medium text-slate-500">Clear</button>
              </div>
            </div>
            <div className="mt-3 max-h-44 space-y-2 overflow-y-auto pr-1">
              {graphOptions.map((graph) => (
                <label key={graph.key} className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 p-3 hover:bg-slate-50">
                  <input type="checkbox" checked={selectedGraphs.includes(graph.key)} onChange={() => toggleGraph(graph.key)} className="h-4 w-4 accent-indigo-600" />
                  <span className="text-sm font-medium text-slate-800">{graph.title}</span>
                </label>
              ))}
              {!graphOptions.length && <p className="py-3 text-sm text-slate-500">No graphs detected on this page.</p>}
            </div>

            <div className="mt-5 flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                <Table2 size={17} className="text-emerald-600" />
                Data & Tables ({available.length})
              </div>
              <div className="flex gap-3 text-sm">
                <button type="button" onClick={() => setSelectedData(available.map((section) => section.key))} className="font-medium text-indigo-600">Select all</button>
                <button type="button" onClick={() => setSelectedData([])} className="font-medium text-slate-500">Clear</button>
              </div>
            </div>
            <div className="mt-3 max-h-44 space-y-2 overflow-y-auto pr-1">
              {available.map((section) => (
                <label key={section.key} className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-3 hover:bg-slate-50">
                  <input type="checkbox" checked={selectedData.includes(section.key)} onChange={() => toggleData(section.key)} className="mt-1 h-4 w-4 accent-indigo-600" />
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-slate-800">{section.label}</span>
                    <span className="mt-0.5 block text-xs text-slate-500">{section.description || `${section.rows.length.toLocaleString("en-IN")} rows`}</span>
                  </span>
                </label>
              ))}
              {!available.length && <p className="py-3 text-sm text-slate-500">No data sheets available.</p>}
            </div>

            <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
              <span className="text-xs text-slate-500">{selectedGraphs.length} graphs · {selectedData.length} data sheets selected</span>
              <div className="flex gap-2">
                <button type="button" onClick={() => setOpen(false)} disabled={exporting} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
                <button type="button" onClick={download} disabled={(!selectedGraphs.length && !selectedData.length) || exporting} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50">
                  <Download size={15} />
                  {exporting ? "Building workbook..." : "Download .xlsx"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
