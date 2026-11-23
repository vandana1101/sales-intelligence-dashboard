import { useMemo, useState } from "react";

import {
  Users,
  UserPlus,
  Target,
  TrendingUp,
  Clock3,
  AlertTriangle,
  Download,
  Search,
  X,
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
  LineChart,
  Line,
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

  const result = Number(
    String(value)
      .replace(/,/g, "")
      .replace(/%/g, "")
      .trim()
  );

  return Number.isFinite(result)
    ? result
    : 0;
}


/*
  We intentionally don't hardcode one exact
  column name for every workbook.

  The function searches common variants so
  the dashboard can adapt to future files.
*/

function getField(row, possibleNames) {
  if (!row || typeof row !== "object") {
    return "";
  }

  const normalizeHeader = (value) =>
    String(value ?? "")
      .replace(/^\uFEFF/, "")
      .trim()
      .toLowerCase()
      .replace(/[_-]+/g, " ")
      .replace(/\s+/g, " ");

  const normalizedMap = new Map(
    Object.entries(row).map(([key, value]) => [
      normalizeHeader(key),
      value,
    ])
  );

  for (const name of possibleNames) {
    const normalizedName = normalizeHeader(name);

    if (normalizedMap.has(normalizedName)) {
      const value = normalizedMap.get(normalizedName);

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


function getLeadName(row) {

  return text(
    getField(row, [
      "Lead Name",
      "Lead name",
      "Name",
      "Contact Name",
      "Lead",
    ])
  ) || "Unnamed Lead";

}


function getCompany(row) {

  return text(
    getField(row, [
      "Company",
      "Company Name",
      "Account Name",
      "Customer name",
      "Customer Name",
      "Organisation",
      "Organization",
    ])
  ) || "Unknown";

}


function getStatus(row) {

  return text(
    getField(row, [
      "Lead Status",
      "Status",
      "Lead status",
      "Current Status",
      "Stage",
    ])
  ) || "Unknown";

}


function getSource(row) {

  return text(
    getField(row, [
      "Lead Source",
      "Lead source",
      "Source",
      "Source Name",
      "Channel",
    ])
  ) || "Unknown";

}


function getOwner(row) {

  return text(
    getField(row, [
      "Assigned To",
      "Owner",
      "Lead Owner",
      "Sales Owner",
      "Created By",
      "Assigned User",
    ])
  ) || "Unassigned";

}


function getRegion(row) {

  return text(
    getField(row, [
      "Region",
      "Customer Service required region",
      "State",
      "Location",
      "City",
      "Customer Location",
    ])
  ) || "Unknown";

}


function getDateValue(row) {

  return text(
    getField(row, [
      "Lead Created Date",
      "Created Date",
      "Created date",
      "Lead Date",
      "Date",
      "Created Time",
      "Created At",
    ])
  );

}


function getAge(row) {

  const directAge =
    number(
      getField(row, [
        "Age",
        "Lead Age",
        "Days Open",
        "Age (Days)",
      ])
    );

  if (directAge > 0) {
    return directAge;
  }

  return 0;

}


/* =========================================================
   AGE BUCKET
========================================================= */

function getAgeBucket(age) {

  if (age < 30) {
    return "<30 days";
  }

  if (age < 60) {
    return "30–60 days";
  }

  if (age <= 90) {
    return "60–90 days";
  }

  return ">90 days";

}


/* =========================================================
   CONVERSION DETECTION
========================================================= */

function isConverted(row) {

  const status =
    getStatus(row).toLowerCase();


  return (
    status.includes("convert") ||
    status.includes("won") ||
    status.includes("opportunity") ||
    status.includes("customer")
  );

}


/* =========================================================
   CSV EXPORT
========================================================= */

function downloadCSV(
  rows,
  fileName = "leads.csv"
) {

  if (!rows.length) {
    return;
  }


  const headers =
    Object.keys(rows[0]);


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

    headers
      .map(escapeCSV)
      .join(","),

    ...rows.map(
      (row) =>
        headers
          .map(
            (header) =>
              escapeCSV(
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

  link.download = fileName;

  link.click();


  URL.revokeObjectURL(url);

}


/* =========================================================
   TOOLTIP
========================================================= */

function ChartTooltip({
  active,
  payload,
  label,
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

      <p className="text-xs text-slate-400 mb-1">
        {label}
      </p>


      {payload.map(
        (item, index) => (

          <p
            key={index}
            className="text-sm font-semibold text-slate-800"
          >

            {item.name}:{" "}

            {typeof item.value === "number"
              ? item.value.toLocaleString(
                  "en-IN"
                )
              : item.value}

          </p>

        )
      )}

    </div>

  );

}


/* =========================================================
   MAIN COMPONENT
========================================================= */

function Leads({
  data,
}) {

  /*
    data.leads contains all lead rows
    collected from uploaded workbooks.
  */

  const leads =
    data?.leads || [];


  /* =======================================================
     FILTER STATE
  ======================================================= */

  const [search, setSearch] =
    useState("");


  const [statusFilter, setStatusFilter] =
    useState("All");


  const [sourceFilter, setSourceFilter] =
    useState("All");


  const [ownerFilter, setOwnerFilter] =
    useState("All");


  const [regionFilter, setRegionFilter] =
    useState("All");


  const [ageFilter, setAgeFilter] =
    useState("All");


  /* =======================================================
     FILTER OPTIONS
  ======================================================= */

  const filterOptions =
    useMemo(() => {

      const unique = (values) =>
        [
          ...new Set(
            values
              .map(text)
              .filter(Boolean)
          ),
        ].sort();


      return {

        statuses:
          unique(
            leads.map(
              getStatus
            )
          ),

        sources:
          unique(
            leads.map(
              getSource
            )
          ),

        owners:
          unique(
            leads.map(
              getOwner
            )
          ),

        regions:
          unique(
            leads.map(
              getRegion
            )
          ),

      };

    }, [
      leads,
    ]);


  /* =======================================================
     FILTERED LEADS
  ======================================================= */

  const filteredLeads =
    useMemo(() => {

      const query =
        search
          .toLowerCase()
          .trim();


      return leads.filter(
        (row) => {

          const leadName =
            getLeadName(row)
              .toLowerCase();


          const company =
            getCompany(row)
              .toLowerCase();


          const matchesSearch =
            !query ||
            leadName.includes(query) ||
            company.includes(query);


          const matchesStatus =
            statusFilter === "All" ||
            getStatus(row) ===
              statusFilter;


          const matchesSource =
            sourceFilter === "All" ||
            getSource(row) ===
              sourceFilter;


          const matchesOwner =
            ownerFilter === "All" ||
            getOwner(row) ===
              ownerFilter;


          const matchesRegion =
            regionFilter === "All" ||
            getRegion(row) ===
              regionFilter;


          const matchesAge =
            ageFilter === "All" ||
            getAgeBucket(
              getAge(row)
            ) === ageFilter;


          return (
            matchesSearch &&
            matchesStatus &&
            matchesSource &&
            matchesOwner &&
            matchesRegion &&
            matchesAge
          );

        }
      );

    }, [
      leads,
      search,
      statusFilter,
      sourceFilter,
      ownerFilter,
      regionFilter,
      ageFilter,
    ]);


  /* =======================================================
     KPI CALCULATIONS
  ======================================================= */

  const metrics =
    useMemo(() => {

      const total =
        filteredLeads.length;


      const converted =
        filteredLeads.filter(
          isConverted
        ).length;


      const conversionRate =
        total
          ? (
              converted /
              total
            ) *
            100
          : 0;


      const aged =
        filteredLeads.filter(
          (row) =>
            getAge(row) > 90
        ).length;


      const ages =
        filteredLeads
          .map(getAge)
          .filter(
            (age) =>
              age > 0
          );


      const averageAge =
        ages.length
          ? ages.reduce(
              (sum, age) =>
                sum + age,
              0
            ) /
            ages.length
          : 0;


      return {

        total,

        converted,

        conversionRate,

        aged,

        averageAge,

      };

    }, [
      filteredLeads,
    ]);


  /* =======================================================
     STATUS DATA
  ======================================================= */

  const statusData =
    useMemo(() => {

      const map = {};


      filteredLeads.forEach(
        (row) => {

          const status =
            getStatus(row);


          map[status] =
            (map[status] || 0) + 1;

        }
      );


      return Object.entries(map)
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

    }, [
      filteredLeads,
    ]);


  /* =======================================================
     SOURCE DATA
  ======================================================= */

  const sourceData =
    useMemo(() => {

      const map = {};


      filteredLeads.forEach(
        (row) => {

          const source =
            getSource(row);


          map[source] =
            (map[source] || 0) + 1;

        }
      );


      return Object.entries(map)
        .map(
          ([source, leads]) => ({
            source,
            leads,
          })
        )
        .sort(
          (a, b) =>
            b.leads -
            a.leads
        )
        .slice(0, 10);

    }, [
      filteredLeads,
    ]);


  /* =======================================================
     OWNER DATA
  ======================================================= */

  const ownerData =
    useMemo(() => {

      const map = {};


      filteredLeads.forEach(
        (row) => {

          const owner =
            getOwner(row);


          map[owner] =
            (map[owner] || 0) + 1;

        }
      );


      return Object.entries(map)
        .map(
          ([owner, leads]) => ({
            owner,
            leads,
          })
        )
        .sort(
          (a, b) =>
            b.leads -
            a.leads
        )
        .slice(0, 10);

    }, [
      filteredLeads,
    ]);


  /* =======================================================
     REGION DATA
  ======================================================= */

  const regionData =
    useMemo(() => {

      const map = {};


      filteredLeads.forEach(
        (row) => {

          const region =
            getRegion(row);


          map[region] =
            (map[region] || 0) + 1;

        }
      );


      return Object.entries(map)
        .map(
          ([region, leads]) => ({
            region,
            leads,
          })
        )
        .sort(
          (a, b) =>
            b.leads -
            a.leads
        )
        .slice(0, 10);

    }, [
      filteredLeads,
    ]);


  /* =======================================================
     AGE DATA
  ======================================================= */

  const ageData =
    useMemo(() => {

      const buckets = {

        "<30 days": 0,

        "30–60 days": 0,

        "60–90 days": 0,

        ">90 days": 0,

      };


      filteredLeads.forEach(
        (row) => {

          const age =
            getAge(row);


          if (age > 0) {

            buckets[
              getAgeBucket(age)
            ]++;

          }

        }
      );


      return Object.entries(buckets)
        .map(
          ([name, value]) => ({
            name,
            value,
          })
        );

    }, [
      filteredLeads,
    ]);


  /* =======================================================
     MONTH DATA
  ======================================================= */

  const monthlyData =
    useMemo(() => {

      const map = {};


      filteredLeads.forEach(
        (row) => {

          const rawDate =
            getDateValue(row);


          if (!rawDate) {
            return;
          }


          /*
            We intentionally keep the
            raw date text if parsing is
            uncertain. This prevents
            the dashboard from inventing
            dates.
          */

          let label =
            rawDate;


          const parsed =
            new Date(rawDate);


          if (
            !Number.isNaN(
              parsed.getTime()
            )
          ) {

            label =
              parsed.toLocaleDateString(
                "en-US",
                {
                  month: "short",
                  year: "numeric",
                }
              );

          }


          map[label] =
            (map[label] || 0) + 1;

        }
      );


      return Object.entries(map)
        .map(
          ([month, leads]) => ({
            month,
            leads,
          })
        )
        .slice(-12);

    }, [
      filteredLeads,
    ]);


  /* =======================================================
     CONVERSION BY SOURCE
  ======================================================= */

  const conversionBySource =
    useMemo(() => {

      const map = {};


      filteredLeads.forEach(
        (row) => {

          const source =
            getSource(row);


          if (!map[source]) {

            map[source] = {

              source,

              total: 0,

              converted: 0,

            };

          }


          map[source].total++;


          if (
            isConverted(row)
          ) {

            map[source].converted++;

          }

        }
      );


      return Object.values(map)
        .map(
          (item) => ({

            ...item,

            rate:
              item.total
                ? (
                    item.converted /
                    item.total
                  ) *
                  100
                : 0,

          })
        )
        .sort(
          (a, b) =>
            b.rate -
            a.rate
        )
        .slice(0, 10);

    }, [
      filteredLeads,
    ]);


  /* =======================================================
     AGING LEADS
  ======================================================= */

  const agingLeads =
    useMemo(() => {

      return [
        ...filteredLeads,
      ]
        .filter(
          (row) =>
            getAge(row) > 90
        )
        .sort(
          (a, b) =>
            getAge(b) -
            getAge(a)
        )
        .slice(0, 8);

    }, [
      filteredLeads,
    ]);


  /* =======================================================
     CLEAR FILTERS
  ======================================================= */

  function clearFilters() {

    setSearch("");

    setStatusFilter("All");

    setSourceFilter("All");

    setOwnerFilter("All");

    setRegionFilter("All");

    setAgeFilter("All");

  }


  const hasFilters =
    search ||
    statusFilter !== "All" ||
    sourceFilter !== "All" ||
    ownerFilter !== "All" ||
    regionFilter !== "All" ||
    ageFilter !== "All";


  /* =======================================================
     EMPTY STATE
  ======================================================= */

  if (!leads.length) {

    return (

      <div className="p-8">

        <div className="bg-white border border-slate-200 rounded-2xl p-16 text-center">

          <Users
            size={42}
            className="mx-auto text-slate-300"
          />


          <h2 className="text-xl font-bold text-slate-900 mt-5">

            No lead data found

          </h2>


          <p className="text-sm text-slate-400 mt-2">

            Upload an Excel or CSV file containing Leads Data.

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

        title="Lead Intelligence"

        subtitle={`${filteredLeads.length} of ${leads.length} leads`}

        action={

          <button
            onClick={() =>
              downloadCSV(
                filteredLeads,
                "leads.csv"
              )
            }
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 shadow-sm"
          >

            <Download size={16} />

            Export CSV

          </button>

        }

      />


      {/* ==================================================
          FILTERS
      ================================================== */}

      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">

        <div className="flex flex-wrap gap-3">


          {/* Search */}

          <div className="relative flex-1 min-w-[240px]">

            <Search
              size={17}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />


            <input
              value={search}
              onChange={(e) =>
                setSearch(
                  e.target.value
                )
              }
              placeholder="Search lead or company..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            />

          </div>


          {/* Status */}

          <select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(
                e.target.value
              )
            }
            className="px-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-white text-slate-600 outline-none"
          >

            <option value="All">
              All statuses
            </option>

            {filterOptions.statuses.map(
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


          {/* Source */}

          <select
            value={sourceFilter}
            onChange={(e) =>
              setSourceFilter(
                e.target.value
              )
            }
            className="px-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-white text-slate-600 outline-none"
          >

            <option value="All">
              All sources
            </option>

            {filterOptions.sources.map(
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


          {/* Owner */}

          <select
            value={ownerFilter}
            onChange={(e) =>
              setOwnerFilter(
                e.target.value
              )
            }
            className="px-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-white text-slate-600 outline-none max-w-[190px]"
          >

            <option value="All">
              All owners
            </option>

            {filterOptions.owners.map(
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


          {/* Region */}

          <select
            value={regionFilter}
            onChange={(e) =>
              setRegionFilter(
                e.target.value
              )
            }
            className="px-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-white text-slate-600 outline-none"
          >

            <option value="All">
              All regions
            </option>

            {filterOptions.regions.map(
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


          {/* Age */}

          <select
            value={ageFilter}
            onChange={(e) =>
              setAgeFilter(
                e.target.value
              )
            }
            className="px-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-white text-slate-600 outline-none"
          >

            <option value="All">
              All ages
            </option>

            <option value="<30 days">
              &lt;30 days
            </option>

            <option value="30–60 days">
              30–60 days
            </option>

            <option value="60–90 days">
              60–90 days
            </option>

            <option value=">90 days">
              &gt;90 days
            </option>

          </select>


          {/* Clear */}

          {hasFilters && (

            <button
              onClick={clearFilters}
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-rose-600 bg-rose-50 hover:bg-rose-100"
            >

              <X size={15} />

              Clear

            </button>

          )}

        </div>

      </div>


      {/* ==================================================
          KPI ROW
      ================================================== */}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-5 mt-6">


        <KPI
          title="Total Leads"
          value={metrics.total}
          subtitle="Filtered lead records"
          icon={Users}
          iconClass="bg-indigo-50 text-indigo-600"
        />


        <KPI
          title="Converted"
          value={metrics.converted}
          subtitle="Detected conversions"
          icon={Target}
          iconClass="bg-emerald-50 text-emerald-600"
        />


        <KPI
          title="Conversion Rate"
          value={`${metrics.conversionRate.toFixed(1)}%`}
          subtitle="Converted / total"
          icon={TrendingUp}
          iconClass="bg-violet-50 text-violet-600"
        />


        <KPI
          title="Average Age"
          value={`${metrics.averageAge.toFixed(0)} days`}
          subtitle="Where age is available"
          icon={Clock3}
          iconClass="bg-cyan-50 text-cyan-600"
        />


        <KPI
          title="Aging Risk"
          value={metrics.aged}
          subtitle="Leads above 90 days"
          icon={AlertTriangle}
          iconClass="bg-rose-50 text-rose-600"
        />

      </div>


      {/* ==================================================
          STATUS + MONTHLY TREND
      ================================================== */}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 mt-6">


        {/* Status */}

        <ChartCard
          title="Lead Status"
          subtitle="Current distribution"
        >

          <div className="h-[330px]">

            <ResponsiveContainer
              width="100%"
              height="100%"
            >

              <PieChart>

                <Pie
                  data={statusData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="45%"
                  innerRadius={65}
                  outerRadius={105}
                  paddingAngle={3}
                >

                  {statusData.map(
                    (_, index) => (

                      <Cell
                        key={index}
                        fill={[
                          "#6366f1",
                          "#10b981",
                          "#f59e0b",
                          "#f43f5e",
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


        {/* Monthly */}

        <ChartCard
          title="Lead Creation Trend"
          subtitle="Lead volume over time"
          className="xl:col-span-2"
        >

          <div className="h-[330px]">

            {monthlyData.length ? (

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
                    dataKey="month"
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
                      fill: "#94a3b8",
                    }}
                  />


                  <Tooltip
                    content={
                      <ChartTooltip />
                    }
                  />


                  <Line
                    type="monotone"
                    dataKey="leads"
                    name="Leads"
                    stroke="#6366f1"
                    strokeWidth={3}
                    dot={{
                      r: 4,
                    }}
                    activeDot={{
                      r: 6,
                    }}
                  />

                </LineChart>

              </ResponsiveContainer>

            ) : (

              <div className="h-full flex items-center justify-center text-sm text-slate-400">

                Date information is not available in a usable format.

              </div>

            )}

          </div>

        </ChartCard>

      </div>


      {/* ==================================================
          SOURCE + OWNER
      ================================================== */}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 mt-6">


        {/* Source */}

        <ChartCard
          title="Leads by Source"
          subtitle="Top acquisition channels"
        >

          <div className="h-[360px]">

            <ResponsiveContainer
              width="100%"
              height="100%"
            >

              <BarChart
                data={sourceData}
              >

                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#e2e8f0"
                />


                <XAxis
                  dataKey="source"
                  axisLine={false}
                  tickLine={false}
                  tick={{
                    fontSize: 11,
                    fill: "#64748b",
                  }}
                  angle={-20}
                  textAnchor="end"
                  height={70}
                />


                <YAxis
                  axisLine={false}
                  tickLine={false}
                />


                <Tooltip
                  content={
                    <ChartTooltip />
                  }
                />


                <Bar
                  dataKey="leads"
                  name="Leads"
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

          </div>

        </ChartCard>


        {/* Owner */}

        <ChartCard
          title="Leads by Owner"
          subtitle="Lead distribution across sales owners"
        >

          <div className="h-[360px]">

            <ResponsiveContainer
              width="100%"
              height="100%"
            >

              <BarChart
                data={ownerData}
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
                  dataKey="owner"
                  width={125}
                  axisLine={false}
                  tickLine={false}
                  tick={{
                    fontSize: 11,
                    fill: "#64748b",
                  }}
                />


                <Tooltip
                  content={
                    <ChartTooltip />
                  }
                />


                <Bar
                  dataKey="leads"
                  name="Leads"
                  fill="#8b5cf6"
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
          REGION + AGE
      ================================================== */}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 mt-6">


        {/* Region */}

        <ChartCard
          title="Leads by Region"
          subtitle="Geographic distribution"
        >

          <div className="h-[330px]">

            <ResponsiveContainer
              width="100%"
              height="100%"
            >

              <BarChart
                data={regionData}
              >

                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#e2e8f0"
                />


                <XAxis
                  dataKey="region"
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


                <Bar
                  dataKey="leads"
                  name="Leads"
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


        {/* Age */}

        <ChartCard
          title="Lead Aging"
          subtitle="Age buckets where age data is available"
        >

          <div className="h-[330px]">

            <ResponsiveContainer
              width="100%"
              height="100%"
            >

              <BarChart
                data={ageData}
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
                  axisLine={false}
                  tickLine={false}
                />


                <Tooltip />


                <Bar
                  dataKey="value"
                  name="Leads"
                  fill="#f59e0b"
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
          CONVERSION BY SOURCE
      ================================================== */}

      <div className="mt-6">

        <ChartCard
          title="Source Conversion Performance"
          subtitle="Which lead sources are producing the strongest conversion rates"
        >

          <div className="overflow-x-auto">

            <table className="w-full text-sm">

              <thead>

                <tr className="border-b border-slate-100">

                  <th className="text-left py-3 px-4 font-semibold text-slate-500">
                    Source
                  </th>

                  <th className="text-right py-3 px-4 font-semibold text-slate-500">
                    Leads
                  </th>

                  <th className="text-right py-3 px-4 font-semibold text-slate-500">
                    Converted
                  </th>

                  <th className="text-right py-3 px-4 font-semibold text-slate-500">
                    Conversion
                  </th>

                </tr>

              </thead>


              <tbody>

                {conversionBySource.map(
                  (item, index) => (

                    <tr
                      key={
                        item.source
                      }
                      className="border-b border-slate-50 hover:bg-slate-50"
                    >

                      <td className="py-4 px-4 font-medium text-slate-800">

                        {item.source}

                      </td>


                      <td className="py-4 px-4 text-right text-slate-600">

                        {item.total.toLocaleString(
                          "en-IN"
                        )}

                      </td>


                      <td className="py-4 px-4 text-right text-slate-600">

                        {item.converted.toLocaleString(
                          "en-IN"
                        )}

                      </td>


                      <td className="py-4 px-4 text-right">

                        <span
                          className={`
                            inline-flex
                            px-2.5
                            py-1
                            rounded-full
                            text-xs
                            font-bold
                            ${
                              item.rate >= 30
                                ? "bg-emerald-50 text-emerald-700"
                                : item.rate >= 15
                                ? "bg-amber-50 text-amber-700"
                                : "bg-slate-100 text-slate-600"
                            }
                          `}
                        >

                          {item.rate.toFixed(
                            1
                          )}%

                        </span>

                      </td>

                    </tr>

                  )
                )}

              </tbody>

            </table>

          </div>

        </ChartCard>

      </div>


      {/* ==================================================
          AGING LEADS
      ================================================== */}

      <div className="mt-6">

        <ChartCard
          title="Aging Lead Monitor"
          subtitle="Leads older than 90 days"
        >

          {agingLeads.length ? (

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">

              {agingLeads.map(
                (row, index) => {

                  const age =
                    getAge(row);


                  return (

                    <div
                      key={index}
                      className="p-4 rounded-xl bg-rose-50 border border-rose-100"
                    >

                      <div className="flex items-center justify-between gap-3">

                        <p className="font-semibold text-sm text-slate-800 truncate">

                          {getLeadName(row)}

                        </p>


                        <span className="shrink-0 px-2 py-1 rounded-full bg-rose-100 text-rose-700 text-xs font-bold">

                          {age}d

                        </span>

                      </div>


                      <p className="text-xs text-slate-500 mt-2 truncate">

                        {getCompany(row)}

                      </p>


                      <p className="text-xs text-slate-400 mt-1">

                        {getStatus(row)}

                      </p>

                    </div>

                  );

                }
              )}

            </div>

          ) : (

            <div className="py-12 text-center text-sm text-slate-400">

              No leads above 90 days.

            </div>

          )}

        </ChartCard>

      </div>


      {/* ==================================================
          LEAD REGISTER
      ================================================== */}

      <div className="mt-6">

        <ChartCard

          title="Lead Register"

          subtitle={`Showing ${filteredLeads.length} records`}

          action={

            <button
              onClick={() =>
                downloadCSV(
                  filteredLeads,
                  "lead-register.csv"
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
                    Lead
                  </th>

                  <th className="text-left px-4 py-3 font-semibold text-slate-500 whitespace-nowrap">
                    Company
                  </th>

                  <th className="text-left px-4 py-3 font-semibold text-slate-500 whitespace-nowrap">
                    Status
                  </th>

                  <th className="text-left px-4 py-3 font-semibold text-slate-500 whitespace-nowrap">
                    Source
                  </th>

                  <th className="text-left px-4 py-3 font-semibold text-slate-500 whitespace-nowrap">
                    Owner
                  </th>

                  <th className="text-left px-4 py-3 font-semibold text-slate-500 whitespace-nowrap">
                    Region
                  </th>

                  <th className="text-right px-4 py-3 font-semibold text-slate-500 whitespace-nowrap">
                    Age
                  </th>

                  <th className="text-left px-4 py-3 font-semibold text-slate-500 whitespace-nowrap">
                    Created
                  </th>

                </tr>

              </thead>


              <tbody>

                {filteredLeads.map(
                  (row, index) => (

                    <tr
                      key={index}
                      className="border-t border-slate-100 hover:bg-slate-50"
                    >

                      <td className="px-4 py-3 font-medium text-slate-800 whitespace-nowrap">

                        {getLeadName(row)}

                      </td>


                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">

                        {getCompany(row)}

                      </td>


                      <td className="px-4 py-3 whitespace-nowrap">

                        <span className="inline-flex px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-semibold">

                          {getStatus(row)}

                        </span>

                      </td>


                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">

                        {getSource(row)}

                      </td>


                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">

                        {getOwner(row)}

                      </td>


                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">

                        {getRegion(row)}

                      </td>


                      <td className="px-4 py-3 text-right whitespace-nowrap">

                        {getAge(row) > 0
                          ? `${getAge(row)} days`
                          : "—"}

                      </td>


                      <td className="px-4 py-3 text-slate-500 whitespace-nowrap">

                        {getDateValue(row) ||
                          "—"}

                      </td>

                    </tr>

                  )
                )}

              </tbody>

            </table>

          </div>

        </ChartCard>

      </div>


    </div>

  );

}


export default Leads;