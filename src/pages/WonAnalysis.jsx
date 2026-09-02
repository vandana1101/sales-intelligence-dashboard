import { useMemo, useState } from "react";
import {
  Trophy,
  IndianRupee,
  TrendingUp,
  Users,
  Target,
  CalendarDays,
  Download,
  Search,
  X,
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
  Brush,
} from "recharts";

import KPI from "../components/dashboard/KPI";
import ChartCard from "../components/dashboard/ChartCard";
import SectionHeader from "../components/dashboard/SectionHeader";

/* =========================================================
   BASIC HELPERS
========================================================= */

function text(v) {
  return v === null || v === undefined ? "" : String(v).trim();
}

function num(v) {
  if (v === null || v === undefined || v === "") return 0;

  if (typeof v === "number") {
    return Number.isFinite(v) ? v : 0;
  }

  const n = Number(
    String(v).replace(/[₹,%\s,]/g, "")
  );

  return Number.isFinite(n) ? n : 0;
}

function dateValue(v) {
  if (!v) return null;

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

function yearOf(v) {
  const d = dateValue(v);

  return d ? d.getFullYear() : null;
}

/* =========================================================
   HEADER NORMALIZATION
   Handles:
   - PCS  Vertical
   - PCS Vertical
   - PCS   Vertical
   - PCS_Vertical
   - non-breaking spaces
   - different casing
========================================================= */

function normalizeHeader(value) {
  return String(value ?? "")
    .replace(/\u00a0/g, " ")
    .trim()
    .toLowerCase()
    .replace(/[_\-\s]+/g, " ");
}

/* =========================================================
   ROBUST COLUMN READER
========================================================= */

function first(
  row,
  keys,
  fallback = "Unknown"
) {
  if (!row || typeof row !== "object") {
    return fallback;
  }

  const rowKeys = Object.keys(row);

  /*
   * First: exact / direct matches
   */
  for (const key of keys) {
    const value = text(row[key]);

    if (value) {
      return value;
    }
  }

  /*
   * Second: normalized header matching.
   *
   * This is particularly important for:
   * "PCS  Vertical"
   * vs
   * "PCS Vertical"
   */
  const normalizedTargets = keys.map(
    normalizeHeader
  );

  for (const actualKey of rowKeys) {
    const normalizedActual =
      normalizeHeader(actualKey);

    if (
      normalizedTargets.includes(
        normalizedActual
      )
    ) {
      const value = text(row[actualKey]);

      if (value) {
        return value;
      }
    }
  }

  return fallback;
}

/* =========================================================
   VALUE
========================================================= */

function getValue(row) {
  const cr = num(
    row?.["Values in Cr"]
  );

  if (cr) {
    return cr;
  }

  const annual = num(
    row?.["Value of Contract Per Annum INR"]
  );

  if (annual) {
    return annual / 10000000;
  }

  const monthly = num(
    row?.[
      "Revenue potential per month (in INR)"
    ]
  );

  return monthly
    ? (monthly * 12) / 10000000
    : 0;
}

/* =========================================================
   FORMATTING
========================================================= */

function formatCr(v) {
  const n = num(v);

  if (Math.abs(n) >= 100) {
    return `₹${n.toFixed(1)} Cr`;
  }

  if (Math.abs(n) >= 10) {
    return `₹${n.toFixed(2)} Cr`;
  }

  return `₹${n.toFixed(2)} Cr`;
}

function formatPct(v) {
  return `${(num(v) * 100).toFixed(1)}%`;
}

function formatInt(v) {
  return Math.round(
    num(v)
  ).toLocaleString("en-IN");
}

/* =========================================================
   UNIQUE VALUES
========================================================= */

function unique(rows, getter) {
  return [
    ...new Set(
      rows
        .map(getter)
        .filter(
          (value) =>
            value !== "" &&
            value !== null &&
            value !== undefined &&
            value !== "Unknown"
        )
    ),
  ].sort((a, b) =>
    String(a).localeCompare(
      String(b)
    )
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
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-xl">
      <div className="mb-2 text-xs font-medium text-slate-400">
        {label}
      </div>

      {payload.map((p, i) => (
        <div
          key={i}
          className="text-sm font-semibold text-slate-800"
        >
          {p.name}:{" "}
          {p.name
            ?.toLowerCase()
            .includes("value")
            ? formatCr(p.value)
            : formatInt(p.value)}
        </div>
      ))}
    </div>
  );
}

/* =========================================================
   DOWNLOAD
========================================================= */

function downloadCSV(
  rows,
  filename
) {
  if (!rows.length) return;

  const headers =
    Object.keys(rows[0]);

  const esc = (v) =>
    `"${String(v ?? "").replace(
      /"/g,
      '""'
    )}"`;

  const csv = [
    headers.map(esc).join(","),
    ...rows.map((r) =>
      headers
        .map((h) => esc(r[h]))
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

  const a =
    document.createElement("a");

  a.href = url;
  a.download = filename;
  a.click();

  URL.revokeObjectURL(url);
}

/* =========================================================
   CHART LABELS
========================================================= */

function ValueLabel({
  x,
  y,
  width,
  value,
}) {
  if (!value) return null;

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

function CountLabel({
  x,
  y,
  width,
  value,
}) {
  if (
    value === undefined ||
    value === null
  ) {
    return null;
  }

  return (
    <text
      x={x + width / 2}
      y={y - 8}
      textAnchor="middle"
      fill="#64748b"
      fontSize={11}
      fontWeight={700}
    >
      {formatInt(value)}
    </text>
  );
}

/* =========================================================
   MAIN PAGE
========================================================= */

export default function WonAnalysis({
  data,
  settings = {},
}) {
  /* =======================================================
     SOURCE OPPORTUNITIES
  ======================================================= */

  const sourceRows = useMemo(() => {
    const source =
      Array.isArray(
        data?.opportunities
      )
        ? data.opportunities
        : Array.isArray(
            data?.currentOpportunities
          )
          ? data.currentOpportunities
          : Array.isArray(
              data?.processed
                ?.opportunities
            )
            ? data.processed
                .opportunities
            : [];

    return source;
  }, [data]);

  /* =======================================================
     GET ONLY WON OPPORTUNITIES
  ======================================================= */

  const rows = useMemo(() => {
    return sourceRows.filter((r) => {
      const outcome = first(
        r,
        [
          "Outcome Bucket",
          "Outcome bucket",
          "Outcome",
          "Current Status in Detail",
        ],
        ""
      ).toLowerCase();

      const stage = text(
        r?.["Opportunity Stage"]
      ).toLowerCase();

      const dateWon =
        r?.["Date won"] ||
        r?.["Won Date"];

      return (
        outcome === "won" ||
        outcome.includes("won") ||
        stage === "won" ||
        !!dateWon
      );
    });
  }, [sourceRows]);

  /* =======================================================
     FILTER STATE
  ======================================================= */

  const [search, setSearch] =
    useState("");

  const [year, setYear] =
    useState("All");

  const [owner, setOwner] =
    useState("All");

  const [region, setRegion] =
    useState("All");

  const [
    pcsVertical,
    setPcsVertical,
  ] = useState("All");

  const [dealSize, setDealSize] =
    useState("All");

  const [
    winReason,
    setWinReason,
  ] = useState("All");

  const [service, setService] =
    useState("All");

  /* =======================================================
     SOURCE COLUMN GETTERS
  ======================================================= */

  const getOwner = (r) =>
    first(r, [
      "Assigned To",
      "Salesforce User Name",
      "Sales Owner",
    ]);

  const getRegion = (r) =>
    first(r, [
      "PCS User Region",
      "Customer Service required region",
    ]);

  /*
   * IMPORTANT:
   *
   * PCS Vertical is read directly from the
   * Opportunities dataset.
   *
   * The header in the workbook may be:
   *
   * PCS  Vertical
   *
   * with TWO spaces.
   *
   * first() normalizes whitespace,
   * underscores, casing and NBSPs.
   */
  const getPCSVertical = (r) =>
    first(
      r,
      [
        "PCS  Vertical",
        "PCS Vertical",
        "PCS_Vertical",
        "PCS-Vertical",
      ],
      "Unknown"
    );

  /*
   * Deal size is ALWAYS recreated from
   * opportunity value so the filter has
   * the exact bandwidths we want.
   */
  const getDealSize = (r) => {
    const value = getValue(r);

    if (value < 0.5) {
      return "<0.5 Cr";
    }

    if (value < 1) {
      return "0.5-1 Cr";
    }

    if (value < 3) {
      return "1-3 Cr";
    }

    if (value < 10) {
      return "3-10 Cr";
    }

    return "10+ Cr";
  };

  /*
   * Win reason = incumbent change reason.
   */
  const getReason = (r) =>
    first(
      r,
      [
        "Reason for Changing Incumbent",
        "Reason for changing incumbent",
        "Win Reason",
        "Win reason",
      ],
      "Unknown"
    );

  /*
   * Services comes directly from
   * Services Required.
   */
  const getService = (r) =>
    first(
      r,
      [
        "Services Required",
        "Services required",
        "Services_Required",
      ],
      "Unknown"
    );

  const getWonYear = (r) => {
    const stored = num(
      r?.["Won Year"]
    );

    if (stored) {
      return String(stored);
    }

    return String(
      yearOf(r?.["Date won"]) ||
        yearOf(r?.["Won Date"]) ||
        yearOf(r?.["Onboarded date"]) ||
        "Unknown"
    );
  };

  /* =======================================================
     FILTER OPTIONS
  ======================================================= */

  const options = useMemo(
    () => ({
      years: unique(
        rows,
        getWonYear
      ),

      owners: unique(
        rows,
        getOwner
      ),

      regions: unique(
        rows,
        getRegion
      ),

      pcsVerticals: unique(
        rows,
        getPCSVertical
      ),

      /*
       * Force the five intended deal-size
       * bandwidths to appear.
       */
      dealSizes: [
        "<0.5 Cr",
        "0.5-1 Cr",
        "1-3 Cr",
        "3-10 Cr",
        "10+ Cr",
      ],

      reasons: unique(
        rows,
        getReason
      ),

      services: unique(
        rows,
        getService
      ),
    }),
    [rows]
  );

  /* =======================================================
     FILTERED DATA
  ======================================================= */

  const filtered = useMemo(
    () =>
      rows.filter((r) => {
        const q =
          search
            .toLowerCase()
            .trim();

        const hay = [
          r?.["Opportunity Name"],
          r?.["Customer name"],
          getOwner(r),
          getPCSVertical(r),
          getRegion(r),
          getReason(r),
          getService(r),
          getDealSize(r),
        ]
          .map(text)
          .join(" ")
          .toLowerCase();

        return (
          (!q || hay.includes(q)) &&
          (year === "All" ||
            getWonYear(r) === year) &&
          (owner === "All" ||
            getOwner(r) === owner) &&
          (region === "All" ||
            getRegion(r) === region) &&
          (pcsVertical === "All" ||
            getPCSVertical(r) ===
              pcsVertical) &&
          (dealSize === "All" ||
            getDealSize(r) ===
              dealSize) &&
          (winReason === "All" ||
            getReason(r) ===
              winReason) &&
          (service === "All" ||
            getService(r) ===
              service)
        );
      }),
    [
      rows,
      search,
      year,
      owner,
      region,
      pcsVertical,
      dealSize,
      winReason,
      service,
    ]
  );

  /* =======================================================
     METRICS
  ======================================================= */

  const metrics = useMemo(() => {
    const values = filtered
      .map(getValue)
      .sort((a, b) => a - b);

    const total =
      values.reduce(
        (a, b) => a + b,
        0
      );

    const median = values.length
      ? values.length % 2
        ? values[
            (values.length - 1) /
              2
          ]
        : (
            values[
              values.length / 2 -
                1
            ] +
            values[
              values.length / 2
            ]
          ) / 2
      : 0;

    const reasons =
      aggregate(
        filtered,
        getReason
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
        reasons[0]?.name ||
        "—",

      topReasonShare:
        filtered.length
          ? (reasons[0]?.count ||
              0) /
            filtered.length
          : 0,
    };
  }, [filtered]);

  /* =======================================================
     CHART DATA
  ======================================================= */

  const reasonData = useMemo(
    () =>
      aggregate(
        filtered,
        getReason
      ).sort(
        (a, b) =>
          b.value - a.value
      ),
    [filtered]
  );

  /*
   * ONLY PCS VERTICAL.
   */
  const pcsVerticalData = useMemo(
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

  const regionData = useMemo(
    () =>
      aggregate(
        filtered,
        getRegion
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

    filtered.forEach((r) => {
      const y =
        getWonYear(r);

      if (!map.has(y)) {
        map.set(y, {
          year: y,
          count: 0,
          value: 0,
        });
      }

      map.get(y).count += 1;
      map.get(y).value +=
        getValue(r);
    });

    const arr = [
      ...map.values(),
    ]
      .filter(
        (x) => x.year !== "Unknown"
      )
      .sort(
        (a, b) =>
          Number(a.year) -
          Number(b.year)
      );

    return arr.map((x, i) => ({
      ...x,

      countGrowth:
        i &&
        arr[i - 1].count
          ? (x.count -
              arr[i - 1].count) /
            arr[i - 1].count
          : null,

      valueGrowth:
        i &&
        arr[i - 1].value
          ? (x.value -
              arr[i - 1].value) /
            arr[i - 1].value
          : null,
    }));
  }, [filtered]);

  /* =======================================================
     REASON BY YEAR
  ======================================================= */

  const reasonByYear =
    useMemo(() => {
      const years = [
        ...new Set(
          filtered
            .map(getWonYear)
            .filter(
              (x) =>
                x !== "Unknown"
            )
        ),
      ].sort(
        (a, b) =>
          Number(a) - Number(b)
      );

      const reasons = [
        ...new Set(
          filtered.map(getReason)
        ),
      ];

      return years.map((y) => {
        const row = {
          year: y,
        };

        reasons.forEach(
          (reason) => {
            row[reason] =
              filtered.filter(
                (r) =>
                  getWonYear(r) ===
                    y &&
                  getReason(r) ===
                    reason
              ).length;
          }
        );

        return row;
      });
    }, [filtered]);

  /* =======================================================
     FIXED-WINDOW BRUSH STATE
     
     Same concept as Opportunities page:
     the graph remains the same size while
     the selected window moves across the
     complete dataset.
  ======================================================= */

  const REASON_WINDOW_SIZE = 5;
  const PCS_WINDOW_SIZE = 5;
  const DEAL_WINDOW_SIZE = 5;
  const SERVICE_WINDOW_SIZE = 5;

  const [
    reasonWindowStart,
    setReasonWindowStart,
  ] = useState(0);

  const [
    pcsWindowStart,
    setPcsWindowStart,
  ] = useState(0);

  const [
    dealWindowStart,
    setDealWindowStart,
  ] = useState(0);

  const [
    serviceWindowStart,
    setServiceWindowStart,
  ] = useState(0);

  /* =======================================================
     SAFE WINDOW STARTS
  ======================================================= */

  const safeReasonWindowStart =
    Math.min(
      reasonWindowStart,
      Math.max(
        0,
        reasonData.length -
          Math.min(
            REASON_WINDOW_SIZE,
            reasonData.length
          )
      )
    );

  const safePCSWindowStart =
    Math.min(
      pcsWindowStart,
      Math.max(
        0,
        pcsVerticalData.length -
          Math.min(
            PCS_WINDOW_SIZE,
            pcsVerticalData.length
          )
      )
    );

  const safeDealWindowStart =
    Math.min(
      dealWindowStart,
      Math.max(
        0,
        dealData.length -
          Math.min(
            DEAL_WINDOW_SIZE,
            dealData.length
          )
      )
    );

  const safeServiceWindowStart =
    Math.min(
      serviceWindowStart,
      Math.max(
        0,
        serviceData.length -
          Math.min(
            SERVICE_WINDOW_SIZE,
            serviceData.length
          )
      )
    );

  /* =======================================================
     BRUSH HANDLERS
     
     The selected range remains fixed-size.
     Dragging the range moves through the
     entire category list.
  ======================================================= */

  const handleReasonBrushChange =
    (range) => {
      if (
        !range ||
        reasonData.length <=
          REASON_WINDOW_SIZE
      ) {
        return;
      }

      const maxStart = Math.max(
        0,
        reasonData.length -
          REASON_WINDOW_SIZE
      );

      const start =
        Number.isFinite(
          range.startIndex
        )
          ? range.startIndex
          : safeReasonWindowStart;

      const end =
        Number.isFinite(
          range.endIndex
        )
          ? range.endIndex
          : start;

      const candidate =
        end -
        REASON_WINDOW_SIZE +
        1;

      setReasonWindowStart(
        Math.min(
          Math.max(
            0,
            Math.max(
              start,
              candidate
            )
          ),
          maxStart
        )
      );
    };

  const handlePCSBrushChange =
    (range) => {
      if (
        !range ||
        pcsVerticalData.length <=
          PCS_WINDOW_SIZE
      ) {
        return;
      }

      const maxStart = Math.max(
        0,
        pcsVerticalData.length -
          PCS_WINDOW_SIZE
      );

      const start =
        Number.isFinite(
          range.startIndex
        )
          ? range.startIndex
          : safePCSWindowStart;

      const end =
        Number.isFinite(
          range.endIndex
        )
          ? range.endIndex
          : start;

      const candidate =
        end -
        PCS_WINDOW_SIZE +
        1;

      setPcsWindowStart(
        Math.min(
          Math.max(
            0,
            Math.max(
              start,
              candidate
            )
          ),
          maxStart
        )
      );
    };

  const handleDealBrushChange =
    (range) => {
      if (
        !range ||
        dealData.length <=
          DEAL_WINDOW_SIZE
      ) {
        return;
      }

      const maxStart = Math.max(
        0,
        dealData.length -
          DEAL_WINDOW_SIZE
      );

      const start =
        Number.isFinite(
          range.startIndex
        )
          ? range.startIndex
          : safeDealWindowStart;

      const end =
        Number.isFinite(
          range.endIndex
        )
          ? range.endIndex
          : start;

      const candidate =
        end -
        DEAL_WINDOW_SIZE +
        1;

      setDealWindowStart(
        Math.min(
          Math.max(
            0,
            Math.max(
              start,
              candidate
            )
          ),
          maxStart
        )
      );
    };

  const handleServiceBrushChange =
    (range) => {
      if (
        !range ||
        serviceData.length <=
          SERVICE_WINDOW_SIZE
      ) {
        return;
      }

      const maxStart = Math.max(
        0,
        serviceData.length -
          SERVICE_WINDOW_SIZE
      );

      const start =
        Number.isFinite(
          range.startIndex
        )
          ? range.startIndex
          : safeServiceWindowStart;

      const end =
        Number.isFinite(
          range.endIndex
        )
          ? range.endIndex
          : start;

      const candidate =
        end -
        SERVICE_WINDOW_SIZE +
        1;

      setServiceWindowStart(
        Math.min(
          Math.max(
            0,
            Math.max(
              start,
              candidate
            )
          ),
          maxStart
        )
      );
    };

  /* =======================================================
     CLEAR FILTERS
  ======================================================= */

  const clearFilters = () => {
    setSearch("");
    setYear("All");
    setOwner("All");
    setRegion("All");
    setPcsVertical("All");
    setDealSize("All");
    setWinReason("All");
    setService("All");
  };

  const activeFilters =
    [
      year,
      owner,
      region,
      pcsVertical,
      dealSize,
      winReason,
      service,
    ].filter(
      (x) => x !== "All"
    ).length || search;

  /* =======================================================
     SELECT
  ======================================================= */

  const Select = ({
    value,
    setValue,
    values,
    label,
  }) => (
    <select
      value={value}
      onChange={(e) =>
        setValue(e.target.value)
      }
      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 outline-none focus:border-indigo-400"
    >
      <option value="All">
        All {label}
      </option>

      {values.map((v) => (
        <option
          key={v}
          value={v}
        >
          {v}
        </option>
      ))}
    </select>
  );

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div className="space-y-7 pb-10">

      {/* =================================================
          HEADER
      ================================================= */}

      <SectionHeader
        title="Won Analysis"
        subtitle="Deep analysis of closed-won opportunities, value contribution and win drivers"
      />

      {/* =================================================
          FILTERS
      ================================================= */}

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">

          {/* SEARCH */}

          <div className="relative md:col-span-2 xl:col-span-1">

            <Search
              size={16}
              className="absolute left-3 top-3.5 text-slate-400"
            />

            <input
              value={search}
              onChange={(e) =>
                setSearch(
                  e.target.value
                )
              }
              placeholder="Search opportunity, customer, owner..."
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-indigo-400"
            />

          </div>

          {/* YEAR */}

          <Select
            value={year}
            setValue={setYear}
            values={options.years}
            label="Won Years"
          />

          {/* OWNER */}

          <Select
            value={owner}
            setValue={setOwner}
            values={options.owners}
            label="Owners"
          />

          {/* REGION */}

          <Select
            value={region}
            setValue={setRegion}
            values={options.regions}
            label="Regions"
          />

          {/* PCS VERTICAL */}

          <Select
            value={pcsVertical}
            setValue={setPcsVertical}
            values={
              options.pcsVerticals
            }
            label="PCS Verticals"
          />

          {/* DEAL SIZE */}

          <Select
            value={dealSize}
            setValue={setDealSize}
            values={
              options.dealSizes
            }
            label="Deal Sizes"
          />

          {/* WIN REASON */}

          <Select
            value={winReason}
            setValue={setWinReason}
            values={
              options.reasons
            }
            label="Win Reasons"
          />

          {/* SERVICES */}

          <Select
            value={service}
            setValue={setService}
            values={
              options.services
            }
            label="Services"
          />

        </div>

        <div className="mt-3 flex items-center justify-between">

          <span className="text-xs font-medium text-slate-400">
            Showing{" "}
            {formatInt(
              filtered.length
            )}{" "}
            won deals
          </span>

          {activeFilters ? (
            <button
              onClick={
                clearFilters
              }
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-100"
            >
              <X size={13} />
              Clear filters
            </button>
          ) : null}

        </div>

      </div>

      {/* =================================================
          KPIs
      ================================================= */}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">

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
            new Set(
              filtered.map(
                getWonYear
              )
            ).size
          )}
          icon={CalendarDays}
        />

      </div>

      {/* =================================================
          WIN DRIVERS
      ================================================= */}

      <SectionHeader
        title="Win Drivers"
        subtitle="Why customers changed providers and where won value is concentrated"
      />

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">

        {/* =================================================
            INCUMBENT CHANGE REASON
        ================================================= */}

        <ChartCard
          title="Incumbent Change Reason"
          subtitle="Won deals and won value by win reason"
        >

          <div className="h-[430px]">

            <ResponsiveContainer
              width="100%"
              height="100%"
            >

              <BarChart
                data={reasonData}
                margin={{
                  top: 25,
                  right: 30,
                  left: 10,
                  bottom: 75,
                }}
              >

                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                />

                {/* X AXIS = WIN REASONS */}

                <XAxis
                  dataKey="name"
                  interval={0}
                  angle={-32}
                  textAnchor="end"
                  height={90}
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

                {/* FIXED WINDOW RANGE SELECTOR */}

                {reasonData.length >
                  REASON_WINDOW_SIZE && (
                  <Brush
                    dataKey="name"
                    height={22}
                    travellerWidth={10}
                    stroke="#6366f1"
                    startIndex={
                      safeReasonWindowStart
                    }
                    endIndex={Math.min(
                      safeReasonWindowStart +
                        REASON_WINDOW_SIZE -
                        1,
                      reasonData.length -
                        1
                    )}
                    onChange={
                      handleReasonBrushChange
                    }
                  />
                )}

              </BarChart>

            </ResponsiveContainer>

          </div>

        </ChartCard>

        {/* =================================================
            PCS VERTICAL
        ================================================= */}

        <ChartCard
          title="Win by PCS Vertical"
          subtitle="Won deals and won value by PCS vertical"
        >

          <div className="h-[430px]">

            <ResponsiveContainer
              width="100%"
              height="100%"
            >

              <BarChart
                data={
                  pcsVerticalData
                }
                margin={{
                  top: 25,
                  right: 30,
                  left: 10,
                  bottom: 80,
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
                  height={95}
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

                {/* FIXED WINDOW RANGE SELECTOR */}

                {pcsVerticalData.length >
                  PCS_WINDOW_SIZE && (
                  <Brush
                    dataKey="name"
                    height={22}
                    travellerWidth={10}
                    stroke="#6366f1"
                    startIndex={
                      safePCSWindowStart
                    }
                    endIndex={Math.min(
                      safePCSWindowStart +
                        PCS_WINDOW_SIZE -
                        1,
                      pcsVerticalData.length -
                        1
                    )}
                    onChange={
                      handlePCSBrushChange
                    }
                  />
                )}

              </BarChart>

            </ResponsiveContainer>

          </div>

        </ChartCard>

      </div>

      {/* =================================================
          YOY
      ================================================= */}

      <SectionHeader
        title="YOY Win Trend & Contribution"
        subtitle="Annual won count, value, growth and contribution to the filtered portfolio"
      />

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">

        {/* YOY TREND */}

        <ChartCard
          title="YOY Won Trend"
          subtitle="Won deals and value by year"
        >

          <div className="h-[390px]">

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
                  dot={{ r: 4 }}
                />

                <Line
                  yAxisId="value"
                  type="monotone"
                  dataKey="value"
                  name="Won Value"
                  stroke="#14b8a6"
                  strokeWidth={3}
                  dot={{ r: 4 }}
                />

              </LineChart>

            </ResponsiveContainer>

          </div>

        </ChartCard>

        {/* CONTRIBUTION */}

        <ChartCard
          title="Contribution by Year"
          subtitle="Share of won deals and won value"
        >

          <div className="h-[390px]">

            <ResponsiveContainer
              width="100%"
              height="100%"
            >

              <BarChart
                data={yearly.map(
                  (r) => ({
                    ...r,
                    countShare:
                      metrics.count
                        ? (r.count /
                            metrics.count) *
                          100
                        : 0,
                    valueShare:
                      metrics.total
                        ? (r.value /
                            metrics.total) *
                          100
                        : 0,
                  })
                )}
                margin={{
                  top: 25,
                  right: 20,
                  left: 10,
                  bottom: 20,
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
                  unit="%"
                  axisLine={false}
                  tickLine={false}
                />

                <Tooltip
                  formatter={(v) =>
                    `${Number(
                      v
                    ).toFixed(1)}%`
                  }
                />

                <Legend />

                <Bar
                  dataKey="countShare"
                  name="% of Won Deals"
                  fill="#818cf8"
                  radius={[
                    6,
                    6,
                    0,
                    0,
                  ]}
                />

                <Bar
                  dataKey="valueShare"
                  name="% of Won Value"
                  fill="#2dd4bf"
                  radius={[
                    6,
                    6,
                    0,
                    0,
                  ]}
                />

              </BarChart>

            </ResponsiveContainer>

          </div>

        </ChartCard>

      </div>

      {/* =================================================
          YEAR-WISE WIN REASON
      ================================================= */}

      <ChartCard
        title="Year-wise Win Reason Trend"
        subtitle="Won deal count by incumbent-change reason and year"
      >

        <div className="h-[450px]">

          <ResponsiveContainer
            width="100%"
            height="100%"
          >

            <BarChart
              data={reasonByYear}
              margin={{
                top: 20,
                right: 25,
                left: 10,
                bottom: 25,
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
                allowDecimals={false}
                axisLine={false}
                tickLine={false}
              />

              <Tooltip />

              <Legend />

              {[
                ...new Set(
                  filtered.map(
                    getReason
                  )
                ),
              ]
                .filter(
                  (reason) =>
                    reason !==
                    "Unknown"
                )
                .slice(0, 10)
                .map(
                  (
                    reason,
                    i
                  ) => (
                    <Bar
                      key={reason}
                      dataKey={
                        reason
                      }
                      name={
                        reason
                      }
                      stackId="won"
                      fill={
                        [
                          "#6366f1",
                          "#14b8a6",
                          "#f59e0b",
                          "#f43f5e",
                          "#8b5cf6",
                          "#06b6d4",
                          "#84cc16",
                          "#ec4899",
                          "#64748b",
                          "#f97316",
                        ][
                          i % 10
                        ]
                      }
                    />
                  )
                )}

            </BarChart>

          </ResponsiveContainer>

        </div>

      </ChartCard>

      {/* =================================================
          WON PORTFOLIO MIX
      ================================================= */}

      <SectionHeader
        title="Won Portfolio Mix"
        subtitle="Regional, deal-size and service-level contribution"
      />

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">

        {/* REGION */}

        <ChartCard
          title="Win by Region"
          subtitle="Won count and value by region"
        >

          <div className="h-[400px]">

            <ResponsiveContainer
              width="100%"
              height="100%"
            >

              <BarChart
                data={regionData}
                margin={{
                  top: 25,
                  right: 25,
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
            DEAL SIZE
        ================================================= */}

        <ChartCard
          title="Win by Deal Size"
          subtitle="Won deals and value by deal-size bucket"
        >

          <div className="h-[400px]">

            <ResponsiveContainer
              width="100%"
              height="100%"
            >

              <BarChart
                data={dealData}
                margin={{
                  top: 25,
                  right: 25,
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

                {/* FIXED WINDOW RANGE SELECTOR */}

                {dealData.length >
                  DEAL_WINDOW_SIZE && (
                  <Brush
                    dataKey="name"
                    height={22}
                    travellerWidth={10}
                    stroke="#6366f1"
                    startIndex={
                      safeDealWindowStart
                    }
                    endIndex={Math.min(
                      safeDealWindowStart +
                        DEAL_WINDOW_SIZE -
                        1,
                      dealData.length -
                        1
                    )}
                    onChange={
                      handleDealBrushChange
                    }
                  />
                )}

              </BarChart>

            </ResponsiveContainer>

          </div>

        </ChartCard>

      </div>

      {/* =================================================
          SERVICES
      ================================================= */}

      <ChartCard
        title="Win by Services Required"
        subtitle="Won deals and won value by Services Required from the Opportunities dataset"
      >

        <div className="h-[450px]">

          <ResponsiveContainer
            width="100%"
            height="100%"
          >

            <BarChart
              data={serviceData}
              margin={{
                top: 25,
                right: 30,
                left: 10,
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
                height={105}
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

              {/* FIXED WINDOW RANGE SELECTOR */}

              {serviceData.length >
                SERVICE_WINDOW_SIZE && (
                <Brush
                  dataKey="name"
                  height={22}
                  travellerWidth={10}
                  stroke="#6366f1"
                  startIndex={
                    safeServiceWindowStart
                  }
                  endIndex={Math.min(
                    safeServiceWindowStart +
                      SERVICE_WINDOW_SIZE -
                      1,
                    serviceData.length -
                      1
                  )}
                  onChange={
                    handleServiceBrushChange
                  }
                />
              )}

            </BarChart>

          </ResponsiveContainer>

        </div>

      </ChartCard>

      {/* =================================================
          WON OPPORTUNITIES REGISTER
      ================================================= */}

      <ChartCard
        title="Won Opportunities Register"
        subtitle={`Showing ${formatInt(
          filtered.length
        )} filtered won opportunities`}
        action={
          <button
            onClick={() =>
              downloadCSV(
                filtered,
                "won-opportunities.csv"
              )
            }
            className="flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200"
          >
            <Download
              size={14}
            />
            Download Table
          </button>
        }
      >

        <div className="max-h-[520px] overflow-auto">

          <table className="w-full min-w-[1000px] text-sm">

            <thead className="sticky top-0 bg-slate-50">

              <tr className="border-b border-slate-200">

                {[
                  "Opportunity",
                  "Customer",
                  "Owner",
                  "PCS Vertical",
                  "Region",
                  "Win Year",
                  "Win Reason",
                  "Deal Size",
                  "Value",
                ].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left font-semibold text-slate-500"
                  >
                    {h}
                  </th>
                ))}

              </tr>

            </thead>

            <tbody>

              {filtered.map(
                (r, i) => (
                  <tr
                    key={
                      r?.[
                        "Opportunity ID"
                      ] || i
                    }
                    className="border-b border-slate-100 hover:bg-slate-50"
                  >

                    <td className="max-w-[260px] px-4 py-3 font-semibold text-slate-800">
                      {text(
                        r?.[
                          "Opportunity Name"
                        ]
                      ) || "—"}
                    </td>

                    <td className="px-4 py-3 text-slate-600">
                      {text(
                        r?.[
                          "Customer name"
                        ]
                      ) || "—"}
                    </td>

                    <td className="px-4 py-3 text-slate-600">
                      {getOwner(r)}
                    </td>

                    <td className="px-4 py-3 text-slate-600">
                      {getPCSVertical(
                        r
                      )}
                    </td>

                    <td className="px-4 py-3 text-slate-600">
                      {getRegion(r)}
                    </td>

                    <td className="px-4 py-3 text-slate-600">
                      {getWonYear(r)}
                    </td>

                    <td className="max-w-[240px] px-4 py-3 text-slate-600">
                      {getReason(r)}
                    </td>

                    <td className="px-4 py-3 text-slate-600">
                      {getDealSize(
                        r
                      )}
                    </td>

                    <td className="px-4 py-3 font-bold text-slate-900">
                      {formatCr(
                        getValue(r)
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