// Updated Opportunities dashboard

import { useMemo, useState } from "react";

import {
  BriefcaseBusiness,
  IndianRupee,
  Trophy,
  Clock3,
  AlertTriangle,
  Users,
  Download,
  Search,
  X,
  Target,
  TrendingUp,
  Timer,
  Layers,
  BarChart3,
  CalendarDays,
} from "lucide-react";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
  LabelList,
  Brush,
} from "recharts";

import KPI from "../components/dashboard/KPI";
import ChartCard from "../components/dashboard/ChartCard";
import SectionHeader from "../components/dashboard/SectionHeader";

/* =========================================================
   BASIC HELPERS
========================================================= */

function text(value) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function number(value) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return 0;
  }

  const cleaned = String(value)
    .replace(/₹/g, "")
    .replace(/,/g, "")
    .replace(/%/g, "")
    .trim();

  const result = Number(cleaned);

  return Number.isFinite(result) ? result : 0;
}

/* =========================================================
   VALUE FORMATTING
========================================================= */

function getCurrencySymbol(currency = "INR") {
  const symbols = {
    INR: "₹",
    USD: "$",
    EUR: "€",
  };

  return symbols[currency] || currency;
}

function formatValue(
  value,
  currency = "INR",
  display = "Crores"
) {
  const amount = number(value);
  const symbol = getCurrencySymbol(currency);

  if (display === "Raw") {
    return `${symbol}${amount.toLocaleString("en-IN", {
      maximumFractionDigits: 0,
    })}`;
  }

  if (display === "Lakhs") {
    return `${symbol}${(
      amount / 100000
    ).toFixed(2)} L`;
  }

  return `${symbol}${(
    amount / 10000000
  ).toFixed(2)} Cr`;
}

function formatChartValue(
  value,
  currency = "INR",
  display = "Crores"
) {
  const amount = number(value);
  const symbol = getCurrencySymbol(currency);
  return `${symbol}${amount.toFixed(1)} Cr`;
}

/* =========================================================
   OPPORTUNITY VALUE
========================================================= */

function getOpportunityValue(row) {
  const valueColumn = Object.keys(row || {}).find((key) =>
    /(?:value|values).*?(?:cr|crore)/i.test(key)
  );

  const croreValue = valueColumn ? number(row[valueColumn]) : 0;
  if (croreValue > 0) return croreValue * 10000000;

  const annual = number(row["Value of Contract Per Annum INR"]);
  if (annual > 0) return annual;

  const monthly = number(row["Revenue potential per month (in INR)"]);
  if (monthly > 0) return monthly * 12;

  return 0;
}

function getOpportunityValueCrores(row) {
  const valueColumn = Object.keys(row || {}).find((key) =>
    /(?:value|values).*?(?:cr|crore)/i.test(key)
  );

  const croreValue = valueColumn ? number(row[valueColumn]) : 0;
  if (croreValue > 0) return croreValue;

  const annual = number(row["Value of Contract Per Annum INR"]);
  if (annual > 0) return annual / 10000000;

  const monthly = number(row["Revenue potential per month (in INR)"]);
  if (monthly > 0) return (monthly * 12) / 10000000;

  return 0;
}

/* =========================================================
   AGE
========================================================= */

function getAge(row) {
  const age = number(row["Age"]);

  if (
    age >= 0 &&
    row["Age"] !== null &&
    row["Age"] !== ""
  ) {
    return age;
  }

  const created = row["Opportunity Created Date"];

  if (created) {
    const date = new Date(created);

    if (!Number.isNaN(date.getTime())) {
      return Math.max(
        0,
        Math.floor(
          (Date.now() - date.getTime()) /
            (1000 * 60 * 60 * 24)
        )
      );
    }
  }

  return 0;
}

function getAgeBucket(
  age,
  warning = 60,
  critical = 90
) {
  if (age < warning) {
    return `<${warning} days`;
  }

  if (age < critical) {
    return `${warning}–${critical} days`;
  }

  return `>${critical} days`;
}

/* =========================================================
   DIMENSIONS
========================================================= */

function getOutcome(row) {
  const stage = text(row["Opportunity Stage"]).toLowerCase().replace(/\s+/g, " ").trim();

  if (["won", "onboarded", "1st invoice", "agreement", "loi received"].includes(stage)) {
    return "Won";
  }
  if (stage === "lost") return "Lost";
  if (stage === "hold") return "Hold";
  return "Active/In Pipeline";
}

function getStage(row) {
  return text(row["Opportunity Stage"]) || "Unknown";
}

function getOwner(row) {
  return text(row["Assigned To"]) || "Unassigned";
}

function getIndustry(row) {
  return text(row["Industry"]) || "Unknown";
}

function getPCSVertical(row) {
  return (
    text(row["PCS Vertical"]) ||
    text(row["PCS  Vertical"]) ||
    text(row["PCS_Vertical"]) ||
    "Unknown"
  );
}

function parseDate(value) {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value === "number" && value > 20000 && value < 60000) {
    const date = new Date(Date.UTC(1899, 11, 30) + value * 86400000);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getCreatedDate(row) {
  return parseDate(row["Opportunity Created Date"]);
}

function getISOWeekInfo(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const year = d.getUTCFullYear();
  const yearStart = new Date(Date.UTC(year, 0, 1));
  const week = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return { year, week };
}

function getMonthInfo(row) {
  const date = getCreatedDate(row);
  if (!date) return { label: "Unknown", key: -1 };
  return {
    label: date.toLocaleString("en-US", { month: "short", year: "numeric" }),
    key: date.getFullYear() * 100 + date.getMonth(),
  };
}

function getWeekInfo(row) {
  const date = getCreatedDate(row);
  if (!date) return { label: "Unknown", key: -1 };
  const { year, week } = getISOWeekInfo(date);
  return { label: `Week ${week} ${year}`, key: year * 100 + week };
}

function getYearInfo(row) {
  const date = getCreatedDate(row);
  if (!date) return { label: "Unknown", key: -1 };
  return { label: String(date.getFullYear()), key: date.getFullYear() };
}

function getFiscalQuarterInfo(row) {
  const date = getCreatedDate(row);
  if (!date) return { label: "Unknown", key: -1 };
  const month = date.getMonth();
  const year = date.getFullYear();
  const quarter = month >= 3 ? Math.floor((month - 3) / 3) + 1 : 4;
  const fiscalYear = month >= 3 ? year : year - 1;
  return { label: `Q${quarter} ${fiscalYear}`, key: fiscalYear * 10 + quarter };
}

function getRegion(row) {
  const raw = text(row["Customer Service required region"] || row["PCS User Region"]).toLowerCase();
  if (!raw) return "Unknown";

  const normalized = raw.replace(/&/g, " and ").replace(/[,/;|]+/g, " ").replace(/[-]+/g, " ");
  const panIndia = /\bpan\s*india\b|all\s*(india|regions)|across\s*india|india\s*wide|nationwide/.test(normalized);
  if (panIndia) return "Pan India";

  const directions = {
    North: /\bnorth(?:ern)?\b|delhi|punjab|haryana|himachal|uttarakhand|jammu|kashmir|uttar\s*pradesh|chandigarh/,
    South: /\bsouth(?:ern)?\b|tamil\s*nadu|kerala|karnataka|telangana|andhra|chennai|bangalore|bengaluru|hyderabad|coimbatore|kochi|madurai/,
    East: /\beast(?:ern)?\b|west\s*bengal|odisha|orissa|bihar|jharkhand|assam|sikkim|meghalaya|tripura|manipur|nagaland|mizoram|arunachal/,
    West: /\bwest(?:ern)?\b|gujarat|maharashtra|goa|madhya\s*pradesh|chhattisgarh|mumbai|pune|ahmedabad|surat|vadodara/,
  };

  const matched = Object.entries(directions)
    .filter(([, regex]) => regex.test(normalized))
    .map(([name]) => name);

  if (matched.length === 0) return "Unknown";
  if (matched.length === 4) return "Pan India";
  if (matched.length === 1) return matched[0];
  return "Multiple Locations";
}

function getUpdatedTime(row) {
  return text(row["Updated Time"] || row["Updated time"] || row["updated_time"]);
}

function getLatestUpdatedTime(rows) {
  const candidates = rows
    .map((row) => ({ raw: getUpdatedTime(row), date: parseDate(getUpdatedTime(row)) }))
    .filter((item) => item.raw);

  if (!candidates.length) return "—";
  const dated = candidates.filter((item) => item.date);
  if (!dated.length) return candidates[0].raw;
  return dated.sort((a, b) => b.date.getTime() - a.date.getTime())[0].raw;
}

function getMonth(row) {
  return getMonthInfo(row).label;
}

function getWeek(row) {
  return getWeekInfo(row).label;
}

/* =========================================================
   DATA AGGREGATION
========================================================= */

function aggregateBy(
  rows,
  dimensionGetter
) {
  const map = {};

  rows.forEach((row) => {
    const key =
      dimensionGetter(row) || "Unknown";

    if (!map[key]) {
      map[key] = {
        name: key,
        opportunities: 0,
        value: 0,
        won: 0,
        lost: 0,
        active: 0,
        hold: 0,
        wonValue: 0,
        lostValue: 0,
        activeValue: 0,
        holdValue: 0,
      };
    }

    const value = getOpportunityValueCrores(row);
    const outcome =
      getOutcome(row).toLowerCase();

    map[key].opportunities += 1;
    map[key].value += value;

    if (outcome.includes("won")) {
      map[key].won += 1;
      map[key].wonValue += value;
    } else if (outcome.includes("lost")) {
      map[key].lost += 1;
      map[key].lostValue += value;
    } else if (outcome.includes("hold")) {
      map[key].hold += 1;
      map[key].holdValue += value;
    } else if (outcome.includes("active")) {
      map[key].active += 1;
      map[key].activeValue += value;
    }
  });

  return Object.values(map);
}

function sortByValue(data) {
  return [...data].sort(
    (a, b) => b.value - a.value
  );
}

/* =========================================================
   CHART TOOLTIP
========================================================= */

function ChartTooltip({
  active,
  payload,
  label,
  currency = "INR",
  valueDisplay = "Crores",
}) {
  if (
    !active ||
    !payload ||
    !payload.length
  ) {
    return null;
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-xl px-4 py-3">
      <p className="text-xs text-slate-400 mb-2">
        {label}
      </p>

      {payload.map((item, index) => {
        const isValue =
          item.name
            ?.toLowerCase()
            .includes("value") ||
          item.name
            ?.toLowerCase()
            .includes("pipeline") ||
          item.name
            ?.toLowerCase()
            .includes("won value") ||
          item.name
            ?.toLowerCase()
            .includes("lost value") ||
          item.name
            ?.toLowerCase()
            .includes("active value");

        return (
          <p
            key={index}
            className="text-sm font-semibold text-slate-800"
          >
            {item.name}:{" "}
            {isValue
              ? formatChartValue(
                  item.value,
                  currency,
                  valueDisplay
                )
              : number(
                    item.value
                  ).toLocaleString("en-IN")}
          </p>
        );
      })}
    </div>
  );
}

/* =========================================================
   BAR LABEL
========================================================= */

function getLabelBox({ x, y, width, height, viewBox }) {
  const box = viewBox || {};
  return {
    x: Number.isFinite(Number(box.x)) ? Number(box.x) : Number(x) || 0,
    y: Number.isFinite(Number(box.y)) ? Number(box.y) : Number(y) || 0,
    width: Number.isFinite(Number(box.width)) ? Number(box.width) : Number(width) || 0,
    height: Number.isFinite(Number(box.height)) ? Number(box.height) : Number(height) || 0,
  };
}

function ValueLabel({
  x,
  y,
  width,
  height,
  value,
  currency,
  display,
  viewBox,
}) {
  if (
    value === undefined ||
    value === null ||
    value === 0
  ) {
    return null;
  }

  const box = getLabelBox({ x, y, width, height, viewBox });

  return (
    <text
      x={box.x + box.width / 2}
      y={box.y - 10}
      textAnchor="middle"
      dominantBaseline="auto"
      fill="#334155"
      fontSize={12}
      fontWeight={600}
    >
      {formatChartValue(value, currency, display)}
    </text>
  );
}

function CountLabel({
  x,
  y,
  width,
  height,
  value,
  viewBox,
}) {
  if (
    value === undefined ||
    value === null
  ) {
    return null;
  }

  const box = getLabelBox({ x, y, width, height, viewBox });

  return (
    <text
      x={box.x + box.width / 2}
      y={box.y - 10}
      textAnchor="middle"
      dominantBaseline="auto"
      fill="#334155"
      fontSize={12}
      fontWeight={600}
    >
      {Number(value).toLocaleString("en-IN")}
    </text>
  );
}

function HorizontalValueLabel({
  x,
  y,
  width,
  height,
  value,
  currency,
  display,
  viewBox,
}) {
  if (
    value === undefined ||
    value === null ||
    value === 0
  ) {
    return null;
  }

  const box = getLabelBox({ x, y, width, height, viewBox });

  return (
    <text
      x={box.x + box.width + 8}
      y={box.y + box.height / 2}
      textAnchor="start"
      dominantBaseline="middle"
      fill="#334155"
      fontSize={10}
      fontWeight={600}
    >
      {formatChartValue(value, currency, display)}
    </text>
  );
}

function HorizontalCountLabel({
  x,
  y,
  width,
  height,
  value,
  viewBox,
}) {
  if (
    value === undefined ||
    value === null
  ) {
    return null;
  }

  const box = getLabelBox({ x, y, width, height, viewBox });

  return (
    <text
      x={box.x + box.width + 8}
      y={box.y + box.height / 2}
      textAnchor="start"
      dominantBaseline="middle"
      fill="#334155"
      fontSize={10}
      fontWeight={600}
    >
      {Number(value).toLocaleString("en-IN")}
    </text>
  );
}

function DurationLabel({ x, y, width, height, value, decimals = 0, viewBox }) {
  if (value === undefined || value === null) return null;

  const box = getLabelBox({ x, y, width, height, viewBox });

  return (
    <text
      x={box.x + box.width / 2}
      y={box.y - 10}
      textAnchor="middle"
      dominantBaseline="auto"
      fill="#64748b"
      fontSize={10}
      fontWeight={600}
    >
      {`${Number(value).toFixed(decimals)}d`}
    </text>
  );
}

function PieCountLabel({
  cx,
  cy,
  midAngle,
  innerRadius,
  outerRadius,
  value,
}) {
  if (!value) return null;

  const RADIAN = Math.PI / 180;
  const radius =
    innerRadius +
    (outerRadius - innerRadius) * 0.58;
  const x =
    cx + Math.cos(-midAngle * RADIAN) * radius;
  const y =
    cy + Math.sin(-midAngle * RADIAN) * radius;

  return (
    <text
      x={x}
      y={y}
      textAnchor="middle"
      dominantBaseline="central"
      fill="#ffffff"
      fontSize={11}
      fontWeight={700}
    >
      {Number(value).toLocaleString("en-IN")}
    </text>
  );
}

/* =========================================================
   CSV EXPORT
========================================================= */

function downloadCSV(
  rows,
  fileName = "opportunities.csv"
) {
  if (!rows.length) return;

  const headers = Object.keys(rows[0]);

  const escapeCSV = (value) => {
    const stringValue =
      value === null ||
      value === undefined
        ? ""
        : String(value);

    return `"${stringValue.replace(
      /"/g,
      '""'
    )}"`;
  };

  const csv = [
    headers.map(escapeCSV).join(","),
    ...rows.map((row) =>
      headers
        .map((header) =>
          escapeCSV(row[header])
        )
        .join(",")
    ),
  ].join("\n");

  const blob = new Blob(
    [csv],
    {
      type: "text/csv;charset=utf-8;",
    }
  );

  const url =
    URL.createObjectURL(blob);

  const link =
    document.createElement("a");

  link.href = url;
  link.download = fileName;

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

function MultiSelectFilter({ label, options, selected, onChange, open, setOpen }) {
  const toggle = (value) => {
    if (selected.includes(value)) onChange(selected.filter((item) => item !== value));
    else onChange([...selected, value]);
  };

  const summary = selected.length === 0 ? `All ${label}` : `${selected.length} selected`;

  return (
    <div className="relative min-w-[150px]">
      <button
        type="button"
        onClick={() => setOpen(open === label ? null : label)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-white text-slate-600"
      >
        <span className="truncate">{summary}</span>
        <span className="text-slate-400">⌄</span>
      </button>

      {open === label && (
        <div className="absolute z-50 mt-2 w-[240px] max-h-[300px] overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl p-2">
          <button
            type="button"
            onClick={() => onChange([])}
            className="w-full text-left px-3 py-2 rounded-lg text-xs font-semibold text-indigo-600 hover:bg-indigo-50"
          >
            Clear selection / All
          </button>
          {options.map((option) => (
            <label key={option} className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-50 cursor-pointer text-sm text-slate-600">
              <input
                type="checkbox"
                checked={selected.includes(option)}
                onChange={() => toggle(option)}
                className="accent-indigo-600"
              />
              <span className="truncate">{option}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

/* =========================================================
   MAIN COMPONENT
========================================================= */

function Opportunities({
  data,
  settings = {},
}) {
  /* =======================================================
     SETTINGS
  ======================================================= */

  const currency =
    settings.currency || "INR";

  const valueDisplay =
    settings.valueDisplay || "Crores";

  const ageWarning =
    number(
      settings?.opportunityRisk
        ?.ageWarning
    ) || 60;

  const ageCritical =
    number(
      settings?.opportunityRisk
        ?.ageCritical
    ) || 90;

  const highValueThreshold =
    number(
      settings?.opportunityRisk
        ?.highValueThreshold
    ) || 0;

  const highValueThresholdAmount =
    highValueThreshold * 10000000;

  /* =======================================================
     OPPORTUNITIES DATA
  ======================================================= */

  const opportunities = useMemo(() => {
    if (
      Array.isArray(
        data?.opportunities
      )
    ) {
      return data.opportunities;
    }

    if (
      Array.isArray(
        data?.currentOpportunities
      )
    ) {
      return data.currentOpportunities;
    }

    if (
      Array.isArray(
        data?.processed
          ?.opportunities
      )
    ) {
      return data.processed
        .opportunities;
    }

    return [];
  }, [data]);

  /* =======================================================
     FILTER STATE
  ======================================================= */

  const [search, setSearch] = useState("");
  const [outcomeFilter, setOutcomeFilter] = useState([]);
  const [stageFilter, setStageFilter] = useState([]);
  const [ownerFilter, setOwnerFilter] = useState([]);
  const [industryFilter, setIndustryFilter] = useState([]);
  const [regionFilter, setRegionFilter] = useState([]);
  const [ageFilter, setAgeFilter] = useState([]);
  const [weekFilter, setWeekFilter] = useState([]);
  const [monthFilter, setMonthFilter] = useState([]);
  const [yearFilter, setYearFilter] = useState([]);
  const [quarterFilter, setQuarterFilter] = useState([]);
  const [openFilter, setOpenFilter] = useState(null);

  /* =======================================================
     FILTER OPTIONS
  ======================================================= */

  const filterOptions = useMemo(() => {
    const unique = (values) => [...new Set(values.filter(Boolean))];
    const sortOptions = (values, type) => [...values].sort((a, b) => {
      if (type === "week") {
        const ma = a.match(/Week (\d+) (\d+)/);
        const mb = b.match(/Week (\d+) (\d+)/);
        return ma && mb ? Number(ma[2]) * 100 + Number(ma[1]) - (Number(mb[2]) * 100 + Number(mb[1])) : a.localeCompare(b);
      }
      if (type === "month") return new Date(`1 ${a}`).getTime() - new Date(`1 ${b}`).getTime();
      if (type === "year") return Number(a) - Number(b);
      if (type === "quarter") {
        const ma = a.match(/Q(\d) (\d+)/);
        const mb = b.match(/Q(\d) (\d+)/);
        return ma && mb ? Number(ma[2]) * 10 + Number(ma[1]) - (Number(mb[2]) * 10 + Number(mb[1])) : a.localeCompare(b);
      }
      return a.localeCompare(b);
    });

    return {
      outcomes: unique(opportunities.map(getOutcome)).sort(),
      stages: unique(opportunities.map(getStage)).sort(),
      owners: unique(opportunities.map(getOwner)).sort(),
      industries: unique(opportunities.map(getIndustry)).sort(),
      regions: unique(opportunities.map(getRegion)).sort(),
      ages: [`<${ageWarning} days`, `${ageWarning}–${ageCritical} days`, `>${ageCritical} days`],
      weeks: sortOptions(unique(opportunities.map((row) => getWeekInfo(row).label)), "week"),
      months: sortOptions(unique(opportunities.map((row) => getMonthInfo(row).label)), "month"),
      years: sortOptions(unique(opportunities.map((row) => getYearInfo(row).label)), "year"),
      quarters: sortOptions(unique(opportunities.map((row) => getFiscalQuarterInfo(row).label)), "quarter"),
    };
  }, [opportunities, ageWarning, ageCritical]);

  /* =======================================================
     FILTERED DATA
  ======================================================= */

  const filteredOpportunities = useMemo(() => {
    const query = search.toLowerCase().trim();
    const matchesAny = (selected, value) => selected.length === 0 || selected.includes(value);

    return opportunities.filter((row) => {
      const opportunityName = text(row["Opportunity Name"]);
      const customer = text(row["Customer name"]);
      const opportunityId = text(row["Opportunity ID"]);

      const matchesSearch = !query ||
        opportunityName.toLowerCase().includes(query) ||
        customer.toLowerCase().includes(query) ||
        opportunityId.toLowerCase().includes(query);

      return (
        matchesSearch &&
        matchesAny(outcomeFilter, getOutcome(row)) &&
        matchesAny(stageFilter, getStage(row)) &&
        matchesAny(ownerFilter, getOwner(row)) &&
        matchesAny(industryFilter, getIndustry(row)) &&
        matchesAny(regionFilter, getRegion(row)) &&
        matchesAny(ageFilter, getAgeBucket(getAge(row), ageWarning, ageCritical)) &&
        matchesAny(weekFilter, getWeekInfo(row).label) &&
        matchesAny(monthFilter, getMonthInfo(row).label) &&
        matchesAny(yearFilter, getYearInfo(row).label) &&
        matchesAny(quarterFilter, getFiscalQuarterInfo(row).label)
      );
    });
  }, [
    opportunities, search, outcomeFilter, stageFilter, ownerFilter, industryFilter,
    regionFilter, ageFilter, weekFilter, monthFilter, yearFilter, quarterFilter,
    ageWarning, ageCritical,
  ]);

  /* =======================================================
     KPI METRICS
  ======================================================= */

  const metrics =
    useMemo(() => {
      const total =
        filteredOpportunities.length;

      const pipelineValue =
        filteredOpportunities.reduce(
          (sum, row) =>
            sum +
            getOpportunityValue(row),
          0
        );

      const wonRows =
        filteredOpportunities.filter(
          (row) =>
            getOutcome(row)
              .toLowerCase()
              .includes("won")
        );

      const lostRows =
        filteredOpportunities.filter(
          (row) =>
            getOutcome(row)
              .toLowerCase()
              .includes("lost")
        );

      const holdRows =
        filteredOpportunities.filter(
          (row) =>
            getOutcome(row)
              .toLowerCase()
              .includes("hold")
        );

      const activeRows =
        filteredOpportunities.filter(
          (row) =>
            getOutcome(row)
              .toLowerCase()
              .includes("active")
        );

      const wonValue =
        wonRows.reduce(
          (sum, row) =>
            sum +
            getOpportunityValue(row),
          0
        );

      const lostValue =
        lostRows.reduce(
          (sum, row) =>
            sum +
            getOpportunityValue(row),
          0
        );

      const activeValue =
        activeRows.reduce(
          (sum, row) =>
            sum +
            getOpportunityValue(row),
          0
        );

      const holdValue =
        holdRows.reduce(
          (sum, row) =>
            sum +
            getOpportunityValue(row),
          0
        );

      const averageAge =
        total > 0
          ? filteredOpportunities.reduce(
              (sum, row) =>
                sum + getAge(row),
              0
            ) / total
          : 0;

      const averageValue =
        total > 0
          ? pipelineValue / total
          : 0;

      const atRisk =
        filteredOpportunities.filter(
          (row) =>
            getAge(row) >
            ageCritical
        ).length;

      const highValue =
        filteredOpportunities.filter(
          (row) =>
            getOpportunityValue(
              row
            ) >=
            highValueThresholdAmount
        ).length;

      const winRate =
        total > 0
          ? (wonRows.length /
              total) *
            100
          : 0;

      const wonLostTotal =
        wonRows.length +
        lostRows.length;

      const wonLossRate =
        wonLostTotal > 0
          ? (wonRows.length /
              wonLostTotal) *
            100
          : 0;

      const proposalDelayValues =
        filteredOpportunities
          .map((row) =>
            number(
              row[
                "Delay in Proposal Submission Date (AU&BB)"
              ]
            )
          )
          .filter(
            (value) =>
              Number.isFinite(value)
          );

      const averageProposalDelay =
        proposalDelayValues.length
          ? proposalDelayValues.reduce(
              (a, b) => a + b,
              0
            ) /
            proposalDelayValues.length
          : 0;

      return {
        total,
        pipelineValue,
        won: wonRows.length,
        lost: lostRows.length,
        hold: holdRows.length,
        active: activeRows.length,
        wonValue,
        lostValue,
        activeValue,
        holdValue,
        averageAge,
        averageValue,
        atRisk,
        highValue,
        winRate,
        wonLossRate,
        averageProposalDelay,
      };
    }, [
      filteredOpportunities,
      ageCritical,
      highValueThresholdAmount,
    ]);

  /* =======================================================
     OUTCOME DATA
  ======================================================= */

  const outcomeData =
    useMemo(() => {
      return [
        {
          name: "Won",
          opportunities:
            metrics.won,
          value:
            metrics.wonValue,
        },
        {
          name: "Active / Pipeline",
          opportunities:
            metrics.active,
          value:
            metrics.activeValue,
        },
        {
          name: "Lost",
          opportunities:
            metrics.lost,
          value:
            metrics.lostValue,
        },
        {
          name: "Hold",
          opportunities:
            metrics.hold,
          value:
            metrics.holdValue,
        },
      ].filter(
        (item) =>
          item.opportunities > 0
      );
    }, [metrics]);

  /* =======================================================
     MONTHLY DATA
  ======================================================= */

  const monthlyData = useMemo(() => {
    const map = {};
    filteredOpportunities.forEach((row) => {
      const info = getMonthInfo(row);
      if (!map[info.label]) map[info.label] = { name: info.label, sortKey: info.key, opportunities: 0, value: 0, wonValue: 0, activeValue: 0, lostValue: 0, holdValue: 0 };
      const value = getOpportunityValueCrores(row);
      map[info.label].opportunities += 1;
      map[info.label].value += value;
      const outcome = getOutcome(row);
      if (outcome === "Won") map[info.label].wonValue += value;
      else if (outcome === "Lost") map[info.label].lostValue += value;
      else if (outcome === "Hold") map[info.label].holdValue += value;
      else map[info.label].activeValue += value;
    });
    return Object.values(map).sort((a, b) => a.sortKey - b.sortKey);
  }, [filteredOpportunities]);

  /* =======================================================
     WEEKLY DATA
  ======================================================= */

  const weeklyData = useMemo(() => {
    const map = {};
    filteredOpportunities.forEach((row) => {
      const info = getWeekInfo(row);
      if (!map[info.label]) map[info.label] = { name: info.label, sortKey: info.key, opportunities: 0, value: 0 };
      map[info.label].opportunities += 1;
      map[info.label].value += getOpportunityValueCrores(row);
    });
    return Object.values(map).sort((a, b) => a.sortKey - b.sortKey);
  }, [filteredOpportunities]);

  /* =======================================================
     STAGE DATA
  ======================================================= */

  const stageData = useMemo(() => sortByValue(aggregateBy(filteredOpportunities, getStage)), [filteredOpportunities]);

  /* =======================================================
     OWNER DATA
  ======================================================= */

  const ownerData =
    useMemo(() => {
      return sortByValue(
        aggregateBy(
          filteredOpportunities,
          getOwner
        )
      ).slice(0, 12);
    }, [filteredOpportunities]);

  /* =======================================================
     PCS VERTICAL DATA
  ======================================================= */

  const pcsVerticalData =
    useMemo(() => {
      return sortByValue(
        aggregateBy(
          filteredOpportunities,
          getPCSVertical
        )
      ).slice(0, 10);
    }, [filteredOpportunities]);

  /* =======================================================
     REGION DATA
  ======================================================= */

  const regionData = useMemo(() => {
    const order = { North: 0, South: 1, East: 2, West: 3, "Pan India": 4, "Multiple Locations": 5, Unknown: 6 };
    return aggregateBy(filteredOpportunities, getRegion)
      .sort((a, b) => (order[a.name] ?? 99) - (order[b.name] ?? 99));
  }, [filteredOpportunities]);

  /* =======================================================
     AGE DATA
  ======================================================= */

  const ageData =
    useMemo(() => {
      const buckets = [
        {
          name: `<${ageWarning} days`,
          opportunities: 0,
          value: 0,
        },
        {
          name: `${ageWarning}–${ageCritical} days`,
          opportunities: 0,
          value: 0,
        },
        {
          name: `>${ageCritical} days`,
          opportunities: 0,
          value: 0,
        },
      ];

      filteredOpportunities.forEach(
        (row) => {
          const age =
            getAge(row);

          const value = getOpportunityValueCrores(row);

          if (
            age < ageWarning
          ) {
            buckets[0].opportunities++;
            buckets[0].value +=
              value;
          } else if (
            age < ageCritical
          ) {
            buckets[1].opportunities++;
            buckets[1].value +=
              value;
          } else {
            buckets[2].opportunities++;
            buckets[2].value +=
              value;
          }
        }
      );

      return buckets;
    }, [
      filteredOpportunities,
      ageWarning,
      ageCritical,
    ]);

  /* =======================================================
     VALUE BUCKET DATA
  ======================================================= */

  const valueBucketData = useMemo(() => {
    const buckets = [
      { name: "0–1 Cr", min: 0, max: 1, opportunities: 0, value: 0 },
      { name: "1–5 Cr", min: 1, max: 5, opportunities: 0, value: 0 },
      { name: "5–10 Cr", min: 5, max: 10, opportunities: 0, value: 0 },
      { name: "10–15 Cr", min: 10, max: 15, opportunities: 0, value: 0 },
      { name: "15–20 Cr", min: 15, max: 20, opportunities: 0, value: 0 },
      { name: ">20 Cr", min: 20, max: Infinity, opportunities: 0, value: 0 },
    ];

    filteredOpportunities.forEach((row) => {
      const value = getOpportunityValueCrores(row);
      const bucket = buckets.find((item) => value >= item.min && value < item.max);
      if (bucket) {
        bucket.opportunities += 1;
        bucket.value += value;
      }
    });

    return buckets;
  }, [filteredOpportunities]);

  /* =======================================================
     PROCESS DURATION DATA
  ======================================================= */

  const processDurationData =
    useMemo(() => {
      const fields = [
        {
          name: "Created → RFQ",
          key:
            "Days: Created to RFQ Received (G&AT)",
        },
        {
          name: "Solution Request → Received",
          key:
            "Days: Solution Request to Solution Received (AY&AW)",
        },
        {
          name: "Solution Received → Approval",
          key:
            "Days: solution Received to BF Approval (BA&AY)",
        },
        {
          name: "RFQ Target → Proposal",
          key:
            "Days: Proposal Submission to RFQ Submission target date (BB&AU)",
        },
        {
          name: "Proposal → Won",
          key:
            "Days: Proposal Submission to Date Won (BB&BG)",
        },
      ];

      return fields.map(
        (field) => {
          const values =
            filteredOpportunities
              .map((row) =>
                number(
                  row[field.key]
                )
              )
              .filter(
                (value) =>
                  value > 0
              );

          const average =
            values.length
              ? values.reduce(
                  (a, b) =>
                    a + b,
                  0
                ) /
                values.length
              : 0;

          const maximum =
            values.length
              ? Math.max(
                  ...values
                )
              : 0;

          return {
            name: field.name,
            average,
            maximum,
            count: values.length,
          };
        }
      );
    }, [filteredOpportunities]);

  /* =======================================================
     PROPOSAL DELAY DATA
  ======================================================= */

  const proposalDelayData =
    useMemo(() => {
      let onTime = 0;
      let delayed = 0;

      filteredOpportunities.forEach(
        (row) => {
          const delay =
            number(
              row[
                "Delay in Proposal Submission Date (AU&BB)"
              ]
            );

          if (delay <= 0) {
            onTime++;
          } else {
            delayed++;
          }
        }
      );

      return [
        {
          name: "On Time",
          opportunities: onTime,
        },
        {
          name: "Delayed",
          opportunities: delayed,
        },
      ];
    }, [filteredOpportunities]);

  /* =======================================================
     TOP OPPORTUNITIES
  ======================================================= */

  const topOpportunities =
    useMemo(() => {
      return [
        ...filteredOpportunities,
      ]
        .sort(
          (a, b) =>
            getOpportunityValue(
              b
            ) -
            getOpportunityValue(
              a
            )
        )
        .slice(0, 10);
    }, [filteredOpportunities]);

  /* =======================================================
     AT RISK
  ======================================================= */

  const atRiskOpportunities =
    useMemo(() => {
      return [
        ...filteredOpportunities,
      ]
        .filter(
          (row) =>
            getAge(row) >
            ageCritical
        )
        .sort(
          (a, b) =>
            getAge(b) -
            getAge(a)
        )
        .slice(0, 10);
    }, [
      filteredOpportunities,
      ageCritical,
    ]);

  /* =======================================================
     CLEAR FILTERS
  ======================================================= */

  function clearFilters() {
    setSearch("");
    setOutcomeFilter([]);
    setStageFilter([]);
    setOwnerFilter([]);
    setIndustryFilter([]);
    setRegionFilter([]);
    setAgeFilter([]);
    setWeekFilter([]);
    setMonthFilter([]);
    setYearFilter([]);
    setQuarterFilter([]);
  }

  const hasFilters =
    search || outcomeFilter.length || stageFilter.length || ownerFilter.length ||
    industryFilter.length || regionFilter.length || ageFilter.length || weekFilter.length ||
    monthFilter.length || yearFilter.length || quarterFilter.length;

  const latestUpdatedTime = useMemo(() => getLatestUpdatedTime(filteredOpportunities), [filteredOpportunities]);

  /* =======================================================
     EMPTY STATE
  ======================================================= */

  if (!opportunities.length) {
    return (
      <div className="p-8">
        <div className="bg-white border border-slate-200 rounded-2xl p-16 text-center">
          <BriefcaseBusiness
            size={40}
            className="mx-auto text-slate-300"
          />

          <h2 className="text-xl font-bold text-slate-900 mt-5">
            No opportunity data found
          </h2>

          <p className="text-slate-400 mt-2">
            The workbook was loaded,
            but no opportunity records
            were found.
          </p>
        </div>
      </div>
    );
  }

  /* =======================================================
     PAGE
  ======================================================= */

  return (
    <div className="p-8 space-y-6">

      {/* ===================================================
          HEADER
      =================================================== */}

      <SectionHeader
        title="Opportunity Intelligence"
        subtitle={`${filteredOpportunities.length} of ${opportunities.length} opportunities`}
        action={
          <button
            onClick={() =>
              downloadCSV(
                filteredOpportunities,
                "opportunities.csv"
              )
            }
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 shadow-sm"
          >
            <Download size={16} />
            Export CSV
          </button>
        }
      />

      {/* ===================================================
          FILTER BAR
      =================================================== */}

      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search opportunity, customer or ID..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            />
          </div>

          <MultiSelectFilter label="outcomes" options={filterOptions.outcomes} selected={outcomeFilter} onChange={setOutcomeFilter} open={openFilter} setOpen={setOpenFilter} />
          <MultiSelectFilter label="stages" options={filterOptions.stages} selected={stageFilter} onChange={setStageFilter} open={openFilter} setOpen={setOpenFilter} />
          <MultiSelectFilter label="owners" options={filterOptions.owners} selected={ownerFilter} onChange={setOwnerFilter} open={openFilter} setOpen={setOpenFilter} />
          <MultiSelectFilter label="industries" options={filterOptions.industries} selected={industryFilter} onChange={setIndustryFilter} open={openFilter} setOpen={setOpenFilter} />
          <MultiSelectFilter label="regions" options={filterOptions.regions} selected={regionFilter} onChange={setRegionFilter} open={openFilter} setOpen={setOpenFilter} />
          <MultiSelectFilter label="ages" options={filterOptions.ages} selected={ageFilter} onChange={setAgeFilter} open={openFilter} setOpen={setOpenFilter} />
          <MultiSelectFilter label="weeks" options={filterOptions.weeks} selected={weekFilter} onChange={setWeekFilter} open={openFilter} setOpen={setOpenFilter} />
          <MultiSelectFilter label="months" options={filterOptions.months} selected={monthFilter} onChange={setMonthFilter} open={openFilter} setOpen={setOpenFilter} />
          <MultiSelectFilter label="years" options={filterOptions.years} selected={yearFilter} onChange={setYearFilter} open={openFilter} setOpen={setOpenFilter} />
          <MultiSelectFilter label="fiscal quarters" options={filterOptions.quarters} selected={quarterFilter} onChange={setQuarterFilter} open={openFilter} setOpen={setOpenFilter} />

          {hasFilters && (
            <button onClick={clearFilters} className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-rose-600 bg-rose-50 hover:bg-rose-100">
              <X size={15} /> Clear
            </button>
          )}
        </div>
        <p className="text-xs text-slate-400 mt-3">Select multiple values inside any filter. Selections within a filter are combined with OR; different filters are combined with AND.</p>
      </div>

      {/* ===================================================
          KPI GRID
      =================================================== */}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5">

        <KPI
          title="Pipeline Value"
          value={formatValue(
            metrics.pipelineValue,
            currency,
            valueDisplay
          )}
          subtitle="Total annual contract value"
          icon={IndianRupee}
          iconClass="bg-indigo-50 text-indigo-600"
        />

        <KPI
          title="Opportunities"
          value={metrics.total}
          subtitle="Current records"
          icon={BriefcaseBusiness}
          iconClass="bg-violet-50 text-violet-600"
        />

        <KPI
          title="Won"
          value={metrics.won}
          subtitle={formatValue(
            metrics.wonValue,
            currency,
            valueDisplay
          )}
          icon={Trophy}
          iconClass="bg-emerald-50 text-emerald-600"
        />

        <KPI
          title="Active Pipeline"
          value={metrics.active}
          subtitle={formatValue(
            metrics.activeValue,
            currency,
            valueDisplay
          )}
          icon={TrendingUp}
          iconClass="bg-cyan-50 text-cyan-600"
        />

        <KPI
          title="Aging Risk"
          value={metrics.atRisk}
          subtitle={`Above ${ageCritical} days`}
          icon={AlertTriangle}
          iconClass="bg-rose-50 text-rose-600"
        />

        <KPI
          title="Win Rate"
          value={`${metrics.winRate.toFixed(
            1
          )}%`}
          subtitle="Won / total opportunities"
          icon={Target}
          iconClass="bg-emerald-50 text-emerald-600"
        />

        <KPI
          title="Won/Lost Rate"
          value={`${metrics.wonLossRate.toFixed(
            1
          )}%`}
          subtitle="Won / Won + Lost"
          icon={BarChart3}
          iconClass="bg-blue-50 text-blue-600"
        />

        <KPI
          title="Average Value"
          value={formatValue(
            metrics.averageValue,
            currency,
            valueDisplay
          )}
          subtitle="Per opportunity"
          icon={IndianRupee}
          iconClass="bg-amber-50 text-amber-600"
        />

        <KPI
          title="Average Age"
          value={`${metrics.averageAge.toFixed(
            0
          )} days`}
          subtitle="Opportunity age"
          icon={Clock3}
          iconClass="bg-orange-50 text-orange-600"
        />

        <KPI
          title="Proposal Delay"
          value={`${metrics.averageProposalDelay.toFixed(
            1
          )} days`}
          subtitle="Average submission delay"
          icon={Timer}
          iconClass="bg-fuchsia-50 text-fuchsia-600"
        />

      </div>

      {/* ===================================================
          HIGH VALUE
      =================================================== */}

      {highValueThreshold > 0 && (
        <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-indigo-50 border border-indigo-100">

          <div className="flex items-center gap-2">

            <IndianRupee
              size={16}
              className="text-indigo-600"
            />

            <p className="text-sm text-indigo-800">
              <span className="font-semibold">
                High-value threshold:
              </span>{" "}
              {formatValue(
                highValueThresholdAmount,
                currency,
                valueDisplay
              )}
            </p>

          </div>

          <p className="text-sm font-semibold text-indigo-700">
            {metrics.highValue} opportunities
          </p>

        </div>
      )}

      {/* ===================================================
          WEEKLY ANALYSIS
      =================================================== */}

      <ChartCard
        title="Weekly Opportunity Creation"
        subtitle="Latest opportunity weeks"
      >

        <div className="h-[380px]">

          <ResponsiveContainer
            width="100%"
            height="100%"
          >

            <BarChart
              data={weeklyData}
              margin={{
                top: 52,
                right: 20,
                left: 10,
                bottom: 30,
              }}
            >

              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="#e2e8f0"
              />

              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                angle={-20}
                textAnchor="end"
                height={60}
                tick={{
                  fontSize: 10,
                  fill: "#64748b",
                }}
              />

              <YAxis
                yAxisId="value"
                axisLine={false}
                tickLine={false}
                tickFormatter={(value) =>
                  formatChartValue(
                    value,
                    currency,
                    valueDisplay
                  )
                }
              />

              <YAxis
                yAxisId="count"
                orientation="right"
                axisLine={false}
                tickLine={false}
              />

              <Tooltip
                content={
                  <ChartTooltip
                    currency={currency}
                    valueDisplay={valueDisplay}
                  />
                }
              />

              <Legend />

              <Bar
                yAxisId="value"
                dataKey="value"
                name="Value"
                fill="#4f46e5"
              >

                <LabelList
                  content={(props) => (
                    <ValueLabel
                      {...props}
                      currency={currency}
                      display={valueDisplay}
                    />
                  )}
                />

              </Bar>

              <Bar
                yAxisId="count"
                dataKey="opportunities"
                name="Opportunities"
                fill="#22c55e"
              >

                <LabelList
                  content={(props) => (
                    <CountLabel
                      {...props}
                    />
                  )}
                />

              </Bar>

            <Brush dataKey="name" height={22} travellerWidth={10} stroke="#6366f1" />
            </BarChart>

          </ResponsiveContainer>

        </div>

      </ChartCard>

      {/* ===================================================
          MONTHLY DOUBLE BAR
      =================================================== */}

      <ChartCard
        title="Monthly Opportunity Performance"
        subtitle="Opportunity count and annual contract value by month"
      >
        <div className="h-[410px]">

          <ResponsiveContainer
            width="100%"
            height="100%"
          >
            <BarChart
              data={monthlyData}
              margin={{
                top: 52,
                right: 20,
                left: 10,
                bottom: 20,
              }}
            >

              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="#e2e8f0"
              />

              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{
                  fontSize: 11,
                  fill: "#64748b",
                }}
              />

              <YAxis
                yAxisId="value"
                axisLine={false}
                tickLine={false}
                tickFormatter={(value) =>
                  formatChartValue(
                    value,
                    currency,
                    valueDisplay
                  )
                }
              />

              <YAxis
                yAxisId="count"
                orientation="right"
                axisLine={false}
                tickLine={false}
              />

              <Tooltip
                content={
                  <ChartTooltip
                    currency={currency}
                    valueDisplay={valueDisplay}
                  />
                }
              />

              <Legend />

              <Bar
                yAxisId="value"
                dataKey="value"
                name="Value"
                fill="#6366f1"
                radius={[
                  6,
                  6,
                  0,
                  0,
                ]}
              >
                <LabelList
                  content={(props) => (
                    <ValueLabel
                      {...props}
                      currency={currency}
                      display={valueDisplay}
                    />
                  )}
                />
              </Bar>

              <Bar
                yAxisId="count"
                dataKey="opportunities"
                name="Opportunities"
                fill="#06b6d4"
                radius={[
                  6,
                  6,
                  0,
                  0,
                ]}
              >
                <LabelList
                  content={(props) => (
                    <CountLabel
                      {...props}
                    />
                  )}
                />
              </Bar>

            <Brush dataKey="name" height={22} travellerWidth={10} stroke="#6366f1" />
            </BarChart>
          </ResponsiveContainer>

        </div>
      </ChartCard>

      {/* ===================================================
          MONTHLY OUTCOME VALUE
      =================================================== */}

      <ChartCard
        title="Monthly Outcome Value"
        subtitle="Double-bar comparison of won value versus active pipeline"
      >
        <div className="h-[410px]">

          <ResponsiveContainer
            width="100%"
            height="100%"
          >
            <BarChart
              data={monthlyData}
              margin={{
                top: 52,
                right: 20,
                left: 10,
                bottom: 20,
              }}
            >

              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="#e2e8f0"
              />

              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{
                  fontSize: 11,
                  fill: "#64748b",
                }}
              />

              <YAxis
                axisLine={false}
                tickLine={false}
                tickFormatter={(value) =>
                  formatChartValue(
                    value,
                    currency,
                    valueDisplay
                  )
                }
              />

              <Tooltip
                content={
                  <ChartTooltip
                    currency={currency}
                    valueDisplay={valueDisplay}
                  />
                }
              />

              <Legend />

              <Bar
                dataKey="wonValue"
                name="Won Value"
                fill="#10b981"
                radius={[
                  6,
                  6,
                  0,
                  0,
                ]}
              >
                <LabelList
                  content={(props) => (
                    <ValueLabel
                      {...props}
                      currency={currency}
                      display={valueDisplay}
                    />
                  )}
                />
              </Bar>

              <Bar
                dataKey="activeValue"
                name="Active Value"
                fill="#6366f1"
                radius={[
                  6,
                  6,
                  0,
                  0,
                ]}
              >
                <LabelList
                  content={(props) => (
                    <ValueLabel
                      {...props}
                      currency={currency}
                      display={valueDisplay}
                    />
                  )}
                />
              </Bar>

            </BarChart>
          </ResponsiveContainer>

        </div>
      </ChartCard>

      {/* ===================================================
          OUTCOME + STAGE
      =================================================== */}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">

        <ChartCard
          title="Opportunity Outcomes"
          subtitle="Count and distribution"
        >

          <div className="h-[370px]">

            <ResponsiveContainer
              width="100%"
              height="100%"
            >

              <PieChart>

                <Pie
                  data={outcomeData}
                  dataKey="opportunities"
                  nameKey="name"
                  cx="50%"
                  cy="45%"
                  innerRadius={65}
                  outerRadius={110}
                  paddingAngle={3}
                  label={PieCountLabel}
                  labelLine={false}
                >

                  {outcomeData.map(
                    (item, index) => (
                      <Cell
                        key={item.name}
                        fill={[
                          "#10b981",
                          "#6366f1",
                          "#f43f5e",
                          "#f59e0b",
                        ][
                          index %
                            4
                        ]}
                      />
                    )
                  )}

                </Pie>

                <Tooltip />

                <Legend
                  verticalAlign="bottom"
                />

              </PieChart>

            </ResponsiveContainer>

          </div>

        </ChartCard>

        <ChartCard
          title="Pipeline by Stage"
          subtitle="Opportunity count versus value"
          className="xl:col-span-2"
        >

          <div className="h-[370px]">

            <ResponsiveContainer
              width="100%"
              height="100%"
            >

              <BarChart
                data={stageData}
                margin={{
                  top: 52,
                  right: 20,
                  left: 10,
                  bottom: 65,
                }}
              >

                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#e2e8f0"
                />

                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  interval={0}
                  angle={-25}
                  textAnchor="end"
                  height={80}
                  tick={{
                    fontSize: 10,
                    fill: "#64748b",
                  }}
                />

                <YAxis
                  yAxisId="value"
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(value) =>
                    formatChartValue(
                      value,
                      currency,
                      valueDisplay
                    )
                  }
                />

                <YAxis
                  yAxisId="count"
                  orientation="right"
                  axisLine={false}
                  tickLine={false}
                />

                <Tooltip
                  content={
                    <ChartTooltip
                      currency={currency}
                      valueDisplay={valueDisplay}
                    />
                  }
                />

                <Legend />

                <Bar
                  yAxisId="value"
                  dataKey="value"
                  name="Value"
                  fill="#6366f1"
                  radius={[
                    5,
                    5,
                    0,
                    0,
                  ]}
                >
                  <LabelList
                    content={(props) => (
                      <ValueLabel
                        {...props}
                        currency={currency}
                        display={valueDisplay}
                      />
                    )}
                  />
                </Bar>

                <Bar
                  yAxisId="count"
                  dataKey="opportunities"
                  name="Opportunities"
                  fill="#06b6d4"
                  radius={[
                    5,
                    5,
                    0,
                    0,
                  ]}
                >
                  <LabelList
                    content={(props) => (
                      <CountLabel
                        {...props}
                      />
                    )}
                  />
                </Bar>

              <Brush dataKey="name" height={22} travellerWidth={10} stroke="#6366f1" />
              </BarChart>

            </ResponsiveContainer>

          </div>

        </ChartCard>

      </div>

      {/* ===================================================
          OWNER + PCS VERTICAL
      =================================================== */}

      <div className="grid grid-cols-1 gap-5">

        <ChartCard
          title="Pipeline by PCS Vertical"
          subtitle="Value and opportunity count by PCS Vertical"
        >

          <div className="h-[680px]">

            <ResponsiveContainer
              width="100%"
              height="100%"
            >

              <BarChart
                data={pcsVerticalData}
                layout="vertical"
                barGap={6}
                margin={{
                  top: 15,
                  right: 78,
                  left: 8,
                  bottom: 15,
                }}
              >

                <CartesianGrid
                  strokeDasharray="3 3"
                  horizontal={false}
                  stroke="#e2e8f0"
                />

                <XAxis
                  xAxisId="value"
                  type="number"
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(value) =>
                    formatChartValue(
                      value,
                      currency,
                      valueDisplay
                    )
                  }
                />

                <XAxis
                  xAxisId="count"
                  type="number"
                  orientation="top"
                  axisLine={false}
                  tickLine={false}
                  tick={false}
                  hide
                />

                <YAxis
                  type="category"
                  dataKey="name"
                  width={135}
                  axisLine={false}
                  tickLine={false}
                  tick={{
                    fontSize: 13,
                    fill: "#475569",
                    fontWeight: 500,
                  }}
                />

                <Tooltip
                  content={
                    <ChartTooltip
                      currency={currency}
                      valueDisplay={valueDisplay}
                    />
                  }
                />

                <Legend wrapperStyle={{ fontSize: 14, fontWeight: 500 }} />

                <Bar
                  xAxisId="value"
                  dataKey="value"
                  name="Value"
                  fill="#06b6d4"
                  radius={[0, 6, 6, 0]}
                >
                  <LabelList
                    content={(props) => (
                      <HorizontalValueLabel
                        {...props}
                        currency={currency}
                        display={valueDisplay}
                      />
                    )}
                  />
                </Bar>

                <Bar
                  xAxisId="count"
                  dataKey="opportunities"
                  name="Count"
                  fill="#14b8a6"
                  radius={[0, 6, 6, 0]}
                >
                  <LabelList
                    content={(props) => (
                      <HorizontalCountLabel
                        {...props}
                      />
                    )}
                  />
                </Bar>

              </BarChart>

            </ResponsiveContainer>

          </div>

        </ChartCard>

        <ChartCard
          title="Sales Owner Performance"
          subtitle="Value and opportunity count"
        >

          <div className="h-[680px]">

            <ResponsiveContainer
              width="100%"
              height="100%"
            >

              <BarChart
                data={ownerData}
                layout="vertical"
                barGap={6}
                margin={{
                  top: 15,
                  right: 78,
                  left: 8,
                  bottom: 15,
                }}
              >

                <CartesianGrid
                  strokeDasharray="3 3"
                  horizontal={false}
                  stroke="#e2e8f0"
                />

                <XAxis
                  xAxisId="value"
                  type="number"
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(value) =>
                    formatChartValue(
                      value,
                      currency,
                      valueDisplay
                    )
                  }
                />

                <XAxis
                  xAxisId="count"
                  type="number"
                  orientation="top"
                  axisLine={false}
                  tickLine={false}
                  tick={false}
                  hide
                />

                <YAxis
                  type="category"
                  dataKey="name"
                  width={135}
                  axisLine={false}
                  tickLine={false}
                  tick={{
                    fontSize: 13,
                    fill: "#475569",
                    fontWeight: 500,
                  }}
                />

                <Tooltip
                  content={
                    <ChartTooltip
                      currency={currency}
                      valueDisplay={valueDisplay}
                    />
                  }
                />

                <Legend wrapperStyle={{ fontSize: 14, fontWeight: 500 }} />

                <Bar
                  xAxisId="value"
                  dataKey="value"
                  name="Value"
                  fill="#8b5cf6"
                  radius={[0, 6, 6, 0]}
                >
                  <LabelList
                    content={(props) => (
                      <HorizontalValueLabel
                        {...props}
                        currency={currency}
                        display={valueDisplay}
                      />
                    )}
                  />
                </Bar>

                <Bar
                  xAxisId="count"
                  dataKey="opportunities"
                  name="Count"
                  fill="#06b6d4"
                  radius={[0, 6, 6, 0]}
                >
                  <LabelList
                    content={(props) => (
                      <HorizontalCountLabel
                        {...props}
                      />
                    )}
                  />
                </Bar>

              </BarChart>

            </ResponsiveContainer>

          </div>

        </ChartCard>

      </div>

      {/* ===================================================
          REGION
      =================================================== */}

      <ChartCard
        title="Regional Opportunity Analysis"
        subtitle="Pipeline value versus opportunity count"
      >

        <div className="h-[380px]">

          <ResponsiveContainer
            width="100%"
            height="100%"
          >

            <BarChart
              data={regionData}
              margin={{
                top: 52,
                right: 20,
                left: 10,
                bottom: 30,
              }}
            >

              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="#e2e8f0"
              />

              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
              />

              <YAxis
                yAxisId="value"
                axisLine={false}
                tickLine={false}
                tickFormatter={(value) =>
                  formatChartValue(
                    value,
                    currency,
                    valueDisplay
                  )
                }
              />

              <YAxis
                yAxisId="count"
                orientation="right"
                axisLine={false}
                tickLine={false}
              />

              <Tooltip
                content={
                  <ChartTooltip
                    currency={currency}
                    valueDisplay={valueDisplay}
                  />
                }
              />

              <Legend />

              <Bar
                yAxisId="value"
                dataKey="value"
                name="Value"
                fill="#6366f1"
              >
                <LabelList
                  content={(props) => (
                    <ValueLabel
                      {...props}
                      currency={currency}
                      display={valueDisplay}
                    />
                  )}
                />
              </Bar>

              <Bar
                yAxisId="count"
                dataKey="opportunities"
                name="Opportunities"
                fill="#14b8a6"
              >
                <LabelList
                  content={(props) => (
                    <CountLabel
                      {...props}
                    />
                  )}
                />
              </Bar>

            <Brush dataKey="name" height={22} travellerWidth={10} stroke="#6366f1" />
            </BarChart>

          </ResponsiveContainer>

        </div>

      </ChartCard>

      {/* ===================================================
          AGE ANALYSIS
      =================================================== */}

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 xl:grid-rows-[420px_420px] items-stretch">

        <div className="xl:col-span-6 xl:row-span-2 grid grid-rows-[420px_420px] gap-5 min-w-0">

          <ChartCard
            className="h-[420px] min-h-0"
            title="Opportunity Aging"
            subtitle={`Count and value using ${ageWarning}/${ageCritical} day thresholds`}
          >

            <div className="h-[320px] min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={ageData}
                  margin={{ top: 52, right: 20, left: 10, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} />
                  <YAxis
                    yAxisId="value"
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(value) => formatChartValue(value, currency, valueDisplay)}
                  />
                  <YAxis yAxisId="count" orientation="right" axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTooltip currency={currency} valueDisplay={valueDisplay} />} />
                  <Legend />

                  <Bar yAxisId="value" dataKey="value" name="Value" fill="#f59e0b" radius={[6, 6, 0, 0]}>
                    <LabelList
                      content={(props) => (
                        <ValueLabel {...props} currency={currency} display={valueDisplay} />
                      )}
                    />
                  </Bar>

                  <Bar yAxisId="count" dataKey="opportunities" name="Opportunities" fill="#f97316" radius={[6, 6, 0, 0]}>
                    <LabelList content={(props) => <CountLabel {...props} />} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

          </ChartCard>

          <ChartCard
            className="h-[420px] min-h-0"
            title="Proposal Submission Performance"
            subtitle="On-time versus delayed proposal submissions"
          >

            <div className="h-[265px] min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={proposalDelayData}
                  margin={{ top: 52, right: 20, left: 10, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} />
                  <YAxis axisLine={false} tickLine={false} />
                  <Tooltip />
                  <Bar dataKey="opportunities" name="Opportunities" fill="#14b8a6" radius={[6, 6, 0, 0]}>
                    <LabelList content={(props) => <CountLabel {...props} />} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-2 grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-emerald-50 border border-emerald-100 px-4 py-2.5">
                <p className="text-xs font-medium text-emerald-600">On time</p>
                <p className="text-xl font-bold text-emerald-700 mt-0.5">
                  {proposalDelayData?.find((item) => item.name === "On Time")?.opportunities ?? 0}
                </p>
              </div>
              <div className="rounded-xl bg-rose-50 border border-rose-100 px-4 py-2.5">
                <p className="text-xs font-medium text-rose-600">Delayed</p>
                <p className="text-xl font-bold text-rose-700 mt-0.5">
                  {proposalDelayData?.find((item) => item.name === "Delayed")?.opportunities ?? 0}
                </p>
              </div>
            </div>

          </ChartCard>

        </div>

        <div className="xl:col-span-6 xl:row-span-2 min-w-0 h-full">
          <ChartCard
            title="Aging Risk Monitor"
            subtitle={`Top opportunities above ${ageCritical} days`}
            action={<span className="text-xs font-medium text-slate-400">Updated: {latestUpdatedTime}</span>}
            className="h-full w-full min-h-0"
          >
            <div className="h-full min-h-0 overflow-y-auto pr-1 space-y-3">

              {atRiskOpportunities.length === 0 && (
                <div className="h-full min-h-[300px] flex items-center justify-center text-sm text-slate-400">
                  No opportunities above {ageCritical} days.
                </div>
              )}

              {atRiskOpportunities.map((row, index) => {
                const age = getAge(row);
                const value = getOpportunityValueCrores(row);

                return (
                  <div
                    key={row["Opportunity ID"] || index}
                    className="flex items-center justify-between p-3 rounded-xl bg-rose-50 border border-rose-100 min-h-[54px]"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-base text-slate-800 truncate">
                        {text(row["Opportunity Name"]) || "Unnamed opportunity"}
                      </p>
                      <p className="text-sm text-slate-500 truncate mt-1">
                        {text(row["Customer name"]) || "Unknown customer"}
                      </p>
                    </div>

                    <div className="text-right ml-4 shrink-0">
                      <p className="text-base font-bold text-rose-600">{age} days</p>
                      <p className="text-sm text-slate-500">
                        {formatValue(value, currency, valueDisplay)}
                      </p>
                    </div>
                  </div>
                );
              })}

            </div>
          </ChartCard>
        </div>

      </div>

      {/* ===================================================
          VALUE DISTRIBUTION
      =================================================== */}

      <ChartCard
        title="Opportunity Value Distribution"
        subtitle="Number of opportunities and total value by value band"
      >

        <div className="h-[380px]">

          <ResponsiveContainer
            width="100%"
            height="100%"
          >

            <BarChart
              data={valueBucketData}
              margin={{
                top: 52,
                right: 20,
                left: 10,
                bottom: 20,
              }}
            >

              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="#e2e8f0"
              />

              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
              />

              <YAxis
                yAxisId="value"
                axisLine={false}
                tickLine={false}
                tickFormatter={(value) =>
                  formatChartValue(
                    value,
                    currency,
                    valueDisplay
                  )
                }
              />

              <YAxis
                yAxisId="count"
                orientation="right"
                axisLine={false}
                tickLine={false}
              />

              <Tooltip
                content={
                  <ChartTooltip
                    currency={currency}
                    valueDisplay={valueDisplay}
                  />
                }
              />

              <Legend />

              <Bar
                yAxisId="value"
                dataKey="value"
                name="Value"
                fill="#7c3aed"
                radius={[
                  6,
                  6,
                  0,
                  0,
                ]}
              >

                <LabelList
                  content={(props) => (
                    <ValueLabel
                      {...props}
                      currency={currency}
                      display={valueDisplay}
                    />
                  )}
                />

              </Bar>

              <Bar
                yAxisId="count"
                dataKey="opportunities"
                name="Opportunities"
                fill="#a78bfa"
                radius={[
                  6,
                  6,
                  0,
                  0,
                ]}
              >

                <LabelList
                  content={(props) => (
                    <CountLabel
                      {...props}
                    />
                  )}
                />

              </Bar>

            </BarChart>

          </ResponsiveContainer>

        </div>

      </ChartCard>

      {/* ===================================================
          SALES PROCESS DURATION
      =================================================== */}

      <ChartCard
        title="Opportunity Process Duration"
        subtitle="Average versus maximum duration across the sales process"
      >

        <div className="h-[410px]">

          <ResponsiveContainer
            width="100%"
            height="100%"
          >

            <BarChart
              data={processDurationData}
              margin={{
                top: 58,
                right: 20,
                left: 10,
                bottom: 70,
              }}
            >

              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="#e2e8f0"
              />

              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                interval={0}
                angle={-20}
                textAnchor="end"
                height={80}
                tick={{
                  fontSize: 10,
                  fill: "#64748b",
                }}
              />

              <YAxis
                axisLine={false}
                tickLine={false}
                label={{
                  value: "Days",
                  angle: -90,
                  position: "insideLeft",
                }}
              />
              <YAxis
                yAxisId="count"
                orientation="right"
                axisLine={false}
                tickLine={false}
                label={{
                  value: "Count",
                  angle: 90,
                  position: "insideRight",
                }}
              />

              <Tooltip />

              <Legend />

              <Bar
                dataKey="average"
                name="Average Days"
                fill="#3b82f6"
                radius={[
                  6,
                  6,
                  0,
                  0,
                ]}
              >

                <LabelList
                  content={(props) => (
                    <DurationLabel
                      {...props}
                      decimals={1}
                    />
                  )}
                />

              </Bar>

              <Bar
                yAxisId="count"
                dataKey="count"
                name="Count"
                fill="#14b8a6"
                radius={[6, 6, 0, 0]}
              >
                <LabelList content={(props) => <CountLabel {...props} />} />
              </Bar>

              <Bar
                dataKey="maximum"
                name="Maximum Days"
                fill="#f97316"
                radius={[
                  6,
                  6,
                  0,
                  0,
                ]}
              >

                <LabelList
                  content={(props) => (
                    <DurationLabel
                      {...props}
                      decimals={0}
                    />
                  )}
                />

              </Bar>

            </BarChart>

          </ResponsiveContainer>

        </div>

      </ChartCard>

      {/* ===================================================
          TOP OPPORTUNITIES
      =================================================== */}

      <ChartCard
        title="Top Opportunities"
        subtitle="Highest-value opportunities in the current pipeline"
        action={
          <span className="text-xs text-slate-400">
            Top 10
          </span>
        }
      >

        <div className="overflow-x-auto">

          <table className="w-full text-sm">

            <thead>

              <tr className="border-b border-slate-100">

                <th className="text-left py-3 pr-4 font-semibold text-slate-500">
                  Opportunity
                </th>

                <th className="text-left py-3 px-4 font-semibold text-slate-500">
                  Customer
                </th>

                <th className="text-left py-3 px-4 font-semibold text-slate-500">
                  Owner
                </th>

                <th className="text-left py-3 px-4 font-semibold text-slate-500">
                  Stage
                </th>

                <th className="text-left py-3 px-4 font-semibold text-slate-500">
                  Outcome
                </th>

                <th className="text-right py-3 px-4 font-semibold text-slate-500">
                  Age
                </th>

                <th className="text-right py-3 pl-4 font-semibold text-slate-500">
                  Value
                </th>

              </tr>

            </thead>

            <tbody>

              {topOpportunities.map(
                (row, index) => {

                  const age =
                    getAge(row);

                  return (
                    <tr
                      key={
                        row[
                          "Opportunity ID"
                        ] ||
                        index
                      }
                      className="border-b border-slate-50 hover:bg-slate-50"
                    >

                      <td className="py-4 pr-4">

                        <p className="font-semibold text-slate-800">
                          {text(
                            row[
                              "Opportunity Name"
                            ]
                          ) ||
                            "Unnamed"}
                        </p>

                        <p className="text-xs text-slate-400 mt-1">
                          {text(
                            row[
                              "Opportunity ID"
                            ]
                          ) ||
                            "—"}
                        </p>

                      </td>

                      <td className="py-4 px-4 text-slate-600">
                        {text(
                          row[
                            "Customer name"
                          ]
                        ) || "—"}
                      </td>

                      <td className="py-4 px-4 text-slate-600">
                        {getOwner(row)}
                      </td>

                      <td className="py-4 px-4">
                        {getStage(row)}
                      </td>

                      <td className="py-4 px-4">
                        {getOutcome(row)}
                      </td>

                      <td className="py-4 px-4 text-right">
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                            age >
                            ageCritical
                              ? "bg-rose-50 text-rose-700"
                              : age >=
                                ageWarning
                              ? "bg-amber-50 text-amber-700"
                              : "bg-emerald-50 text-emerald-700"
                          }`}
                        >
                          {age}d
                        </span>
                      </td>

                      <td className="py-4 pl-4 text-right font-bold text-slate-900">
                        {formatValue(
                          getOpportunityValue(
                            row
                          ),
                          currency,
                          valueDisplay
                        )}
                      </td>

                    </tr>
                  );
                }
              )}

            </tbody>

          </table>

        </div>

      </ChartCard>

      {/* ===================================================
          FULL REGISTER
      =================================================== */}

      <ChartCard
        title="Opportunity Register"
        subtitle={`Showing ${filteredOpportunities.length} filtered records`}
        action={
          <button
            onClick={() =>
              downloadCSV(
                filteredOpportunities,
                "opportunity-register.csv"
              )
            }
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-600"
          >
            <Download size={14} />
            Download Table
          </button>
        }
      >

        <div className="overflow-x-auto">

          <table className="w-full text-sm">

            <thead className="bg-slate-50">

              <tr>

                <th className="text-left px-4 py-3 font-semibold text-slate-500 whitespace-nowrap">
                  Opportunity
                </th>

                <th className="text-left px-4 py-3 font-semibold text-slate-500 whitespace-nowrap">
                  Customer
                </th>

                <th className="text-left px-4 py-3 font-semibold text-slate-500 whitespace-nowrap">
                  Owner
                </th>

                <th className="text-left px-4 py-3 font-semibold text-slate-500 whitespace-nowrap">
                  Stage
                </th>

                <th className="text-left px-4 py-3 font-semibold text-slate-500 whitespace-nowrap">
                  Outcome
                </th>

                <th className="text-left px-4 py-3 font-semibold text-slate-500 whitespace-nowrap">
                  Industry
                </th>

                <th className="text-left px-4 py-3 font-semibold text-slate-500 whitespace-nowrap">
                  Region
                </th>

                <th className="text-right px-4 py-3 font-semibold text-slate-500 whitespace-nowrap">
                  Age
                </th>

                <th className="text-right px-4 py-3 font-semibold text-slate-500 whitespace-nowrap">
                  Value
                </th>

              </tr>

            </thead>

            <tbody>

              {filteredOpportunities.map(
                (row, index) => (
                  <tr
                    key={
                      row[
                        "Opportunity ID"
                      ] ||
                      index
                    }
                    className="border-t border-slate-100 hover:bg-slate-50"
                  >

                    <td className="px-4 py-3 font-medium text-slate-800 whitespace-nowrap">
                      {text(
                        row[
                          "Opportunity Name"
                        ]
                      ) || "—"}
                    </td>

                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                      {text(
                        row[
                          "Customer name"
                        ]
                      ) || "—"}
                    </td>

                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                      {getOwner(row)}
                    </td>

                    <td className="px-4 py-3 whitespace-nowrap">
                      {getStage(row)}
                    </td>

                    <td className="px-4 py-3 whitespace-nowrap">
                      {getOutcome(row)}
                    </td>

                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                      {getIndustry(row)}
                    </td>

                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                      {getRegion(row)}
                    </td>

                    <td className="px-4 py-3 text-right font-medium whitespace-nowrap">
                      {getAge(row)} days
                    </td>

                    <td className="px-4 py-3 text-right font-semibold text-slate-900 whitespace-nowrap">
                      {formatValue(
                        getOpportunityValue(
                          row
                        ),
                        currency,
                        valueDisplay
                      )}
                    </td>

                  </tr>
                )
              )}

            </tbody>

          </table>

        </div>

      </ChartCard>

    </div>
  );
}

export default Opportunities;