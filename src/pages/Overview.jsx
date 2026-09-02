import {
  BriefcaseBusiness,
  Trophy,
  Users,
  Activity,
  IndianRupee,
  AlertTriangle,
} from "lucide-react";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
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

  const cleaned =
    String(value)
      .replace(/₹/g, "")
      .replace(/,/g, "")
      .replace(/%/g, "")
      .trim();

  const result = Number(cleaned);

  return Number.isFinite(result)
    ? result
    : 0;
}


/* =========================================================
   HEADER NORMALIZATION
========================================================= */

function normalizeHeader(value) {
  return String(value ?? "")
    .replace(/^\uFEFF/, "")
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
}

/*
 * PERFORMANCE:
 * Build a normalized column map once per row instead of scanning
 * Object.entries(row) + normalizing every header on every calculation.
 *
 * WeakMap keeps the cache attached to the row object without changing
 * the shape of the user's data or appearing in CSV exports.
 */
const overviewRowColumnCache = new WeakMap();

function getNormalizedRowColumns(row) {
  if (!row || typeof row !== "object") return new Map();

  const cached = overviewRowColumnCache.get(row);
  if (cached) return cached;

  const columns = new Map();

  Object.keys(row).forEach((key) => {
    columns.set(normalizeHeader(key), key);
  });

  overviewRowColumnCache.set(row, columns);
  return columns;
}


/* =========================================================
   FLEXIBLE COLUMN LOOKUP
========================================================= */

function getColumnValue(
  row,
  possibleNames
) {
  if (!row || typeof row !== "object") {
    return undefined;
  }

  const columns = getNormalizedRowColumns(row);

  for (const possibleName of possibleNames) {
    const actualKey = columns.get(
      normalizeHeader(possibleName)
    );

    if (actualKey !== undefined) {
      return row[actualKey];
    }
  }

  return undefined;
}


/* =========================================================
   OPPORTUNITY VALUE
========================================================= */

const overviewOpportunityValueCache = new WeakMap();

function getOpportunityValue(row) {
  if (!row || typeof row !== "object") return 0;

  const cached = overviewOpportunityValueCache.get(row);
  if (cached !== undefined) return cached;

  /*
   * Preferred:
   * Value of Contract Per Annum INR
   */

  const annual =
    number(
      getColumnValue(
        row,
        [
          "Value of Contract Per Annum INR",
          "Value of Contract Per Annum",
          "Annual Contract Value",
        ]
      )
    );


  if (annual > 0) {
    overviewOpportunityValueCache.set(row, annual);
    return annual;
  }


  /*
   * Fallback:
   * Revenue potential per month × 12
   */

  const monthly =
    number(
      getColumnValue(
        row,
        [
          "Revenue potential per month (in INR)",
          "Revenue Potential Per Month (in INR)",
          "Revenue Potential Per Month",
          "Monthly Revenue Potential",
        ]
      )
    );


  const result = monthly * 12;
  overviewOpportunityValueCache.set(row, result);
  return result;

}


/* =========================================================
   SETTINGS-AWARE DISPLAY HELPERS
========================================================= */

function getCurrencySymbol(
  currency = "INR"
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


function formatValue(
  value,
  settings = {}
) {

  const currency =
    settings?.currency ||
    "INR";

  const display =
    settings?.valueDisplay ||
    "Crores";

  const symbol =
    getCurrencySymbol(currency);

  const amount =
    number(value);


  if (display === "Raw") {

    return `${symbol}${amount.toLocaleString(
      "en-IN",
      {
        maximumFractionDigits: 0,
      }
    )}`;

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


function getValueAxisFormatter(
  settings = {}
) {

  const currency =
    settings?.currency ||
    "INR";

  const display =
    settings?.valueDisplay ||
    "Crores";

  const symbol =
    getCurrencySymbol(currency);


  return (value) => {

    const amount =
      number(value);


    if (display === "Raw") {

      return `${symbol}${(
        amount / 1000000
      ).toFixed(1)}M`;

    }


    if (display === "Lakhs") {

      return `${symbol}${(
        amount / 100000
      ).toFixed(1)}L`;

    }


    return `${symbol}${(
      amount / 10000000
    ).toFixed(1)}Cr`;

  };

}


/* =========================================================
   MONTH HELPERS
========================================================= */

/*
 * Get the actual Opportunity Created Date.
 *
 * IMPORTANT:
 * We intentionally do NOT use Opportunity Month (G)
 * for monthly aggregation.
 *
 * The source date is the authoritative field.
 */

function getOpportunityCreatedDate(row) {
  return getColumnValue(
    row,
    [
      "Opportunity Created Date",
      "Opportunity Created",
      "Created Date",
      "CreatedDate",
    ]
  );
}


/*
 * Convert a date value into:
 *
 * YYYY-MM
 *
 * Examples:
 * 15/02/2023 -> 2023-02
 * 15-02-2023 -> 2023-02
 * 2023-02-15 -> 2023-02
 */

function getMonthLabel(value) {

  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "Unknown";
  }

  const raw =
    String(value).trim();


  if (!raw) {
    return "Unknown";
  }


  /*
   * Already-normalized date:
   *
   * 2023-02-15
   * 2023-02-15 10:30:00
   */

  const normalizedMatch =
    raw.match(
      /^(\d{4})-(\d{1,2})-(\d{1,2})/
    );


  if (normalizedMatch) {

    const year =
      Number(normalizedMatch[1]);

    const month =
      Number(normalizedMatch[2]);


    if (
      Number.isFinite(year) &&
      month >= 1 &&
      month <= 12
    ) {

      return `${year}-${String(
        month
      ).padStart(2, "0")}`;

    }

  }


  /*
   * DD/MM/YYYY
   * DD-MM-YYYY
   */

  const dmyMatch =
    raw.match(
      /^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})/
    );


  if (dmyMatch) {

    const month =
      Number(dmyMatch[2]);

    const year =
      Number(dmyMatch[3]);


    if (
      month >= 1 &&
      month <= 12 &&
      Number.isFinite(year)
    ) {

      return `${year}-${String(
        month
      ).padStart(2, "0")}`;

    }

  }


  /*
   * Final fallback for values that JavaScript
   * can parse as a valid date.
   */

  const parsed =
    new Date(raw);


  if (
    !Number.isNaN(
      parsed.getTime()
    )
  ) {

    return `${parsed.getFullYear()}-${String(
      parsed.getMonth() + 1
    ).padStart(2, "0")}`;

  }


  return "Unknown";
}


/* =========================================================
   MAIN COMPONENT
========================================================= */

function Overview({
  data,
  settings,
}) {

  /*
   * Opportunities.jsx uses currentOpportunities.
   *
   * Keep the same source here so Overview reflects the
   * same processed dataset regardless of whether the
   * original source was XLSX, XLS or CSV.
   */

  const opportunities =
    data?.currentOpportunities ||
    data?.opportunities ||
    data?.currentOpportunityData ||
    [];


  const leads =
    data?.leads ||
    data?.leadData ||
    [];


  const activities =
    data?.activities ||
    data?.activityData ||
    [];


  const derived = useMemo(() => {
    /* =======================================================
       ALL OVERVIEW CALCULATIONS

       PERFORMANCE:
       This block runs only when the underlying datasets or the
       relevant aging setting changes. Previously every calculation
       ran again on every render.
    ======================================================= */

    const pipelineValue = opportunities.reduce(
      (sum, row) => sum + getOpportunityValue(row),
      0
    );

    let won = 0;
    let active = 0;
    let agingRisk = 0;

    const monthlyMap = {};
    const outcomeMap = {};
    const ageBuckets = {
      "<30": 0,
      "30–60": 0,
      "60–90": 0,
      ">90": 0,
    };

    opportunities.forEach((row) => {
      const outcome = text(
        getColumnValue(row, [
          "Outcome bucket",
          "Outcome Bucket",
          "Outcome_Bucket",
          "Outcome-Bucket",
          "Outcome",
        ])
      ).toLowerCase();

      if (
        outcome.includes("won") &&
        !outcome.includes("lost")
      ) {
        won += 1;
      }

      if (outcome.includes("active")) {
        active += 1;
      }

      const age = number(
        getColumnValue(row, [
          "Age",
          "Opportunity Age",
        ])
      );

      if (age > agingCritical) {
        agingRisk += 1;
      }

      const createdDate =
        getOpportunityCreatedDate(row);

      const month = getMonthLabel(createdDate);

      if (!monthlyMap[month]) {
        monthlyMap[month] = {
          month,
          opportunities: 0,
          value: 0,
        };
      }

      monthlyMap[month].opportunities += 1;
      monthlyMap[month].value +=
        getOpportunityValue(row);

      const outcomeLabel =
        text(
          getColumnValue(row, [
            "Outcome bucket",
            "Outcome Bucket",
            "Outcome_Bucket",
            "Outcome-Bucket",
            "Outcome",
          ])
        ) || "Unknown";

      outcomeMap[outcomeLabel] =
        (outcomeMap[outcomeLabel] || 0) + 1;

      if (age < 30) {
        ageBuckets["<30"] += 1;
      } else if (age < 60) {
        ageBuckets["30–60"] += 1;
      } else if (age <= 90) {
        ageBuckets["60–90"] += 1;
      } else {
        ageBuckets[">90"] += 1;
      }
    });

    const monthlyData =
      Object.values(monthlyMap).sort(
        (a, b) => {
          if (a.month === "Unknown") return 1;
          if (b.month === "Unknown") return -1;
          return a.month.localeCompare(b.month);
        }
      );

    const outcomeData =
      Object.entries(outcomeMap)
        .map(([name, value]) => ({
          name,
          value,
        }))
        .sort((a, b) => b.value - a.value);

    const ageData =
      Object.entries(ageBuckets).map(
        ([name, value]) => ({
          name,
          value,
        })
      );

    return {
      pipelineValue,
      won,
      active,
      agingRisk,
      monthlyData,
      outcomeData,
      ageData,
    };
  }, [opportunities, agingCritical]);

  const {
    pipelineValue,
    won,
    active,
    agingRisk,
    monthlyData,
    outcomeData,
    ageData,
  } = derived;

  /* =======================================================
     EMPTY STATE
  ======================================================= */

  if (
    !opportunities.length
  ) {

    return (

      <div className="p-8">

        <SectionHeader
          title="Sales Overview"
          subtitle="A real-time view of your sales intelligence."
        />


        <div className="bg-white border border-slate-200 rounded-2xl p-16 text-center mt-6">

          <BriefcaseBusiness
            size={42}
            className="mx-auto text-slate-300"
          />


          <h2 className="text-xl font-bold text-slate-900 mt-5">

            No opportunity data available

          </h2>


          <p className="text-slate-400 mt-2">

            The workbook was loaded, but no opportunity
            records were found for the overview.

          </p>


          <p className="text-xs text-slate-300 mt-4">

            Check the browser console for the processed
            workbook structure.

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
        title="Sales Overview"
        subtitle={`A real-time view of your opportunities, pipeline, leads and activities. Values: ${
          settings?.currency || "INR"
        } • ${
          settings?.valueDisplay || "Crores"
        } • Aging critical: ${
          agingCritical
        } days.`}
      />


      {/* ==================================================
          KPI GRID
      ================================================== */}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-5">

        <KPI
          title="Pipeline Value"
          value={formatValue(
            pipelineValue,
            settings
          )}
          subtitle={`Annual contract value • ${
            settings?.valueDisplay || "Crores"
          }`}
          icon={IndianRupee}
          iconClass="bg-indigo-50 text-indigo-600"
        />


        <KPI
          title="Opportunities"
          value={
            opportunities.length
          }
          subtitle="Current opportunities"
          icon={BriefcaseBusiness}
          iconClass="bg-violet-50 text-violet-600"
        />


        <KPI
          title="Won Opportunities"
          value={won}
          subtitle="Won opportunities"
          icon={Trophy}
          iconClass="bg-emerald-50 text-emerald-600"
        />


        <KPI
          title="Leads"
          value={
            leads.length
          }
          subtitle="Total lead records"
          icon={Users}
          iconClass="bg-cyan-50 text-cyan-600"
        />


        <KPI
          title="Aging Risk"
          value={agingRisk}
          subtitle={`Opportunities >${agingCritical} days`}
          icon={AlertTriangle}
          iconClass="bg-rose-50 text-rose-600"
        />

      </div>


      {/* ==================================================
          CHART ROW 1
      ================================================== */}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 mt-6">


        {/* Pipeline Trend */}

        <ChartCard
          title="Pipeline Trend"
          subtitle="Opportunity value by month"
          className="xl:col-span-2"
        >

          <div className="h-[320px]">

            <ResponsiveContainer
              width="100%"
              height="100%"
            >

              <AreaChart
                data={monthlyData}
              >

                <defs>

                  <linearGradient
                    id="overviewPipelineGradient"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >

                    <stop
                      offset="0%"
                      stopColor="#6366f1"
                      stopOpacity={0.25}
                    />

                    <stop
                      offset="100%"
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
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  tick={{
                    fontSize: 11,
                    fill: "#94a3b8",
                  }}
                />


                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{
                    fontSize: 11,
                    fill: "#94a3b8",
                  }}
                  tickFormatter={
                    getValueAxisFormatter(
                      settings
                    )
                  }
                />


                <Tooltip
                  formatter={(value) =>
                    formatValue(
                      value,
                      settings
                    )
                  }
                />


                <Area
                  type="monotone"
                  dataKey="value"
                  name="Value"
                  stroke="#6366f1"
                  strokeWidth={3}
                  fill="url(#overviewPipelineGradient)"
                />

              </AreaChart>

            </ResponsiveContainer>

          </div>

        </ChartCard>


        {/* Outcome */}

        <ChartCard
          title="Opportunity Outcomes"
          subtitle="Current pipeline composition"
        >

          <div className="h-[320px]">

            <ResponsiveContainer
              width="100%"
              height="100%"
            >

              <PieChart>

                <Pie
                  data={outcomeData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="45%"
                  outerRadius={100}
                  innerRadius={65}
                  paddingAngle={3}
                >

                  {outcomeData.map(
                    (_, index) => (

                      <Cell
                        key={index}
                        fill={[
                          "#6366f1",
                          "#10b981",
                          "#f43f5e",
                          "#f59e0b",
                          "#06b6d4",
                        ][
                          index % 5
                        ]}
                      />

                    )
                  )}

                </Pie>


                <Tooltip />


                <Legend
                  verticalAlign="bottom"
                  height={36}
                />

              </PieChart>

            </ResponsiveContainer>

          </div>

        </ChartCard>

      </div>


      {/* ==================================================
          CHART ROW 2
      ================================================== */}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 mt-6">


        {/* Opportunity Volume */}

        <ChartCard
          title="Opportunity Volume"
          subtitle="Number of opportunities by month"
        >

          <div className="h-[300px]">

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
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                />


                <YAxis
                  axisLine={false}
                  tickLine={false}
                />


                <Tooltip />


                <Bar
                  dataKey="opportunities"
                  name="Opportunities"
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


        {/* Aging */}

        <ChartCard
          title="Opportunity Aging"
          subtitle="Current opportunities grouped by age"
        >

          <div className="h-[300px]">

            <ResponsiveContainer
              width="100%"
              height="100%"
            >

              <BarChart
                data={ageData}
                layout="vertical"
              >

                <CartesianGrid
                  strokeDasharray="3 3"
                  horizontal={false}
                  stroke="#e2e8f0"
                />


                <XAxis
                  type="number"
                  axisLine={false}
                  tickLine={false}
                />


                <YAxis
                  type="category"
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                />


                <Tooltip />


                <Bar
                  dataKey="value"
                  name="Opportunities"
                  fill="#06b6d4"
                  radius={[
                    0,
                    6,
                    6,
                    0,
                  ]}
                />

              </BarChart>

            </ResponsiveContainer>

          </div>

        </ChartCard>

      </div>


      {/* ==================================================
          QUICK INSIGHT
      ================================================== */}

      <div className="mt-6 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 p-6 text-white">

        <p className="text-sm font-medium text-indigo-100">

          QUICK INSIGHT

        </p>


        <h3 className="text-xl font-bold mt-2">

          {active} opportunities are currently active.

        </h3>


        <p className="text-sm text-indigo-100 mt-2">

          Your dashboard currently contains{" "}
          {opportunities.length}{" "}
          opportunities,{" "}
          {leads.length} leads and{" "}
          {activities.length} activities.

          {settings?.insights?.agingAlerts !== false && (
            <>
              {" "}Aging risk uses the configured{" "}
              {agingCritical}-day critical threshold.
            </>
          )}

          {settings?.insights?.pipelineAlerts !== false && (
            <>
              {" "}Pipeline values are displayed in{" "}
              {settings?.currency || "INR"} using the{" "}
              {settings?.valueDisplay || "Crores"} format.
            </>
          )}

        </p>

      </div>


    </div>

  );

}


export default Overview;