import { useCallback, useEffect, useMemo, useState } from "react";
import ExcelJS from "exceljs";
import { toPng } from "html-to-image";
import { Download, FileSpreadsheet, Image as ImageIcon, Table2, CheckSquare, Square } from "lucide-react";
import { dashboardExportRegistry } from "./dashboard/exportRegistry";

const PAGE_ORDER = ["overview", "opportunities", "won-analysis", "loss-analysis", "leads", "activities", "insights", "comparison", "forecast", "custom-charts"];

function safeSheetName(value, used) {
  const base = String(value || "Data").replace(/[\\/?*:[\]]/g, " ").trim().slice(0, 31) || "Data";
  let name = base; let index = 2;
  while (used.has(name.toLowerCase())) {
    const suffix = ` ${index++}`;
    name = `${base.slice(0, 31 - suffix.length)}${suffix}`;
  }
  used.add(name.toLowerCase()); return name;
}

function getPageGroups() {
  const roots = Array.from(document.querySelectorAll("[data-download-page]"));
  return roots.map((root) => {
    const pageId = root.getAttribute("data-download-page");
    const pageLabel = root.getAttribute("data-download-page-label") || pageId;
    const registered = dashboardExportRegistry.get(pageId);
    const charts = Array.from(root.querySelectorAll('[data-dashboard-chart-card="true"]')).map((card, index) => {
      const chart = card.querySelector(".recharts-wrapper");
      const svg = chart?.querySelector("svg");
      if (!chart || !svg) return null;
      const title = card.querySelector("h3")?.textContent?.trim() || `Chart ${index + 1}`;
      return { key: `${pageId}:chart:${index}`, title, pageId, pageLabel, element: chart };
    }).filter(Boolean);
    const sections = (registered?.sections || []).filter((section) => Array.isArray(section.rows) && section.rows.length);
    // Also include native HTML tables on pages that do not currently publish
    // a dedicated exportSections array. These rows reflect the rendered filters.
    Array.from(root.querySelectorAll("table")).forEach((table, index) => {
      const headers = Array.from(table.querySelectorAll("thead th")).map((cell) => cell.textContent.trim());
      const bodyRows = Array.from(table.querySelectorAll("tbody tr")).map((tr) =>
        Array.from(tr.querySelectorAll("td")).map((cell) => cell.textContent.trim())
      ).filter((row) => row.length);
      if (!headers.length || !bodyRows.length) return;
      const heading = table.closest("[data-dashboard-chart-card]")?.querySelector("h3")?.textContent?.trim()
        || table.parentElement?.querySelector("h3, h4")?.textContent?.trim()
        || `Table ${index + 1}`;
      sections.push({
        key: `rendered-table-${index}`,
        label: heading,
        columns: headers,
        rows: bodyRows.map((values) => Object.fromEntries(headers.map((header, columnIndex) => [header || `Column ${columnIndex + 1}`, values[columnIndex] ?? ""]))),
      });
    });
    return { pageId, pageLabel, charts, sections };
  }).sort((a, b) => PAGE_ORDER.indexOf(a.pageId) - PAGE_ORDER.indexOf(b.pageId));
}

function makePreviewRows(rows) {
  return rows.slice(0, 3).map((row) => row);
}

export default function DownloadCentre() {
  const [groups, setGroups] = useState([]);
  const [selected, setSelected] = useState(() => new Set());
  const [chartImages, setChartImages] = useState({});
  const [exporting, setExporting] = useState(false);

  const refresh = useCallback(() => {
    const next = getPageGroups();
    setGroups(next);
    setSelected((old) => {
      const valid = new Set(next.flatMap((group) => [
        ...group.charts.map((item) => item.key),
        ...group.sections.map((item) => `${group.pageId}:table:${item.key}`),
      ]));
      const retained = new Set([...old].filter((key) => valid.has(key)));
      return retained.size ? retained : new Set(valid);
    });
  }, []);

  useEffect(() => {
    refresh();
    window.addEventListener("dashboard-export-registry-updated", refresh);
    const observer = new MutationObserver(refresh);
    document.querySelectorAll("[data-download-page]").forEach((node) => observer.observe(node, { childList: true, subtree: true }));
    return () => {
      window.removeEventListener("dashboard-export-registry-updated", refresh);
      observer.disconnect();
    };
  }, [refresh]);

  useEffect(() => {
    let cancelled = false;
    async function buildPreviews() {
      const entries = await Promise.all(groups.flatMap((group) => group.charts.map(async (chart) => {
        try {
          const image = await toPng(chart.element, { pixelRatio: 0.55, backgroundColor: "#ffffff", cacheBust: true, skipAutoScale: true });
          return [chart.key, image];
        } catch (error) {
          console.warn(`Could not create preview for ${chart.title}:`, error);
          return [chart.key, null];
        }
      })));
      if (!cancelled) setChartImages(Object.fromEntries(entries.filter(([, image]) => image)));
    }
    if (groups.length) buildPreviews();
    return () => { cancelled = true; };
  }, [groups]);

  const itemCount = useMemo(() => groups.reduce((sum, group) => sum + group.charts.length + group.sections.length, 0), [groups]);
  const toggle = (key) => setSelected((old) => { const next = new Set(old); next.has(key) ? next.delete(key) : next.add(key); return next; });
  const selectAll = () => setSelected(new Set(groups.flatMap((group) => [...group.charts.map((item) => item.key), ...group.sections.map((item) => `${group.pageId}:table:${item.key}`)])));
  const clearAll = () => setSelected(new Set());

  async function downloadSelected() {
    const chosenCharts = groups.flatMap((group) => group.charts).filter((item) => selected.has(item.key));
    const chosenTables = groups.flatMap((group) => group.sections.map((section) => ({ ...section, pageId: group.pageId, pageLabel: group.pageLabel, selectionKey: `${group.pageId}:table:${section.key}` }))).filter((item) => selected.has(item.selectionKey));
    if (!chosenCharts.length && !chosenTables.length) return;
    setExporting(true);
    try {
      const workbook = new ExcelJS.Workbook();
      workbook.creator = "Sales Intelligence Dashboard";
      workbook.created = new Date();
      const used = new Set();
      chosenTables.forEach((section) => {
        const rows = section.rows.map((row) => ({ ...row }));
        const sheet = workbook.addWorksheet(safeSheetName(`${section.pageLabel} - ${section.label}`, used));
        const columns = section.columns?.length ? section.columns.map((column) => ({ header: String(column), key: String(column) })) : Array.from(new Set(rows.flatMap((row) => Object.keys(row)))).map((key) => ({ header: key, key }));
        sheet.columns = columns.map((column) => ({ ...column, width: Math.min(40, Math.max(14, String(column.header || column.key).length + 3)) }));
        sheet.addRows(rows); sheet.views = [{ state: "frozen", ySplit: 1 }];
        sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
        sheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF3730A3" } };
        if (columns.length) sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: columns.length } };
      });
      if (chosenCharts.length) {
        const sheet = workbook.addWorksheet(safeSheetName("Charts", used));
        sheet.getColumn(1).width = 34;
        let row = 1;
        for (const chart of chosenCharts) {
          const dataUrl = await toPng(chart.element, { pixelRatio: 2, backgroundColor: "#ffffff", cacheBust: true, skipAutoScale: true });
          const imageId = workbook.addImage({ base64: dataUrl.split(",")[1], extension: "png" });
          sheet.getCell(`A${row}`).value = `${chart.pageLabel} — ${chart.title}`;
          sheet.getCell(`A${row}`).font = { bold: true, size: 13, color: { argb: "FF1E293B" } };
          sheet.addImage(imageId, { tl: { col: 0, row }, ext: { width: 900, height: 420 } });
          row += 24;
        }
      }
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = URL.createObjectURL(blob); const anchor = document.createElement("a");
      anchor.href = url; anchor.download = "sales-dashboard-selected-exports.xlsx"; document.body.appendChild(anchor); anchor.click(); anchor.remove(); URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Download Centre export failed:", error);
      window.alert(`Excel export failed: ${error?.message || "Unknown error"}`);
    } finally { setExporting(false); }
  }

  return <div className="min-h-screen bg-slate-50 p-6 md:p-8">
    <div className="mx-auto max-w-7xl">
      <div className="mb-7 flex flex-wrap items-start justify-between gap-4">
        <div><p className="text-sm font-semibold uppercase tracking-wide text-indigo-600">Sales Intelligence</p><h1 className="mt-1 text-2xl font-bold text-slate-900">Download Centre</h1><p className="mt-1 text-sm text-slate-500">Choose charts and tables from every dashboard page. Table previews show up to three rows; exports include all filtered rows.</p></div>
        <div className="flex flex-wrap items-center gap-2"><button onClick={refresh} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100">Refresh previews</button><button onClick={selectAll} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100">Select all</button><button onClick={clearAll} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100">Clear</button></div>
      </div>
      <div className="mb-5 flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-5 py-4"><div className="text-sm text-slate-600">{selected.size} of {itemCount} items selected</div><button onClick={downloadSelected} disabled={!selected.size || exporting} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"><Download size={16}/>{exporting ? "Preparing workbook…" : "Download selected (.xlsx)"}</button></div>
      <div className="space-y-6">
        {groups.map((group) => <section key={group.pageId} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-bold text-slate-900">{group.pageLabel}</h2><span className="text-xs text-slate-500">{group.charts.length} charts · {group.sections.length} tables</span></div>
          {group.charts.length > 0 && <><div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700"><ImageIcon size={16}/> Charts</div><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{group.charts.map((chart) => <label key={chart.key} className={`cursor-pointer rounded-xl border p-3 ${selected.has(chart.key) ? "border-indigo-300 bg-indigo-50/50" : "border-slate-200"}`}><div className="mb-2 flex items-center gap-2"><input type="checkbox" checked={selected.has(chart.key)} onChange={() => toggle(chart.key)} className="h-4 w-4 accent-indigo-600"/><span className="text-sm font-semibold text-slate-800">{chart.title}</span></div><div className="flex h-24 items-center justify-center overflow-hidden rounded-lg border border-slate-100 bg-white p-1">{chartImages[chart.key] ? <img src={chartImages[chart.key]} alt={`${chart.title} preview`} className="h-full w-full object-contain" /> : <span className="text-xs text-slate-400">Preparing chart preview…</span>}</div></label>)}</div></>}
          {group.sections.length > 0 && <div className="mt-5"><div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700"><Table2 size={16}/> Tables & data</div><div className="grid gap-3 lg:grid-cols-2">{group.sections.map((section) => { const key = `${group.pageId}:table:${section.key}`; const rows = makePreviewRows(section.rows); const columns = section.columns?.length ? section.columns : Array.from(new Set(rows.flatMap((row) => Object.keys(row)))); return <label key={key} className={`block min-w-0 cursor-pointer rounded-xl border p-3 ${selected.has(key) ? "border-indigo-300 bg-indigo-50/40" : "border-slate-200"}`}><div className="mb-2 flex items-center gap-2"><input type="checkbox" checked={selected.has(key)} onChange={() => toggle(key)} className="h-4 w-4 accent-indigo-600"/><span className="text-sm font-semibold text-slate-800">{section.label}</span><span className="ml-auto text-xs text-slate-500">{section.rows.length.toLocaleString("en-IN")} rows</span></div><div className="overflow-x-auto rounded-lg border border-slate-200 bg-white"><table className="min-w-full text-left text-xs"><thead className="bg-slate-100 text-slate-600"><tr>{columns.slice(0, 6).map((column) => <th key={String(column)} className="whitespace-nowrap px-2 py-2 font-semibold">{String(column)}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={index} className="border-t border-slate-100">{columns.slice(0, 6).map((column) => <td key={String(column)} className="max-w-36 truncate whitespace-nowrap px-2 py-2 text-slate-600">{String(row[column] ?? "")}</td>)}</tr>)}</tbody></table></div></label>; })}</div></div>}
          {!group.charts.length && !group.sections.length && <p className="text-sm text-slate-400">No exportable charts or tables are available on this page.</p>}
        </section>)}
      </div>
      {!groups.length && <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center text-sm text-slate-500"><FileSpreadsheet className="mx-auto mb-3"/>No dashboard content found yet. Open Download Centre again after the dashboard has loaded.</div>}
    </div>
  </div>;
}
