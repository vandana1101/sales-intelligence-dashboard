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


function getOpportunityValue(row) {

  const annual =
    number(
      row[
        "Value of Contract Per Annum INR"
      ]
    );

  if (annual > 0) {
    return annual;
  }


  const monthly =
    number(
      row[
        "Revenue potential per month (in INR)"
      ]
    );

  return monthly * 12;

}


/* =========================================================
   SETTINGS-AWARE DISPLAY HELPERS
========================================================= */

function getCurrencySymbol(currency = "INR") {
  const symbols = {
    INR: "₹",
    USD: "$",
    EUR: "€",
  };

  return symbols[currency] || currency;
}


function formatValue(value, settings = {}) {
  const currency = settings?.currency || "INR";
  const display = settings?.valueDisplay || "Crores";
  const symbol = getCurrencySymbol(currency);
  const amount = number(value);

  if (display === "Raw") {
    return `${symbol}${amount.toLocaleString("en-IN", {
      maximumFractionDigits: 0,
    })}`;
  }

  if (display === "Lakhs") {
    return `${symbol}${(amount / 100000).toFixed(2)} L`;
  }

  return `${symbol}${(amount / 10000000).toFixed(2)} Cr`;
}


function getValueAxisFormatter(settings = {}) {
  const currency = settings?.currency || "INR";
  const display = settings?.valueDisplay || "Crores";
  const symbol = getCurrencySymbol(currency);

  return (value) => {
    const amount = number(value);

    if (display === "Raw") {
      return `${symbol}${(amount / 1000000).toFixed(1)}M`;
    }

    if (display === "Lakhs") {
      return `${symbol}${(amount / 100000).toFixed(1)}L`;
    }

    return `${symbol}${(amount / 10000000).toFixed(1)}Cr`;
  };
}


/* =========================================================
   MAIN COMPONENT
========================================================= */

function Overview({
  data,
  settings,
}) {

  /*
   * IMPORTANT:
   *
   * Opportunities.jsx uses currentOpportunities.
   * We use the exact same source here.
   *
   * The fallbacks make the page more tolerant if the
   * processor exposes the dataset under another name.
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


  /* =======================================================
     KPI VALUES
  ======================================================= */

  const pipelineValue =
    opportunities.reduce(
      (sum, row) =>
        sum +
        getOpportunityValue(row),
      0
    );


  const won =
    opportunities.filter(
      (row) => {

        const outcome =
          text(
            row[
              "Outcome bucket"
            ]
          ).toLowerCase();

        return (
          outcome.includes("won") &&
          !outcome.includes("lost")
        );

      }
    ).length;


  const active =
    opportunities.filter(
      (row) => {

        const outcome =
          text(
            row[
              "Outcome bucket"
            ]
          ).toLowerCase();

        return outcome.includes(
          "active"
        );

      }
    ).length;


  const agingCritical =
    Number(settings?.opportunityRisk?.ageCritical) || 90;

  const agingRisk =
    opportunities.filter(
      (row) =>
        number(
          row["Age"]
        ) > agingCritical
    ).length;


  /* =======================================================
     MONTHLY PIPELINE DATA
  ======================================================= */

  const monthlyMap = {};


  opportunities.forEach(
    (row) => {

      const month =
        text(
          row[
            "Opportunity Month (G)"
          ]
        ) ||
        text(
          row["Opportunity Month"]
        ) ||
        "Unknown";


      if (!monthlyMap[month]) {

        monthlyMap[month] = {

          month,

          opportunities: 0,

          value: 0,

        };

      }


      monthlyMap[month]
        .opportunities += 1;


      monthlyMap[month].value +=
        getOpportunityValue(row);

    }
  );


  const monthlyData =
    Object.values(
      monthlyMap
    );


  /* =======================================================
     OUTCOME DATA
  ======================================================= */

  const outcomeMap = {};


  opportunities.forEach(
    (row) => {

      const outcome =
        text(
          row[
            "Outcome bucket"
          ]
        ) ||
        "Unknown";


      outcomeMap[outcome] =
        (
          outcomeMap[outcome] ||
          0
        ) + 1;

    }
  );


  const outcomeData =
    Object.entries(
      outcomeMap
    )
      .map(
        ([name, value]) => ({
          name,
          value,
        })
      )
      .sort(
        (a, b) =>
          b.value - a.value
      );


  /* =======================================================
     AGE DATA
  ======================================================= */

  const ageBuckets = {

    "<30": 0,

    "30–60": 0,

    "60–90": 0,

    ">90": 0,

  };


  opportunities.forEach(
    (row) => {

      const age =
        number(
          row["Age"]
        );


      if (age < 30) {

        ageBuckets["<30"]++;

      } else if (age < 60) {

        ageBuckets["30–60"]++;

      } else if (age <= 90) {

        ageBuckets["60–90"]++;

      } else {

        ageBuckets[">90"]++;

      }

    }
  );


  const ageData =
    Object.entries(
      ageBuckets
    )
      .map(
        ([name, value]) => ({
          name,
          value,
        })
      );


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
                  tickFormatter={(value) =>
                    `${(
                      value /
                      10000000
                    ).toFixed(1)}Cr`
                  }
                />


                <Tooltip
                  formatter={(value) =>
                    `₹${(
                      Number(value) /
                      10000000
                    ).toFixed(2)} Cr`
                  }
                />


                <Area
                  type="monotone"
                  dataKey="value"
                  name="Pipeline Value"
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