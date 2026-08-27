import { useMemo, useState } from "react";

import {
  Activity,
  Users,
  CalendarDays,
  TrendingUp,
  UserCheck,
  Search,
  Download,
  X,
  Zap,
  AlertTriangle,
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
   GENERIC HELPERS
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
        .replace(/%/g, "")
        .trim()
    );

  return Number.isFinite(result)
    ? result
    : 0;

}


/*
  Search multiple possible column names.

  This makes the dashboard more resilient
  when the workbook structure changes.
*/

function getField(
  row,
  possibleNames
) {

  for (
    const name of possibleNames
  ) {

    if (
      row &&
      Object.prototype.hasOwnProperty.call(
        row,
        name
      )
    ) {

      const value =
        row[name];

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
   FIELD MAPPERS
========================================================= */

function getActivityType(row) {

  return text(
    getField(row, [

      "Activity Type",
      "Activity type",
      "Type",
      "Activity",
      "Task Type",
      "Task type",
      "Event Type",
      "Event type",
      "Call Type",
      "Interaction Type",

    ])
  ) || "Unknown";

}


function getSubject(row) {

  return text(
    getField(row, [

      "Subject",
      "Activity Subject",
      "Task Subject",
      "Description",
      "Activity Name",
      "Task Name",
      "Title",

    ])
  ) || "Untitled Activity";

}


function getOwner(row) {

  return text(
    getField(row, [

      "Assigned To",
      "Owner",
      "Activity Owner",
      "Created By",
      "Created by",
      "Assigned User",
      "User",
      "Username",
      "Salesperson",
      "Employee",

    ])
  ) || "Unassigned";

}


function getStatus(row) {

  return text(
    getField(row, [

      "Status",
      "Activity Status",
      "Task Status",
      "Activity status",
      "State",

    ])
  ) || "Unknown";

}


function getPriority(row) {

  return text(
    getField(row, [

      "Priority",
      "Activity Priority",
      "Task Priority",

    ])
  ) || "Unknown";

}


function getRelatedTo(row) {

  return text(
    getField(row, [

      "Opportunity Name",
      "Opportunity",
      "Opportunity Name",
      "Lead Name",
      "Lead",
      "Customer name",
      "Customer Name",
      "Account Name",
      "Company",
      "Related To",

    ])
  ) || "Not linked";

}


function getDateValue(row) {

  return text(
    getField(row, [

      "Activity Date",
      "Activity date",
      "Date",
      "Created Date",
      "Created date",
      "Created Time",
      "Created At",
      "Task Date",
      "Due Date",
      "Due date",
      "Start Date",
      "Start date",

    ])
  );

}


/* =========================================================
   DATE PARSER
========================================================= */

function parseDate(value) {

  if (!value) {
    return null;
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


  /*
    Handle common DD-MMM-YY
    formats such as:

    8-Apr-26
    31-Mar-26
  */

  const match =
    String(value).match(
      /^(\d{1,2})[-/ ]([A-Za-z]{3,})[-/ ](\d{2,4})/
    );


  if (!match) {
    return null;
  }


  const day =
    Number(match[1]);


  const monthText =
    match[2]
      .slice(0, 3)
      .toLowerCase();


  const yearRaw =
    Number(match[3]);


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


  if (
    months[monthText] ===
    undefined
  ) {
    return null;
  }


  const year =
    yearRaw < 100
      ? 2000 + yearRaw
      : yearRaw;


  return new Date(
    year,
    months[monthText],
    day
  );

}


/* =========================================================
   AGE / RECENCY
========================================================= */

function getAge(row) {

  const directAge =
    number(
      getField(row, [

        "Age",
        "Activity Age",
        "Days Open",
        "Days",
        "Age (Days)",
        "Days Since Activity",

      ])
    );


  if (directAge > 0) {
    return directAge;
  }


  const date =
    parseDate(
      getDateValue(row)
    );


  if (!date) {
    return 0;
  }


  const now =
    new Date();


  const difference =
    now.getTime() -
    date.getTime();


  const days =
    Math.floor(
      difference /
      (1000 * 60 * 60 * 24)
    );


  return days > 0
    ? days
    : 0;

}


/* =========================================================
   AGE BUCKET
========================================================= */

function getAgeBucket(age) {

  if (age < 7) {
    return "<7 days";
  }

  if (age < 30) {
    return "7–30 days";
  }

  if (age <= 90) {
    return "30–90 days";
  }

  return ">90 days";

}


/* =========================================================
   CSV EXPORT
========================================================= */

function downloadCSV(
  rows,
  fileName = "activities.csv"
) {

  if (!rows.length) {
    return;
  }


  const headers =
    Object.keys(rows[0]);


  const escapeCSV =
    (value) => {

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

function Activities({
  data,
}) {

  const activities =
    data?.activities || [];


  /* =======================================================
     FILTER STATE
  ======================================================= */

  const [search, setSearch] =
    useState("");


  const [typeFilter, setTypeFilter] =
    useState("All");


  const [ownerFilter, setOwnerFilter] =
    useState("All");


  const [statusFilter, setStatusFilter] =
    useState("All");


  const [priorityFilter, setPriorityFilter] =
    useState("All");


  const [ageFilter, setAgeFilter] =
    useState("All");


  /* =======================================================
     FILTER OPTIONS
  ======================================================= */

  const filterOptions =
    useMemo(() => {

      const unique =
        (values) =>
          [
            ...new Set(
              values
                .map(text)
                .filter(Boolean)
            ),
          ].sort();


      return {

        types:
          unique(
            activities.map(
              getActivityType
            )
          ),

        owners:
          unique(
            activities.map(
              getOwner
            )
          ),

        statuses:
          unique(
            activities.map(
              getStatus
            )
          ),

        priorities:
          unique(
            activities.map(
              getPriority
            )
          ),

      };

    }, [
      activities,
    ]);


  /* =======================================================
     FILTERED ACTIVITIES
  ======================================================= */

  const filteredActivities =
    useMemo(() => {

      const query =
        search
          .toLowerCase()
          .trim();


      return activities.filter(
        (row) => {

          const subject =
            getSubject(row)
              .toLowerCase();


          const related =
            getRelatedTo(row)
              .toLowerCase();


          const owner =
            getOwner(row)
              .toLowerCase();


          const matchesSearch =
            !query ||
            subject.includes(query) ||
            related.includes(query) ||
            owner.includes(query);


          const matchesType =
            typeFilter === "All" ||
            getActivityType(row) ===
              typeFilter;


          const matchesOwner =
            ownerFilter === "All" ||
            getOwner(row) ===
              ownerFilter;


          const matchesStatus =
            statusFilter === "All" ||
            getStatus(row) ===
              statusFilter;


          const matchesPriority =
            priorityFilter === "All" ||
            getPriority(row) ===
              priorityFilter;


          const matchesAge =
            ageFilter === "All" ||
            getAgeBucket(
              getAge(row)
            ) ===
              ageFilter;


          return (
            matchesSearch &&
            matchesType &&
            matchesOwner &&
            matchesStatus &&
            matchesPriority &&
            matchesAge
          );

        }
      );

    }, [

      activities,

      search,

      typeFilter,

      ownerFilter,

      statusFilter,

      priorityFilter,

      ageFilter,

    ]);


  /* =======================================================
     KPI METRICS
  ======================================================= */

  const metrics =
    useMemo(() => {

      const total =
        filteredActivities.length;


      const uniqueOwners =
        new Set(
          filteredActivities.map(
            getOwner
          )
        ).size;


      const uniqueRelated =
        new Set(
          filteredActivities
            .map(
              getRelatedTo
            )
            .filter(
              (value) =>
                value !==
                "Not linked"
            )
        ).size;


      const completed =
        filteredActivities.filter(
          (row) => {

            const status =
              getStatus(row)
                .toLowerCase();


            return (
              status.includes(
                "complete"
              ) ||
              status.includes(
                "done"
              ) ||
              status.includes(
                "closed"
              ) ||
              status.includes(
                "finish"
              )
            );

          }
        ).length;


      const highPriority =
        filteredActivities.filter(
          (row) => {

            const priority =
              getPriority(row)
                .toLowerCase();


            return (
              priority.includes(
                "high"
              ) ||
              priority.includes(
                "urgent"
              ) ||
              priority.includes(
                "critical"
              )
            );

          }
        ).length;


      const aging =
        filteredActivities.filter(
          (row) =>
            getAge(row) > 90
        ).length;


      return {

        total,

        uniqueOwners,

        uniqueRelated,

        completed,

        highPriority,

        aging,

      };

    }, [
      filteredActivities,
    ]);


  /* =======================================================
     ACTIVITY TYPE DATA
  ======================================================= */

  const typeData =
    useMemo(() => {

      const map = {};


      filteredActivities.forEach(
        (row) => {

          const type =
            getActivityType(row);


          map[type] =
            (map[type] || 0) + 1;

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
      filteredActivities,
    ]);


  /* =======================================================
     OWNER DATA
  ======================================================= */

  const ownerData =
    useMemo(() => {

      const map = {};


      filteredActivities.forEach(
        (row) => {

          const owner =
            getOwner(row);


          map[owner] =
            (map[owner] || 0) + 1;

        }
      );


      return Object.entries(map)
        .map(
          ([owner, activities]) => ({
            owner,
            activities,
          })
        )
        .sort(
          (a, b) =>
            b.activities -
            a.activities
        )
        .slice(0, 12);

    }, [
      filteredActivities,
    ]);


  /* =======================================================
     STATUS DATA
  ======================================================= */

  const statusData =
    useMemo(() => {

      const map = {};


      filteredActivities.forEach(
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
      filteredActivities,
    ]);


  /* =======================================================
     PRIORITY DATA
  ======================================================= */

  const priorityData =
    useMemo(() => {

      const map = {};


      filteredActivities.forEach(
        (row) => {

          const priority =
            getPriority(row);


          map[priority] =
            (map[priority] || 0) + 1;

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
      filteredActivities,
    ]);


  /* =======================================================
     MONTHLY ACTIVITY DATA
  ======================================================= */

  const monthlyData =
    useMemo(() => {

      const map = {};


      filteredActivities.forEach(
        (row) => {

          const rawDate =
            getDateValue(row);


          const date =
            parseDate(rawDate);


          if (!date) {
            return;
          }


          const month =
            date.toLocaleDateString(
              "en-US",
              {
                month: "short",
                year: "numeric",
              }
            );


          map[month] =
            (map[month] || 0) + 1;

        }
      );


      return Object.entries(map)
        .map(
          ([month, activities]) => ({

            month,

            activities,

          })
        )
        .slice(-12);

    }, [
      filteredActivities,
    ]);


  /* =======================================================
     AGE DATA
  ======================================================= */

  const ageData =
    useMemo(() => {

      const buckets = {

        "<7 days": 0,

        "7–30 days": 0,

        "30–90 days": 0,

        ">90 days": 0,

      };


      filteredActivities.forEach(
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


      return Object.entries(
        buckets
      ).map(
        ([name, value]) => ({
          name,
          value,
        })
      );

    }, [
      filteredActivities,
    ]);


  /* =======================================================
     MOST ACTIVE USERS
  ======================================================= */

  const topUsers =
    useMemo(() => {

      const map = {};


      filteredActivities.forEach(
        (row) => {

          const owner =
            getOwner(row);


          map[owner] =
            (map[owner] || 0) + 1;

        }
      );


      return Object.entries(map)
        .map(
          ([owner, activities]) => ({
            owner,
            activities,
          })
        )
        .sort(
          (a, b) =>
            b.activities -
            a.activities
        )
        .slice(0, 8);

    }, [
      filteredActivities,
    ]);


  /* =======================================================
     AGING ACTIVITIES
  ======================================================= */

  const agingActivities =
    useMemo(() => {

      return [
        ...filteredActivities,
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
      filteredActivities,
    ]);


  /* =======================================================
     CLEAR FILTERS
  ======================================================= */

  function clearFilters() {

    setSearch("");

    setTypeFilter("All");

    setOwnerFilter("All");

    setStatusFilter("All");

    setPriorityFilter("All");

    setAgeFilter("All");

  }


  const hasFilters =
    search ||
    typeFilter !== "All" ||
    ownerFilter !== "All" ||
    statusFilter !== "All" ||
    priorityFilter !== "All" ||
    ageFilter !== "All";


  /* =======================================================
     EMPTY STATE
  ======================================================= */

  if (!activities.length) {

    return (

      <div className="p-8">

        <div className="bg-white border border-slate-200 rounded-2xl p-16 text-center">

          <Activity
            size={42}
            className="mx-auto text-slate-300"
          />


          <h2 className="text-xl font-bold text-slate-900 mt-5">

            No activity data found

          </h2>


          <p className="text-sm text-slate-400 mt-2">

            Upload a workbook containing an Activity Data sheet.

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

        title="Activity Intelligence"

        subtitle={`${filteredActivities.length} of ${activities.length} activities`}

        action={

          <button
            onClick={() =>
              downloadCSV(
                filteredActivities,
                "activities.csv"
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
              placeholder="Search activity, owner or related record..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            />

          </div>


          {/* Type */}

          <select
            value={typeFilter}
            onChange={(e) =>
              setTypeFilter(
                e.target.value
              )
            }
            className="px-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-white text-slate-600 outline-none"
          >

            <option value="All">
              All activity types
            </option>

            {filterOptions.types.map(
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


          {/* Priority */}

          <select
            value={priorityFilter}
            onChange={(e) =>
              setPriorityFilter(
                e.target.value
              )
            }
            className="px-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-white text-slate-600 outline-none"
          >

            <option value="All">
              All priorities
            </option>

            {filterOptions.priorities.map(
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

            <option value="<7 days">
              &lt;7 days
            </option>

            <option value="7–30 days">
              7–30 days
            </option>

            <option value="30–90 days">
              30–90 days
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
          title="Total Activities"
          value={metrics.total}
          subtitle="Filtered activity records"
          icon={Activity}
          iconClass="bg-indigo-50 text-indigo-600"
        />


        <KPI
          title="Active Users"
          value={metrics.uniqueOwners}
          subtitle="Unique activity owners"
          icon={Users}
          iconClass="bg-violet-50 text-violet-600"
        />


        <KPI
          title="Linked Records"
          value={metrics.uniqueRelated}
          subtitle="Leads / opportunities / accounts"
          icon={UserCheck}
          iconClass="bg-cyan-50 text-cyan-600"
        />


        <KPI
          title="Completed"
          value={metrics.completed}
          subtitle="Completed / closed activities"
          icon={TrendingUp}
          iconClass="bg-emerald-50 text-emerald-600"
        />


        <KPI
          title="Aging Risk"
          value={metrics.aging}
          subtitle="Activities above 90 days"
          icon={AlertTriangle}
          iconClass="bg-rose-50 text-rose-600"
        />

      </div>


      {/* ==================================================
          TYPE + MONTHLY TREND
      ================================================== */}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 mt-6">


        {/* Activity Type */}

        <ChartCard
          title="Activity Mix"
          subtitle="Distribution by activity type"
        >

          <div className="h-[330px]">

            <ResponsiveContainer
              width="100%"
              height="100%"
            >

              <PieChart>

                <Pie
                  data={typeData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="45%"
                  innerRadius={62}
                  outerRadius={105}
                  paddingAngle={3}
                >

                  {typeData.map(
                    (_, index) => (

                      <Cell
                        key={index}
                        fill={[
                          "#6366f1",
                          "#06b6d4",
                          "#10b981",
                          "#f59e0b",
                          "#f43f5e",
                          "#8b5cf6",
                        ][
                          index % 6
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


        {/* Monthly Trend */}

        <ChartCard
          title="Activity Trend"
          subtitle="Activity volume over time"
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
                    dataKey="activities"
                    name="Activities"
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
          OWNER + STATUS
      ================================================== */}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 mt-6">


        {/* Owner */}

        <ChartCard
          title="Activity by Owner"
          subtitle="Most active sales users"
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
                  width={135}
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
                  dataKey="activities"
                  name="Activities"
                  fill="#6366f1"
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


        {/* Status */}

        <ChartCard
          title="Activity Status"
          subtitle="Current status distribution"
        >

          <div className="h-[360px]">

            <ResponsiveContainer
              width="100%"
              height="100%"
            >

              <BarChart
                data={statusData}
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
                  dataKey="value"
                  name="Activities"
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

      </div>


      {/* ==================================================
          PRIORITY + AGING
      ================================================== */}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 mt-6">


        {/* Priority */}

        <ChartCard
          title="Priority Distribution"
          subtitle="Activity urgency"
        >

          <div className="h-[330px]">

            <ResponsiveContainer
              width="100%"
              height="100%"
            >

              <PieChart>

                <Pie
                  data={priorityData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="45%"
                  innerRadius={60}
                  outerRadius={105}
                  paddingAngle={3}
                >

                  {priorityData.map(
                    (_, index) => (

                      <Cell
                        key={index}
                        fill={[
                          "#f43f5e",
                          "#f59e0b",
                          "#6366f1",
                          "#10b981",
                        ][
                          index % 4
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


        {/* Aging */}

        <ChartCard
          title="Activity Aging"
          subtitle="How old are the activity records?"
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
                  name="Activities"
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
          TOP USERS
      ================================================== */}

      <div className="mt-6">

        <ChartCard
          title="Sales Activity Leaderboard"
          subtitle="Users with the highest activity volume"
        >

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">

            {topUsers.map(
              (user, index) => (

                <div
                  key={user.owner}
                  className="relative bg-slate-50 border border-slate-100 rounded-2xl p-5"
                >

                  <div className="flex items-center justify-between">

                    <div className="flex items-center gap-3">

                      <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-sm">

                        {index + 1}

                      </div>


                      <div>

                        <p className="font-semibold text-sm text-slate-800">

                          {user.owner}

                        </p>


                        <p className="text-xs text-slate-400 mt-1">

                          Activity owner

                        </p>

                      </div>

                    </div>


                    <div className="text-right">

                      <p className="text-lg font-bold text-slate-900">

                        {user.activities.toLocaleString(
                          "en-IN"
                        )}

                      </p>


                      <p className="text-[11px] text-slate-400">

                        activities

                      </p>

                    </div>

                  </div>

                </div>

              )
            )}

          </div>

        </ChartCard>

      </div>


      {/* ==================================================
          AGING MONITOR
      ================================================== */}

      <div className="mt-6">

        <ChartCard
          title="Activity Aging Monitor"
          subtitle="Records older than 90 days"
        >

          {agingActivities.length ? (

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">

              {agingActivities.map(
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

                          {getSubject(row)}

                        </p>


                        <span className="shrink-0 px-2 py-1 rounded-full bg-rose-100 text-rose-700 text-xs font-bold">

                          {age}d

                        </span>

                      </div>


                      <p className="text-xs text-slate-500 mt-2 truncate">

                        {getOwner(row)}

                      </p>


                      <p className="text-xs text-slate-400 mt-1 truncate">

                        {getRelatedTo(row)}

                      </p>

                    </div>

                  );

                }
              )}

            </div>

          ) : (

            <div className="py-12 text-center text-sm text-slate-400">

              No activities above 90 days.

            </div>

          )}

        </ChartCard>

      </div>


      {/* ==================================================
          ACTIVITY REGISTER
      ================================================== */}

      <div className="mt-6">

        <ChartCard

          title="Activity Register"

          subtitle={`Showing ${filteredActivities.length} records`}

          action={

            <button
              onClick={() =>
                downloadCSV(
                  filteredActivities,
                  "activity-register.csv"
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
                    Activity
                  </th>

                  <th className="text-left px-4 py-3 font-semibold text-slate-500 whitespace-nowrap">
                    Type
                  </th>

                  <th className="text-left px-4 py-3 font-semibold text-slate-500 whitespace-nowrap">
                    Owner
                  </th>

                  <th className="text-left px-4 py-3 font-semibold text-slate-500 whitespace-nowrap">
                    Status
                  </th>

                  <th className="text-left px-4 py-3 font-semibold text-slate-500 whitespace-nowrap">
                    Priority
                  </th>

                  <th className="text-left px-4 py-3 font-semibold text-slate-500 whitespace-nowrap">
                    Related To
                  </th>

                  <th className="text-right px-4 py-3 font-semibold text-slate-500 whitespace-nowrap">
                    Age
                  </th>

                  <th className="text-left px-4 py-3 font-semibold text-slate-500 whitespace-nowrap">
                    Date
                  </th>

                </tr>

              </thead>


              <tbody>

                {filteredActivities.map(
                  (row, index) => (

                    <tr
                      key={index}
                      className="border-t border-slate-100 hover:bg-slate-50"
                    >

                      <td className="px-4 py-3 font-medium text-slate-800 max-w-[260px] truncate">

                        {getSubject(row)}

                      </td>


                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">

                        {getActivityType(row)}

                      </td>


                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">

                        {getOwner(row)}

                      </td>


                      <td className="px-4 py-3 whitespace-nowrap">

                        <span className="inline-flex px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-semibold">

                          {getStatus(row)}

                        </span>

                      </td>


                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">

                        {getPriority(row)}

                      </td>


                      <td className="px-4 py-3 text-slate-600 max-w-[220px] truncate">

                        {getRelatedTo(row)}

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


export default Activities;