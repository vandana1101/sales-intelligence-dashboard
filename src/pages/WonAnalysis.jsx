import { useMemo, useState } from "react";

import {
  Trophy,
  IndianRupee,
  TrendingUp,
  Users,
  Target,
  CalendarDays,
  Search,
  X,
  ChevronDown,
} from "lucide-react";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LabelList,
} from "recharts";

import KPI from "../components/dashboard/KPI";
import ChartCard from "../components/dashboard/ChartCard";
import SectionHeader from "../components/dashboard/SectionHeader";

/* =========================================================
   HELPERS
========================================================= */

function text(v) {
  return v === null || v === undefined ? "" : String(v).trim();
}

function num(v) {
  if (v === null || v === undefined || v === "") {
    return 0;
  }

  if (typeof v === "number") {
    return Number.isFinite(v) ? v : 0;
  }

  const n = Number(
    String(v).replace(/[₹,%\s,]/g, "")
  );

  return Number.isFinite(n) ? n : 0;
}

/* =========================================================
   DATE HELPERS
========================================================= */

function dateValue(v) {
  if (!v) {
    return null;
  }

  if (
    v instanceof Date &&
    !Number.isNaN(v.getTime())
  ) {
    return v;
  }

  if (typeof v === "number") {
    const d = new Date(
      Date.UTC(1899, 11, 30) +
        v * 86400000
    );

    return Number.isNaN(d.getTime()) ? null : d;
  }

  const d = new Date(v);

  return Number.isNaN(d.getTime()) ? null : d;
}

function getCreatedDate(row) {
  return dateValue(
    row?.["Opportunity Created Date"]
  );
}

function getWonDate(row) {
  return (
    row?.["Date won"] ||
    row?.["Won Date"] ||
    row?.["Onboarded date"]
  );
}

function getWonYear(row) {
  const d = dateValue(getWonDate(row));

  if (d) {
    return String(d.getFullYear());
  }

  const created = getCreatedDate(row);

  return created
    ? String(created.getFullYear())
    : "Unknown";
}

function getCreatedYear(row) {
  const d = getCreatedDate(row);

  return d
    ? String(d.getFullYear())
    : "Unknown";
}

/*
 * Week is based directly on Opportunity Created Date.
 */
function getOpportunityWeek(row) {
  const d = getCreatedDate(row);

  if (!d) {
    return "Unknown";
  }

  const start = new Date(
    d.getFullYear(),
    0,
    1
  );

  const diff = Math.floor(
    (d.getTime() - start.getTime()) /
      86400000
  );

  const week =
    Math.floor(diff / 7) + 1;

  return `Week ${week} ${d.getFullYear()}`;
}

function getOpportunityMonth(row) {
  const d = getCreatedDate(row);

  if (!d) {
    return "Unknown";
  }

  return d.toLocaleString("en-US", {
    month: "short",
    year: "numeric",
  });
}

/*
 * Fiscal year:
 *
 * Q1 = Apr-Jun
 * Q2 = Jul-Sep
 * Q3 = Oct-Dec
 * Q4 = Jan-Mar
 *
 * Example:
 * Apr 2025 -> Q1 2025
 * Jan 2025 -> Q4 2025
 */
function getFiscalQuarter(row) {
  const d = getCreatedDate(row);

  if (!d) {
    return "Unknown";
  }

  const month = d.getMonth() + 1;

  if (month >= 4 && month <= 6) {
    return `Q1 ${d.getFullYear()}`;
  }

  if (month >= 7 && month <= 9) {
    return `Q2 ${d.getFullYear()}`;
  }

  if (month >= 10 && month <= 12) {
    return `Q3 ${d.getFullYear()}`;
  }

  return `Q4 ${d.getFullYear()}`;
}

/* =========================================================
   SORTING FOR DATE FILTERS
========================================================= */

function sortDescending(values, type) {
  return [...values].sort((a, b) => {
    if (a === "Unknown") return 1;
    if (b === "Unknown") return -1;

    if (type === "year") {
      return Number(b) - Number(a);
    }

    if (type === "week") {
      const ma = String(a).match(
        /Week\s*(\d+)\s+(\d{4})/
      );

      const mb = String(b).match(
        /Week\s*(\d+)\s+(\d{4})/
      );

      if (!ma || !mb) {
        return String(b).localeCompare(String(a));
      }

      const ya = Number(ma[2]);
      const yb = Number(mb[2]);
      const wa = Number(ma[1]);
      const wb = Number(mb[1]);

      return yb - ya || wb - wa;
    }

    if (type === "month") {
      const ma = String(a).match(
        /^([A-Za-z]{3})\s+(\d{4})$/
      );

      const mb = String(b).match(
        /^([A-Za-z]{3})\s+(\d{4})$/
      );

      if (!ma || !mb) {
        return String(b).localeCompare(String(a));
      }

      const monthIndex = {
        Jan: 0,
        Feb: 1,
        Mar: 2,
        Apr: 3,
        May: 4,
        Jun: 5,
        Jul: 6,
        Aug: 7,
        Sep: 8,
        Oct: 9,
        Nov: 10,
        Dec: 11,
      };

      const da = new Date(
        Number(ma[2]),
        monthIndex[ma[1]],
        1
      );

      const db = new Date(
        Number(mb[2]),
        monthIndex[mb[1]],
        1
      );

      return db - da;
    }

    if (type === "quarter") {
      const ma = String(a).match(
        /^Q(\d)\s+(\d{4})$/
      );

      const mb = String(b).match(
        /^Q(\d)\s+(\d{4})$/
      );

      if (!ma || !mb) {
        return String(b).localeCompare(String(a));
      }

      const ya = Number(ma[2]);
      const yb = Number(mb[2]);
      const qa = Number(ma[1]);
      const qb = Number(mb[1]);

      return yb - ya || qb - qa;
    }

    return String(b).localeCompare(String(a));
  });
}

/* =========================================================
   VALUE
========================================================= */

/*
 * Priority:
 *
 * 1. Any "Values in Cr" / "Value in Cr" type field
 * 2. Value of Contract Per Annum INR / 10^7
 * 3. Revenue potential per month × 12 / 10^7
 *
 * Everything returned from this function is in CRORES.
 */

function getCrValueField(row) {
  const preferredKeys = [
    "Values in Cr",
    "Value in Cr",
    "Value (Cr)",
    "Values (Cr)",
    "Value in Crores",
    "Values in Crores",
    "Value of Contract Per Annum in Cr",
  ];

  for (const key of preferredKeys) {
    if (
      Object.prototype.hasOwnProperty.call(
        row || {},
        key
      )
    ) {
      return num(row[key]);
    }
  }

  /*
   * Fallback header detection for slightly
   * different source-column naming.
   */
  const keys = Object.keys(row || {});

  const dynamicKey = keys.find((key) => {
    const k = key
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();

    return (
      k.includes("value") &&
      k.includes("cr") &&
      !k.includes("per annum inr") &&
      !k.includes("contract per annum")
    );
  });

  return dynamicKey
    ? num(row[dynamicKey])
    : 0;
}

function getValue(row) {
  const crValue = getCrValueField(row);

  if (crValue !== 0) {
    return crValue;
  }

  const annual = num(
    row?.[
      "Value of Contract Per Annum INR"
    ]
  );

  if (annual !== 0) {
    return annual / 10000000;
  }

  const monthly = num(
    row?.[
      "Revenue potential per month (in INR)"
    ]
  );

  if (monthly !== 0) {
    return (
      (monthly * 12) /
      10000000
    );
  }

  return 0;
}

function formatCr(v) {
  return `₹${num(v).toFixed(2)} Cr`;
}

function formatInt(v) {
  return Math.round(num(v)).toLocaleString(
    "en-IN"
  );
}

function formatPct(v) {
  return `${(
    num(v) * 100
  ).toFixed(1)}%`;
}

/* =========================================================
   GENERIC FIELD HELPERS
========================================================= */

function first(
  row,
  keys,
  fallback = "Unknown"
) {
  for (const key of keys) {
    const value = text(row?.[key]);

    if (value) {
      return value;
    }
  }

  return fallback;
}

/* =========================================================
   FIELD GETTERS
========================================================= */

function getOwner(row) {
  return first(row, [
    "Assigned To",
    "Salesforce User Name",
    "Sales Owner",
  ]);
}

function getPCSVertical(row) {
  return first(row, [
    "PCS Vertical",
    "PCS vertical",
    "PCS_Vertical",
  ]);
}

function getIndustry(row) {
  return first(row, ["Industry"]);
}

function getDealSize(row) {
  return first(row, ["Deal Size Bucket"]);
}

function getService(row) {
  return first(row, [
    "Capability Required",
    "Capability required",
    "Services Required",
  ]);
}

function getRawWinReason(row) {
  return first(
    row,
    [
      "Reason for Changing Incumbent",
      "Reason for changing incumbent",
      "Reason for changing incumbent ",
    ],
    ""
  );
}

/* =========================================================
   REGION STANDARDIZATION
========================================================= */

function getStandardizedRegion(row) {
  const raw = first(
    row,
    [
      "Customer Service required region",
      "PCS User Region",
    ],
    ""
  )
    .toLowerCase()
    .trim();

  if (!raw) {
    return "Unknown";
  }

  /*
   * Explicit PAN INDIA.
   */
  if (
    raw.includes("pan india") ||
    raw.includes("pan-india") ||
    raw.includes("panindia") ||
    raw.includes("all india") ||
    raw.includes("all over india")
  ) {
    return "Pan India";
  }

  const northTokens = [
    "north",
    "delhi",
    "ncr",
    "haryana",
    "punjab",
    "himachal",
    "uttarakhand",
    "uttar pradesh",
    "jammu",
    "jammu & kashmir",
    "jammu and kashmir",
    "rajasthan",
    "chandigarh",
    "lucknow",
    "noida",
    "gurgaon",
    "gurugram",
  ];

  const southTokens = [
    "south",
    "bangalore",
    "bengaluru",
    "karnataka",
    "tamil nadu",
    "tamilnadu",
    "chennai",
    "kerala",
    "hyderabad",
    "telangana",
    "andhra",
    "andhra pradesh",
    "coimbatore",
    "madurai",
    "mysore",
    "mysuru",
  ];

  const eastTokens = [
    "east",
    "kolkata",
    "west bengal",
    "odisha",
    "orissa",
    "bihar",
    "jharkhand",
    "assam",
    "guwahati",
    "bhubaneswar",
    "patna",
  ];

  const westTokens = [
    "west",
    "mumbai",
    "maharashtra",
    "pune",
    "gujarat",
    "ahmedabad",
    "vadodara",
    "surat",
    "goa",
    "madhya pradesh",
    "indore",
    "nagpur",
  ];

  const hasAny = (tokens) =>
    tokens.some((token) =>
      raw.includes(token)
    );

  const north = hasAny(northTokens);
  const south = hasAny(southTokens);
  const east = hasAny(eastTokens);
  const west = hasAny(westTokens);

  /*
   * If North + South + East + West are all present,
   * treat it as PAN INDIA.
   */
  if (
    north &&
    south &&
    east &&
    west
  ) {
    return "Pan India";
  }

  /*
   * Multiple directions.
   */
  const directionCount = [
    north,
    south,
    east,
    west,
  ].filter(Boolean).length;

  if (directionCount > 1) {
    return "Multiple Locations";
  }

  /*
   * Explicit multiple-location wording.
   */
  const multipleLocationPattern =
    /,|\band\b|&|\/|;|\+/i;

  if (
    multipleLocationPattern.test(raw) &&
    directionCount === 1
  ) {
    /*
     * If several known location tokens occur,
     * classify as Multiple Locations.
     */
    const allTokens = [
      ...northTokens,
      ...southTokens,
      ...eastTokens,
      ...westTokens,
    ];

    const matches = allTokens.filter(
      (token) => raw.includes(token)
    );

    const uniqueMatches = [
      ...new Set(matches),
    ];

    if (uniqueMatches.length > 1) {
      return "Multiple Locations";
    }
  }

  if (north) {
    return "North";
  }

  if (south) {
    return "South";
  }

  if (east) {
    return "East";
  }

  if (west) {
    return "West";
  }

  return "Unknown";
}

/* =========================================================
   WIN REASON STANDARDIZATION
========================================================= */

const WIN_REASON_CATEGORIES = [
  "New Requirement / Expansion",
  "Service Quality",
  "Cost / Commercial",
  "Contract / Agreement Cycle",
  "Moving to Organized / Professional 3PL",
  "Operational Issues",
  "Vendor Diversification / Reducing Dependency",
  "Space / Facility Constraint",
  "Consolidation / Restructuring / Relocation",
  "Other / Unclear",
  "Unknown",
];

function standardizeWinReason(row) {
  const raw = getRawWinReason(row);

  if (!raw) {
    return "Unknown";
  }

  const value = raw
    .toLowerCase()
    .trim();

  if (
    !value ||
    value === "n/a" ||
    value === "na" ||
    value === "nil" ||
    value === "-" ||
    value === "?" ||
    value === "not applicable"
  ) {
    return "Unknown";
  }

  /*
   * The order here matters.
   * Specific categories are checked before
   * broad categories such as Service / Cost.
   */

  /* CONSOLIDATION */

  if (
    /consolidat|restructur|relocat|merging|merge|warehouse.*shift|shift.*warehouse|moving to a larger|moving to bigger|changing location|multiple locations|regional players|location preference/i.test(
      value
    )
  ) {
    return "Consolidation / Restructuring / Relocation";
  }

  /* SPACE / FACILITY */

  if (
    /space|warehouse caught fire|fire system|warehouse option|facility|wh size|wh size expansion|space crunch|additional space|bigger.*space|larger.*space|poor condition of wh|warehousing option|warehouse extension|warehouse priority|warehouse$/i.test(
      value
    )
  ) {
    return "Space / Facility Constraint";
  }

  /* CONTRACT */

  if (
    /contract|agreement|annual rfq|rfq|bidding|auction|3\+2|term expire|term over|yearly bidding|renewal|encirclement/i.test(
      value
    )
  ) {
    return "Contract / Agreement Cycle";
  }

  /* PROFESSIONAL 3PL */

  if (
    /professional.*3pl|move to 3pl|move.*professional|outsource.*3pl|organised|organized.*player|professional player|3pl player|3pl model|shift to 3pl|formal player|well organised|well organized|self.?manage.*outsource|outsource.*self|cfa to 3pl|looking to outsource|want to outsource/i.test(
      value
    )
  ) {
    return "Moving to Organized / Professional 3PL";
  }

  /* VENDOR DIVERSIFICATION */

  if (
    /reducing depend|reduce depend|adding.*vendor|adding.*player|new vendor addition|addition of new|multiple ff|multiple.*vendor|more.*vendor|more.*player|introducing new vendor|vehicle placement|new suppliers|new vendor|new vendors|new supplier|addition.*supplier|incorporate.*transport|incorporate.*vendor/i.test(
      value
    )
  ) {
    return "Vendor Diversification / Reducing Dependency";
  }

  /* OPERATIONAL ISSUES */

  if (
    /operation|operational|productivity|process|manpower|visibility|delay in delivery|transportation delay|transportation delays|manage b2c|inefficien|control over operation|process adherence|smooth operation|attrition|re.?vamping|operational challenges|better process management/i.test(
      value
    )
  ) {
    return "Operational Issues";
  }

  /* NEW REQUIREMENT / EXPANSION */

  if (
    /expansion|new requirement|new lane|new start|new launch|new setup|new set-up|new location|new dc|new warehouse|volume increase|volume growth|scaling|increase in demand|increase in volume|production capacity|looking for new scm|looking for a new scm|looking for new supply|new opportunity|requirement|business expansion|growth|additional requirement|new project|new scm|new site|new facility|new service|new product|exploring new geographies|excess volume/i.test(
      value
    )
  ) {
    return "New Requirement / Expansion";
  }

  /* COST / COMMERCIAL */

  if (
    /cost|commercial|pricing|price|rate|rates|competitive|competative|saving|savings|costing|cost effective|cost reduction|cost optimisation|cost optimization|better price|better pricing|rfq price|better offer|affordable|cost correction/i.test(
      value
    )
  ) {
    return "Cost / Commercial";
  }

  /* SERVICE QUALITY */

  if (
    /service|serivce|better services|better service|service issue|service issues|service quality|service improvement|poor service|enhance service|service level|customer experience|quality output|service provider|service offering|better process management/i.test(
      value
    )
  ) {
    return "Service Quality";
  }

  /* OTHER */

  if (
    /inhouse|temporary requirement|software interface|relationship|bosch global policy|inventory management|warehouse management|primarily focus|to be checked|need efficiency/i.test(
      value
    )
  ) {
    return "Other / Unclear";
  }

  return "Other / Unclear";
}

/* =========================================================
   MULTI SELECT
========================================================= */

function MultiSelect({
  label,
  values,
  selected,
  setSelected,
}) {
  const [open, setOpen] = useState(false);

  function toggle(value) {
    if (selected.includes(value)) {
      setSelected(
        selected.filter(
          (x) => x !== value
        )
      );
    } else {
      setSelected([
        ...selected,
        value,
      ]);
    }
  }

  function selectAll() {
    setSelected(values);
  }

  function clearAll() {
    setSelected([]);
  }

  const display =
    selected.length === 0
      ? `All ${label}`
      : selected.length === 1
        ? selected[0]
        : `${selected.length} ${label} selected`;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() =>
          setOpen(!open)
        }
        className="
          w-full
          min-h-[52px]
          rounded-xl
          border
          border-slate-200
          bg-white
          px-4
          py-2.5
          text-left
          text-sm
          font-medium
          text-slate-700
          flex
          items-center
          justify-between
          gap-3
          outline-none
          focus:border-indigo-400
        "
      >
        <span className="truncate">
          {display}
        </span>

        <ChevronDown
          size={17}
          className="shrink-0 text-slate-400"
        />
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() =>
              setOpen(false)
            }
          />

          <div
            className="
              absolute
              left-0
              right-0
              top-[58px]
              z-50
              max-h-72
              overflow-auto
              rounded-xl
              border
              border-slate-200
              bg-white
              p-2
              shadow-2xl
            "
          >
            <div
              className="
                flex
                items-center
                justify-between
                border-b
                border-slate-100
                px-2
                pb-2
                mb-1
              "
            >
              <button
                type="button"
                onClick={selectAll}
                className="
                  text-xs
                  font-semibold
                  text-indigo-600
                "
              >
                Select all
              </button>

              <button
                type="button"
                onClick={clearAll}
                className="
                  text-xs
                  font-semibold
                  text-slate-400
                "
              >
                Clear
              </button>
            </div>

            {values.map((value) => {
              const checked =
                selected.includes(value);

              return (
                <label
                  key={value}
                  className="
                    flex
                    cursor-pointer
                    items-center
                    gap-3
                    rounded-lg
                    px-2
                    py-2.5
                    text-sm
                    text-slate-700
                    hover:bg-slate-50
                  "
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() =>
                      toggle(value)
                    }
                    className="
                      h-4
                      w-4
                      rounded
                      border-slate-300
                      text-indigo-600
                      focus:ring-indigo-500
                    "
                  />

                  <span className="truncate">
                    {value}
                  </span>
                </label>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

/* =========================================================
   CHART SLIDER
========================================================= */

function ChartSlider({
  total,
  visible = 6,
  start,
  setStart,
}) {
  const max = Math.max(
    0,
    total - visible
  );

  if (max <= 0) {
    return null;
  }

  return (
    <div
      className="
        mt-3
        flex
        items-center
        gap-3
        px-2
      "
    >
      <span
        className="
          text-[11px]
          font-medium
          text-slate-400
          whitespace-nowrap
        "
      >
        Scroll
      </span>

      <input
        type="range"
        min="0"
        max={max}
        value={Math.min(
          start,
          max
        )}
        onChange={(e) =>
          setStart(
            Number(e.target.value)
          )
        }
        className="
          w-full
          accent-indigo-600
          cursor-pointer
        "
      />

      <span
        className="
          text-[11px]
          text-slate-400
          whitespace-nowrap
        "
      >
        {Math.min(
          start + 1,
          total
        )}
        –
        {Math.min(
          start + visible,
          total
        )}
        /{total}
      </span>
    </div>
  );
}

/* =========================================================
   CHART LABELS
========================================================= */

function CountLabel({
  x,
  y,
  width,
  value,
  position = "top",
}) {
  if (
    value === null ||
    value === undefined
  ) {
    return null;
  }

  if (position === "right") {
    return (
      <text
        x={x + width + 7}
        y={y + 4}
        textAnchor="start"
        fill="#475569"
        fontSize={10}
        fontWeight={700}
      >
        {formatInt(value)}
      </text>
    );
  }

  return (
    <text
      x={x + width / 2}
      y={y - 7}
      textAnchor="middle"
      fill="#475569"
      fontSize={10}
      fontWeight={700}
    >
      {formatInt(value)}
    </text>
  );
}

function ValueLabel({
  x,
  y,
  width,
  value,
  position = "top",
}) {
  if (
    value === null ||
    value === undefined
  ) {
    return null;
  }

  if (position === "right") {
    return (
      <text
        x={x + width + 7}
        y={y + 4}
        textAnchor="start"
        fill="#475569"
        fontSize={10}
        fontWeight={700}
      >
        {formatCr(value)}
      </text>
    );
  }

  return (
    <text
      x={x + width / 2}
      y={y - 7}
      textAnchor="middle"
      fill="#475569"
      fontSize={10}
      fontWeight={700}
    >
      {formatCr(value)}
    </text>
  );
}

/* =========================================================
   TOOLTIP
========================================================= */

function CustomTooltip({
  active,
  payload,
  label,
}) {
  if (
    !active ||
    !payload?.length
  ) {
    return null;
  }

  return (
    <div
      className="
        rounded-xl
        border
        border-slate-200
        bg-white
        px-4
        py-3
        shadow-xl
      "
    >
      <div
        className="
          mb-2
          text-xs
          font-medium
          text-slate-400
        "
      >
        {label}
      </div>

      {payload.map((p, i) => {
        const name = String(
          p.name || ""
        );

        const isValue =
          name
            .toLowerCase()
            .includes("value");

        return (
          <div
            key={i}
            className="
              text-sm
              font-semibold
              text-slate-800
            "
          >
            {name}:{" "}
            {isValue
              ? formatCr(p.value)
              : formatInt(p.value)}
          </div>
        );
      })}
    </div>
  );
}

/* =========================================================
   AGGREGATION
========================================================= */

function aggregate(rows, getter) {
  const map = new Map();

  rows.forEach((row) => {
    const key =
      getter(row) || "Unknown";

    if (!map.has(key)) {
      map.set(key, {
        name: key,
        count: 0,
        value: 0,
      });
    }

    const item = map.get(key);

    item.count += 1;
    item.value += getValue(row);
  });

  return [...map.values()];
}

/* =========================================================
   COMPONENT
========================================================= */

export default function WonAnalysis({
  data,
  settings = {},
}) {
  /* =======================================================
     SOURCE
  ======================================================= */

  const rows = useMemo(() => {
    const source = Array.isArray(
      data?.opportunities
    )
      ? data.opportunities
      : Array.isArray(
          data?.processed?.opportunities
        )
        ? data.processed.opportunities
        : [];

    return source.filter((row) => {
      const stage = text(
        row?.["Opportunity Stage"]
      ).toLowerCase();

      const outcome = text(
        row?.["Outcome bucket"] ||
          row?.["Outcome Bucket"]
      ).toLowerCase();

      const dateWon = getWonDate(row);

      return (
        outcome === "won" ||
        outcome.includes("won") ||
        stage === "won" ||
        !!dateWon
      );
    });
  }, [data]);

  /* =======================================================
     FILTER STATE
  ======================================================= */

  const [search, setSearch] =
    useState("");

  const [
    selectedWeeks,
    setSelectedWeeks,
  ] = useState([]);

  const [
    selectedMonths,
    setSelectedMonths,
  ] = useState([]);

  const [
    selectedYears,
    setSelectedYears,
  ] = useState([]);

  const [
    selectedQuarters,
    setSelectedQuarters,
  ] = useState([]);

  const [
    selectedOwners,
    setSelectedOwners,
  ] = useState([]);

  const [
    selectedPCS,
    setSelectedPCS,
  ] = useState([]);

  const [
    selectedIndustries,
    setSelectedIndustries,
  ] = useState([]);

  const [
    selectedRegions,
    setSelectedRegions,
  ] = useState([]);

  const [
    selectedDealSizes,
    setSelectedDealSizes,
  ] = useState([]);

  const [
    selectedReasons,
    setSelectedReasons,
  ] = useState([]);

  const [
    selectedServices,
    setSelectedServices,
  ] = useState([]);

  /* =======================================================
     FILTER OPTIONS
  ======================================================= */

  const options = useMemo(() => {
    const unique = (getter) => [
      ...new Set(
        rows
          .map(getter)
          .filter(Boolean)
      ),
    ];

    return {
      weeks: sortDescending(
        unique(getOpportunityWeek),
        "week"
      ),

      months: sortDescending(
        unique(getOpportunityMonth),
        "month"
      ),

      years: sortDescending(
        unique(getCreatedYear),
        "year"
      ),

      quarters: sortDescending(
        unique(getFiscalQuarter),
        "quarter"
      ),

      owners: unique(getOwner).sort(
        (a, b) =>
          String(a).localeCompare(
            String(b)
          )
      ),

      pcs: unique(
        getPCSVertical
      ).sort((a, b) =>
        String(a).localeCompare(
          String(b)
        )
      ),

      industries: unique(
        getIndustry
      ).sort((a, b) =>
        String(a).localeCompare(
          String(b)
        )
      ),

      regions: [
        "North",
        "South",
        "East",
        "West",
        "Pan India",
        "Multiple Locations",
        "Unknown",
      ].filter((region) =>
        rows.some(
          (row) =>
            getStandardizedRegion(
              row
            ) === region
        )
      ),

      dealSizes: unique(
        getDealSize
      ).sort((a, b) =>
        String(a).localeCompare(
          String(b)
        )
      ),

      reasons:
        WIN_REASON_CATEGORIES.filter(
          (reason) =>
            rows.some(
              (row) =>
                standardizeWinReason(
                  row
                ) === reason
            )
        ),

      services: unique(
        getService
      ).sort((a, b) =>
        String(a).localeCompare(
          String(b)
        )
      ),
    };
  }, [rows]);

  /* =======================================================
     FILTER MATCH
  ======================================================= */

  function matches(
    selected,
    value
  ) {
    return (
      selected.length === 0 ||
      selected.includes(value)
    );
  }

  /* =======================================================
     FILTERED DATA
  ======================================================= */

  const filtered = useMemo(() => {
    const q = search
      .trim()
      .toLowerCase();

    return rows.filter((row) => {
      const haystack = [
        row?.["Opportunity Name"],
        row?.["Customer name"],
        row?.["Opportunity ID"],
        getOwner(row),
        getPCSVertical(row),
        getIndustry(row),
        getStandardizedRegion(row),
        standardizeWinReason(row),
        getService(row),
      ]
        .map(text)
        .join(" ")
        .toLowerCase();

      return (
        (!q || haystack.includes(q)) &&

        matches(
          selectedWeeks,
          getOpportunityWeek(row)
        ) &&

        matches(
          selectedMonths,
          getOpportunityMonth(row)
        ) &&

        matches(
          selectedYears,
          getCreatedYear(row)
        ) &&

        matches(
          selectedQuarters,
          getFiscalQuarter(row)
        ) &&

        matches(
          selectedOwners,
          getOwner(row)
        ) &&

        matches(
          selectedPCS,
          getPCSVertical(row)
        ) &&

        matches(
          selectedIndustries,
          getIndustry(row)
        ) &&

        matches(
          selectedRegions,
          getStandardizedRegion(row)
        ) &&

        matches(
          selectedDealSizes,
          getDealSize(row)
        ) &&

        matches(
          selectedReasons,
          standardizeWinReason(row)
        ) &&

        matches(
          selectedServices,
          getService(row)
        )
      );
    });
  }, [
    rows,
    search,
    selectedWeeks,
    selectedMonths,
    selectedYears,
    selectedQuarters,
    selectedOwners,
    selectedPCS,
    selectedIndustries,
    selectedRegions,
    selectedDealSizes,
    selectedReasons,
    selectedServices,
  ]);

  /* =======================================================
     KPIs
  ======================================================= */

  const metrics = useMemo(() => {
    const values = filtered
      .map(getValue)
      .sort((a, b) => a - b);

    const total = values.reduce(
      (a, b) => a + b,
      0
    );

    const median =
      values.length === 0
        ? 0
        : values.length % 2
          ? values[
              (values.length - 1) / 2
            ]
          : (
              values[
                values.length / 2 - 1
              ] +
              values[
                values.length / 2
              ]
            ) / 2;

    const reasons = aggregate(
      filtered,
      standardizeWinReason
    ).sort(
      (a, b) =>
        b.count - a.count
    );

    return {
      count: filtered.length,

      total,

      average: filtered.length
        ? total / filtered.length
        : 0,

      highest:
        values[
          values.length - 1
        ] || 0,

      median,

      topReason:
        reasons[0]?.name || "—",

      topReasonShare:
        filtered.length
          ? (reasons[0]?.count || 0) /
            filtered.length
          : 0,

      years:
        new Set(
          filtered.map(getWonYear)
        ).size,
    };
  }, [filtered]);

  /* =======================================================
     VALUE DISTRIBUTION
  ======================================================= */

  const valueDistribution =
    useMemo(() => {
      const bands = [
        {
          name: "0–1 Cr",
          min: 0,
          max: 1,
        },
        {
          name: "1–5 Cr",
          min: 1,
          max: 5,
        },
        {
          name: "5–10 Cr",
          min: 5,
          max: 10,
        },
        {
          name: "10–15 Cr",
          min: 10,
          max: 15,
        },
        {
          name: "15–20 Cr",
          min: 15,
          max: 20,
        },
        {
          name: ">20 Cr",
          min: 20,
          max: Infinity,
        },
      ];

      return bands.map((band) => {
        const matching =
          filtered.filter((row) => {
            const value =
              getValue(row);

            return (
              value >= band.min &&
              value < band.max
            );
          });

        return {
          name: band.name,

          count: matching.length,

          value: matching.reduce(
            (total, row) =>
              total + getValue(row),
            0
          ),
        };
      });
    }, [filtered]);

  /* =======================================================
     OTHER CHART DATA
  ======================================================= */

  const reasonData = useMemo(
    () =>
      aggregate(
        filtered,
        standardizeWinReason
      ).sort(
        (a, b) =>
          b.value - a.value
      ),
    [filtered]
  );

  const industryData = useMemo(
    () =>
      aggregate(
        filtered,
        getIndustry
      ).sort(
        (a, b) =>
          b.value - a.value
      ),
    [filtered]
  );

  const regionData = useMemo(
    () =>
      [
        "North",
        "South",
        "East",
        "West",
        "Pan India",
        "Multiple Locations",
      ].map((name) => {
        const matching =
          filtered.filter(
            (row) =>
              getStandardizedRegion(
                row
              ) === name
          );

        return {
          name,
          count: matching.length,
          value: matching.reduce(
            (total, row) =>
              total + getValue(row),
            0
          ),
        };
      }),
    [filtered]
  );

  const pcsData = useMemo(
    () =>
      aggregate(
        filtered,
        getPCSVertical
      ).sort(
        (a, b) =>
          b.value - a.value
      ),
    [filtered]
  );

  const dealData = useMemo(
    () =>
      aggregate(
        filtered,
        getDealSize
      ).sort(
        (a, b) =>
          b.value - a.value
      ),
    [filtered]
  );

  const serviceData = useMemo(
    () =>
      aggregate(
        filtered,
        getService
      ).sort(
        (a, b) =>
          b.value - a.value
      ),
    [filtered]
  );

  /* =======================================================
     YEARLY DATA
  ======================================================= */

  const yearly = useMemo(() => {
    const map = new Map();

    filtered.forEach((row) => {
      const year =
        getWonYear(row);

      if (!map.has(year)) {
        map.set(year, {
          year,
          count: 0,
          value: 0,
        });
      }

      const item = map.get(year);

      item.count += 1;
      item.value += getValue(row);
    });

    return [...map.values()]
      .filter(
        (x) =>
          x.year !== "Unknown"
      )
      .sort(
        (a, b) =>
          Number(a.year) -
          Number(b.year)
      );
  }, [filtered]);

  /* =======================================================
     SLIDER STATE
  ======================================================= */

  const [
    reasonStart,
    setReasonStart,
  ] = useState(0);

  const [
    industryStart,
    setIndustryStart,
  ] = useState(0);

  const [
    pcsStart,
    setPCSStart,
  ] = useState(0);

  const [
    serviceStart,
    setServiceStart,
  ] = useState(0);

  const [
    dealStart,
    setDealStart,
  ] = useState(0);

  const [
    yearlyStart,
    setYearlyStart,
  ] = useState(0);

  /* =======================================================
     VISIBLE CHART DATA
  ======================================================= */

  const visibleReasons =
    reasonData.slice(
      reasonStart,
      reasonStart + 6
    );

  const visibleIndustries =
    industryData.slice(
      industryStart,
      industryStart + 6
    );

  const visiblePCS =
    pcsData.slice(
      pcsStart,
      pcsStart + 6
    );

  const visibleServices =
    serviceData.slice(
      serviceStart,
      serviceStart + 6
    );

  const visibleDeals =
    dealData.slice(
      dealStart,
      dealStart + 6
    );

  const visibleYearly =
    yearly.slice(
      yearlyStart,
      yearlyStart + 6
    );

  /* =======================================================
     FILTER RESET
  ======================================================= */

  const activeFilterCount =
    [
      selectedWeeks,
      selectedMonths,
      selectedYears,
      selectedQuarters,
      selectedOwners,
      selectedPCS,
      selectedIndustries,
      selectedRegions,
      selectedDealSizes,
      selectedReasons,
      selectedServices,
    ].reduce(
      (total, arr) =>
        total + arr.length,
      0
    ) + (search ? 1 : 0);

  function clearFilters() {
    setSearch("");

    setSelectedWeeks([]);
    setSelectedMonths([]);
    setSelectedYears([]);
    setSelectedQuarters([]);
    setSelectedOwners([]);
    setSelectedPCS([]);
    setSelectedIndustries([]);
    setSelectedRegions([]);
    setSelectedDealSizes([]);
    setSelectedReasons([]);
    setSelectedServices([]);

    setReasonStart(0);
    setIndustryStart(0);
    setPCSStart(0);
    setServiceStart(0);
    setDealStart(0);
    setYearlyStart(0);
  }

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div className="space-y-7 pb-10">

      <SectionHeader
        title="Won Analysis"
        subtitle="
          Analysis of won opportunities based directly on the Opportunities dataset
        "
      />

      {/* ===================================================
          FILTERS
      =================================================== */}

      <div
        className="
          rounded-2xl
          border
          border-slate-200
          bg-white
          p-4
          shadow-sm
        "
      >
        <div
          className="
            grid
            grid-cols-1
            gap-3
            md:grid-cols-2
            xl:grid-cols-4
          "
        >

          {/* SEARCH */}

          <div className="relative">
            <Search
              size={17}
              className="
                pointer-events-none
                absolute
                left-3
                top-1/2
                -translate-y-1/2
                text-slate-400
              "
            />

            <input
              value={search}
              onChange={(e) =>
                setSearch(
                  e.target.value
                )
              }
              placeholder="Search opportunity, customer, owner..."
              className="
                h-[52px]
                w-full
                rounded-xl
                border
                border-slate-200
                bg-white
                pl-10
                pr-3
                py-0
                text-sm
                font-medium
                leading-normal
                text-slate-700
                outline-none
                placeholder:text-slate-400
                focus:border-indigo-400
              "
            />
          </div>

          <MultiSelect
            label="Weeks"
            values={options.weeks}
            selected={selectedWeeks}
            setSelected={
              setSelectedWeeks
            }
          />

          <MultiSelect
            label="Months"
            values={options.months}
            selected={selectedMonths}
            setSelected={
              setSelectedMonths
            }
          />

          <MultiSelect
            label="Years"
            values={options.years}
            selected={selectedYears}
            setSelected={
              setSelectedYears
            }
          />

          <MultiSelect
            label="Fiscal Quarters"
            values={options.quarters}
            selected={
              selectedQuarters
            }
            setSelected={
              setSelectedQuarters
            }
          />

          <MultiSelect
            label="Owners"
            values={options.owners}
            selected={selectedOwners}
            setSelected={
              setSelectedOwners
            }
          />

          <MultiSelect
            label="PCS Verticals"
            values={options.pcs}
            selected={selectedPCS}
            setSelected={
              setSelectedPCS
            }
          />

          <MultiSelect
            label="Industries"
            values={
              options.industries
            }
            selected={
              selectedIndustries
            }
            setSelected={
              setSelectedIndustries
            }
          />

          <MultiSelect
            label="Regions"
            values={options.regions}
            selected={
              selectedRegions
            }
            setSelected={
              setSelectedRegions
            }
          />

          <MultiSelect
            label="Deal Sizes"
            values={
              options.dealSizes
            }
            selected={
              selectedDealSizes
            }
            setSelected={
              setSelectedDealSizes
            }
          />

          <MultiSelect
            label="Win Reasons"
            values={
              options.reasons
            }
            selected={
              selectedReasons
            }
            setSelected={
              setSelectedReasons
            }
          />

          <MultiSelect
            label="Services"
            values={
              options.services
            }
            selected={
              selectedServices
            }
            setSelected={
              setSelectedServices
            }
          />
        </div>

        <div
          className="
            mt-3
            flex
            items-center
            justify-between
          "
        >
          <span
            className="
              text-xs
              font-medium
              text-slate-400
            "
          >
            Showing{" "}
            {formatInt(
              filtered.length
            )}{" "}
            won opportunities
          </span>

          {activeFilterCount > 0 && (
            <button
              onClick={
                clearFilters
              }
              className="
                flex
                items-center
                gap-1.5
                rounded-lg
                px-3
                py-1.5
                text-xs
                font-semibold
                text-slate-500
                hover:bg-slate-100
              "
            >
              <X size={13} />
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* ===================================================
          KPIs
      =================================================== */}

      <div
        className="
          grid
          grid-cols-1
          gap-4
          md:grid-cols-2
          xl:grid-cols-4
        "
      >
        <KPI
          title="Total Deals Won"
          value={formatInt(
            metrics.count
          )}
          icon={Trophy}
        />

        <KPI
          title="Total Value Won"
          value={formatCr(
            metrics.total
          )}
          icon={IndianRupee}
        />

        <KPI
          title="Avg Won Deal Size"
          value={formatCr(
            metrics.average
          )}
          icon={Target}
        />

        <KPI
          title="Highest Value Won"
          value={formatCr(
            metrics.highest
          )}
          icon={TrendingUp}
        />

        <KPI
          title="Median Deal Size"
          value={formatCr(
            metrics.median
          )}
          icon={IndianRupee}
        />

        <KPI
          title="Top Win Reason"
          value={
            metrics.topReason
          }
          icon={Trophy}
        />

        <KPI
          title="Top Reason Share"
          value={formatPct(
            metrics.topReasonShare
          )}
          icon={Users}
        />

        <KPI
          title="Won Years Covered"
          value={formatInt(
            metrics.years
          )}
          icon={CalendarDays}
        />
      </div>

      {/* ===================================================
          VALUE DISTRIBUTION
      =================================================== */}

      <SectionHeader
        title="Opportunity Value Distribution"
        subtitle="
          Number of won opportunities and total won value by value band
        "
      />

      <ChartCard
        title="Opportunity Value Distribution"
        subtitle="
          Won opportunities grouped using values in Crores
        "
      >
        <div className="h-[430px]">
          <ResponsiveContainer
            width="100%"
            height="100%"
          >
            <BarChart
              data={
                valueDistribution
              }
              margin={{
                top: 40,
                right: 45,
                left: 15,
                bottom: 25,
              }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
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
                tickFormatter={(v) =>
                  `${v} Cr`
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
                  <CustomTooltip />
                }
              />

              <Legend />

              <Bar
                yAxisId="count"
                dataKey="count"
                name="Opportunities"
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
                    <CountLabel
                      {...props}
                    />
                  )}
                />
              </Bar>

              <Bar
                yAxisId="value"
                dataKey="value"
                name="Total Value"
                fill="#14b8a6"
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
                    />
                  )}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      {/* ===================================================
          WIN DRIVERS
      =================================================== */}

      <SectionHeader
        title="Win Drivers"
        subtitle="
          Why customers changed providers and where won value is concentrated
        "
      />

      <div
        className="
          grid
          grid-cols-1
          gap-5
          xl:grid-cols-2
        "
      >

        {/* WIN REASON */}

        <ChartCard
          title="Incumbent Change Reason"
          subtitle="
            Standardized won-deal reason and value
          "
        >
          <div className="h-[430px]">
            <ResponsiveContainer
              width="100%"
              height="100%"
            >
              <BarChart
                data={
                  visibleReasons
                }
                layout="vertical"
                margin={{
                  top: 20,
                  right: 95,
                  left: 175,
                  bottom: 20,
                }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  horizontal={false}
                />

                <XAxis
                  type="number"
                  axisLine={false}
                  tickLine={false}
                />

                <YAxis
                  type="category"
                  dataKey="name"
                  width={165}
                  axisLine={false}
                  tickLine={false}
                  tick={{
                    fontSize: 11,
                  }}
                />

                <Tooltip
                  content={
                    <CustomTooltip />
                  }
                />

                <Legend />

                <Bar
                  dataKey="count"
                  name="Count"
                  fill="#6366f1"
                  radius={[
                    0,
                    6,
                    6,
                    0,
                  ]}
                >
                  <LabelList
                    content={(props) => (
                      <CountLabel
                        {...props}
                        position="right"
                      />
                    )}
                  />
                </Bar>

                <Bar
                  dataKey="value"
                  name="Value"
                  fill="#14b8a6"
                  radius={[
                    0,
                    6,
                    6,
                    0,
                  ]}
                >
                  <LabelList
                    content={(props) => (
                      <ValueLabel
                        {...props}
                        position="right"
                      />
                    )}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <ChartSlider
            total={
              reasonData.length
            }
            visible={6}
            start={reasonStart}
            setStart={
              setReasonStart
            }
          />
        </ChartCard>

        {/* INDUSTRY */}

        <ChartCard
          title="Win by Industrial Vertical"
          subtitle="
            Won deals and value by industry
          "
        >
          <div className="h-[430px]">
            <ResponsiveContainer
              width="100%"
              height="100%"
            >
              <BarChart
                data={
                  visibleIndustries
                }
                margin={{
                  top: 40,
                  right: 35,
                  left: 10,
                  bottom: 75,
                }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                />

                <XAxis
                  dataKey="name"
                  angle={-32}
                  textAnchor="end"
                  interval={0}
                  height={85}
                  tick={{
                    fontSize: 11,
                  }}
                  axisLine={false}
                  tickLine={false}
                />

                <YAxis
                  yAxisId="value"
                  axisLine={false}
                  tickLine={false}
                />

                <YAxis
                  yAxisId="count"
                  orientation="right"
                  axisLine={false}
                  tickLine={false}
                />

                <Tooltip
                  content={
                    <CustomTooltip />
                  }
                />

                <Legend />

                <Bar
                  yAxisId="count"
                  dataKey="count"
                  name="Count"
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
                      <CountLabel
                        {...props}
                      />
                    )}
                  />
                </Bar>

                <Bar
                  yAxisId="value"
                  dataKey="value"
                  name="Value"
                  fill="#14b8a6"
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
                      />
                    )}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <ChartSlider
            total={
              industryData.length
            }
            visible={6}
            start={
              industryStart
            }
            setStart={
              setIndustryStart
            }
          />
        </ChartCard>
      </div>

      {/* ===================================================
          PCS VERTICAL
      =================================================== */}

      <ChartCard
        title="Won by PCS Vertical"
        subtitle="
          Won opportunities and value by PCS Vertical
        "
      >
        <div className="h-[430px]">
          <ResponsiveContainer
            width="100%"
            height="100%"
          >
            <BarChart
              data={visiblePCS}
              margin={{
                top: 40,
                right: 35,
                left: 10,
                bottom: 65,
              }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
              />

              <XAxis
                dataKey="name"
                angle={-30}
                textAnchor="end"
                interval={0}
                height={80}
                tick={{
                  fontSize: 11,
                }}
                axisLine={false}
                tickLine={false}
              />

              <YAxis
                yAxisId="value"
                axisLine={false}
                tickLine={false}
              />

              <YAxis
                yAxisId="count"
                orientation="right"
                axisLine={false}
                tickLine={false}
              />

              <Tooltip
                content={
                  <CustomTooltip />
                }
              />

              <Legend />

              <Bar
                yAxisId="count"
                dataKey="count"
                name="Count"
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
                    <CountLabel
                      {...props}
                    />
                  )}
                />
              </Bar>

              <Bar
                yAxisId="value"
                dataKey="value"
                name="Value"
                fill="#14b8a6"
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
                    />
                  )}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <ChartSlider
          total={pcsData.length}
          visible={6}
          start={pcsStart}
          setStart={setPCSStart}
        />
      </ChartCard>

      {/* ===================================================
          YOY WIN TREND
      =================================================== */}

      <SectionHeader
        title="YOY Win Trend"
        subtitle="
          Annual won opportunities and total won value
        "
      />

      <ChartCard
        title="YOY Won Trend"
        subtitle="
          Won deals and value by year
        "
      >
        <div className="h-[420px]">
          <ResponsiveContainer
            width="100%"
            height="100%"
          >
            <LineChart
              data={visibleYearly}
              margin={{
                top: 30,
                right: 35,
                left: 10,
                bottom: 10,
              }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
              />

              <XAxis
                dataKey="year"
                axisLine={false}
                tickLine={false}
              />

              <YAxis
                yAxisId="count"
                axisLine={false}
                tickLine={false}
              />

              <YAxis
                yAxisId="value"
                orientation="right"
                axisLine={false}
                tickLine={false}
              />

              <Tooltip
                content={
                  <CustomTooltip />
                }
              />

              <Legend />

              <Line
                yAxisId="count"
                type="monotone"
                dataKey="count"
                name="Won Deals"
                stroke="#6366f1"
                strokeWidth={3}
                dot={{ r: 4 }}
              >
                <LabelList
                  position="top"
                  formatter={formatInt}
                />
              </Line>

              <Line
                yAxisId="value"
                type="monotone"
                dataKey="value"
                name="Won Value"
                stroke="#14b8a6"
                strokeWidth={3}
                dot={{ r: 4 }}
              >
                <LabelList
                  position="top"
                  formatter={formatCr}
                />
              </Line>
            </LineChart>
          </ResponsiveContainer>
        </div>

        <ChartSlider
          total={yearly.length}
          visible={6}
          start={yearlyStart}
          setStart={setYearlyStart}
        />
      </ChartCard>

      {/* ===================================================
          REGION + DEAL SIZE
      =================================================== */}

      <SectionHeader
        title="Won Portfolio Mix"
        subtitle="
          Regional and deal-size contribution
        "
      />

      <div
        className="
          grid
          grid-cols-1
          gap-5
          xl:grid-cols-2
        "
      >

        {/* REGION */}

        <ChartCard
          title="Win by Region"
          subtitle="
            Standardized region classification
          "
        >
          <div className="h-[410px]">
            <ResponsiveContainer
              width="100%"
              height="100%"
            >
              <BarChart
                data={regionData}
                margin={{
                  top: 40,
                  right: 35,
                  left: 10,
                  bottom: 30,
                }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                />

                <XAxis
                  dataKey="name"
                  interval={0}
                  axisLine={false}
                  tickLine={false}
                  tick={{
                    fontSize: 11,
                  }}
                />

                <YAxis
                  yAxisId="value"
                  axisLine={false}
                  tickLine={false}
                />

                <YAxis
                  yAxisId="count"
                  orientation="right"
                  axisLine={false}
                  tickLine={false}
                />

                <Tooltip
                  content={
                    <CustomTooltip />
                  }
                />

                <Legend />

                <Bar
                  yAxisId="count"
                  dataKey="count"
                  name="Count"
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
                      <CountLabel
                        {...props}
                      />
                    )}
                  />
                </Bar>

                <Bar
                  yAxisId="value"
                  dataKey="value"
                  name="Value"
                  fill="#14b8a6"
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
                      />
                    )}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        {/* DEAL SIZE */}

        <ChartCard
          title="Win by Deal Size"
          subtitle="
            Won deals and value by deal-size bucket
          "
        >
          <div className="h-[410px]">
            <ResponsiveContainer
              width="100%"
              height="100%"
            >
              <BarChart
                data={visibleDeals}
                margin={{
                  top: 40,
                  right: 35,
                  left: 10,
                  bottom: 30,
                }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                />

                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  interval={0}
                />

                <YAxis
                  yAxisId="value"
                  axisLine={false}
                  tickLine={false}
                />

                <YAxis
                  yAxisId="count"
                  orientation="right"
                  axisLine={false}
                  tickLine={false}
                />

                <Tooltip
                  content={
                    <CustomTooltip />
                  }
                />

                <Legend />

                <Bar
                  yAxisId="count"
                  dataKey="count"
                  name="Count"
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
                      <CountLabel
                        {...props}
                      />
                    )}
                  />
                </Bar>

                <Bar
                  yAxisId="value"
                  dataKey="value"
                  name="Value"
                  fill="#14b8a6"
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
                      />
                    )}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <ChartSlider
            total={dealData.length}
            visible={6}
            start={dealStart}
            setStart={setDealStart}
          />
        </ChartCard>
      </div>

      {/* ===================================================
          SERVICES
      =================================================== */}

      <ChartCard
        title="Win by Services Required"
        subtitle="
          Capability/service mix among won opportunities
        "
      >
        <div className="h-[450px]">
          <ResponsiveContainer
            width="100%"
            height="100%"
          >
            <BarChart
              data={
                visibleServices
              }
              layout="vertical"
              margin={{
                top: 20,
                right: 100,
                left: 155,
                bottom: 20,
              }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                horizontal={false}
              />

              <XAxis
                type="number"
                axisLine={false}
                tickLine={false}
              />

              <YAxis
                type="category"
                dataKey="name"
                width={145}
                tick={{
                  fontSize: 11,
                }}
                axisLine={false}
                tickLine={false}
              />

              <Tooltip
                content={
                  <CustomTooltip />
                }
              />

              <Legend />

              <Bar
                dataKey="count"
                name="Count"
                fill="#6366f1"
                radius={[
                  0,
                  6,
                  6,
                  0,
                ]}
              >
                <LabelList
                  content={(props) => (
                    <CountLabel
                      {...props}
                      position="right"
                    />
                  )}
                />
              </Bar>

              <Bar
                dataKey="value"
                name="Value"
                fill="#14b8a6"
                radius={[
                  0,
                  6,
                  6,
                  0,
                ]}
              >
                <LabelList
                  content={(props) => (
                    <ValueLabel
                      {...props}
                      position="right"
                    />
                  )}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <ChartSlider
          total={
            serviceData.length
          }
          visible={6}
          start={serviceStart}
          setStart={
            setServiceStart
          }
        />
      </ChartCard>

      {/* ===================================================
          REGISTER
      =================================================== */}

      <ChartCard
        title="Won Opportunities Register"
        subtitle={`
          Showing ${formatInt(
            filtered.length
          )} filtered won opportunities
        `}
      >
        <div
          className="
            max-h-[520px]
            overflow-auto
          "
        >
          <table
            className="
              w-full
              min-w-[1300px]
              text-sm
            "
          >
            <thead
              className="
                sticky
                top-0
                bg-slate-50
              "
            >
              <tr
                className="
                  border-b
                  border-slate-200
                "
              >
                {[
                  "Opportunity",
                  "Customer",
                  "Owner",
                  "PCS Vertical",
                  "Industry",
                  "Region",
                  "Won Year",
                  "Win Reason",
                  "Deal Size",
                  "Value",
                ].map((header) => (
                  <th
                    key={header}
                    className="
                      px-4
                      py-3
                      text-left
                      font-semibold
                      text-slate-500
                    "
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {filtered.map(
                (row, index) => (
                  <tr
                    key={
                      row?.[
                        "Opportunity ID"
                      ] || index
                    }
                    className="
                      border-b
                      border-slate-100
                      hover:bg-slate-50
                    "
                  >
                    <td
                      className="
                        max-w-[260px]
                        px-4
                        py-3
                        font-semibold
                        text-slate-800
                      "
                    >
                      {text(
                        row?.[
                          "Opportunity Name"
                        ]
                      ) || "—"}
                    </td>

                    <td
                      className="
                        px-4
                        py-3
                        text-slate-600
                      "
                    >
                      {text(
                        row?.[
                          "Customer name"
                        ]
                      ) || "—"}
                    </td>

                    <td
                      className="
                        px-4
                        py-3
                        text-slate-600
                      "
                    >
                      {getOwner(row)}
                    </td>

                    <td
                      className="
                        px-4
                        py-3
                        text-slate-600
                      "
                    >
                      {getPCSVertical(row)}
                    </td>

                    <td
                      className="
                        px-4
                        py-3
                        text-slate-600
                      "
                    >
                      {getIndustry(row)}
                    </td>

                    <td
                      className="
                        px-4
                        py-3
                        text-slate-600
                      "
                    >
                      {getStandardizedRegion(
                        row
                      )}
                    </td>

                    <td
                      className="
                        px-4
                        py-3
                        text-slate-600
                      "
                    >
                      {getWonYear(row)}
                    </td>

                    <td
                      className="
                        max-w-[280px]
                        px-4
                        py-3
                        text-slate-600
                      "
                    >
                      {standardizeWinReason(
                        row
                      )}
                    </td>

                    <td
                      className="
                        px-4
                        py-3
                        text-slate-600
                      "
                    >
                      {getDealSize(row)}
                    </td>

                    <td
                      className="
                        px-4
                        py-3
                        font-bold
                        text-slate-900
                      "
                    >
                      {formatCr(
                        getValue(row)
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