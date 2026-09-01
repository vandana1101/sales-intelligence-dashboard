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
} from "recharts";

import KPI from "../components/dashboard/KPI";
import ChartCard from "../components/dashboard/ChartCard";
import SectionHeader from "../components/dashboard/SectionHeader";


/* =========================================================
   HELPERS
========================================================= */

function text(value) {
  return value === null || value === undefined
    ? ""
    : String(value).trim();
}


function num(value) {

  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return 0;
  }

  if (typeof value === "number") {
    return Number.isFinite(value)
      ? value
      : 0;
  }

  const cleaned =
    String(value)
      .replace(/[₹,%\s,]/g, "");

  const n = Number(cleaned);

  return Number.isFinite(n)
    ? n
    : 0;
}


function dateValue(value) {

  if (!value) {
    return null;
  }

  if (
    value instanceof Date &&
    !Number.isNaN(value.getTime())
  ) {
    return value;
  }

  if (typeof value === "number") {

    const date =
      new Date(
        Date.UTC(
          1899,
          11,
          30
        ) +
        value *
        86400000
      );

    return Number.isNaN(
      date.getTime()
    )
      ? null
      : date;
  }

  const date =
    new Date(value);

  return Number.isNaN(
    date.getTime()
  )
    ? null
    : date;
}


function yearOf(value) {

  const date =
    dateValue(value);

  return date
    ? date.getFullYear()
    : null;
}


/* =========================================================
   VALUE CALCULATION
========================================================= */

function getValue(row) {

  const valuesCr =
    num(
      row?.["Values in Cr"]
    );

  if (valuesCr) {
    return valuesCr;
  }


  const annual =
    num(
      row?.[
        "Value of Contract Per Annum INR"
      ]
    );

  if (annual) {
    return annual / 10000000;
  }


  const monthly =
    num(
      row?.[
        "Revenue potential per month (in INR)"
      ]
    );

  if (monthly) {
    return (
      monthly * 12
    ) / 10000000;
  }


  return 0;
}


/* =========================================================
   FIRST AVAILABLE VALUE
========================================================= */

function first(
  row,
  keys,
  fallback = "Unknown"
) {

  for (
    const key of keys
  ) {

    const value =
      text(
        row?.[key]
      );

    if (value) {
      return value;
    }
  }

  return fallback;
}


/* =========================================================
   FORMATTERS
========================================================= */

function formatCr(value) {

  const n =
    num(value);

  if (
    Math.abs(n) >= 100
  ) {
    return `₹${n.toFixed(1)} Cr`;
  }

  if (
    Math.abs(n) >= 10
  ) {
    return `₹${n.toFixed(2)} Cr`;
  }

  return `₹${n.toFixed(2)} Cr`;
}


function formatPct(value) {

  return `${(
    num(value) * 100
  ).toFixed(1)}%`;
}


function formatInt(value) {

  return Math.round(
    num(value)
  ).toLocaleString(
    "en-IN"
  );
}


/* =========================================================
   UNIQUE OPTIONS
========================================================= */

function unique(
  rows,
  getter
) {

  return [
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
}


/* =========================================================
   AGGREGATION
========================================================= */

function aggregate(
  rows,
  getter
) {

  const map =
    new Map();

  rows.forEach(
    (row) => {

      const key =
        getter(row) ||
        "Unknown";


      if (
        !map.has(key)
      ) {

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

    }
  );


  return [
    ...map.values(),
  ];
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
        (item, index) => {

          const name =
            String(
              item.name || ""
            ).toLowerCase();


          const isValue =
            name.includes(
              "value"
            );


          return (

            <div
              key={index}
              className="
                text-sm
                font-semibold
                text-slate-800
              "
            >

              {item.name}:{" "}

              {isValue
                ? formatCr(
                    item.value
                  )
                : formatInt(
                    item.value
                  )}

            </div>

          );

        }
      )}

    </div>

  );
}


/* =========================================================
   CSV DOWNLOAD
========================================================= */

function downloadCSV(
  rows,
  filename
) {

  if (
    !rows.length
  ) {
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


  const anchor =
    document.createElement(
      "a"
    );

  anchor.href = url;

  anchor.download =
    filename;

  anchor.click();

  URL.revokeObjectURL(
    url
  );
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

  if (
    value === null ||
    value === undefined
  ) {
    return null;
  }


  return (

    <text
      x={
        x +
        width / 2
      }
      y={
        y - 8
      }
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
    value === null ||
    value === undefined
  ) {
    return null;
  }


  return (

    <text
      x={
        x +
        width / 2
      }
      y={
        y - 8
      }
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
   WON ANALYSIS
========================================================= */

export default function WonAnalysis({
  data,
  settings = {},
}) {


  /* =======================================================
     SOURCE DATA
  ======================================================= */

  const rows =
    useMemo(
      () => {

        const source =
          Array.isArray(
            data?.opportunities
          )
            ? data.opportunities
            : [];


        /*
         * IMPORTANT:
         *
         * Won Analysis is generated from
         * the Opportunity dataset.
         *
         * The Excel "Won Analysis" sheet
         * is NOT used as the source of
         * dashboard calculations.
         */

        return source.filter(
          (row) => {

            const outcome =
              text(
                row?.[
                  "Outcome bucket"
                ]
              ).toLowerCase();


            return (
              outcome === "won"
            );

          }
        );

      },
      [
        data,
      ]
    );


  /* =======================================================
     FILTER STATE
  ======================================================= */

  const [
    search,
    setSearch,
  ] = useState("");


  const [
    year,
    setYear,
  ] = useState("All");


  const [
    owner,
    setOwner,
  ] = useState("All");


  const [
    region,
    setRegion,
  ] = useState("All");


  const [
    pcsVertical,
    setPcsVertical,
  ] = useState("All");


  const [
    industry,
    setIndustry,
  ] = useState("All");


  const [
    dealSize,
    setDealSize,
  ] = useState("All");


  const [
    winReason,
    setWinReason,
  ] = useState("All");


  const [
    service,
    setService,
  ] = useState("All");


  /* =======================================================
     FIELD GETTERS
  ======================================================= */

  const getOwner =
    (row) =>
      first(
        row,
        [
          "Assigned To",
          "Salesforce User Name",
          "Sales Owner",
        ]
      );


  const getRegion =
    (row) =>
      first(
        row,
        [
          "PCS User Region",
          "Customer Service required region",
        ]
      );


  const getPCSVertical =
    (row) =>
      first(
        row,
        [
          "PCS Vertical",
        ]
      );


  const getIndustry =
    (row) =>
      first(
        row,
        [
          "Industry",
        ]
      );


  const getDealSize =
    (row) =>
      first(
        row,
        [
          "Deal Size Bucket",
        ]
      );


  const getReason =
    (row) =>
      first(
        row,
        [
          "Reason for Changing Incumbent",
          "Reason for changing incumbent",
        ]
      );


  const getService =
    (row) =>
      first(
        row,
        [
          "Capability Required",
          "Capability required",
          "Services Required",
        ]
      );


  const getWonYear =
    (row) => {

      const stored =
        num(
          row?.[
            "Won Year"
          ]
        );


      if (stored) {
        return String(
          stored
        );
      }


      return String(
        yearOf(
          row?.[
            "Date won"
          ]
        ) ||
        yearOf(
          row?.[
            "Onboarded date"
          ]
        ) ||
        "Unknown"
      );

    };


  /* =======================================================
     FILTER OPTIONS
  ======================================================= */

  const options =
    useMemo(
      () => ({

        years:
          unique(
            rows,
            getWonYear
          ),

        owners:
          unique(
            rows,
            getOwner
          ),

        regions:
          unique(
            rows,
            getRegion
          ),

        pcsVerticals:
          unique(
            rows,
            getPCSVertical
          ),

        industries:
          unique(
            rows,
            getIndustry
          ),

        dealSizes:
          unique(
            rows,
            getDealSize
          ),

        reasons:
          unique(
            rows,
            getReason
          ),

        services:
          unique(
            rows,
            getService
          ),

      }),
      [
        rows,
      ]
    );


  /* =======================================================
     FILTERED DATA
  ======================================================= */

  const filtered =
    useMemo(
      () => {

        const query =
          search
            .toLowerCase()
            .trim();


        return rows.filter(
          (row) => {

            const searchable = [

              row?.[
                "Opportunity Name"
              ],

              row?.[
                "Customer name"
              ],

              getOwner(row),

              getPCSVertical(row),

              getIndustry(row),

              getReason(row),

              getService(row),

            ]
              .map(text)
              .join(" ")
              .toLowerCase();


            return (

              (
                !query ||
                searchable.includes(
                  query
                )
              )

              &&

              (
                year === "All" ||
                getWonYear(row) === year
              )

              &&

              (
                owner === "All" ||
                getOwner(row) === owner
              )

              &&

              (
                region === "All" ||
                getRegion(row) === region
              )

              &&

              (
                pcsVertical === "All" ||
                getPCSVertical(row) === pcsVertical
              )

              &&

              (
                industry === "All" ||
                getIndustry(row) === industry
              )

              &&

              (
                dealSize === "All" ||
                getDealSize(row) === dealSize
              )

              &&

              (
                winReason === "All" ||
                getReason(row) === winReason
              )

              &&

              (
                service === "All" ||
                getService(row) === service
              )

            );

          }
        );

      },
      [
        rows,
        search,
        year,
        owner,
        region,
        pcsVertical,
        industry,
        dealSize,
        winReason,
        service,
      ]
    );


  /* =======================================================
     KPI METRICS
  ======================================================= */

  const metrics =
    useMemo(
      () => {

        const values =
          filtered
            .map(getValue)
            .sort(
              (a, b) =>
                a - b
            );


        const total =
          values.reduce(
            (sum, value) =>
              sum + value,
            0
          );


        const average =
          filtered.length
            ? total /
              filtered.length
            : 0;


        const highest =
          values[
            values.length - 1
          ] || 0;


        const median =
          values.length
            ? values.length % 2
              ? values[
                  (values.length - 1) /
                    2
                ]
              : (
                  values[
                    values.length / 2 - 1
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
              b.count -
              a.count
          );


        const topReason =
          reasons[0]?.name ||
          "—";


        const topReasonShare =
          filtered.length
            ? (
                reasons[0]?.count ||
                0
              ) /
              filtered.length
            : 0;


        return {

          count:
            filtered.length,

          total,

          average,

          highest,

          median,

          topReason,

          topReasonShare,

          years:
            new Set(
              filtered.map(
                getWonYear
              )
            ).size,

        };

      },
      [
        filtered,
      ]
    );


  /* =======================================================
     CHART DATA
  ======================================================= */

  const reasonData =
    useMemo(
      () =>
        aggregate(
          filtered,
          getReason
        ).sort(
          (a, b) =>
            b.value -
            a.value
        ),
      [
        filtered,
      ]
    );


  const pcsVerticalData =
    useMemo(
      () =>
        aggregate(
          filtered,
          getPCSVertical
        ).sort(
          (a, b) =>
            b.value -
            a.value
        ),
      [
        filtered,
      ]
    );


  const industryData =
    useMemo(
      () =>
        aggregate(
          filtered,
          getIndustry
        ).sort(
          (a, b) =>
            b.value -
            a.value
        ),
      [
        filtered,
      ]
    );


  const regionData =
    useMemo(
      () =>
        aggregate(
          filtered,
          getRegion
        ).sort(
          (a, b) =>
            b.value -
            a.value
        ),
      [
        filtered,
      ]
    );


  const dealData =
    useMemo(
      () =>
        aggregate(
          filtered,
          getDealSize
        ).sort(
          (a, b) =>
            b.value -
            a.value
        ),
      [
        filtered,
      ]
    );


  const serviceData =
    useMemo(
      () =>
        aggregate(
          filtered,
          getService
        ).sort(
          (a, b) =>
            b.value -
            a.value
        ),
      [
        filtered,
      ]
    );


  /* =======================================================
     YEARLY DATA
  ======================================================= */

  const yearly =
    useMemo(
      () => {

        const map =
          new Map();


        filtered.forEach(
          (row) => {

            const currentYear =
              getWonYear(row);


            if (
              !map.has(
                currentYear
              )
            ) {

              map.set(
                currentYear,
                {
                  year:
                    currentYear,
                  count: 0,
                  value: 0,
                }
              );

            }


            const item =
              map.get(
                currentYear
              );


            item.count += 1;

            item.value +=
              getValue(row);

          }
        );


        const result =
          [
            ...map.values(),
          ]
            .filter(
              (item) =>
                item.year !==
                "Unknown"
            )
            .sort(
              (a, b) =>
                Number(a.year) -
                Number(b.year)
            );


        return result.map(
          (item, index) => ({

            ...item,

            countGrowth:
              index
                ? (
                    item.count -
                    result[
                      index - 1
                    ].count
                  ) /
                  (
                    result[
                      index - 1
                    ].count || 1
                  )
                : null,

            valueGrowth:
              index
                ? (
                    item.value -
                    result[
                      index - 1
                    ].value
                  ) /
                  (
                    result[
                      index - 1
                    ].value || 1
                  )
                : null,

          })
        );

      },
      [
        filtered,
      ]
    );


  /* =======================================================
     REASON BY YEAR
  ======================================================= */

  const reasonByYear =
    useMemo(
      () => {

        const years =
          [
            ...new Set(
              filtered
                .map(
                  getWonYear
                )
                .filter(
                  (value) =>
                    value !==
                    "Unknown"
                )
            ),
          ].sort(
            (a, b) =>
              Number(a) -
              Number(b)
          );


        const reasons =
          [
            ...new Set(
              filtered.map(
                getReason
              )
            ),
          ];


        return years.map(
          (currentYear) => {

            const row = {
              year:
                currentYear,
            };


            reasons
              .slice(0, 10)
              .forEach(
                (reason) => {

                  row[reason] =
                    filtered.filter(
                      (item) =>
                        getWonYear(
                          item
                        ) ===
                          currentYear &&
                        getReason(
                          item
                        ) ===
                          reason
                    ).length;

                }
              );


            return row;

          }
        );

      },
      [
        filtered,
      ]
    );


  /* =======================================================
     FILTER CONTROLS
  ======================================================= */

  const clearFilters =
    () => {

      setSearch("");

      setYear("All");

      setOwner("All");

      setRegion("All");

      setPcsVertical("All");

      setIndustry("All");

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
      industry,
      dealSize,
      winReason,
      service,
    ].filter(
      (value) =>
        value !== "All"
    ).length ||
    Boolean(search);


  function Select({
    value,
    setValue,
    values,
    label,
  }) {

    return (

      <select
        value={value}
        onChange={(event) =>
          setValue(
            event.target.value
          )
        }
        className="
          w-full
          rounded-xl
          border
          border-slate-200
          bg-white
          px-3
          py-2.5
          text-sm
          font-medium
          text-slate-700
          outline-none
          focus:border-indigo-400
        "
      >

        <option value="All">
          All {label}
        </option>


        {values.map(
          (value) => (

            <option
              key={value}
              value={value}
            >
              {value}
            </option>

          )
        )}

      </select>

    );
  }


  /* =========================================================
     PAGE
  ========================================================= */

  return (

    <div
      className="
        space-y-7
        pb-10
        px-6
        pt-6
      "
    >

      <SectionHeader
        title="Won Analysis"
        subtitle="
          Deep analysis of closed-won opportunities,
          value contribution and win drivers
        "
      />


      {/* =====================================================
          FILTERS
      ===================================================== */}

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

          <div
            className="
              relative
              md:col-span-2
              xl:col-span-1
            "
          >

            <Search
              size={16}
              className="
                absolute
                left-3
                top-3.5
                text-slate-400
              "
            />

            <input
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value
                )
              }
              placeholder="
                Search opportunity, customer, owner...
              "
              className="
                w-full
                rounded-xl
                border
                border-slate-200
                bg-white
                py-2.5
                pl-9
                pr-3
                text-sm
                outline-none
                focus:border-indigo-400
              "
            />

          </div>


          <Select
            value={year}
            setValue={setYear}
            values={options.years}
            label="Won Years"
          />


          <Select
            value={owner}
            setValue={setOwner}
            values={options.owners}
            label="Owners"
          />


          <Select
            value={region}
            setValue={setRegion}
            values={options.regions}
            label="Regions"
          />


          <Select
            value={pcsVertical}
            setValue={setPcsVertical}
            values={
              options.pcsVerticals
            }
            label="PCS Verticals"
          />


          <Select
            value={industry}
            setValue={setIndustry}
            values={
              options.industries
            }
            label="Industries"
          />


          <Select
            value={dealSize}
            setValue={setDealSize}
            values={
              options.dealSizes
            }
            label="Deal Sizes"
          />


          <Select
            value={winReason}
            setValue={setWinReason}
            values={
              options.reasons
            }
            label="Win Reasons"
          />


          <Select
            value={service}
            setValue={setService}
            values={
              options.services
            }
            label="Services"
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
            won deals
          </span>


          {activeFilters ? (

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

          ) : null}

        </div>

      </div>


      {/* =====================================================
          KPIs
      ===================================================== */}

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
          value={
            formatInt(
              metrics.count
            )
          }
          icon={Trophy}
        />


        <KPI
          title="Total Value Won"
          value={
            formatCr(
              metrics.total
            )
          }
          icon={IndianRupee}
        />


        <KPI
          title="Avg Won Deal Size"
          value={
            formatCr(
              metrics.average
            )
          }
          icon={Target}
        />


        <KPI
          title="Highest Value Won"
          value={
            formatCr(
              metrics.highest
            )
          }
          icon={TrendingUp}
        />


        <KPI
          title="Median Deal Size"
          value={
            formatCr(
              metrics.median
            )
          }
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
          value={
            formatPct(
              metrics.topReasonShare
            )
          }
          icon={Users}
        />


        <KPI
          title="Won Years Covered"
          value={
            formatInt(
              metrics.years
            )
          }
          icon={CalendarDays}
        />

      </div>


      {/* =====================================================
          WIN DRIVERS
      ===================================================== */}

      <SectionHeader
        title="Win Drivers"
        subtitle="
          Why customers changed providers
          and where won value is concentrated
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

        {/* ---------------------------------------------------
            WIN REASON
        --------------------------------------------------- */}

        <ChartCard
          title="Incumbent Change Reason"
          subtitle="
            Won deal count and value by reason
          "
        >

          <div
            className="h-[430px]"
          >

            <ResponsiveContainer
              width="100%"
              height="100%"
            >

              <BarChart
                data={
                  reasonData
                }
                layout="vertical"
                margin={{
                  top: 20,
                  right: 65,
                  left: 120,
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
                  width={115}
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
                    0,
                    6,
                    6,
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


        {/* ---------------------------------------------------
            PCS VERTICAL
        --------------------------------------------------- */}

        <ChartCard
          title="Win by PCS Vertical"
          subtitle="
            Won deals and won value by PCS Vertical
          "
        >

          <div
            className="h-[430px]"
          >

            <ResponsiveContainer
              width="100%"
              height="100%"
            >

              <BarChart
                data={
                  pcsVerticalData
                }
                margin={{
                  top: 30,
                  right: 35,
                  left: 10,
                  bottom: 70,
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


      {/* =====================================================
          YEARLY ANALYSIS
      ===================================================== */}

      <SectionHeader
        title="YOY Win Trend & Contribution"
        subtitle="
          Annual won count, value, growth and
          contribution to the filtered portfolio
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

        <ChartCard
          title="YOY Won Trend"
          subtitle="
            Won deals and value by year
          "
        >

          <div
            className="h-[390px]"
          >

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


        <ChartCard
          title="Contribution by Year"
          subtitle="
            Share of won deals and won value
          "
        >

          <div
            className="h-[390px]"
          >

            <ResponsiveContainer
              width="100%"
              height="100%"
            >

              <BarChart
                data={
                  yearly.map(
                    (item) => ({

                      ...item,

                      countShare:
                        metrics.count
                          ? (
                              item.count /
                              metrics.count
                            ) *
                            100
                          : 0,

                      valueShare:
                        metrics.total
                          ? (
                              item.value /
                              metrics.total
                            ) *
                            100
                          : 0,

                    })
                  )
                }
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
                  formatter={(value) =>
                    `${Number(
                      value
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


      {/* =====================================================
          REASON TREND
      ===================================================== */}

      <ChartCard
        title="Year-wise Win Reason Trend"
        subtitle="
          Won deal count by incumbent-change
          reason and year
        "
      >

        <div
          className="h-[450px]"
        >

          <ResponsiveContainer
            width="100%"
            height="100%"
          >

            <BarChart
              data={
                reasonByYear
              }
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
                .slice(0, 10)
                .map(
                  (
                    reason,
                    index
                  ) => (

                    <Bar
                      key={reason}
                      dataKey={reason}
                      name={reason}
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
                          index % 10
                        ]
                      }
                    />

                  )
                )}

            </BarChart>

          </ResponsiveContainer>

        </div>

      </ChartCard>


      {/* =====================================================
          PORTFOLIO MIX
      ===================================================== */}

      <SectionHeader
        title="Won Portfolio Mix"
        subtitle="
          Regional, industry, deal-size and
          service-level contribution
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

        <ChartCard
          title="Win by Region"
          subtitle="
            Won count and value by region
          "
        >

          <div
            className="h-[400px]"
          >

            <ResponsiveContainer
              width="100%"
              height="100%"
            >

              <BarChart
                data={
                  regionData
                }
                margin={{
                  top: 30,
                  right: 30,
                  left: 10,
                  bottom: 35,
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


        <ChartCard
          title="Win by Deal Size"
          subtitle="
            Won deals and value by deal-size bucket
          "
        >

          <div
            className="h-[400px]"
          >

            <ResponsiveContainer
              width="100%"
              height="100%"
            >

              <BarChart
                data={
                  dealData
                }
                margin={{
                  top: 30,
                  right: 30,
                  left: 10,
                  bottom: 35,
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

      </div>


      {/* =====================================================
          INDUSTRY
      ===================================================== */}

      <ChartCard
        title="Win by Industry"
        subtitle="
          Won deals and won value by industry
        "
      >

        <div
          className="h-[420px]"
        >

          <ResponsiveContainer
            width="100%"
            height="100%"
          >

            <BarChart
              data={
                industryData
              }
              margin={{
                top: 30,
                right: 30,
                left: 10,
                bottom: 70,
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


      {/* =====================================================
          SERVICES
      ===================================================== */}

      <ChartCard
        title="Win by Services Required"
        subtitle="
          Capability/service mix among won opportunities
        "
      >

        <div
          className="h-[450px]"
        >

          <ResponsiveContainer
            width="100%"
            height="100%"
          >

            <BarChart
              data={
                serviceData
              }
              layout="vertical"
              margin={{
                top: 20,
                right: 70,
                left: 145,
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
                width={140}
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
                    <CountLabel />
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
                    <ValueLabel />
                  }
                />

              </Bar>

            </BarChart>

          </ResponsiveContainer>

        </div>

      </ChartCard>


      {/* =====================================================
          REGISTER
      ===================================================== */}

      <ChartCard
        title="Won Opportunities Register"
        subtitle={`
          Showing ${formatInt(
            filtered.length
          )} filtered won opportunities
        `}
        action={

          <button
            onClick={() =>
              downloadCSV(
                filtered,
                "won-opportunities.csv"
              )
            }
            className="
              flex
              items-center
              gap-2
              rounded-lg
              bg-slate-100
              px-3
              py-2
              text-xs
              font-semibold
              text-slate-600
              hover:bg-slate-200
            "
          >

            <Download
              size={14}
            />

            Download Table

          </button>

        }
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
              min-w-[1150px]
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
                  "Win Year",
                  "Win Reason",
                  "Deal Size",
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
                      {text(
                        row?.[
                          "Opportunity Name"
                        ]
                      ) ||
                        "—"}
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
                      ) ||
                        "—"}
                    </td>


                    <td
                      className="
                        px-4
                        py-3
                        text-slate-600
                      "
                    >
                      {getOwner(
                        row
                      )}
                    </td>


                    <td
                      className="
                        px-4
                        py-3
                        font-medium
                        text-slate-700
                      "
                    >
                      {getPCSVertical(
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
                      {getIndustry(
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
                      {getRegion(
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
                      {getWonYear(
                        row
                      )}
                    </td>


                    <td
                      className="
                        max-w-[240px]
                        px-4
                        py-3
                        text-slate-600
                      "
                    >
                      {getReason(
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
                      {getDealSize(
                        row
                      )}
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