import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  TrendingUp,
  TrendingDown,
  Minus,
  Download,
  Sparkles,
  CalendarDays,
  Target,
  BarChart3,
  Settings2,
} from "lucide-react";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  Line,
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


function getColumnValue(row, possibleNames = []) {
  if (!row || typeof row !== "object") {
    return "";
  }

  const normalizedMap = new Map(
    Object.entries(row).map(
      ([key, value]) => [
        normalizeHeader(key),
        value,
      ]
    )
  );

  for (const name of possibleNames) {
    const normalizedName =
      normalizeHeader(name);

    if (normalizedMap.has(normalizedName)) {
      return normalizedMap.get(normalizedName);
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


/* =========================================================
   DATE PARSER
========================================================= */

function parseDate(value) {

  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {

    return null;

  }


  if (
    value instanceof Date &&
    !Number.isNaN(
      value.getTime()
    )
  ) {

    return value;

  }


  const text =
    String(value).trim();


  /*
   * Excel serial date
   */

  if (
    /^\d+(\.\d+)?$/.test(text)
  ) {

    const serial =
      Number(text);


    if (
      serial > 20000 &&
      serial < 80000
    ) {

      const date =
        new Date(
          Date.UTC(
            1899,
            11,
            30
          )
        );


      date.setUTCDate(
        date.getUTCDate() +
        Math.floor(serial)
      );


      return date;

    }

  }


  /*
   * Normal JavaScript parsing
   */

  const direct =
    new Date(text);


  if (
    !Number.isNaN(
      direct.getTime()
    )
  ) {

    return direct;

  }


  /*
   * DD-MMM-YY / DD-MMM-YYYY
   */

  const match =
    text.match(
      /^(\d{1,2})[-\/](\w{3,9})[-\/](\d{2,4})$/
    );


  if (match) {

    const day =
      Number(match[1]);

    const monthText =
      match[2];

    let year =
      Number(match[3]);


    if (
      year < 100
    ) {

      year += 2000;

    }


    const months = {

      jan: 0,
      january: 0,

      feb: 1,
      february: 1,

      mar: 2,
      march: 2,

      apr: 3,
      april: 3,

      may: 4,

      jun: 5,
      june: 5,

      jul: 6,
      july: 6,

      aug: 7,
      august: 7,

      sep: 8,
      sept: 8,
      september: 8,

      oct: 9,
      october: 9,

      nov: 10,
      november: 10,

      dec: 11,
      december: 11,

    };


    const month =
      months[
        monthText.toLowerCase()
      ];


    if (
      month !== undefined
    ) {

      return new Date(
        year,
        month,
        day
      );

    }

  }


  return null;

}


/* =========================================================
   DATE HELPERS
========================================================= */

function monthKey(date) {

  return `${date.getFullYear()}-${String(
    date.getMonth() + 1
  ).padStart(2, "0")}`;

}


function monthLabel(date) {

  return date.toLocaleDateString(
    "en-IN",
    {
      month: "short",
      year: "numeric",
    }
  );

}


function addMonths(
  date,
  months
) {

  const result =
    new Date(date);


  result.setMonth(
    result.getMonth() +
    months
  );


  return result;

}


/* =========================================================
   CURRENCY
========================================================= */

function getCurrencySymbol(
  currency
) {

  const symbols = {

    INR: "₹",

    USD: "$",

    EUR: "€",

  };


  return (
    symbols[currency] ||
    currency
  );

}


/* =========================================================
   VALUE DISPLAY
========================================================= */

function getValueUnit(
  valueDisplay
) {

  if (
    valueDisplay === "Lakhs"
  ) {

    return "L";

  }


  if (
    valueDisplay === "Crores"
  ) {

    return "Cr";

  }


  return "";

}


function convertDisplayValue(
  value,
  valueDisplay
) {

  if (
    value === null ||
    value === undefined ||
    Number.isNaN(value)
  ) {

    return null;

  }


  /*
   * Assumes the underlying workbook
   * values are stored in base currency.
   *
   * Raw    -> unchanged
   * Lakhs  -> / 100,000
   * Crores -> / 10,000,000
   */

  if (
    valueDisplay === "Lakhs"
  ) {

    return value / 100000;

  }


  if (
    valueDisplay === "Crores"
  ) {

    return value / 10000000;

  }


  return value;

}


/* =========================================================
   FORMAT NUMBER
========================================================= */

function formatNumber(
  value,
  currency,
  valueDisplay
) {

  if (
    value === null ||
    value === undefined ||
    Number.isNaN(value)
  ) {

    return "—";

  }


  const converted =
    convertDisplayValue(
      value,
      valueDisplay
    );


  const symbol =
    getCurrencySymbol(
      currency
    );


  const unit =
    getValueUnit(
      valueDisplay
    );


  return `${symbol}${Number(
    converted
  ).toLocaleString(
    "en-IN",
    {
      maximumFractionDigits:
        2,
    }
  )}${unit ? ` ${unit}` : ""}`;

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
    Object.keys(
      rows[0]
    );


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
    URL.createObjectURL(
      blob
    );


  const link =
    document.createElement(
      "a"
    );


  link.href =
    url;

  link.download =
    filename;


  document.body.appendChild(
    link
  );


  link.click();


  document.body.removeChild(
    link
  );


  URL.revokeObjectURL(
    url
  );

}


/* =========================================================
   COLUMN DETECTION
========================================================= */

function isNumericColumn(
  rows,
  column
) {

  let numeric = 0;

  let nonEmpty = 0;


  rows
    .slice(0, 200)
    .forEach(
      (row) => {

        const value =
          getColumnValue(
            row,
            [column]
          );


        if (
          value === null ||
          value === undefined ||
          String(value).trim() === ""
        ) {

          return;

        }


        nonEmpty++;


        if (
          toNumber(value) !==
          null
        ) {

          numeric++;

        }

      }
    );


  return (
    nonEmpty > 0 &&
    numeric / nonEmpty >=
      0.7
  );

}


function isDateColumn(
  rows,
  column
) {

  let parsed = 0;

  let nonEmpty = 0;


  rows
    .slice(0, 200)
    .forEach(
      (row) => {

        const value =
          getColumnValue(
            row,
            [column]
          );


        if (
          value === null ||
          value === undefined ||
          String(value).trim() === ""
        ) {

          return;

        }


        nonEmpty++;


        if (
          parseDate(value)
        ) {

          parsed++;

        }

      }
    );


  return (
    nonEmpty > 0 &&
    parsed / nonEmpty >=
      0.7
  );

}


/* =========================================================
   LINEAR REGRESSION
========================================================= */

function linearRegression(
  values
) {

  if (
    values.length <
    2
  ) {

    return {

      slope: 0,

      intercept:
        values[0] || 0,

    };

  }


  const n =
    values.length;


  const x =
    values.map(
      (_, index) =>
        index
    );


  const y =
    values;


  const sumX =
    x.reduce(
      (a, b) =>
        a + b,
      0
    );


  const sumY =
    y.reduce(
      (a, b) =>
        a + b,
      0
    );


  const sumXY =
    x.reduce(
      (
        total,
        xi,
        index
      ) =>
        total +
        xi *
          y[index],
      0
    );


  const sumXX =
    x.reduce(
      (
        total,
        xi
      ) =>
        total +
        xi * xi,
      0
    );


  const denominator =
    n * sumXX -
    sumX * sumX;


  if (
    denominator === 0
  ) {

    return {

      slope: 0,

      intercept:
        sumY / n,

    };

  }


  const slope =
    (
      n * sumXY -
      sumX * sumY
    ) /
    denominator;


  const intercept =
    (
      sumY -
      slope * sumX
    ) /
    n;


  return {

    slope,

    intercept,

  };

}


/* =========================================================
   R-SQUARED
========================================================= */

function calculateRSquared(
  values,
  regression
) {

  if (
    values.length <
    2
  ) {

    return 0;

  }


  const mean =
    values.reduce(
      (a, b) =>
        a + b,
      0
    ) /
    values.length;


  let ssTotal = 0;

  let ssResidual = 0;


  values.forEach(
    (value, index) => {

      const predicted =
        regression.intercept +
        regression.slope *
          index;


      ssTotal +=
        Math.pow(
          value -
            mean,
          2
        );


      ssResidual +=
        Math.pow(
          value -
            predicted,
          2
        );

    }
  );


  if (
    ssTotal === 0
  ) {

    return 1;

  }


  return Math.max(
    0,
    Math.min(
      1,
      1 -
        ssResidual /
          ssTotal
    )
  );

}


/* =========================================================
   COMPONENT
========================================================= */

function Forecast({
  data,
  settings,
}) {

  /* =======================================================
     DATASETS
  ======================================================= */

  const datasets =
    useMemo(
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
     FORECAST SETTINGS
     (read directly from the settings prop passed down by
     App.jsx — no local copy, no localStorage reads. This
     page now re-renders automatically whenever settings
     change, exactly like every other page.)
  ======================================================= */

  const configuredHorizon =
    Number(
      settings?.forecast?.horizon
    ) || 3;


  const forecastSignalsEnabled =
    settings?.insights
      ?.forecastSignals !== false;


  const currency =
    settings?.currency ||
    "INR";


  const valueDisplay =
    settings?.valueDisplay ||
    "Crores";


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
    dateColumn,
    setDateColumn,
  ] = useState("");


  const [
    metric,
    setMetric,
  ] = useState("");


  /*
   * Forecast horizon starts from the Settings page
   * configuration.
   */

  const [
    horizon,
    setHorizon,
  ] = useState(
    configuredHorizon
  );


  const [
    generated,
    setGenerated,
  ] = useState(false);


  /*
   * Keep the Forecast page synchronized with Settings
   * whenever the configured horizon changes (e.g. the
   * user updates it on the Settings page and comes back).
   */

  useEffect(
    () => {

      setHorizon(
        configuredHorizon
      );

      setGenerated(
        false
      );

    },
    [configuredHorizon]
  );


  const rows =
    datasets[source] ||
    [];


  /* =======================================================
     AVAILABLE COLUMNS
  ======================================================= */

  const columns =
    useMemo(
      () => {

        if (!rows.length) {
          return [];
        }


        const set =
          new Set();


        rows.forEach(
          (row) => {

            Object.keys(
              row || {}
            ).forEach(
              (key) => {

                if (
                  key !==
                  "__fileName"
                ) {

                  set.add(
                    key
                  );

                }

              }
            );

          }
        );


        return Array.from(
          set
        );

      },
      [rows]
    );


  const dateColumns =
    useMemo(
      () =>
        columns.filter(
          (column) =>
            isDateColumn(
              rows,
              column
            )
        ),
      [
        columns,
        rows,
      ]
    );


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


  /* =======================================================
     SMART DEFAULTS
  ======================================================= */

  useEffect(
    () => {

      if (!columns.length) {
        return;
      }


      if (
        !dateColumn ||
        !dateColumns.includes(
          dateColumn
        )
      ) {

        const preferredDate =
          dateColumns.find(
            (column) =>
              /date|month|time/i.test(
                column
              )
          ) ||
          dateColumns[0];


        if (preferredDate) {

          setDateColumn(
            preferredDate
          );

        }

      }


      if (
        !metric ||
        !numericColumns.includes(
          metric
        )
      ) {

        const preferredMetric =
          numericColumns.find(
            (column) =>
              /revenue|value|amount|sales|annual|contract|potential/i.test(
                column
              )
          ) ||
          numericColumns[0];


        if (preferredMetric) {

          setMetric(
            preferredMetric
          );

        }

      }

    },
    [
      source,
      columns.length,
      dateColumns,
      numericColumns,
    ]
  );


  /* =======================================================
     MONTHLY HISTORICAL DATA
  ======================================================= */

  const historical =
    useMemo(
      () => {

        if (
          !rows.length ||
          !dateColumn ||
          !metric
        ) {

          return [];

        }


        const groups =
          new Map();


        rows.forEach(
          (row) => {

            const date =
              parseDate(
                row?.[
                  dateColumn
                ]
              );


            const value =
              toNumber(
                getColumnValue(
                  row,
                  [metric]
                )
              );


            if (
              !date ||
              value === null
            ) {

              return;

            }


            const key =
              monthKey(
                date
              );


            if (
              !groups.has(
                key
              )
            ) {

              groups.set(
                key,
                {

                  key,

                  date:
                    new Date(
                      date.getFullYear(),
                      date.getMonth(),
                      1
                    ),

                  value: 0,

                  count: 0,

                }
              );

            }


            const group =
              groups.get(
                key
              );


            group.value +=
              value;


            group.count++;

          }
        );


        return Array.from(
          groups.values()
        )
          .sort(
            (a, b) =>
              a.date -
              b.date
          )
          .map(
            (item) => ({

              date:
                item.date,

              label:
                monthLabel(
                  item.date
                ),

              actual:
                Number(
                  item.value.toFixed(
                    2
                  )
                ),

              count:
                item.count,

            })
          );

      },
      [
        rows,
        dateColumn,
        metric,
      ]
    );


  /* =======================================================
     FORECAST
  ======================================================= */

  const forecast =
    useMemo(
      () => {

        if (
          historical.length <
          2
        ) {

          return {

            chart:
              historical.map(
                (item) => ({

                  ...item,

                  forecast:
                    null,

                })
              ),

            regression:
              null,

            forecastRows:
              [],

          };

        }


        const values =
          historical.map(
            (item) =>
              item.actual
          );


        const regression =
          linearRegression(
            values
          );


        const rSquared =
          calculateRSquared(
            values,
            regression
          );


        const last =
          historical[
            historical.length -
              1
          ];


        const forecastRows =
          [];


        for (
          let i = 1;
          i <= horizon;
          i++
        ) {

          const x =
            values.length -
            1 +
            i;


          let predicted =
            regression.intercept +
            regression.slope *
              x;


          /*
           * Sales forecast cannot be
           * negative.
           */

          predicted =
            Math.max(
              0,
              predicted
            );


          const date =
            addMonths(
              last.date,
              i
            );


          forecastRows.push({

            date,

            label:
              monthLabel(
                date
              ),

            forecast:
              Number(
                predicted.toFixed(
                  2
                )
              ),

          });

        }


        const chart = [

          ...historical.map(
            (item) => ({

              ...item,

              forecast:
                null,

            })
          ),

          ...forecastRows.map(
            (item) => ({

              ...item,

              actual:
                null,

            })
          ),

        ];


        /*
         * Connect historical and forecast.
         */

        if (
          historical.length
        ) {

          chart[
            historical.length -
              1
          ].forecast =
            last.actual;

        }


        return {

          chart,

          regression: {

            ...regression,

            rSquared,

          },

          forecastRows,

        };

      },
      [
        historical,
        horizon,
      ]
    );


  /* =======================================================
     TREND
  ======================================================= */

  const trend =
    useMemo(
      () => {

        if (
          !forecast.regression
        ) {

          return {

            direction:
              "neutral",

            label:
              "Insufficient data",

            percentage:
              0,

          };

        }


        const slope =
          forecast.regression
            .slope;


        const average =
          historical.length
            ? historical.reduce(
                (
                  total,
                  item
                ) =>
                  total +
                  item.actual,
                0
              ) /
              historical.length
            : 0;


        const percentage =
          average
            ? (
                slope /
                average
              ) *
              100
            : 0;


        if (
          percentage >
          1
        ) {

          return {

            direction:
              "up",

            label:
              "Upward trend",

            percentage,

          };

        }


        if (
          percentage <
          -1
        ) {

          return {

            direction:
              "down",

            label:
              "Downward trend",

            percentage,

          };

        }


        return {

          direction:
            "neutral",

          label:
            "Stable trend",

          percentage,

        };

      },
      [
        forecast.regression,
        historical,
      ]
    );


  /* =======================================================
     SUMMARY
  ======================================================= */

  const summary =
    useMemo(
      () => {

        if (
          !forecast.forecastRows
            ?.length
        ) {

          return {

            latest:
              null,

            future:
              null,

            change:
              null,

          };

        }


        const latest =
          historical[
            historical.length -
              1
          ]?.actual || 0;


        const future =
          forecast.forecastRows[
            forecast.forecastRows.length -
              1
          ]?.forecast || 0;


        const change =
          latest
            ? (
                (
                  future -
                  latest
                ) /
                latest
              ) *
              100
            : 0;


        return {

          latest,

          future,

          change,

        };

      },
      [
        historical,
        forecast.forecastRows,
      ]
    );


  /* =======================================================
     EXPORT
  ======================================================= */

  function exportForecast() {

    if (
      !forecast.forecastRows
        ?.length
    ) {

      return;

    }


    const exportRows =
      forecast.forecastRows.map(
        (row) => ({

          Period:
            row.label,

          Forecast:
            row.forecast,

          Currency:
            currency,

          Display:
            valueDisplay,

        })
      );


    downloadCSV(
      exportRows,
      "sales-forecast.csv"
    );

  }


  /* =======================================================
     GENERATE
  ======================================================= */

  function generateForecast() {

    if (!forecastSignalsEnabled) {

      alert(
        "Forecast Signals are disabled in Dashboard Settings."
      );

      return;

    }


    if (!dateColumn) {

      alert(
        "Please select a date column."
      );

      return;

    }


    if (!metric) {

      alert(
        "Please select a numeric metric."
      );

      return;

    }


    if (
      historical.length <
      2
    ) {

      alert(
        "At least two historical months are required to create a forecast."
      );

      return;

    }


    setGenerated(
      true
    );

  }


  /* =======================================================
     EMPTY DATA
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

            Forecast & Predictions

          </h2>

          <p className="text-sm text-slate-400 mt-2">

            Upload your workbook first
            to generate forecasts.

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

        title="Forecast & Predictions"

        subtitle="Estimate future performance from historical trends"

      />


      {/* ==================================================
          SETTINGS STATUS
      ================================================== */}

      <div className="mt-6 flex items-center justify-between gap-4 px-4 py-3 rounded-xl border border-indigo-100 bg-indigo-50">

        <div className="flex items-center gap-3">

          <div className="w-9 h-9 rounded-lg bg-white text-indigo-600 flex items-center justify-center">

            <Settings2
              size={17}
            />

          </div>


          <div>

            <p className="text-sm font-semibold text-indigo-900">

              Forecast settings applied

            </p>


            <p className="text-xs text-indigo-600 mt-0.5">

              {horizon} month horizon
              {" • "}
              {currency}
              {" • "}
              {valueDisplay}

            </p>

          </div>

        </div>


        {!forecastSignalsEnabled && (

          <span className="text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-100 px-3 py-1.5 rounded-lg">

            Forecast Signals Disabled

          </span>

        )}

      </div>


      {/* ==================================================
          FORECAST BUILDER
      ================================================== */}

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm mt-5 overflow-hidden">


        <div className="p-6 border-b border-slate-100">

          <div className="flex items-center gap-3">

            <div className="w-10 h-10 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center">

              <Target
                size={19}
              />

            </div>


            <div>

              <h2 className="font-bold text-slate-900">

                Forecast Builder

              </h2>


              <p className="text-xs text-slate-400 mt-1">

                Select the dataset, date and metric you want to forecast

              </p>

            </div>

          </div>

        </div>


        <div className="p-6">

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">


            {/* SOURCE */}

            <div>

              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">

                Data Source

              </label>


              <select

                value={
                  source
                }

                onChange={(e) => {

                  setSource(
                    e.target.value
                  );

                  setGenerated(
                    false
                  );

                  setDateColumn(
                    ""
                  );

                  setMetric(
                    ""
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


            {/* DATE */}

            <div>

              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">

                Date / Month Column

              </label>


              <select

                value={
                  dateColumn
                }

                onChange={(e) => {

                  setDateColumn(
                    e.target.value
                  );

                  setGenerated(
                    false
                  );

                }}

                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400"
              >

                <option value="">
                  Select date
                </option>


                {dateColumns.map(
                  (column) => (

                    <option
                      key={
                        column
                      }
                      value={
                        column
                      }
                    >

                      {column}

                    </option>

                  )
                )}

              </select>

            </div>


            {/* METRIC */}

            <div>

              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">

                Metric

              </label>


              <select

                value={
                  metric
                }

                onChange={(e) => {

                  setMetric(
                    e.target.value
                  );

                  setGenerated(
                    false
                  );

                }}

                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400"
              >

                <option value="">
                  Select metric
                </option>


                {numericColumns.map(
                  (column) => (

                    <option
                      key={
                        column
                      }
                      value={
                        column
                      }
                    >

                      {column}

                    </option>

                  )
                )}

              </select>

            </div>


            {/* HORIZON */}

            <div>

              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">

                Forecast Horizon

              </label>


              <select

                value={
                  horizon
                }

                onChange={(e) => {

                  setHorizon(
                    Number(
                      e.target.value
                    )
                  );

                  setGenerated(
                    false
                  );

                }}

                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400"
              >

                <option value={1}>
                  1 Month
                </option>

                <option value={3}>
                  3 Months
                </option>

                <option value={6}>
                  6 Months
                </option>

                <option value={12}>
                  12 Months
                </option>

              </select>

            </div>

          </div>


          <div className="flex justify-end mt-6">

            <button

              onClick={
                generateForecast
              }

              disabled={
                !forecastSignalsEnabled
              }

              className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold shadow-lg transition ${
                forecastSignalsEnabled
                  ? "bg-violet-600 hover:bg-violet-700 text-white shadow-violet-100"
                  : "bg-slate-200 text-slate-400 cursor-not-allowed shadow-none"
              }`}
            >

              <Sparkles
                size={17}
              />

              {forecastSignalsEnabled
                ? "Generate Forecast"
                : "Forecast Disabled"}

            </button>

          </div>

        </div>

      </div>


      {/* ==================================================
          DATA INFO
      ================================================== */}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-5">

        <div className="bg-white border border-slate-200 rounded-xl p-4">

          <p className="text-xs text-slate-400">
            Historical Months
          </p>

          <p className="text-xl font-bold text-slate-900 mt-1">

            {historical.length}

          </p>

        </div>


        <div className="bg-white border border-slate-200 rounded-xl p-4">

          <p className="text-xs text-slate-400">
            Forecast Months
          </p>

          <p className="text-xl font-bold text-slate-900 mt-1">

            {horizon}

          </p>

        </div>


        <div className="bg-white border border-slate-200 rounded-xl p-4">

          <p className="text-xs text-slate-400">
            Numeric Metrics
          </p>

          <p className="text-xl font-bold text-slate-900 mt-1">

            {numericColumns.length}

          </p>

        </div>


        <div className="bg-white border border-slate-200 rounded-xl p-4">

          <p className="text-xs text-slate-400">
            Date Columns
          </p>

          <p className="text-xl font-bold text-slate-900 mt-1">

            {dateColumns.length}

          </p>

        </div>

      </div>


      {/* ==================================================
          GENERATED FORECAST
      ================================================== */}

      {generated &&
        forecastSignalsEnabled && (

        <>


          {/* ================================================
              KPI CARDS
          ================================================ */}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-6">


            {/* LATEST */}

            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">

              <div className="flex items-center justify-between">

                <div>

                  <p className="text-xs uppercase tracking-wide font-semibold text-slate-400">

                    Latest Actual

                  </p>

                  <p className="text-2xl font-bold text-slate-900 mt-2">

                    {formatNumber(
                      summary.latest,
                      currency,
                      valueDisplay
                    )}

                  </p>

                </div>


                <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">

                  <BarChart3
                    size={20}
                  />

                </div>

              </div>

            </div>


            {/* FORECAST */}

            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">

              <div className="flex items-center justify-between">

                <div>

                  <p className="text-xs uppercase tracking-wide font-semibold text-slate-400">

                    Final Forecast

                  </p>

                  <p className="text-2xl font-bold text-slate-900 mt-2">

                    {formatNumber(
                      summary.future,
                      currency,
                      valueDisplay
                    )}

                  </p>

                </div>


                <div className="w-11 h-11 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center">

                  <Target
                    size={20}
                  />

                </div>

              </div>

            </div>


            {/* CHANGE */}

            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">

              <div className="flex items-center justify-between">

                <div>

                  <p className="text-xs uppercase tracking-wide font-semibold text-slate-400">

                    Projected Change

                  </p>


                  <p className="text-2xl font-bold text-slate-900 mt-2">

                    {summary.change >=
                    0
                      ? "+"
                      : ""}

                    {summary.change?.toFixed(
                      1
                    )}

                    %

                  </p>

                </div>


                <div
                  className={`
                    w-11
                    h-11
                    rounded-xl
                    flex
                    items-center
                    justify-center
                    ${
                      summary.change >
                      0
                        ? "bg-emerald-50 text-emerald-600"
                        : summary.change <
                          0
                        ? "bg-rose-50 text-rose-600"
                        : "bg-slate-100 text-slate-500"
                    }
                  `}
                >

                  {summary.change >
                  0 ? (

                    <TrendingUp
                      size={20}
                    />

                  ) : summary.change <
                    0 ? (

                    <TrendingDown
                      size={20}
                    />

                  ) : (

                    <Minus
                      size={20}
                    />

                  )}

                </div>

              </div>

            </div>

          </div>


          {/* ================================================
              TREND BANNER
          ================================================ */}

          <div className="mt-5">

            <div
              className={`
                rounded-2xl
                border
                p-5
                flex
                items-center
                justify-between
                ${
                  trend.direction ===
                  "up"
                    ? "bg-emerald-50 border-emerald-100"
                    : trend.direction ===
                      "down"
                    ? "bg-rose-50 border-rose-100"
                    : "bg-slate-50 border-slate-200"
                }
              `}
            >

              <div className="flex items-center gap-4">

                <div
                  className={`
                    w-11
                    h-11
                    rounded-xl
                    flex
                    items-center
                    justify-center
                    ${
                      trend.direction ===
                      "up"
                        ? "bg-emerald-100 text-emerald-600"
                        : trend.direction ===
                          "down"
                        ? "bg-rose-100 text-rose-600"
                        : "bg-slate-100 text-slate-500"
                    }
                  `}
                >

                  {trend.direction ===
                  "up" ? (

                    <TrendingUp
                      size={21}
                    />

                  ) : trend.direction ===
                    "down" ? (

                    <TrendingDown
                      size={21}
                    />

                  ) : (

                    <Minus
                      size={21}
                    />

                  )}

                </div>


                <div>

                  <p className="font-bold text-slate-900">

                    {trend.label}

                  </p>


                  <p className="text-xs text-slate-500 mt-1">

                    Estimated monthly trend:

                    {" "}

                    {trend.percentage >=
                    0
                      ? "+"
                      : ""}

                    {trend.percentage.toFixed(
                      2
                    )}

                    %

                  </p>

                </div>

              </div>


              <div className="text-right">

                <p className="text-xs text-slate-400">

                  Model fit

                </p>


                <p className="font-bold text-slate-700 mt-1">

                  {(
                    (
                      forecast
                        .regression
                        ?.rSquared ||
                      0
                    ) *
                    100
                  ).toFixed(
                    1
                  )}

                  %

                </p>

              </div>

            </div>

          </div>


          {/* ================================================
              CHART
          ================================================ */}

          <div className="mt-6">

            <ChartCard

              title={`${metric} Forecast`}

              subtitle={`Historical performance and ${horizon}-month projection`}

              action={

                <button

                  onClick={
                    exportForecast
                  }

                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-600"
                >

                  <Download
                    size={14}
                  />

                  Export

                </button>

              }

            >

              <div className="h-[480px]">

                <ResponsiveContainer
                  width="100%"
                  height="100%"
                >

                  <AreaChart
                    data={
                      forecast.chart
                    }
                  >

                    <defs>

                      <linearGradient
                        id="forecastActual"
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
                        formatNumber(
                          value,
                          currency,
                          valueDisplay
                        )
                      }
                    />


                    <Tooltip
                      formatter={(value) =>
                        formatNumber(
                          value,
                          currency,
                          valueDisplay
                        )
                      }
                    />


                    <Legend />


                    <Area
                      type="monotone"
                      dataKey="actual"
                      name="Historical"
                      stroke="#6366f1"
                      strokeWidth={3}
                      fill="url(#forecastActual)"
                    />


                    <Line
                      type="monotone"
                      dataKey="forecast"
                      name="Forecast"
                      stroke="#8b5cf6"
                      strokeWidth={3}
                      strokeDasharray="6 6"
                      dot={{
                        r: 4,
                      }}
                    />

                  </AreaChart>

                </ResponsiveContainer>

              </div>

            </ChartCard>

          </div>


          {/* ================================================
              FORECAST TABLE
          ================================================ */}

          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm mt-5 overflow-hidden">

            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">

              <div>

                <h3 className="font-bold text-slate-900">

                  Forecast Schedule

                </h3>


                <p className="text-xs text-slate-400 mt-1">

                  Projected values for upcoming periods

                </p>

              </div>


              <button

                onClick={
                  exportForecast
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

                    <th className="text-left px-6 py-3 text-xs uppercase tracking-wide font-semibold text-slate-500">

                      Period

                    </th>


                    <th className="text-right px-6 py-3 text-xs uppercase tracking-wide font-semibold text-slate-500">

                      Forecast

                    </th>

                  </tr>

                </thead>


                <tbody>

                  {forecast.forecastRows.map(
                    (
                      row
                    ) => (

                      <tr
                        key={
                          row.label
                        }
                        className="border-t border-slate-100"
                      >

                        <td className="px-6 py-3 text-slate-700">

                          {row.label}

                        </td>


                        <td className="px-6 py-3 text-right font-bold text-slate-900">

                          {formatNumber(
                            row.forecast,
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

          </div>

        </>

      )}


      {/* ==================================================
          EMPTY FORECAST STATE
      ================================================== */}

      {!generated && (

        <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-14 text-center mt-6">

          <CalendarDays
            size={42}
            className="mx-auto text-violet-400"
          />


          <h3 className="font-bold text-slate-800 mt-5">

            Your forecast will appear here

          </h3>


          <p className="text-sm text-slate-400 mt-2 max-w-lg mx-auto">

            Choose a data source, date column,
            numeric metric and forecast horizon,
            then generate the prediction.

          </p>

        </div>

      )}

    </div>

  );

}


export default Forecast;