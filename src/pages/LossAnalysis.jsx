import { useMemo, useState } from "react";
import { AlertTriangle, IndianRupee, TrendingDown, Target, Search, X } from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell,
} from "recharts";
import KPI from "../components/dashboard/KPI";
import ChartCard from "../components/dashboard/ChartCard";
import SectionHeader from "../components/dashboard/SectionHeader";
import MultiSelectFilter from "../components/dashboard/MultiSelectFilter";
import ExcelExportButton from "../components/dashboard/ExcelExportButton";
import { getOpportunityValueCrores } from "../calculations/valueUtils";

const LOSS_REASONS = [
  "Over Budget",
  "Project Deferred / On Hold",
  "Other Business Reason",
  "Project Cancelled by Customer",
  "Operational / Capability Constraint",
  "Customer Non-Responsive",
  "Incumbent Vendor Retained",
  "Bid Lost",
  "Lost to Incumbent Vendor on Cost",
  "Contractual Terms / Compliance Mismatch",
  "Unknown / Not Specified",
  "Requirement Changed / No Longer Needed",
  "Transferred Internally",
  "Customer Insourcing / Self-Managed",
  "Management Decision",
  "RFQ not released",
  "Duplicate / Data Entry Error",
  "Delayed Quote Submission",
];
const DEAL_BUCKETS = ["<0.5 Cr", "0.5-1 Cr", "1-3 Cr", "3-10 Cr", "10+ Cr"];
const COLORS = ["#6366f1", "#06b6d4", "#10b981", "#f59e0b", "#f43f5e", "#8b5cf6", "#0ea5e9", "#84cc16"];

function normalize(value) {
  return String(value ?? "").replace(/^\uFEFF/, "").trim().toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ");
}
function field(row, names, fallback = "") {
  const map = new Map(Object.entries(row || {}).map(([key, value]) => [normalize(key), value]));
  for (const name of names) {
    const value = map.get(normalize(name));
    if (value !== null && value !== undefined && String(value).trim() !== "") return value;
  }
  return fallback;
}
function text(value, fallback = "Unknown") {
  const result = String(value ?? "").trim();
  return result || fallback;
}
function parseDate(value) {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value === "number" && Number.isFinite(value)) {
    const date = new Date(Date.UTC(1899, 11, 30) + value * 86400000);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  const raw = String(value).trim();
  const named = raw.match(/^(\d{1,2})[-/ ]([A-Za-z]{3,})[-/ ](\d{2,4})/);
  if (named) {
    const months = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };
    let year = Number(named[3]);
    if (year < 100) year += year >= 50 ? 1900 : 2000;
    const date = new Date(year, months[named[2].slice(0, 3).toLowerCase()], Number(named[1]));
    return Number.isNaN(date.getTime()) ? null : date;
  }
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}
function getCreatedDate(row) {
  return parseDate(field(row, ["Opportunity Created Date", "Opportunity_Created_Date", "OpportunityCreatedDate"]));
}
function getLostDate(row) {
  return parseDate(field(row, ["Date lost", "Lost Date", "Date Lost"]));
}
function getLostYear(row) {
  const existing = field(row, ["Lost Year", "Lost_Year"]);
  if (existing && Number.isFinite(Number(existing))) return String(Number(existing));
  const date = getLostDate(row) || getCreatedDate(row);
  return date ? String(date.getFullYear()) : "Unknown";
}
function getWeek(row) {
  const date = getCreatedDate(row);
  if (!date) return "Unknown";
  const start = new Date(date.getFullYear(), 0, 1);
  const week = Math.floor((date.getTime() - start.getTime()) / 86400000 / 7) + 1;
  return `Week ${week} ${date.getFullYear()}`;
}
function getMonth(row) {
  const date = getCreatedDate(row);
  return date ? date.toLocaleString("en-US", { month: "short", year: "numeric" }) : "Unknown";
}
function getQuarter(row) {
  const date = getCreatedDate(row);
  if (!date) return "Unknown";
  const month = date.getMonth() + 1;
  const quarter = month >= 4 && month <= 6 ? "Q1" : month >= 7 && month <= 9 ? "Q2" : month >= 10 ? "Q3" : "Q4";
  const fy = month >= 4 ? date.getFullYear() : date.getFullYear() - 1;
  return `${quarter} ${fy}`;
}
function getOwner(row) { return text(field(row, ["Assigned To", "Assigned to", "Owner"]), "Unassigned"); }
function getVertical(row) { return text(field(row, ["PCS Vertical", "PCS  Vertical", "PCS_Vertical"])); }
function getRegion(row) { return text(field(row, ["PCS User Region"])); }
function getService(row) { return text(field(row, ["Services Required", "Services"])); }
function getLeadSource(row) { return text(field(row, ["Lead source", "Lead Source", "Source"])); }
function getValue(row) {
  const value = getOpportunityValueCrores(row);
  if (Number.isFinite(value) && value > 0) return value;
  const raw = Number(field(row, ["Annual Value in Crs", "Values in Cr", "Value in Cr"], 0));
  return Number.isFinite(raw) ? raw : 0;
}
function getDealBucket(row) {
  const stored = text(field(row, ["Deal Size Bucket", "Deal_Size_Bucket"]), "");
  if (DEAL_BUCKETS.includes(stored)) return stored;
  const value = getValue(row);
  if (value < 0.5) return DEAL_BUCKETS[0];
  if (value < 1) return DEAL_BUCKETS[1];
  if (value < 3) return DEAL_BUCKETS[2];
  if (value < 10) return DEAL_BUCKETS[3];
  return DEAL_BUCKETS[4];
}
function getLossReason(row) {
  const standardized = text(field(row, ["Standardized Category (Detailed)", "Standardized Category", "Loss Reason (Detailed)"]), "");
  const matchedStandardized = LOSS_REASONS.find((reason) => reason.toLowerCase() === standardized.toLowerCase());
  if (matchedStandardized) return matchedStandardized;
  const detail = String(field(row, ["Detailed reason", "Detailed Reason", "Loss Reason"], "")).trim();
  const broad = String(field(row, ["Lost / Drop due to", "Drop / Lost"], "")).trim();
  const validPart = (value) => value && !["--none--", "unknown", "na", "n/a", "nil", "-", "--select--"].includes(value.toLowerCase());
  if (!validPart(detail) && !validPart(broad)) return "Unknown / Not Specified";
  const raw = `${validPart(detail) ? detail : ""} ${validPart(broad) ? broad : ""}`.toLowerCase();
  if (/budget|price|pricing|cost|expensive|commercial/.test(raw)) return "Over Budget";
  if (/postpon|defer|on hold|hold|delay.*project/.test(raw)) return "Project Deferred / On Hold";
  if (/cancel|cancelled|cancell?ation|not proceed/.test(raw)) return "Project Cancelled by Customer";
  if (/capabilit|technical|operational|infrastructure|capacity/.test(raw)) return "Operational / Capability Constraint";
  if (/non.?responsive|no response|not respond|unresponsive/.test(raw)) return "Customer Non-Responsive";
  if (/incumbent|existing vendor|vendor retained|current vendor/.test(raw)) return /cost|price/.test(raw) ? "Lost to Incumbent Vendor on Cost" : "Incumbent Vendor Retained";
  if (/bid lost|lost.*bid|tender|competitor won/.test(raw)) return "Bid Lost";
  if (/agreement|contract|clause|compliance|legal|terms/.test(raw)) return "Contractual Terms / Compliance Mismatch";
  if (/requirement changed|no longer required|not needed|change in requirement/.test(raw)) return "Requirement Changed / No Longer Needed";
  if (/transfer.*internal|internal transfer/.test(raw)) return "Transferred Internally";
  if (/insourc|self.?manage|in.?house/.test(raw)) return "Customer Insourcing / Self-Managed";
  if (/management decision|management not approved/.test(raw)) return "Management Decision";
  if (/rfq.*not|not.*rfq|rfq not released/.test(raw)) return "RFQ not released";
  if (/duplicate|data entry|wrong entry/.test(raw)) return "Duplicate / Data Entry Error";
  if (/quote.*delay|delayed quote|late submission/.test(raw)) return "Delayed Quote Submission";
  if (/other|business reason/.test(raw)) return "Other Business Reason";
  return "Unknown / Not Specified";
}
function unique(values) { return [...new Set(values)].filter(Boolean); }
function aggregate(rows, getter) {
  const map = new Map();
  rows.forEach((row) => {
    const name = getter(row);
    const current = map.get(name) || { name, count: 0, valueLost: 0 };
    current.count += 1;
    current.valueLost += getValue(row);
    map.set(name, current);
  });
  return [...map.values()];
}
function Table({ columns, rows }) {
  return <div className="max-h-[390px] overflow-auto"><table className="w-full text-sm"><thead className="sticky top-0 bg-slate-50 text-xs uppercase text-slate-500"><tr>{columns.map((column) => <th key={column.key} className={`px-3 py-2 ${column.align === "right" ? "text-right" : "text-left"}`}>{column.label}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={index} className="border-t border-slate-100">{columns.map((column) => <td key={column.key} className={`px-3 py-2 ${column.align === "right" ? "text-right tabular-nums" : "text-left"}`}>{column.format ? column.format(row[column.key]) : row[column.key]}</td>)}</tr>)}</tbody></table></div>;
}

export default function LossAnalysis({ data, settings = {} }) {
  const allRows = useMemo(() => (data?.opportunities || []).filter((row) => {
    const outcome = text(field(row, ["Outcome bucket", "Outcome Bucket"]), "").toLowerCase();
    const stage = text(field(row, ["Opportunity Stage", "Stage"]), "").toLowerCase();
    return outcome === "lost" || stage === "lost";
  }), [data]);

  const [search, setSearch] = useState("");
  const [weeks, setWeeks] = useState([]);
  const [months, setMonths] = useState([]);
  const [years, setYears] = useState([]);
  const [quarters, setQuarters] = useState([]);
  const [owners, setOwners] = useState([]);
  const [verticals, setVerticals] = useState([]);
  const [regions, setRegions] = useState([]);
  const [dealSizes, setDealSizes] = useState([]);
  const [reasons, setReasons] = useState([]);
  const [services, setServices] = useState([]);

  const options = useMemo(() => ({
    weeks: unique(allRows.map(getWeek)).sort((a, b) => b.localeCompare(a, undefined, { numeric: true })),
    months: unique(allRows.map(getMonth)).sort((a, b) => new Date(b) - new Date(a)),
    years: unique(allRows.map(getLostYear)).sort((a, b) => b.localeCompare(a, undefined, { numeric: true })),
    quarters: unique(allRows.map(getQuarter)).sort((a, b) => b.localeCompare(a)),
    owners: unique(allRows.map(getOwner)).sort(),
    verticals: unique(allRows.map(getVertical)).sort(),
    regions: unique(allRows.map(getRegion)).sort(),
    dealSizes: DEAL_BUCKETS.filter((bucket) => allRows.some((row) => getDealBucket(row) === bucket)),
    reasons: LOSS_REASONS.filter((reason) => allRows.some((row) => getLossReason(row) === reason)),
    services: unique(allRows.map(getService)).sort(),
  }), [allRows]);

  const matches = (selected, value) => selected.length === 0 || selected.includes(value);
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return allRows.filter((row) => {
      const haystack = [field(row, ["Opportunity Name"]), field(row, ["Customer name", "Customer Name"]), getOwner(row), getVertical(row), getRegion(row), getLossReason(row), getService(row), getLeadSource(row)].join(" ").toLowerCase();
      return (!query || haystack.includes(query)) && matches(weeks, getWeek(row)) && matches(months, getMonth(row)) && matches(years, getLostYear(row)) && matches(quarters, getQuarter(row)) && matches(owners, getOwner(row)) && matches(verticals, getVertical(row)) && matches(regions, getRegion(row)) && matches(dealSizes, getDealBucket(row)) && matches(reasons, getLossReason(row)) && matches(services, getService(row));
    });
  }, [allRows, search, weeks, months, years, quarters, owners, verticals, regions, dealSizes, reasons, services]);

  const reasonData = useMemo(() => LOSS_REASONS.map((name) => {
    const subset = filtered.filter((row) => getLossReason(row) === name);
    const valueLost = subset.reduce((sum, row) => sum + getValue(row), 0);
    return { name, count: subset.length, percentOfLostDeals: filtered.length ? subset.length / filtered.length * 100 : 0, valueLost, percentOfValueLost: filtered.reduce((sum, row) => sum + getValue(row), 0) ? valueLost / filtered.reduce((sum, row) => sum + getValue(row), 0) * 100 : 0, averageDealSize: subset.length ? valueLost / subset.length : 0 };
  }).filter((item) => item.count || options.reasons.includes(item.name)), [filtered, options.reasons]);

  const verticalData = useMemo(() => aggregate(filtered, getVertical).sort((a, b) => b.count - a.count).map((item) => ({ ...item, share: filtered.length ? item.count / filtered.length * 100 : 0, averageDealSize: item.count ? item.valueLost / item.count : 0 })), [filtered]);
  const regionData = useMemo(() => aggregate(filtered, getRegion).sort((a, b) => b.count - a.count), [filtered]);
  const dealSizeData = useMemo(() => DEAL_BUCKETS.map((name) => {
    const subset = filtered.filter((row) => getDealBucket(row) === name);
    return { name, count: subset.length, valueLost: subset.reduce((sum, row) => sum + getValue(row), 0) };
  }).filter((item) => item.count), [filtered]);
  const sourceData = useMemo(() => aggregate(filtered, getLeadSource).sort((a, b) => b.count - a.count).map((item) => ({ ...item, share: filtered.length ? item.count / filtered.length * 100 : 0 })), [filtered]);
  const yearlyData = useMemo(() => {
    const yearsSorted = unique(filtered.map(getLostYear)).filter((year) => year !== "Unknown").sort();
    return yearsSorted.map((year, index) => {
      const subset = filtered.filter((row) => getLostYear(row) === year);
      const previousYear = String(Number(year) - 1);
      const previous = filtered.filter((row) => getLostYear(row) === previousYear);
      const valueLost = subset.reduce((sum, row) => sum + getValue(row), 0);
      const previousValue = previous.reduce((sum, row) => sum + getValue(row), 0);
      return { year, lostDeals: subset.length, valueLost, countContribution: filtered.length ? subset.length / filtered.length * 100 : 0, valueContribution: filtered.reduce((sum, row) => sum + getValue(row), 0) ? valueLost / filtered.reduce((sum, row) => sum + getValue(row), 0) * 100 : 0, yoyCountGrowth: previous.length ? (subset.length - previous.length) / previous.length * 100 : null, yoyValueGrowth: previousValue ? (valueLost - previousValue) / previousValue * 100 : null };
    });
  }, [filtered]);
  const yearReasonData = useMemo(() => {
    const topSix = [...reasonData].sort((a, b) => b.count - a.count).slice(0, 6).map((item) => item.name);
    return yearlyData.map((yearRow) => {
      const row = { year: yearRow.year };
      topSix.forEach((reason) => { row[reason] = filtered.filter((item) => getLostYear(item) === yearRow.year && getLossReason(item) === reason).length; });
      return row;
    });
  }, [filtered, reasonData, yearlyData]);

  const totalValue = filtered.reduce((sum, row) => sum + getValue(row), 0);
  const topReason = [...reasonData].sort((a, b) => b.count - a.count)[0];
  const currency = settings?.currency || "INR";
  const currencySymbol = currency === "USD" ? "$" : currency === "EUR" ? "€" : "₹";
  const formatCr = (value) => `${currencySymbol}${Number(value || 0).toFixed(2)} Cr`;

  function clearFilters() {
    setSearch(""); setWeeks([]); setMonths([]); setYears([]); setQuarters([]); setOwners([]); setVerticals([]); setRegions([]); setDealSizes([]); setReasons([]); setServices([]);
  }

  const exportSections = [
    { key: "records", label: "Filtered Lost Opportunities", rows: filtered },
    { key: "reason", label: "Loss Reason Breakdown", rows: reasonData },
    { key: "vertical", label: "Loss by Industry Vertical", rows: verticalData },
    { key: "year", label: "Year-on-Year Loss Trend", rows: yearlyData },
    { key: "year-reason", label: "Year-wise Top Loss Reasons", rows: yearReasonData },
    { key: "region", label: "Loss by Region", rows: regionData },
    { key: "deal-size", label: "Loss by Deal Size", rows: dealSizeData },
    { key: "source", label: "Loss by Lead Source", rows: sourceData },
  ];

  if (!allRows.length) return <div className="p-8"><div className="rounded-2xl border border-slate-200 bg-white p-16 text-center"><AlertTriangle size={40} className="mx-auto text-slate-300" /><h2 className="mt-5 text-xl font-bold text-slate-900">No lost opportunities found</h2><p className="mt-2 text-sm text-slate-500">This page uses opportunity records with Outcome Bucket = Lost.</p></div></div>;

  return (
    <div className="space-y-6 p-8">
      <SectionHeader title="Loss Analysis" subtitle={`${filtered.length.toLocaleString("en-IN")} of ${allRows.length.toLocaleString("en-IN")} lost opportunities`} action={<ExcelExportButton fileName="loss-analysis-dashboard.xlsx" sections={exportSections} />} />

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="relative"><Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search opportunity, customer, owner..." className="h-[44px] w-full rounded-xl border border-slate-200 pl-10 pr-3 text-sm outline-none focus:border-indigo-400" /></div>
          <MultiSelectFilter label="Weeks" options={options.weeks} selected={weeks} onChange={setWeeks} />
          <MultiSelectFilter label="Months" options={options.months} selected={months} onChange={setMonths} />
          <MultiSelectFilter label="Lost Years" options={options.years} selected={years} onChange={setYears} />
          <MultiSelectFilter label="Fiscal Quarters" options={options.quarters} selected={quarters} onChange={setQuarters} />
          <MultiSelectFilter label="Owners" options={options.owners} selected={owners} onChange={setOwners} />
          <MultiSelectFilter label="PCS Verticals" options={options.verticals} selected={verticals} onChange={setVerticals} />
          <MultiSelectFilter label="Regions" options={options.regions} selected={regions} onChange={setRegions} />
          <MultiSelectFilter label="Deal Sizes" options={options.dealSizes} selected={dealSizes} onChange={setDealSizes} />
          <MultiSelectFilter label="Loss Reasons" options={options.reasons} selected={reasons} onChange={setReasons} />
          <MultiSelectFilter label="Services" options={options.services} selected={services} onChange={setServices} />
          {(search || [weeks, months, years, quarters, owners, verticals, regions, dealSizes, reasons, services].some((items) => items.length)) && <button onClick={clearFilters} className="inline-flex items-center justify-center gap-2 rounded-xl bg-rose-50 px-3 py-2.5 text-sm font-semibold text-rose-600 hover:bg-rose-100"><X size={15} /> Clear filters</button>}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
        <KPI title="Total Deals Lost" value={filtered.length.toLocaleString("en-IN")} subtitle="Filtered lost opportunities" icon={AlertTriangle} iconClass="bg-rose-50 text-rose-600" />
        <KPI title="Total Value Lost" value={formatCr(totalValue)} subtitle="Annual contract value" icon={IndianRupee} iconClass="bg-amber-50 text-amber-600" />
        <KPI title="Average Lost Deal Size" value={formatCr(filtered.length ? totalValue / filtered.length : 0)} subtitle="Value lost / deals lost" icon={Target} iconClass="bg-violet-50 text-violet-600" />
        <KPI title="Top Loss Reason" value={topReason?.name || "—"} subtitle={`${(topReason?.count || 0).toLocaleString("en-IN")} deals · ${(topReason?.percentOfLostDeals || 0).toFixed(1)}%`} icon={TrendingDown} iconClass="bg-cyan-50 text-cyan-600" />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <ChartCard title="Loss Reason Breakdown" subtitle="Lost deal count by standardized detailed reason"><div className="h-[380px]"><ResponsiveContainer width="100%" height="100%"><BarChart data={reasonData} layout="vertical" margin={{ left: 30, right: 20 }}><CartesianGrid strokeDasharray="3 3" horizontal={false} /><XAxis type="number" allowDecimals={false} /><YAxis type="category" dataKey="name" width={205} tick={{ fontSize: 10 }} /><Tooltip /><Bar dataKey="count" name="Lost Deals" fill="#ef4444" radius={[0, 6, 6, 0]} /></BarChart></ResponsiveContainer></div></ChartCard>
        <ChartCard title="Value Lost by Reason" subtitle="Contribution of each reason to total lost value"><div className="h-[380px]"><ResponsiveContainer width="100%" height="100%"><BarChart data={[...reasonData].sort((a, b) => b.valueLost - a.valueLost).slice(0, 10)}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" angle={-25} textAnchor="end" height={100} interval={0} tick={{ fontSize: 9 }} /><YAxis /><Tooltip formatter={(value) => formatCr(value)} /><Bar dataKey="valueLost" name="Value Lost (Cr)" fill="#f97316" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></div></ChartCard>
      </div>

      <ChartCard title="Year-on-Year Loss Trend & Contribution" subtitle="Lost deals, value lost and year-over-year movement"><div className="h-[340px]"><ResponsiveContainer width="100%" height="100%"><LineChart data={yearlyData}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="year" /><YAxis yAxisId="count" allowDecimals={false} /><YAxis yAxisId="value" orientation="right" /><Tooltip /><Legend /><Line yAxisId="count" type="monotone" dataKey="lostDeals" name="Lost Deals" stroke="#ef4444" strokeWidth={3} /><Line yAxisId="value" type="monotone" dataKey="valueLost" name="Value Lost (Cr)" stroke="#6366f1" strokeWidth={3} /></LineChart></ResponsiveContainer></div></ChartCard>

      <ChartCard title="Year-wise Trend — Top 6 Loss Reasons" subtitle="Annual count by the six most frequent loss reasons"><div className="h-[360px]"><ResponsiveContainer width="100%" height="100%"><BarChart data={yearReasonData}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="year" /><YAxis allowDecimals={false} /><Tooltip /><Legend />{[...reasonData].sort((a, b) => b.count - a.count).slice(0, 6).map((reason, index) => <Bar key={reason.name} dataKey={reason.name} stackId="reasons" fill={COLORS[index % COLORS.length]} />)}</BarChart></ResponsiveContainer></div></ChartCard>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <ChartCard title="Loss by Industry Vertical" subtitle="Count and value lost by PCS vertical"><div className="h-[340px]"><ResponsiveContainer width="100%" height="100%"><BarChart data={verticalData}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" angle={-25} textAnchor="end" height={90} tick={{ fontSize: 10 }} /><YAxis allowDecimals={false} /><Tooltip /><Bar dataKey="count" name="Lost Deals" fill="#6366f1" radius={[5, 5, 0, 0]} /></BarChart></ResponsiveContainer></div></ChartCard>
        <ChartCard title="Loss by Region" subtitle="Lost deal count across PCS user regions"><div className="h-[340px]"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={regionData} dataKey="count" nameKey="name" innerRadius={65} outerRadius={110} paddingAngle={3} label>{regionData.map((item, index) => <Cell key={item.name} fill={COLORS[index % COLORS.length]} />)}</Pie><Tooltip /><Legend /></PieChart></ResponsiveContainer></div></ChartCard>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <ChartCard title="Loss by Deal Size Bucket" subtitle="Count and value lost by workbook deal-size bands"><div className="h-[330px]"><ResponsiveContainer width="100%" height="100%"><BarChart data={dealSizeData}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" /><YAxis allowDecimals={false} /><Tooltip /><Legend /><Bar dataKey="count" name="Lost Deals" fill="#f43f5e" /><Bar dataKey="valueLost" name="Value Lost (Cr)" fill="#8b5cf6" /></BarChart></ResponsiveContainer></div></ChartCard>
        <ChartCard title="Loss by Lead Source" subtitle="Failed opportunities by original lead source"><div className="h-[330px]"><ResponsiveContainer width="100%" height="100%"><BarChart data={sourceData}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" angle={-25} textAnchor="end" height={85} tick={{ fontSize: 10 }} /><YAxis allowDecimals={false} /><Tooltip /><Bar dataKey="count" name="Lost Deals" fill="#0ea5e9" radius={[5, 5, 0, 0]} /></BarChart></ResponsiveContainer></div></ChartCard>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <ChartCard title="Detailed Loss Reason Table" subtitle="Count, share of lost deals, value lost and average deal size"><Table columns={[{ key: "name", label: "Loss Reason" }, { key: "count", label: "Count", align: "right" }, { key: "percentOfLostDeals", label: "% Deals", align: "right", format: (v) => `${v.toFixed(1)}%` }, { key: "valueLost", label: "Value Lost (Cr)", align: "right", format: (v) => v.toFixed(2) }, { key: "percentOfValueLost", label: "% Value", align: "right", format: (v) => `${v.toFixed(1)}%` }, { key: "averageDealSize", label: "Avg Size (Cr)", align: "right", format: (v) => v.toFixed(2) }]} rows={reasonData} /></ChartCard>
        <ChartCard title="Vertical Performance Table" subtitle="Lost count, value and average deal size by vertical"><Table columns={[{ key: "name", label: "Vertical" }, { key: "count", label: "Count", align: "right" }, { key: "share", label: "% Deals", align: "right", format: (v) => `${v.toFixed(1)}%` }, { key: "valueLost", label: "Value Lost (Cr)", align: "right", format: (v) => v.toFixed(2) }, { key: "averageDealSize", label: "Avg Size (Cr)", align: "right", format: (v) => v.toFixed(2) }]} rows={verticalData} /></ChartCard>
      </div>
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <ChartCard title="Yearly Loss Summary" subtitle="Lost count, contribution, value and YoY growth"><Table columns={[{ key: "year", label: "Year" }, { key: "lostDeals", label: "Lost Deals", align: "right" }, { key: "countContribution", label: "% Count", align: "right", format: (v) => `${v.toFixed(1)}%` }, { key: "valueLost", label: "Value Lost (Cr)", align: "right", format: (v) => v.toFixed(2) }, { key: "valueContribution", label: "% Value", align: "right", format: (v) => `${v.toFixed(1)}%` }, { key: "yoyCountGrowth", label: "YoY Count", align: "right", format: (v) => v === null ? "—" : `${v.toFixed(1)}%` }]} rows={yearlyData} /></ChartCard>
        <ChartCard title="Region & Lead Source Summary" subtitle="Regional loss and source failure breakdown"><Table columns={[{ key: "name", label: "Region / Source" }, { key: "count", label: "Count", align: "right" }, { key: "valueLost", label: "Value Lost (Cr)", align: "right", format: (v) => v.toFixed(2) }]} rows={[...regionData.map((item) => ({ ...item, name: `Region: ${item.name}` })), ...sourceData.map((item) => ({ ...item, name: `Source: ${item.name}` }))]} /></ChartCard>
      </div>
    </div>
  );
}
