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
return v === null || v === undefined
? ""
: String(v).trim();
}

function num(v) {
if (
v === null ||
v === undefined ||
v === ""
) {
return 0;
}

if (typeof v === "number") {
return Number.isFinite(v) ? v : 0;
}

const n = Number(
String(v)
.replace(/[₹,%\s,]/g, "")
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

return Number.isNaN(d.getTime())
  ? null
  : d;

}

const d = new Date(v);

return Number.isNaN(d.getTime())
? null
: d;
}

function getCreatedDate(row) {
return dateValue(
first(row, ["Opportunity Created Date", "Opportunity_Created_Date", "OpportunityCreatedDate"])
);
}

function getWonDate(row) {
return (
first(row, ["Date won", "Date Won", "Date_won", "DateWon"]) ||
first(row, ["Won Date", "Won_Date", "WonDate"]) ||
first(row, ["Onboarded date", "Onboarded Date", "Onboarded_date", "OnboardedDate"])
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
(
d.getTime() -
start.getTime()
) / 86400000
);

const week =
Math.floor(diff / 7) + 1;

return Week ${week} ${d.getFullYear()};
}

function getOpportunityMonth(row) {
const d = getCreatedDate(row);

if (!d) {
return "Unknown";
}

return d.toLocaleString(
"en-US",
{
month: "short",
year: "numeric",
}
);
}

/*

Fiscal year:



Q1 = Apr-Jun

Q2 = Jul-Sep

Q3 = Oct-Dec

Q4 = Jan-Mar
*/
function getFiscalQuarter(row) {
const d = getCreatedDate(row);

if (!d) {
return "Unknown";
}

const month = d.getMonth() + 1;

let quarter;

if (month >= 4 && month <= 6) {
quarter = "Q1";
} else if (month >= 7 && month <= 9) {
quarter = "Q2";
} else if (month >= 10 && month <= 12) {
quarter = "Q3";
} else {
quarter = "Q4";
}

return ${quarter} ${d.getFullYear()};
}

/* =========================================================
VALUE
========================================================= */

/*

Value is always converted into Crores.



Priority:





Values in Cr



Value of Contract Per Annum INR / 10^7



Revenue potential per month × 12 / 10^7
*/
function getValue(row) {
const valuesCr = num(
first(row, ["Values in Cr", "Values_in_Cr", "ValuesInCr"], "")
);

if (valuesCr) {
return valuesCr;
}

const annual = num(
row?.[
"Value of Contract Per Annum INR"
]
);

if (annual) {
return annual / 10000000;
}

const monthly = num(
row?.[
"Revenue potential per month (in INR)"
]
);

if (monthly) {
return (
monthly *
12 /
10000000
);
}

return 0;
}

function formatCr(v) {
return ₹${num(v).toFixed(2)} Cr;
}

function formatInt(v) {
return Math.round(
num(v)
).toLocaleString("en-IN");
}

function formatPct(v) {
return ${(
    num(v) * 100
  ).toFixed(1)}%;
}

/* =========================================================
GENERIC FIELD HELPER
========================================================= */

function normalizeHeaderKey(value) {
return String(value ?? "")
.replace(/\uFEFF/g, "")
.trim()
.toLowerCase()
.replace(/[\s_-\u2013\u2014]+/g, "");
}

function first(
row,
keys,
fallback = "Unknown"
) {
for (const key of keys) {
const value = text(row?.[key]);
if (value) return value;
}

const normalizedKeys = keys.map(normalizeHeaderKey);
for (const rowKey of Object.keys(row || {})) {
if (!normalizedKeys.includes(normalizeHeaderKey(rowKey))) continue;
const value = text(row?.[rowKey]);
if (value) return value;
}

return fallback;
}

/* =========================================================
FIELD GETTERS
========================================================= */

function getOwner(row) {
return first(
row,
[
"Assigned To",
"Salesforce User Name",
"Sales Owner",
]
);
}

/*

IMPORTANT:

PCS Vertical comes directly from the

PCS Vertical column in the Opportunities data.
*/
function getPCSVertical(row) {
// Read directly from the Opportunities dataset's PCS Vertical field.
// Header normalization handles Excel whitespace/BOM/case variations.
return first(
row,
[
"PCS Vertical",
"PCS vertical",
"PCS_Vertical",
"PCS Vertical ",
]
);
}

/*

Services come directly from Services Required.

Capability Required is retained only as a

fallback for older datasets.
*/
function getService(row) {
return first(
row,
[
"Services Required",
"Services required",
"services required",
"Services",
"services",
"Capability Required",
"Capability required",
]
);
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
DEAL SIZE BANDS
========================================================= */

const DEAL_SIZE_BANDS = [
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

function getDealSize(row) {
const value = getValue(row);

const band = DEAL_SIZE_BANDS.find(
(item) =>
value >= item.min &&
value < item.max
);

return band?.name || "Unknown";
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

/* PAN INDIA */

if (
raw.includes("pan india") ||
raw.includes("pan-india") ||
raw.includes("panindia") ||
raw.includes("all india") ||
raw.includes("all over india")
) {
return "Pan India";
}

const north = [
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
"rajasthan",
"chandigarh",
].some((x) => raw.includes(x));

const south = [
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
].some((x) => raw.includes(x));

const east = [
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
].some((x) => raw.includes(x));

const west = [
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
].some((x) => raw.includes(x));

const directions = [
north,
south,
east,
west,
].filter(Boolean).length;

if (directions > 1) {
return "Multiple Locations";
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
value === "?"
) {
return "Unknown";
}

/* CONSOLIDATION */

if (
/consolidat|restructur|relocat|merging|merge|warehouse.*shift|shift.*warehouse|larger warehouse|bigger space|moving to a larger/i
.test(value)
) {
return "Consolidation / Restructuring / Relocation";
}

/* SPACE / FACILITY */

if (
/space|warehouse caught fire|fire system|warehouse option|facility|wh size|wh size expansion|space crunch|additional space|bigger.*space|larger.*space|poor condition of wh/i
.test(value)
) {
return "Space / Facility Constraint";
}

/* CONTRACT */

if (
/contract|agreement|annual rfq|rfq|bidding|auction|3+2|term expire|term over|yearly bidding|renewal|encirclement/i
.test(value)
) {
return "Contract / Agreement Cycle";
}

/* PROFESSIONAL 3PL */

if (
/professional.*3pl|move to 3pl|move.*professional|outsource.*3pl|organised|organized.*player|professional player|3pl player|3pl model|shift to 3pl|formal player|well organised/i
.test(value)
) {
return "Moving to Organized / Professional 3PL";
}

/* VENDOR DIVERSIFICATION */

if (
/reducing depend|reduce depend|adding.*vendor|adding.*player|new vendor addition|addition of new|multiple ff|multiple.*vendor|more.*vendor|more.*player|introducing new vendor|vehicle placement|new suppliers/i
.test(value)
) {
return "Vendor Diversification / Reducing Dependency";
}

/* COST / COMMERCIAL */

if (
/cost|commercial|pricing|price|rate|rates|competitive|competative|saving|savings|costing|cost effective|cost reduction|cost optimisation|cost optimization|better price|better pricing|rfq price/i
.test(value)
) {
return "Cost / Commercial";
}

/* SERVICE QUALITY */

if (
/service|better services|better service|service issue|service issues|service quality|service improvement|poor service|enhance service|service level|customer experience/i
.test(value)
) {
return "Service Quality";
}

/* OPERATIONAL ISSUES */

if (
/operation|operational|productivity|process|manpower|visibility|delay in delivery|transportation delay|manage b2c|inefficien|control over operation|process adherence|smooth operation|attrition/i
.test(value)
) {
return "Operational Issues";
}

/* NEW REQUIREMENT / EXPANSION */

if (
/expansion|new requirement|new lane|new start|new launch|new setup|new set-up|new location|new dc|new warehouse|volume increase|volume growth|scaling|increase in demand|production capacity|looking for new scm|looking for a new scm|looking for new supply|new opportunity|requirement|business expansion|growth|additional requirement/i
.test(value)
) {
return "New Requirement / Expansion";
}

/* OTHER */

if (
/inhouse|temporary requirement|software interface|relationship|bosch global policy|inventory management|warehouse management|primarily focus|to be checked/i
.test(value)
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
const [
open,
setOpen,
] = useState(false);

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
? All ${label}
: selected.length === 1
? selected[0]
: ${selected.length} ${label} selected;

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
        className="
          fixed
          inset-0
          z-40
        "
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


        {values.map(
          (value) => {

            const checked =
              selected.includes(
                value
              );

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
          }
        )}

      </div>

    </>
  )}

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
}) {
if (
value === null ||
value === undefined
) {
return null;
}

return (
<text
x={x + width / 2}
y={y - 8}
textAnchor="middle"
fill="#475569"
fontSize={11}
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
}) {
if (
value === null ||
value === undefined
) {
return null;
}

return (
<text
x={x + width / 2}
y={y - 8}
textAnchor="middle"
fill="#475569"
fontSize={11}
fontWeight={700}
>
{formatCr(value)}
</text>
);
}

/*

Horizontal-bar label.

Used for services if required.
*/
function HorizontalCountLabel({
x,
y,
width,
height,
value,
}) {
if (
value === null ||
value === undefined
) {
return null;
}

return (
<text
x={x + width + 8}
y={y + height / 2 + 4}
fill="#475569"
fontSize={11}
fontWeight={700}
>
{formatInt(value)}
</text>
);
}

function HorizontalValueLabel({
x,
y,
width,
height,
value,
}) {
if (
value === null ||
value === undefined
) {
return null;
}

return (
<text
x={x + width + 8}
y={y + height / 2 + 4}
fill="#475569"
fontSize={11}
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

  {payload.map(
    (p, i) => {

      const name =
        String(
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
    }
  )}

</div>

);
}

/* =========================================================
AGGREGATION
========================================================= */

function aggregate(
rows,
getter
) {
const map = new Map();

rows.forEach((row) => {

const key =
  getter(row) ||
  "Unknown";

if (!map.has(key)) {
  map.set(
    key,
    {
      name: key,
      count: 0,
      value: 0,
    }
  );
}

const item =
  map.get(key);

item.count += 1;

item.value +=
  getValue(row);

});

return [
...map.values(),
];
}

/* =========================================================
COMPONENT
========================================================= */

export default function WonAnalysis({
data,
settings = {},
}) {

/* =======================================================
WON OPPORTUNITIES SOURCE
======================================================= */

const rows = useMemo(() => {

const source =
  Array.isArray(
    data?.opportunities
  )
    ? data.opportunities
    : [];

return source.filter(
  (row) => {

    const stage =
      text(
        row?.[
          "Opportunity Stage"
        ]
      ).toLowerCase();

    const outcome =
      text(
        row?.[
          "Outcome bucket"
        ] ||
        row?.[
          "Outcome Bucket"
        ]
      ).toLowerCase();

    const dateWon =
      getWonDate(row);

    return (
      outcome === "won" ||
      outcome.includes("won") ||
      stage === "won" ||
      !!dateWon
    );
  }
);

}, [data]);

/* =======================================================
FILTER STATE
======================================================= */

const [
search,
setSearch,
] = useState("");

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

const unique =
  (getter) =>
    [
      ...new Set(
        rows
          .map(getter)
          .filter(Boolean)
      ),
    ].sort(
      (a, b) =>
        String(a).localeCompare(
          String(b)
        )
    );


/*
 * Time filters are sorted descending.
 */

const weeks = unique(
  getOpportunityWeek
).sort((a, b) => {

  if (
    a === "Unknown"
  ) return 1;

  if (
    b === "Unknown"
  ) return -1;

  const yearA =
    Number(
      a.match(/\d{4}/)?.[0]
    );

  const weekA =
    Number(
      a.match(
        /Week\s*(\d+)/
      )?.[1]
    );

  const yearB =
    Number(
      b.match(/\d{4}/)?.[0]
    );

  const weekB =
    Number(
      b.match(
        /Week\s*(\d+)/
      )?.[1]
    );

  return (
    yearB - yearA ||
    weekB - weekA
  );
});


const months = unique(
  getOpportunityMonth
).sort((a, b) => {

  const da =
    new Date(a);

  const db =
    new Date(b);

  return db - da;
});


const years = unique(
  getWonYear
).sort((a, b) => {

  if (a === "Unknown") return 1;
  if (b === "Unknown") return -1;

  return Number(b) - Number(a);
});


const quarters = unique(
  getFiscalQuarter
).sort((a, b) => {

  if (a === "Unknown") return 1;
  if (b === "Unknown") return -1;

  const yearA =
    Number(
      a.match(/\d{4}/)?.[0]
    );

  const qA =
    Number(
      a.match(/Q(\d)/)?.[1]
    );

  const yearB =
    Number(
      b.match(/\d{4}/)?.[0]
    );

  const qB =
    Number(
      b.match(/Q(\d)/)?.[1]
    );

  return (
    yearB - yearA ||
    qB - qA
  );
});


return {

  weeks,

  months,

  years,

  quarters,

  owners:
    unique(getOwner),

  pcs:
    unique(getPCSVertical),

  regions:
    [
      "North",
      "South",
      "East",
      "West",
      "Pan India",
      "Multiple Locations",
    ].filter(
      (region) =>
        rows.some(
          (row) =>
            getStandardizedRegion(
              row
            ) === region
        )
    ),

  /*
   * Deal Size filter is now
   * standardized into the
   * requested bandwidths.
   */
  dealSizes:
    DEAL_SIZE_BANDS
      .map(
        (band) =>
          band.name
      )
      .filter(
        (band) =>
          rows.some(
            (row) =>
              getDealSize(row) ===
              band
          )
      ),

  reasons:
    unique(
      standardizeWinReason
    ),

  /*
   * Services filter now uses
   * Services Required.
   */
  services:
    unique(getService),

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

const q =
  search
    .trim()
    .toLowerCase();


return rows.filter(
  (row) => {

    const haystack = [

      row?.[
        "Opportunity Name"
      ],

      row?.[
        "Customer name"
      ],

      getOwner(row),

      getPCSVertical(row),

      getStandardizedRegion(row),

      standardizeWinReason(row),

      getService(row),

    ]
      .map(text)
      .join(" ")
      .toLowerCase();


    return (

      (
        !q ||
        haystack.includes(q)
      )

      && matches(
        selectedWeeks,
        getOpportunityWeek(row)
      )

      && matches(
        selectedMonths,
        getOpportunityMonth(row)
      )

      && matches(
        selectedYears,
        getWonYear(row)
      )

      && matches(
        selectedQuarters,
        getFiscalQuarter(row)
      )

      && matches(
        selectedOwners,
        getOwner(row)
      )

      && matches(
        selectedPCS,
        getPCSVertical(row)
      )

      && matches(
        selectedRegions,
        getStandardizedRegion(row)
      )

      && matches(
        selectedDealSizes,
        getDealSize(row)
      )

      && matches(
        selectedReasons,
        standardizeWinReason(row)
      )

      && matches(
        selectedServices,
        getService(row)
      )

    );
  }
);

}, [
rows,
search,
selectedWeeks,
selectedMonths,
selectedYears,
selectedQuarters,
selectedOwners,
selectedPCS,
selectedRegions,
selectedDealSizes,
selectedReasons,
selectedServices,
]);

/* =======================================================
KPIs
======================================================= */

const metrics = useMemo(() => {

const values =
  filtered
    .map(getValue)
    .sort(
      (a, b) => a - b
    );


const total =
  values.reduce(
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


const reasons =
  aggregate(
    filtered,
    standardizeWinReason
  ).sort(
    (a, b) =>
      b.count - a.count
  );


return {

  count:
    filtered.length,

  total,

  average:
    filtered.length
      ? total /
        filtered.length
      : 0,

  highest:
    values[
      values.length - 1
    ] || 0,

  median,

  topReason:
    reasons[0]?.name ||
    "—",

  topReasonShare:
    filtered.length
      ? (
          reasons[0]?.count ||
          0
        ) /
        filtered.length
      : 0,

  years:
    new Set(
      filtered.map(
        getWonYear
      )
    ).size,

};

}, [filtered]);

/* =======================================================
WIN BY DEAL SIZE
======================================================= */

const dealSizeData = useMemo(() => {

return DEAL_SIZE_BANDS.map(
  (band) => {

    const matching =
      filtered.filter(
        (row) =>
          getValue(row) >=
            band.min &&
          getValue(row) <
            band.max
      );


    return {

      name:
        band.name,

      count:
        matching.length,

      value:
        matching.reduce(
          (
            total,
            row
          ) =>
            total +
            getValue(row),
          0
        ),

    };
  }
);

}, [filtered]);

/* =======================================================
OTHER CHART DATA
======================================================= */

const reasonData =
useMemo(
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

const pcsData =
useMemo(
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

const regionData =
useMemo(
() =>
[
"North",
"South",
"East",
"West",
"Pan India",
"Multiple Locations",
].map(
(name) => {

        const matching =
          filtered.filter(
            (row) =>
              getStandardizedRegion(
                row
              ) === name
          );


        return {

          name,

          count:
            matching.length,

          value:
            matching.reduce(
              (
                total,
                row
              ) =>
                total +
                getValue(row),
              0
            ),

        };

      }
    ),
  [filtered]
);

const serviceData =
useMemo(
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

const yearly =
useMemo(() => {

  const map =
    new Map();


  filtered.forEach(
    (row) => {

      const year =
        getWonYear(row);


      if (!map.has(year)) {

        map.set(
          year,
          {
            year,
            count: 0,
            value: 0,
          }
        );

      }


      const item =
        map.get(year);


      item.count += 1;

      item.value +=
        getValue(row);

    }
  );


  return [
    ...map.values(),
  ]
    .filter(
      (x) =>
        x.year !==
        "Unknown"
    )
    .sort(
      (a, b) =>
        Number(a.year) -
        Number(b.year)
    );

}, [filtered]);

/* =======================================================
CHART DATA
======================================================= */

// Show the complete dataset on each chart; no range sliders on this page.
const visibleReasons = reasonData;
const visiblePCS = pcsData;
const visibleServices = serviceData;

/* =======================================================
RESET
======================================================= */

const activeFilterCount =
[
selectedWeeks,
selectedMonths,
selectedYears,
selectedQuarters,
selectedOwners,
selectedPCS,
selectedRegions,
selectedDealSizes,
selectedReasons,
selectedServices,
].reduce(
(
total,
arr
) =>
total + arr.length,
0
) +
(
search
? 1
: 0
);

function clearFilters() {

setSearch("");

setSelectedWeeks([]);

setSelectedMonths([]);

setSelectedYears([]);

setSelectedQuarters([]);

setSelectedOwners([]);

setSelectedPCS([]);

setSelectedRegions([]);

setSelectedDealSizes([]);

setSelectedReasons([]);

setSelectedServices([]);

}

/* =======================================================
RENDER
======================================================= */

return (

<div
  className="
    space-y-7
    pb-10
  "
>

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

      <div
        className="
          relative
          flex
          items-center
        "
      >

        <Search
          size={19}
          className="
            pointer-events-none
            absolute
            left-4
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
            pl-11
            pr-3
            text-sm
            font-medium
            leading-[52px]
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
        setSelected={setSelectedWeeks}
      />


      <MultiSelect
        label="Months"
        values={options.months}
        selected={selectedMonths}
        setSelected={setSelectedMonths}
      />


      <MultiSelect
        label="Years"
        values={options.years}
        selected={selectedYears}
        setSelected={setSelectedYears}
      />


      <MultiSelect
        label="Fiscal Quarters"
        values={options.quarters}
        selected={selectedQuarters}
        setSelected={setSelectedQuarters}
      />


      <MultiSelect
        label="Owners"
        values={options.owners}
        selected={selectedOwners}
        setSelected={setSelectedOwners}
      />


      {/* PCS VERTICAL */}

      <MultiSelect
        label="PCS Verticals"
        values={options.pcs}
        selected={selectedPCS}
        setSelected={setSelectedPCS}
      />


      {/* REGION */}

      <MultiSelect
        label="Regions"
        values={options.regions}
        selected={selectedRegions}
        setSelected={setSelectedRegions}
      />


      {/* DEAL SIZE */}

      <MultiSelect
        label="Deal Sizes"
        values={options.dealSizes}
        selected={selectedDealSizes}
        setSelected={setSelectedDealSizes}
      />


      {/* WIN REASON */}

      <MultiSelect
        label="Win Reasons"
        values={options.reasons}
        selected={selectedReasons}
        setSelected={setSelectedReasons}
      />


      {/* SERVICES */}

      <MultiSelect
        label="Services"
        values={options.services}
        selected={selectedServices}
        setSelected={setSelectedServices}
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
          type="button"
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
      value={formatInt(metrics.count)}
      icon={Trophy}
    />

    <KPI
      title="Total Value Won"
      value={formatCr(metrics.total)}
      icon={IndianRupee}
    />

    <KPI
      title="Avg Won Deal Size"
      value={formatCr(metrics.average)}
      icon={Target}
    />

    <KPI
      title="Highest Value Won"
      value={formatCr(metrics.highest)}
      icon={TrendingUp}
    />

    <KPI
      title="Median Deal Size"
      value={formatCr(metrics.median)}
      icon={IndianRupee}
    />

    <KPI
      title="Top Win Reason"
      value={metrics.topReason}
      icon={Trophy}
    />

    <KPI
      title="Top Reason Share"
      value={formatPct(metrics.topReasonShare)}
      icon={Users}
    />

    <KPI
      title="Won Years Covered"
      value={formatInt(metrics.years)}
      icon={CalendarDays}
    />

  </div>


  {/* ===================================================
      WIN BY DEAL SIZE
  =================================================== */}

  <SectionHeader
    title="Win by Deal Size"
    subtitle="
      Number of won opportunities and total won value by deal-size band
    "
  />


  <ChartCard
    title="Win by Deal Size"
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
          data={dealSizeData}
          margin={{
            top: 40,
            right: 30,
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
              content={
                <CountLabel />
              }
            />

          </Bar>


          <Bar
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
              content={
                <ValueLabel />
              }
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
    "
  >

    {/* =================================================
        INCUMBENT CHANGE REASON
    ================================================= */}

    <ChartCard
      title="Incumbent Change Reason"
      subtitle="
        Standardized win reasons and won value
      "
    >

      <div className="h-[430px]">

        <ResponsiveContainer
          width="100%"
          height="100%"
        >

          <BarChart
            data={visibleReasons}
            margin={{
              top: 45,
              right: 25,
              left: 15,
              bottom: 115,
            }}
          >

            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
            />

            {/* WIN REASONS ARE NOW ON X AXIS */}

            <XAxis
              dataKey="name"
              interval={0}
              angle={-32}
              textAnchor="end"
              height={115}
              axisLine={false}
              tickLine={false}
              tick={{
                fontSize: 10,
              }}
            />

            <YAxis
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
                6,
                6,
                0,
                0,
              ]}
            >

              <LabelList
                content={
                  <CountLabel />
                }
              />

            </Bar>


            <Bar
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
                content={
                  <ValueLabel />
                }
              />

            </Bar>

          </BarChart>

        </ResponsiveContainer>

      </div>

    </ChartCard>


    {/* =================================================
        PCS VERTICAL
    ================================================= */}

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
              right: 30,
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
              angle={-30}
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
                6,
                6,
                0,
                0,
              ]}
            >

              <LabelList
                content={
                  <CountLabel />
                }
              />

            </Bar>


            <Bar
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
                content={
                  <ValueLabel />
                }
              />

            </Bar>

          </BarChart>

        </ResponsiveContainer>

      </div>

    </ChartCard>

  </div>


  {/* ===================================================
      YOY TREND
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
          data={yearly}
          margin={{
            top: 25,
            right: 25,
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
            dot={{
              r: 4,
            }}
          />

          <Line
            yAxisId="value"
            type="monotone"
            dataKey="value"
            name="Won Value"
            stroke="#14b8a6"
            strokeWidth={3}
            dot={{
              r: 4,
            }}
          />

        </LineChart>

      </ResponsiveContainer>

    </div>

  </ChartCard>


  {/* ===================================================
      REGION
  =================================================== */}

  <SectionHeader
    title="Won Portfolio Mix"
    subtitle="
      Regional contribution to won business
    "
  />


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
            right: 30,
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
              6,
              6,
              0,
              0,
            ]}
          >

            <LabelList
              content={
                <CountLabel />
              }
            />

          </Bar>


          <Bar
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
              content={
                <ValueLabel />
              }
            />

          </Bar>

        </BarChart>

      </ResponsiveContainer>

    </div>

  </ChartCard>


  {/* ===================================================
      SERVICES
  =================================================== */}

  <ChartCard
    title="Win by Services Required"
    subtitle="
      Service mix among won opportunities
    "
  >

    <div className="h-[450px]">

      <ResponsiveContainer
        width="100%"
        height="100%"
      >

        <BarChart
          data={visibleServices}
          layout="vertical"
          margin={{
            top: 20,
            right: 100,
            left: 170,
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
            width={160}
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
              content={
                <HorizontalCountLabel />
              }
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
              content={
                <HorizontalValueLabel />
              }
            />

          </Bar>

        </BarChart>

      </ResponsiveContainer>

    </div>

  </ChartCard>


  {/* ===================================================
      ALL SERVICES BY VALUE & COUNT
  =================================================== */}

  <ChartCard
    title="All Services by Value & Count"
    subtitle="
      Total won opportunities and won value across all services
    "
  >

    <div className="h-[450px]">

      <ResponsiveContainer
        width="100%"
        height="100%"
      >

        <BarChart
          data={visibleServices}
          margin={{
            top: 40,
            right: 30,
            left: 15,
            bottom: 90,
          }}
        >

          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
          />

          <XAxis
            dataKey="name"
            interval={0}
            angle={-32}
            textAnchor="end"
            height={100}
            tick={{
              fontSize: 10,
            }}
            axisLine={false}
            tickLine={false}
          />

          <YAxis
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
              6,
              6,
              0,
              0,
            ]}
          >

            <LabelList
              content={
                <CountLabel />
              }
            />

          </Bar>

          <Bar
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
              content={
                <ValueLabel />
              }
            />

          </Bar>

        </BarChart>

      </ResponsiveContainer>

    </div>

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
              "Region",
              "Won Year",
              "Win Reason",
              "Deal Size",
              "Services",
              "Value",
            ].map(
              (header) => (

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

              )
            )}

          </tr>

        </thead>


        <tbody>

          {filtered.map(
            (row, index) => (

              <tr
                key={
                  row?.[
                    "Opportunity ID"
                  ] ||
                  index
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
                  {
                    text(
                      row?.[
                        "Opportunity Name"
                      ]
                    ) || "—"
                  }
                </td>


                <td
                  className="
                    px-4
                    py-3
                    text-slate-600
                  "
                >
                  {
                    text(
                      row?.[
                        "Customer name"
                      ]
                    ) || "—"
                  }
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
                  {
                    getStandardizedRegion(
                      row
                    )
                  }
                </td>


                <td
                  className="
                    px-4
                    py-3
                    text-slate-600
                  "
                >
                  {
                    getWonYear(row)
                  }
                </td>


                <td
                  className="
                    max-w-[280px]
                    px-4
                    py-3
                    text-slate-600
                  "
                >
                  {
                    standardizeWinReason(
                      row
                    )
                  }
                </td>


                <td
                  className="
                    px-4
                    py-3
                    text-slate-600
                  "
                >
                  {
                    getDealSize(row)
                  }
                </td>


                <td
                  className="
                    max-w-[260px]
                    px-4
                    py-3
                    text-slate-600
                  "
                >
                  {
                    getService(row)
                  }
                </td>


                <td
                  className="
                    px-4
                    py-3
                    font-bold
                    text-slate-900
                  "
                >
                  {
                    formatCr(
                      getValue(row)
                    )
                  }
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