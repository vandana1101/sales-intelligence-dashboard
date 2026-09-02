import { useMemo, useState } from "react";

import {
  BarChart3,
  LineChart as LineChartIcon,
  PieChart as PieChartIcon,
  AreaChart as AreaChartIcon,
  Download,
  RotateCcw,
  Sparkles,
  SlidersHorizontal,
} from "lucide-react";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

import ChartCard from "../components/dashboard/ChartCard";
import SectionHeader from "../components/dashboard/SectionHeader";


/* =========================================================
   HELPERS
========================================================= */

function normalizeHeader(value) {
  return String(value ?? "")
    .replace(/^\uFEFF/, "")
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
}


function getField(row, key) {
  if (!row || !key) {
    return "";
  }

  // CSV files can contain equivalent headers with
  // underscores, hyphens, different spacing, casing,
  // or a UTF-8 BOM. Resolve those variations while
  // preserving the original column names in the UI.
  const normalizedKey =
    normalizeHeader(key);

  const entries =
    Object.entries(row);

  for (const [header, value] of entries) {
    if (
      normalizeHeader(header) ===
      normalizedKey
    ) {
      return value;
    }
  }

  return "";
}


function cleanText(value) {
  if (
    value === null ||
    value === undefined
  ) {
    return "";
  }

  return String(value).trim();
}


function toNumber(value) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const cleaned =
    String(value)
      .replace(/,/g, "")
      .replace(/₹/g, "")
      .replace(/%/g, "")
      .trim();

  const number =
    Number(cleaned);

  return Number.isFinite(number)
    ? number
    : null;
}


function isNumericColumn(
  rows,
  key
) {
  if (!rows.length) {
    return false;
  }

  let numeric = 0;
  let nonEmpty = 0;

  for (
    const row of rows.slice(0, 100)
  ) {
    const value =
      getField(row, key);

    if (
      value === null ||
      value === undefined ||
      String(value).trim() === ""
    ) {
      continue;
    }

    nonEmpty++;

    if (
      toNumber(value) !== null
    ) {
      numeric++;
    }
  }

  return (
    nonEmpty > 0 &&
    numeric / nonEmpty >= 0.7
  );
}


function formatNumber(
  value
) {
  if (
    value === null ||
    value === undefined ||
    Number.isNaN(value)
  ) {
    return "—";
  }

  return Number(value)
    .toLocaleString("en-IN", {
      maximumFractionDigits: 2,
    });
}


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
  link.download = filename;

  document.body.appendChild(
    link
  );

  link.click();

  document.body.removeChild(
    link
  );

  URL.revokeObjectURL(url);
}


/* =========================================================
   COLORS
========================================================= */

const CHART_COLORS = [
  "#6366f1",
  "#8b5cf6",
  "#06b6d4",
  "#10b981",
  "#f59e0b",
  "#f43f5e",
  "#ec4899",
  "#14b8a6",
  "#3b82f6",
  "#a855f7",
];


/* =========================================================
   COMPONENT
========================================================= */

function CustomCharts({
  data,
}) {

  /*
   * The processor currently exposes:
   *
   * data.opportunities
   * data.leads
   * data.activities
   *
   * We also support a few alternative structures so this
   * page remains resilient if the processor evolves.
   */

  const datasets = useMemo(
    () => ({
      opportunities:
        data?.opportunities ||
        data?.currentOpportunities ||
        [],

      leads:
        data?.leads ||
        [],

      activities:
        data?.activities ||
        [],
    }),
    [data]
  );


  /* =======================================================
     STATE
  ======================================================= */

  const [
    source,
    setSource,
  ] = useState(
    "opportunities"
  );


  const [
    xAxis,
    setXAxis,
  ] = useState("");


  const [
    yAxis,
    setYAxis,
  ] = useState("");


  const [
    aggregation,
    setAggregation,
  ] = useState(
    "count"
  );


  const [
    chartType,
    setChartType,
  ] = useState(
    "bar"
  );


  const [
    limit,
    setLimit,
  ] = useState(15);


  const [
    generated,
    setGenerated,
  ] = useState(false);


  /* =======================================================
     CURRENT ROWS
  ======================================================= */

  const rows =
    datasets[source] || [];


  /* =======================================================
     AVAILABLE COLUMNS
  ======================================================= */

  const columns = useMemo(
    () => {

      if (!rows.length) {
        return [];
      }

      const counts = {};

      rows.forEach(
        (row) => {

          Object.keys(
            row || {}
          ).forEach(
            (key) => {

              if (
                key ===
                "__fileName"
              ) {
                return;
              }

              counts[key] =
                (counts[key] ||
                  0) + 1;
            }
          );

        }
      );

      return Object.keys(
        counts
      ).sort(
        (a, b) => {

          const aRatio =
            counts[a] /
            rows.length;

          const bRatio =
            counts[b] /
            rows.length;

          if (
            bRatio !==
            aRatio
          ) {
            return (
              bRatio -
              aRatio
            );
          }

          return a.localeCompare(
            b
          );
        }
      );

    },
    [rows]
  );


  /* =======================================================
     COLUMN TYPE DETECTION
  ======================================================= */

  const numericColumns =
    useMemo(
      () =>
        columns.filter(
          (column) =>
            isNumericColumn(
              rows,
              column
            )
        ),
      [
        columns,
        rows,
      ]
    );


  const categoricalColumns =
    columns.filter(
      (column) =>
        !numericColumns.includes(
          column
        )
    );


  /* =======================================================
     SMART DEFAULTS
  ======================================================= */

  useMemo(
    () => {

      if (!columns.length) {
        return;
      }

      if (
        !xAxis ||
        !columns.includes(
          xAxis
        )
      ) {

        const preferred =
          categoricalColumns[0] ||
          columns[0];

        setXAxis(
          preferred
        );

      }

      if (
        !yAxis ||
        !columns.includes(
          yAxis
        )
      ) {

        if (
          numericColumns.length
        ) {

          setYAxis(
            numericColumns[0]
          );

        } else {

          setYAxis(
            columns[0]
          );

        }

      }

    },
    [
      source,
      columns.length,
    ]
  );


  /* =======================================================
     GROUP / AGGREGATION
  ======================================================= */

  const chartData =
    useMemo(
      () => {

        if (
          !rows.length ||
          !xAxis
        ) {
          return [];
        }

        const groups =
          new Map();


        rows.forEach(
          (row) => {

            const rawX =
              getField(
                row,
                xAxis
              );

            const key =
              cleanText(
                rawX
              ) ||
              "Blank";


            if (
              !groups.has(key)
            ) {

              groups.set(
                key,
                {
                  key,
                  values: [],
                  count: 0,
                }
              );

            }


            const group =
              groups.get(
                key
              );


            group.count++;


            if (yAxis) {

              const numericValue =
                toNumber(
                  getField(
                    row,
                    yAxis
                  )
                );


              if (
                numericValue !==
                null
              ) {

                group.values.push(
                  numericValue
                );

              }

            }

          }
        );


        let result =
          Array.from(
            groups.values()
          ).map(
            (group) => {

              let value =
                group.count;


              if (
                aggregation ===
                "count"
              ) {

                value =
                  group.count;

              }
              else if (
                aggregation ===
                "sum"
              ) {

                value =
                  group.values.reduce(
                    (
                      total,
                      current
                    ) =>
                      total +
                      current,
                    0
                  );

              }
              else if (
                aggregation ===
                "average"
              ) {

                value =
                  group.values.length
                    ? group.values.reduce(
                        (
                          total,
                          current
                        ) =>
                          total +
                          current,
                        0
                      ) /
                      group.values
                        .length
                    : 0;

              }
              else if (
                aggregation ===
                "min"
              ) {

                value =
                  group.values.length
                    ? Math.min(
                        ...group.values
                      )
                    : 0;

              }
              else if (
                aggregation ===
                "max"
              ) {

                value =
                  group.values.length
                    ? Math.max(
                        ...group.values
                      )
                    : 0;

              }


              return {

                category:
                  group.key,

                value:

                  Number(
                    value.toFixed(
                      2
                    )
                  ),

              };

            }
          );


        /*
          Largest categories first.
        */

        result.sort(
          (a, b) =>
            b.value -
            a.value
        );


        /*
          Keep chart readable.
        */

        const maxItems =
          Number(limit) || 15;


        if (
          result.length >
          maxItems
        ) {

          const top =
            result.slice(
              0,
              maxItems
            );


          const remaining =
            result
              .slice(
                maxItems
              )
              .reduce(
                (
                  total,
                  item
                ) =>
                  total +
                  item.value,
                0
              );


          if (
            remaining > 0
          ) {

            top.push({
              category:
                "Other",
              value:
                Number(
                  remaining.toFixed(
                    2
                  )
                ),
            });

          }


          result =
            top;

        }


        return result;

      },
      [
        rows,
        xAxis,
        yAxis,
        aggregation,
        limit,
      ]
    );


  /* =======================================================
     RESET
  ======================================================= */

  function resetBuilder() {

    setXAxis(
      categoricalColumns[0] ||
        columns[0] ||
        ""
    );

    setYAxis(
      numericColumns[0] ||
        columns[0] ||
        ""
    );

    setAggregation(
      "count"
    );

    setChartType(
      "bar"
    );

    setLimit(15);

    setGenerated(
      false
    );

  }


  /* =======================================================
     GENERATE
  ======================================================= */

  function generateChart() {

    if (!xAxis) {

      alert(
        "Please select an X-axis column."
      );

      return;
    }

    setGenerated(
      true
    );

  }


  /* =======================================================
     EXPORT CHART DATA
  ======================================================= */

  function exportChartData() {

    if (
      !chartData.length
    ) {
      return;
    }

    downloadCSV(
      chartData,
      "custom-chart-data.csv"
    );

  }


  /* =======================================================
     EMPTY DATASET
  ======================================================= */

  if (
    !datasets.opportunities.length &&
    !datasets.leads.length &&
    !datasets.activities.length
  ) {

    return (

      <div className="p-8">

        <div className="bg-white border border-slate-200 rounded-2xl p-16 text-center">

          <Sparkles
            size={44}
            className="mx-auto text-indigo-400"
          />

          <h2 className="text-xl font-bold text-slate-900 mt-5">

            Custom Analytics

          </h2>

          <p className="text-sm text-slate-400 mt-2">

            Upload a workbook first to build
            custom charts from your data.

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

        title="Custom Analytics"

        subtitle="Build your own charts from any available column"

        action={

          <button

            onClick={
              resetBuilder
            }

            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-sm font-semibold text-slate-600"
          >

            <RotateCcw
              size={15}
            />

            Reset

          </button>

        }

      />


      {/* ==================================================
          BUILDER
      ================================================== */}

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm mt-6 overflow-hidden">


        <div className="p-6 border-b border-slate-100">

          <div className="flex items-center gap-3">

            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">

              <SlidersHorizontal
                size={19}
              />

            </div>


            <div>

              <h2 className="font-bold text-slate-900">

                Chart Builder

              </h2>


              <p className="text-xs text-slate-400 mt-1">

                Choose your data and visualization

              </p>

            </div>

          </div>

        </div>


        <div className="p-6">

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">


            {/* DATA SOURCE */}

            <div>

              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">

                Data Source

              </label>


              <select

                value={source}

                onChange={(e) => {

                  setSource(
                    e.target.value
                  );

                  setGenerated(
                    false
                  );

                }}

                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400"
              >

                <option value="opportunities">

                  Opportunities

                </option>


                <option value="leads">

                  Leads

                </option>


                <option value="activities">

                  Activities

                </option>

              </select>

            </div>


            {/* X AXIS */}

            <div>

              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">

                X-Axis / Category

              </label>


              <select

                value={xAxis}

                onChange={(e) =>
                  setXAxis(
                    e.target.value
                  )
                }

                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400"
              >

                <option value="">

                  Select column

                </option>


                {columns.map(
                  (column) => (

                    <option
                      key={column}
                      value={column}
                    >

                      {column}

                    </option>

                  )
                )}

              </select>

            </div>


            {/* Y AXIS */}

            <div>

              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">

                Y-Axis / Value

              </label>


              <select

                value={yAxis}

                onChange={(e) =>
                  setYAxis(
                    e.target.value
                  )
                }

                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400"
              >

                <option value="">

                  Select column

                </option>


                {columns.map(
                  (column) => (

                    <option
                      key={column}
                      value={column}
                    >

                      {column}

                    </option>

                  )
                )}

              </select>

            </div>


            {/* AGGREGATION */}

            <div>

              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">

                Aggregation

              </label>


              <select

                value={
                  aggregation
                }

                onChange={(e) =>
                  setAggregation(
                    e.target.value
                  )
                }

                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400"
              >

                <option value="count">

                  Count

                </option>


                <option value="sum">

                  Sum

                </option>


                <option value="average">

                  Average

                </option>


                <option value="min">

                  Minimum

                </option>


                <option value="max">

                  Maximum

                </option>

              </select>

            </div>


            {/* CHART TYPE */}

            <div>

              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">

                Chart Type

              </label>


              <select

                value={
                  chartType
                }

                onChange={(e) =>
                  setChartType(
                    e.target.value
                  )
                }

                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400"
              >

                <option value="bar">

                  Bar Chart

                </option>


                <option value="line">

                  Line Chart

                </option>


                <option value="area">

                  Area Chart

                </option>


                <option value="pie">

                  Pie / Donut Chart

                </option>

              </select>

            </div>


            {/* LIMIT */}

            <div>

              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">

                Maximum Categories

              </label>


              <select

                value={limit}

                onChange={(e) =>
                  setLimit(
                    Number(
                      e.target.value
                    )
                  )
                }

                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400"
              >

                <option value={5}>
                  Top 5
                </option>

                <option value={10}>
                  Top 10
                </option>

                <option value={15}>
                  Top 15
                </option>

                <option value={20}>
                  Top 20
                </option>

                <option value={30}>
                  Top 30
                </option>

              </select>

            </div>

          </div>


          {/* GENERATE BUTTON */}

          <div className="flex justify-end mt-6">

            <button

              onClick={
                generateChart
              }

              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold shadow-lg shadow-indigo-100 transition"
            >

              <Sparkles
                size={17}
              />

              Generate Chart

            </button>

          </div>

        </div>

      </div>


      {/* ==================================================
          QUICK CONFIGURATION
      ================================================== */}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-5">

        <div className="bg-white border border-slate-200 rounded-xl p-4">

          <p className="text-xs text-slate-400">
            Records
          </p>

          <p className="text-xl font-bold text-slate-900 mt-1">

            {rows.length.toLocaleString(
              "en-IN"
            )}

          </p>

        </div>


        <div className="bg-white border border-slate-200 rounded-xl p-4">

          <p className="text-xs text-slate-400">
            Columns
          </p>

          <p className="text-xl font-bold text-slate-900 mt-1">

            {columns.length}

          </p>

        </div>


        <div className="bg-white border border-slate-200 rounded-xl p-4">

          <p className="text-xs text-slate-400">
            Numeric Columns
          </p>

          <p className="text-xl font-bold text-slate-900 mt-1">

            {numericColumns.length}

          </p>

        </div>


        <div className="bg-white border border-slate-200 rounded-xl p-4">

          <p className="text-xs text-slate-400">
            Categories
          </p>

          <p className="text-xl font-bold text-slate-900 mt-1">

            {chartData.length}

          </p>

        </div>

      </div>


      {/* ==================================================
          GENERATED CHART
      ================================================== */}

      {generated && (

        <div className="mt-6">

          <ChartCard

            title={`${aggregation.charAt(0).toUpperCase() + aggregation.slice(1)} of ${yAxis || "Records"} by ${xAxis}`}

            subtitle={`${source.charAt(0).toUpperCase() + source.slice(1)} • ${chartType} chart`}

            action={

              <button

                onClick={
                  exportChartData
                }

                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-600"
              >

                <Download
                  size={14}
                />

                Export Data

              </button>

            }

          >

            <div className="h-[480px]">


              {/* BAR */}

              {chartType ===
                "bar" && (

                <ResponsiveContainer
                  width="100%"
                  height="100%"
                >

                  <BarChart
                    data={
                      chartData
                    }
                  >

                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="#e2e8f0"
                    />


                    <XAxis
                      dataKey="category"
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
                    />


                    <Tooltip />


                    <Legend />


                    <Bar
                      dataKey="value"
                      name={
                        aggregation
                      }
                      fill="#6366f1"
                      radius={[
                        6,
                        6,
                        0,
                        0,
                      ]}
                    />

                  </BarChart>

                </ResponsiveContainer>

              )}


              {/* LINE */}

              {chartType ===
                "line" && (

                <ResponsiveContainer
                  width="100%"
                  height="100%"
                >

                  <LineChart
                    data={
                      chartData
                    }
                  >

                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="#e2e8f0"
                    />


                    <XAxis
                      dataKey="category"
                      axisLine={false}
                      tickLine={false}
                    />


                    <YAxis
                      axisLine={false}
                      tickLine={false}
                    />


                    <Tooltip />


                    <Legend />


                    <Line
                      type="monotone"
                      dataKey="value"
                      name={
                        aggregation
                      }
                      stroke="#6366f1"
                      strokeWidth={3}
                      dot={{
                        r: 4,
                      }}
                    />

                  </LineChart>

                </ResponsiveContainer>

              )}


              {/* AREA */}

              {chartType ===
                "area" && (

                <ResponsiveContainer
                  width="100%"
                  height="100%"
                >

                  <AreaChart
                    data={
                      chartData
                    }
                  >

                    <defs>

                      <linearGradient
                        id="customAreaGradient"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >

                        <stop
                          offset="5%"
                          stopColor="#6366f1"
                          stopOpacity={0.3}
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
                      dataKey="category"
                      axisLine={false}
                      tickLine={false}
                    />


                    <YAxis
                      axisLine={false}
                      tickLine={false}
                    />


                    <Tooltip />


                    <Area
                      type="monotone"
                      dataKey="value"
                      name={
                        aggregation
                      }
                      stroke="#6366f1"
                      strokeWidth={3}
                      fill="url(#customAreaGradient)"
                    />

                  </AreaChart>

                </ResponsiveContainer>

              )}


              {/* PIE */}

              {chartType ===
                "pie" && (

                <ResponsiveContainer
                  width="100%"
                  height="100%"
                >

                  <PieChart>

                    <Pie
                      data={
                        chartData
                      }
                      dataKey="value"
                      nameKey="category"
                      cx="50%"
                      cy="50%"
                      innerRadius="45%"
                      outerRadius="75%"
                      paddingAngle={2}
                      label
                    >

                      {chartData.map(
                        (
                          entry,
                          index
                        ) => (

                          <Cell
                            key={
                              `cell-${index}`
                            }
                            fill={
                              CHART_COLORS[
                                index %
                                  CHART_COLORS.length
                              ]
                            }
                          />

                        )
                      )}

                    </Pie>


                    <Tooltip />


                    <Legend />

                  </PieChart>

                </ResponsiveContainer>

              )}

            </div>

          </ChartCard>


          {/* =================================================
              RESULT TABLE
          ================================================= */}

          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm mt-5 overflow-hidden">

            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">

              <div>

                <h3 className="font-bold text-slate-900">

                  Chart Data

                </h3>

                <p className="text-xs text-slate-400 mt-1">

                  Aggregated values used to create the visualization

                </p>

              </div>


              <button

                onClick={
                  exportChartData
                }

                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-600"
              >

                <Download
                  size={14}
                />

                CSV

              </button>

            </div>


            <div className="overflow-x-auto">

              <table className="w-full text-sm">

                <thead className="bg-slate-50">

                  <tr>

                    <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">

                      {xAxis}

                    </th>


                    <th className="text-right px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">

                      {aggregation}

                    </th>

                  </tr>

                </thead>


                <tbody>

                  {chartData.map(
                    (row) => (

                      <tr
                        key={
                          row.category
                        }
                        className="border-t border-slate-100"
                      >

                        <td className="px-5 py-3 text-slate-700">

                          {row.category}

                        </td>


                        <td className="px-5 py-3 text-right font-semibold text-slate-900">

                          {formatNumber(
                            row.value
                          )}

                        </td>

                      </tr>

                    )
                  )}

                </tbody>

              </table>

            </div>

          </div>

        </div>

      )}


      {/* ==================================================
          NO CHART YET
      ================================================== */}

      {!generated && (

        <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-14 text-center mt-6">

          <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">

            <BarChart3
              size={26}
            />

          </div>


          <h3 className="font-bold text-slate-800 mt-5">

            Your chart will appear here

          </h3>


          <p className="text-sm text-slate-400 mt-2 max-w-lg mx-auto">

            Select the data source, columns,
            aggregation and chart type above,
            then click Generate Chart.

          </p>

        </div>

      )}

    </div>

  );

}


export default CustomCharts;