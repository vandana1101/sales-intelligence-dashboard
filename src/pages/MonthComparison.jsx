import { useMemo, useState } from "react";

import {
  CalendarDays,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Target,
  Users,
  Activity,
  Download,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
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
  AreaChart,
  Area,
} from "recharts";

import KPI from "../components/dashboard/KPI";
import ChartCard from "../components/dashboard/ChartCard";
import SectionHeader from "../components/dashboard/SectionHeader";


/* =========================================================
   HELPERS
========================================================= */

function text(value) {

  if (
    value === null ||
    value === undefined
  ) {
    return "";
  }

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

  const result =
    Number(
      String(value)
        .replace(/,/g, "")
        .replace(/₹/g, "")
        .replace(/%/g, "")
        .trim()
    );

  return Number.isFinite(result)
    ? result
    : 0;

}


function getCurrencySymbol(currency) {

  if (currency === "USD") {
    return "$";
  }

  if (currency === "EUR") {
    return "€";
  }

  return "₹";

}


function normalizeHeader(value) {
  return String(value ?? "")
    .replace(/^\uFEFF/, "")
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\\s+/g, " ");
}

function getField(
  row,
  names
) {
  if (!row || typeof row !== "object") {
    return "";
  }

  const normalizedMap = new Map(
    Object.entries(row).map(([key, value]) => [
      normalizeHeader(key),
      value,
    ])
  );

  for (const name of names) {
    const normalizedName =
      normalizeHeader(name);

    if (normalizedMap.has(normalizedName)) {
      const value =
        normalizedMap.get(normalizedName);

      if (
        value !== null &&
        value !== undefined &&
        String(value).trim() !== ""
      ) {
        return value;
      }
    }
  }

  return "";
}


/* =========================================================
   DATE HELPERS
========================================================= */

function parseDate(value) {

  if (!value) {
    return null;
  }


  if (
    value instanceof Date &&
    !Number.isNaN(value.getTime())
  ) {

    return value;

  }


  const direct =
    new Date(value);


  if (
    !Number.isNaN(
      direct.getTime()
    )
  ) {

    return direct;

  }


  const match =
    String(value).match(
      /^(\d{1,2})[-/ ]([A-Za-z]{3,})[-/ ](\d{2,4})/
    );


  if (!match) {
    return null;
  }


  const months = {

    jan: 0,
    feb: 1,
    mar: 2,
    apr: 3,
    may: 4,
    jun: 5,
    jul: 6,
    aug: 7,
    sep: 8,
    oct: 9,
    nov: 10,
    dec: 11,

  };


  const day =
    Number(match[1]);


  const month =
    match[2]
      .slice(0, 3)
      .toLowerCase();


  const rawYear =
    Number(match[3]);


  if (
    months[month] ===
    undefined
  ) {
    return null;
  }


  const year =
    rawYear < 100
      ? 2000 + rawYear
      : rawYear;


  return new Date(
    year,
    months[month],
    day
  );

}


function getMonthKey(
  value
) {

  const date =
    parseDate(value);


  if (!date) {
    return null;
  }


  return `${date.getFullYear()}-${String(
    date.getMonth() + 1
  ).padStart(2, "0")}`;

}


function formatMonth(
  monthKey
) {

  if (!monthKey) {
    return "Unknown";
  }


  const [
    year,
    month,
  ] =
    monthKey.split("-");


  const date =
    new Date(
      Number(year),
      Number(month) - 1,
      1
    );


  return date.toLocaleDateString(
    "en-US",
    {
      month: "short",
      year: "numeric",
    }
  );

}


/* =========================================================
   OPPORTUNITY HELPERS
========================================================= */

function getOpportunityDate(
  row
) {

  return getField(
    row,
    [
      "Opportunity Created Date",
      "Opportunity Date",
      "Created Date",
      "Created Time",
      "Date",
    ]
  );

}


function getOpportunityMonth(
  row
) {

  const explicit =
    text(
      getField(
        row,
        [
          "Opportunity Month (G)",
          "Opportunity Month",
          "Created Month",
          "Salesforce Created Month",
        ]
      )
    );


  if (explicit) {

    const parsed =
      parseDate(explicit);


    if (parsed) {

      return getMonthKey(
        parsed
      );

    }


    const monthMatch =
      explicit.match(
        /([A-Za-z]{3,})[- ](\d{4})/
      );


    if (monthMatch) {

      const monthNames = {

        jan: "01",
        feb: "02",
        mar: "03",
        apr: "04",
        may: "05",
        jun: "06",
        jul: "07",
        aug: "08",
        sep: "09",
        oct: "10",
        nov: "11",
        dec: "12",

      };


      const month =
        monthNames[
          monthMatch[1]
            .slice(0, 3)
            .toLowerCase()
        ];


      if (month) {

        return `${monthMatch[2]}-${month}`;

      }

    }

  }


  return getMonthKey(
    getOpportunityDate(row)
  );

}


function getOpportunityStatus(
  row
) {

  return text(
    getField(
      row,
      [
        "Opportunity Stage",
        "Current Status in details",
        "Current status in Detail",
        "Status",
        "Outcome bucket",
      ]
    )
  ) || "Unknown";

}


function getOutcome(
  row
) {

  return text(
    getField(
      row,
      [
        "Outcome bucket",
        "Outcome",
        "Status",
        "Opportunity Stage",
      ]
    )
  ) || "Unknown";

}


function getOpportunityValue(
  row
) {

  const annual =
    number(
      getField(
        row,
        [
          "Value of Contract Per Annum INR",
          "Annual Value in INR",
          "Annual Value",
        ]
      )
    );


  if (annual) {
    return annual;
  }


  const monthly =
    number(
      getField(
        row,
        [
          "Revenue potential per month (in INR)",
          "Revenue Potential Per Month",
          "Monthly Revenue",
        ]
      )
    );


  return monthly * 12;

}


/* =========================================================
   LEAD HELPERS
========================================================= */

function getLeadDate(
  row
) {

  return getField(
    row,
    [
      "Lead Created Date",
      "Created Date",
      "Created Time",
      "Lead Date",
      "Date",
    ]
  );

}


function getLeadMonth(
  row
) {

  const explicit =
    text(
      getField(
        row,
        [
          "Lead Month",
          "Created Month",
          "Month",
        ]
      )
    );


  if (explicit) {

    const parsed =
      parseDate(explicit);


    if (parsed) {

      return getMonthKey(
        parsed
      );

    }

  }


  return getMonthKey(
    getLeadDate(row)
  );

}


function getLeadStatus(
  row
) {

  return text(
    getField(
      row,
      [
        "Lead Status",
        "Status",
        "Current Status",
        "Lead Stage",
      ]
    )
  ) || "Unknown";

}


/* =========================================================
   ACTIVITY HELPERS
========================================================= */

function getActivityDate(
  row
) {

  return getField(
    row,
    [
      "Activity Date",
      "Activity date",
      "Date",
      "Created Date",
      "Created Time",
      "Created At",
      "Task Date",
      "Due Date",
      "Start Date",
    ]
  );

}


function getActivityMonth(
  row
) {

  const explicit =
    text(
      getField(
        row,
        [
          "Activity Month",
          "Created Month",
          "Month",
        ]
      )
    );


  if (explicit) {

    const parsed =
      parseDate(explicit);


    if (parsed) {

      return getMonthKey(
        parsed
      );

    }

  }


  return getMonthKey(
    getActivityDate(row)
  );

}


/* =========================================================
   CSV EXPORT
========================================================= */

function downloadCSV(
  rows,
  filename
) {

  if (!rows.length) {
    return;
  }


  const headers =
    Object.keys(rows[0]);


  const escape =
    (value) =>
      `"${String(
        value ?? ""
      ).replace(
        /"/g,
        '""'
      )}"`;


  const csv = [

    headers
      .map(escape)
      .join(","),

    ...rows.map(
      (row) =>
        headers
          .map(
            (header) =>
              escape(
                row[header]
              )
          )
          .join(",")
    ),

  ].join("\n");


  const blob =
    new Blob(
      [csv],
      {
        type:
          "text/csv;charset=utf-8;",
      }
    );


  const url =
    URL.createObjectURL(blob);


  const link =
    document.createElement("a");


  link.href = url;

  link.download =
    filename;

  link.click();


  URL.revokeObjectURL(url);

}


/* =========================================================
   CHANGE CALCULATION
========================================================= */

function getChange(
  current,
  previous
) {

  if (
    previous === 0 &&
    current === 0
  ) {

    return {
      value: 0,
      percent: 0,
      direction: "flat",
    };

  }


  if (previous === 0) {

    return {
      value:
        current,
      percent:
        100,
      direction:
        "up",
    };

  }


  const value =
    current -
    previous;


  const percent =
    (value /
      Math.abs(previous)) *
    100;


  return {

    value,

    percent,

    direction:
      value > 0
        ? "up"
        : value < 0
        ? "down"
        : "flat",

  };

}


/* =========================================================
   MAIN COMPONENT
========================================================= */

function MonthComparison({
  data,
  settings,
}) {

  const opportunities =
    data?.opportunities || [];


  const currentOpportunities =
    data?.currentOpportunities ||
    opportunities;


  const leads =
    data?.leads || [];


  const activities =
    data?.activities || [];


  /* =======================================================
     MONTH SELECTION
  ======================================================= */

  const [selectedMonth, setSelectedMonth] =
    useState("");


  /* =======================================================
     BUILD MONTHLY DATA
  ======================================================= */

  const monthlyData =
    useMemo(() => {

      const months = {};


      function ensureMonth(
        month
      ) {

        if (!month) {
          return;
        }


        if (!months[month]) {

          months[month] = {

            month,

            opportunities: 0,

            pipelineValue: 0,

            won: 0,

            lost: 0,

            active: 0,

            leads: 0,

            activities: 0,

          };

        }

      }


      /*
        Opportunities
      */

      opportunities.forEach(
        (row) => {

          const month =
            getOpportunityMonth(
              row
            );


          if (!month) {
            return;
          }


          ensureMonth(month);


          months[month]
            .opportunities++;


          months[month]
            .pipelineValue +=
            getOpportunityValue(
              row
            );


          const outcome =
            getOutcome(row)
              .toLowerCase();


          const status =
            getOpportunityStatus(
              row
            ).toLowerCase();


          if (
            outcome.includes(
              "won"
            ) ||
            status.includes(
              "won"
            )
          ) {

            months[month]
              .won++;

          }
          else if (
            outcome.includes(
              "lost"
            ) ||
            outcome.includes(
              "drop"
            ) ||
            status.includes(
              "lost"
            )
          ) {

            months[month]
              .lost++;

          }
          else {

            months[month]
              .active++;

          }

        }
      );


      /*
        Leads
      */

      leads.forEach(
        (row) => {

          const month =
            getLeadMonth(
              row
            );


          if (!month) {
            return;
          }


          ensureMonth(month);


          months[month]
            .leads++;

        }
      );


      /*
        Activities
      */

      activities.forEach(
        (row) => {

          const month =
            getActivityMonth(
              row
            );


          if (!month) {
            return;
          }


          ensureMonth(month);


          months[month]
            .activities++;

        }
      );


      return Object.values(
        months
      )
        .sort(
          (a, b) =>
            a.month.localeCompare(
              b.month
            )
        )
        .map(
          (item) => ({

            ...item,

            label:
              formatMonth(
                item.month
              ),

            conversionRate:
              item.opportunities
                ? (
                    item.won /
                    item.opportunities
                  ) *
                  100
                : 0,

          })
        );

    }, [

      opportunities,

      leads,

      activities,

    ]);


  /* =======================================================
     MONTHS
  ======================================================= */

  const availableMonths =
    monthlyData.map(
      (item) =>
        item.month
    );


  /*
    Automatically select
    latest month.
  */

  const effectiveMonth =
    selectedMonth ||
    availableMonths[
      availableMonths.length - 1
    ] ||
    "";


  const selectedIndex =
    monthlyData.findIndex(
      (item) =>
        item.month ===
        effectiveMonth
    );


  const selectedData =
    monthlyData[
      selectedIndex
    ] || {

      month: effectiveMonth,

      label:
        formatMonth(
          effectiveMonth
        ),

      opportunities: 0,

      pipelineValue: 0,

      won: 0,

      lost: 0,

      active: 0,

      leads: 0,

      activities: 0,

      conversionRate: 0,

    };


  const previousData =
    monthlyData[
      selectedIndex - 1
    ] || {

      opportunities: 0,

      pipelineValue: 0,

      won: 0,

      lost: 0,

      active: 0,

      leads: 0,

      activities: 0,

      conversionRate: 0,

    };


  /* =======================================================
     MONTH CHANGES
  ======================================================= */

  const opportunityChange =
    getChange(
      selectedData.opportunities,
      previousData.opportunities
    );


  const pipelineChange =
    getChange(
      selectedData.pipelineValue,
      previousData.pipelineValue
    );


  const leadChange =
    getChange(
      selectedData.leads,
      previousData.leads
    );


  const activityChange =
    getChange(
      selectedData.activities,
      previousData.activities
    );


  const wonChange =
    getChange(
      selectedData.won,
      previousData.won
    );


  const conversionChange =
    getChange(
      selectedData.conversionRate,
      previousData.conversionRate
    );


  /* =======================================================
     GROWTH DATA
  ======================================================= */

  const growthData =
    monthlyData.map(
      (item, index) => {

        const previous =
          monthlyData[
            index - 1
          ];


        const pipeline =
          getChange(
            item.pipelineValue,
            previous?.pipelineValue ||
              0
          );


        const leads =
          getChange(
            item.leads,
            previous?.leads ||
              0
          );


        const activities =
          getChange(
            item.activities,
            previous?.activities ||
              0
          );


        return {

          month:
            item.label,

          pipelineGrowth:
            Number(
              pipeline.percent.toFixed(
                1
              )
            ),

          leadGrowth:
            Number(
              leads.percent.toFixed(
                1
              )
            ),

          activityGrowth:
            Number(
              activities.percent.toFixed(
                1
              )
            ),

        };

      }
    );


  /* =======================================================
     COMPARISON DATA
  ======================================================= */

  const comparisonData = [

    {
      metric:
        "Opportunities",
      current:
        selectedData.opportunities,
      previous:
        previousData.opportunities,
    },

    {
      metric:
        "Pipeline Value",
      current:
        selectedData.pipelineValue,
      previous:
        previousData.pipelineValue,
    },

    {
      metric:
        "Won",
      current:
        selectedData.won,
      previous:
        previousData.won,
    },

    {
      metric:
        "Lost",
      current:
        selectedData.lost,
      previous:
        previousData.lost,
    },

    {
      metric:
        "Active",
      current:
        selectedData.active,
      previous:
        previousData.active,
    },

    {
      metric:
        "Leads",
      current:
        selectedData.leads,
      previous:
        previousData.leads,
    },

    {
      metric:
        "Activities",
      current:
        selectedData.activities,
      previous:
        previousData.activities,
    },

  ];


  /* =======================================================
     BEST MONTH
  ======================================================= */

  const bestPipelineMonth =
    [...monthlyData]
      .sort(
        (a, b) =>
          b.pipelineValue -
          a.pipelineValue
      )[0];


  const bestWonMonth =
    [...monthlyData]
      .sort(
        (a, b) =>
          b.won -
          a.won
      )[0];


  const bestLeadMonth =
    [...monthlyData]
      .sort(
        (a, b) =>
          b.leads -
          a.leads
      )[0];


  /* =======================================================
     INSIGHT
  ======================================================= */

  function getInsight() {

    if (
      !previousData ||
      !selectedData
    ) {

      return "Upload multiple monthly files to unlock month-over-month intelligence.";

    }


    if (
      pipelineChange.percent >
      10
    ) {

      return `Pipeline value increased ${pipelineChange.percent.toFixed(
        1
      )}% compared with ${formatMonth(
        previousData.month
      )}.`;

    }


    if (
      pipelineChange.percent <
      -10
    ) {

      return `Pipeline value declined ${Math.abs(
        pipelineChange.percent
      ).toFixed(
        1
      )}% compared with the previous month.`;

    }


    if (
      leadChange.percent >
      10
    ) {

      return `Lead generation accelerated ${leadChange.percent.toFixed(
        1
      )}% this month.`;

    }


    if (
      activityChange.percent >
      10
    ) {

      return `Sales activity increased ${activityChange.percent.toFixed(
        1
      )}% compared with the previous month.`;

    }


    if (
      conversionChange.percent >
      5
    ) {

      return `Opportunity conversion improved by ${conversionChange.percent.toFixed(
        1
      )} percentage points.`;

    }


    if (
      conversionChange.percent <
      -5
    ) {

      return `Opportunity conversion weakened by ${Math.abs(
        conversionChange.percent
      ).toFixed(
        1
      )} percentage points.`;

    }


    return `Performance remained relatively stable compared with the previous month.`;

  }


  /* =======================================================
     FORMAT CURRENCY
  ======================================================= */

  function formatCurrency(
    value
  ) {

    const symbol =
      getCurrencySymbol(
        settings?.currency
      );

    const numeric =
      Number(value) || 0;

    const display =
      settings?.valueDisplay ||
      "Crores";


    if (display === "Lakhs") {

      return `${symbol}${(
        numeric /
        100000
      ).toFixed(2)} L`;

    }


    if (display === "Raw") {

      return `${symbol}${Math.round(
        numeric
      ).toLocaleString("en-IN")}`;

    }


    return `${symbol}${(
      numeric /
      10000000
    ).toFixed(2)} Cr`;

  }


  /* =======================================================
     CHANGE BADGE
  ======================================================= */

  function ChangeBadge({
    change,
    inverse = false,
  }) {

    const isPositive =
      inverse
        ? change.direction ===
          "down"
        : change.direction ===
          "up";


    if (
      change.direction ===
      "flat"
    ) {

      return (

        <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-400">

          <Minus size={12} />

          0%

        </span>

      );

    }


    return (

      <span
        className={`inline-flex items-center gap-1 text-xs font-semibold ${
          isPositive
            ? "text-emerald-600"
            : "text-rose-600"
        }`}
      >

        {change.direction ===
        "up" ? (

          <ArrowUpRight
            size={13}
          />

        ) : (

          <ArrowDownRight
            size={13}
          />

        )}

        {Math.abs(
          change.percent
        ).toFixed(
          1
        )}%

      </span>

    );

  }


  /* =======================================================
     EMPTY STATE
  ======================================================= */

  if (!monthlyData.length) {

    return (

      <div className="p-8">

        <div className="bg-white border border-slate-200 rounded-2xl p-16 text-center">

          <CalendarDays
            size={44}
            className="mx-auto text-slate-300"
          />


          <h2 className="text-xl font-bold text-slate-900 mt-5">

            Monthly comparison needs date information

          </h2>


          <p className="text-sm text-slate-400 mt-2 max-w-lg mx-auto">

            Upload monthly Excel or CSV files containing
            opportunity, lead or activity dates.
            The dashboard will automatically group
            the records by month.

          </p>

        </div>

      </div>

    );

  }


  /* =======================================================
     PAGE
  ======================================================= */

  return (

    <div className="p-8">


      {/* ==================================================
          HEADER
      ================================================== */}

      <SectionHeader

        title="Month Comparison"

        subtitle={`Comparing ${monthlyData.length} month${
          monthlyData.length === 1
            ? ""
            : "s"
        } of sales activity`}

        action={

          <button

            onClick={() =>
              downloadCSV(
                monthlyData,
                "monthly-comparison.csv"
              )
            }

            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 shadow-sm"
          >

            <Download
              size={16}
            />

            Export Comparison

          </button>

        }

      />


      {/* ==================================================
          MONTH SELECTOR
      ================================================== */}

      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm mt-6">

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">

          <div>

            <p className="text-xs font-semibold uppercase tracking-wider text-indigo-500">

              Selected period

            </p>


            <h2 className="text-lg font-bold text-slate-900 mt-1">

              {selectedData.label}

            </h2>


            <p className="text-sm text-slate-400 mt-1">

              Compared against{" "}

              {previousData.month
                ? formatMonth(
                    previousData.month
                  )
                : "previous available month"}

            </p>

          </div>


          <select

            value={effectiveMonth}

            onChange={(e) =>
              setSelectedMonth(
                e.target.value
              )
            }

            className="px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
          >

            {availableMonths.map(
              (month) => (

                <option
                  key={month}
                  value={month}
                >

                  {formatMonth(
                    month
                  )}

                </option>

              )
            )}

          </select>

        </div>

      </div>


      {/* ==================================================
          INSIGHT BANNER
      ================================================== */}

      <div className="mt-5 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white p-6 shadow-lg">

        <div className="flex items-start gap-4">

          <div className="w-11 h-11 rounded-xl bg-white/15 flex items-center justify-center shrink-0">

            <Target
              size={22}
            />

          </div>


          <div>

            <p className="text-xs uppercase tracking-wider font-semibold text-indigo-100">

              Automated insight

            </p>


            <p className="text-lg font-semibold mt-1">

              {getInsight()}

            </p>

          </div>

        </div>

      </div>


      {/* ==================================================
          KPI ROW
      ================================================== */}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 mt-6">


        <KPI

          title="Opportunities"

          value={
            selectedData.opportunities.toLocaleString(
              "en-IN"
            )
          }

          subtitle={
            <ChangeBadge
              change={
                opportunityChange
              }
            />
          }

          icon={BarChart3}

          iconClass="bg-indigo-50 text-indigo-600"

        />


        <KPI

          title="Pipeline Value"

          value={
            formatCurrency(
              selectedData.pipelineValue
            )
          }

          subtitle={
            <ChangeBadge
              change={
                pipelineChange
              }
            />
          }

          icon={TrendingUp}

          iconClass="bg-emerald-50 text-emerald-600"

        />


        <KPI

          title="Leads"

          value={
            selectedData.leads.toLocaleString(
              "en-IN"
            )
          }

          subtitle={
            <ChangeBadge
              change={
                leadChange
              }
            />
          }

          icon={Users}

          iconClass="bg-violet-50 text-violet-600"

        />


        <KPI

          title="Activities"

          value={
            selectedData.activities.toLocaleString(
              "en-IN"
            )
          }

          subtitle={
            <ChangeBadge
              change={
                activityChange
              }
            />
          }

          icon={Activity}

          iconClass="bg-cyan-50 text-cyan-600"

        />

      </div>


      {/* ==================================================
          MONTHLY PIPELINE
      ================================================== */}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 mt-6">


        <ChartCard

          title="Pipeline Trend"

          subtitle="Monthly opportunity pipeline"

          className="xl:col-span-2"

        >

          <div className="h-[350px]">

            <ResponsiveContainer
              width="100%"
              height="100%"
            >

              <AreaChart
                data={monthlyData}
              >

                <defs>

                  <linearGradient
                    id="pipelineGradient"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >

                    <stop
                      offset="5%"
                      stopColor="#6366f1"
                      stopOpacity={0.25}
                    />

                    <stop
                      offset="95%"
                      stopColor="#6366f1"
                      stopOpacity={0}
                    />

                  </linearGradient>

                </defs>


                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#e2e8f0"
                />


                <XAxis
                  dataKey="label"
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
                  tick={{
                    fontSize: 11,
                    fill: "#64748b",
                  }}
                  tickFormatter={(value) =>
                    formatCurrency(
                      value
                    )
                  }
                />


                <Tooltip
                  formatter={(value) =>
                    formatCurrency(
                      value
                    )
                  }
                />


                <Area
                  type="monotone"
                  dataKey="pipelineValue"
                  name="Pipeline"
                  stroke="#6366f1"
                  strokeWidth={3}
                  fill="url(#pipelineGradient)"
                />

              </AreaChart>

            </ResponsiveContainer>

          </div>

        </ChartCard>


        {/* Won / Lost */}

        <ChartCard

          title="Outcome Trend"

          subtitle="Won, lost and active opportunities"

        >

          <div className="h-[350px]">

            <ResponsiveContainer
              width="100%"
              height="100%"
            >

              <LineChart
                data={monthlyData}
              >

                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#e2e8f0"
                />


                <XAxis
                  dataKey="label"
                  axisLine={false}
                  tickLine={false}
                  tick={{
                    fontSize: 10,
                    fill: "#64748b",
                  }}
                />


                <YAxis
                  axisLine={false}
                  tickLine={false}
                />


                <Tooltip />


                <Legend />


                <Line
                  type="monotone"
                  dataKey="won"
                  name="Won"
                  stroke="#10b981"
                  strokeWidth={3}
                  dot={false}
                />


                <Line
                  type="monotone"
                  dataKey="lost"
                  name="Lost"
                  stroke="#f43f5e"
                  strokeWidth={3}
                  dot={false}
                />


                <Line
                  type="monotone"
                  dataKey="active"
                  name="Active"
                  stroke="#6366f1"
                  strokeWidth={3}
                  dot={false}
                />

              </LineChart>

            </ResponsiveContainer>

          </div>

        </ChartCard>

      </div>


      {/* ==================================================
          LEADS + ACTIVITIES
      ================================================== */}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 mt-6">


        <ChartCard

          title="Lead Volume"

          subtitle="Monthly lead generation"

        >

          <div className="h-[320px]">

            <ResponsiveContainer
              width="100%"
              height="100%"
            >

              <BarChart
                data={monthlyData}
              >

                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#e2e8f0"
                />


                <XAxis
                  dataKey="label"
                  axisLine={false}
                  tickLine={false}
                />


                <YAxis
                  axisLine={false}
                  tickLine={false}
                />


                <Tooltip />


                <Bar
                  dataKey="leads"
                  name="Leads"
                  fill="#8b5cf6"
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


        <ChartCard

          title="Activity Volume"

          subtitle="Monthly sales activity"

        >

          <div className="h-[320px]">

            <ResponsiveContainer
              width="100%"
              height="100%"
            >

              <BarChart
                data={monthlyData}
              >

                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#e2e8f0"
                />


                <XAxis
                  dataKey="label"
                  axisLine={false}
                  tickLine={false}
                />


                <YAxis
                  axisLine={false}
                  tickLine={false}
                />


                <Tooltip />


                <Bar
                  dataKey="activities"
                  name="Activities"
                  fill="#06b6d4"
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


      {/* ==================================================
          GROWTH ANALYSIS
      ================================================== */}

      <div className="mt-6">

        <ChartCard

          title="Growth Analysis"

          subtitle="Month-over-month percentage movement"

        >

          <div className="h-[340px]">

            <ResponsiveContainer
              width="100%"
              height="100%"
            >

              <LineChart
                data={growthData}
              >

                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#e2e8f0"
                />


                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                />


                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(value) =>
                    `${value}%`
                  }
                />


                <Tooltip
                  formatter={(value) =>
                    `${value}%`
                  }
                />


                <Legend />


                <Line
                  type="monotone"
                  dataKey="pipelineGrowth"
                  name="Pipeline Growth"
                  stroke="#6366f1"
                  strokeWidth={3}
                  dot={false}
                />


                <Line
                  type="monotone"
                  dataKey="leadGrowth"
                  name="Lead Growth"
                  stroke="#8b5cf6"
                  strokeWidth={3}
                  dot={false}
                />


                <Line
                  type="monotone"
                  dataKey="activityGrowth"
                  name="Activity Growth"
                  stroke="#06b6d4"
                  strokeWidth={3}
                  dot={false}
                />

              </LineChart>

            </ResponsiveContainer>

          </div>

        </ChartCard>

      </div>


      {/* ==================================================
          MONTH SNAPSHOT
      ================================================== */}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-6">


        {/* Best Pipeline */}

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">

          <div className="flex items-center gap-3">

            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">

              <TrendingUp
                size={19}
              />

            </div>


            <div>

              <p className="text-xs text-slate-400">

                Highest Pipeline Month

              </p>


              <p className="font-bold text-slate-900 mt-1">

                {bestPipelineMonth?.label ||
                  "—"}

              </p>

            </div>

          </div>


          <p className="text-2xl font-bold text-slate-900 mt-5">

            {formatCurrency(
              bestPipelineMonth?.pipelineValue ||
                0
            )}

          </p>

        </div>


        {/* Best Won */}

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">

          <div className="flex items-center gap-3">

            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">

              <Target
                size={19}
              />

            </div>


            <div>

              <p className="text-xs text-slate-400">

                Most Wins

              </p>


              <p className="font-bold text-slate-900 mt-1">

                {bestWonMonth?.label ||
                  "—"}

              </p>

            </div>

          </div>


          <p className="text-2xl font-bold text-slate-900 mt-5">

            {(
              bestWonMonth?.won ||
              0
            ).toLocaleString(
              "en-IN"
            )}

          </p>

        </div>


        {/* Best Leads */}

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">

          <div className="flex items-center gap-3">

            <div className="w-10 h-10 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center">

              <Users
                size={19}
              />

            </div>


            <div>

              <p className="text-xs text-slate-400">

                Highest Lead Volume

              </p>


              <p className="font-bold text-slate-900 mt-1">

                {bestLeadMonth?.label ||
                  "—"}

              </p>

            </div>

          </div>


          <p className="text-2xl font-bold text-slate-900 mt-5">

            {(
              bestLeadMonth?.leads ||
              0
            ).toLocaleString(
              "en-IN"
            )}

          </p>

        </div>

      </div>


      {/* ==================================================
          DETAILED COMPARISON TABLE
      ================================================== */}

      <div className="mt-6">

        <ChartCard

          title="Detailed Month Comparison"

          subtitle={`Current: ${selectedData.label}`}

          action={

            <button

              onClick={() =>
                downloadCSV(
                  comparisonData,
                  "month-detail-comparison.csv"
                )
              }

              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-600"
            >

              <Download
                size={14}
              />

              Download Table

            </button>

          }

        >

          <div className="overflow-x-auto">

            <table className="w-full text-sm">

              <thead className="bg-slate-50">

                <tr>

                  <th className="text-left px-4 py-3 font-semibold text-slate-500">
                    Metric
                  </th>

                  <th className="text-right px-4 py-3 font-semibold text-slate-500">
                    Previous Month
                  </th>

                  <th className="text-right px-4 py-3 font-semibold text-slate-500">
                    Selected Month
                  </th>

                  <th className="text-right px-4 py-3 font-semibold text-slate-500">
                    Change
                  </th>

                </tr>

              </thead>


              <tbody>

                {comparisonData.map(
                  (row) => {

                    const change =
                      getChange(
                        row.current,
                        row.previous
                      );


                    const isCurrency =
                      row.metric ===
                      "Pipeline Value";


                    return (

                      <tr
                        key={
                          row.metric
                        }
                        className="border-t border-slate-100"
                      >

                        <td className="px-4 py-3 font-semibold text-slate-800">

                          {row.metric}

                        </td>


                        <td className="px-4 py-3 text-right text-slate-500">

                          {isCurrency
                            ? formatCurrency(
                                row.previous
                              )
                            : row.previous.toLocaleString(
                                "en-IN"
                              )}

                        </td>


                        <td className="px-4 py-3 text-right font-semibold text-slate-900">

                          {isCurrency
                            ? formatCurrency(
                                row.current
                              )
                            : row.current.toLocaleString(
                                "en-IN"
                              )}

                        </td>


                        <td className="px-4 py-3 text-right">

                          <ChangeBadge
                            change={
                              change
                            }
                          />

                        </td>

                      </tr>

                    );

                  }
                )}

              </tbody>

            </table>

          </div>

        </ChartCard>

      </div>


    </div>

  );

}


export default MonthComparison;