import { useMemo } from "react";

import {
  Brain,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Users,
  Building2,
  Activity,
  Zap,
  ArrowRight,
} from "lucide-react";

import KPI from "../components/dashboard/KPI";
import ChartCard from "../components/dashboard/ChartCard";
import SectionHeader from "../components/dashboard/SectionHeader";



/* =========================================================
   HEADER-NORMALIZED COLUMN ACCESS
   Keeps Insights compatible with Excel and CSV headers such as
   "Opportunity_ID", "OpportunityID", "Assigned_To", etc.
========================================================= */

function normalizeHeader(value) {
  return String(value ?? "")
    .replace(/^\\uFEFF/, "")
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\\s+/g, " ");
}

function getColumnValue(row, possibleNames = []) {
  if (!row || typeof row !== "object") return "";

  const normalizedMap = new Map(
    Object.entries(row).map(([key, value]) => [normalizeHeader(key), value])
  );

  for (const name of possibleNames) {
    const normalizedName = normalizeHeader(name);
    if (normalizedMap.has(normalizedName)) return normalizedMap.get(normalizedName);
  }

  return "";
}

function column(row, ...names) {
  return getColumnValue(row, names);
}

/* =========================================================
   HELPERS
   (same conventions as Opportunities.jsx / Activities.jsx
   so this page reads the exact same fields consistently)
========================================================= */

function text(value) {
  if (value === null || value === undefined) {
    return "";
  }
  return String(value).trim();
}


function number(value) {
  if (value === null || value === undefined || value === "") {
    return 0;
  }

  const cleaned = String(value)
    .replace(/₹/g, "")
    .replace(/,/g, "")
    .replace(/%/g, "")
    .trim();

  const result = Number(cleaned);

  return Number.isFinite(result) ? result : 0;
}


function getOpportunityValue(row) {
  const annual = number(column(row, "Value of Contract Per Annum INR"));

  if (annual > 0) {
    return annual;
  }

  const monthly = number(column(row, "Revenue potential per month (in INR)"));

  if (monthly > 0) {
    return monthly * 12;
  }

  return 0;
}


function getAge(row) {
  return number(column(row, "Age"));
}


function getOutcome(row) {
  return text(column(row, "Outcome bucket", "Outcome Bucket")) || "Unknown";
}


function getOwner(row) {
  return text(column(row, "Assigned To")) || "Unassigned";
}


function getIndustry(row) {
  return text(column(row, "Industry")) || "Unknown";
}


function getRelatedTo(row) {
  return (
    text(column(row, "Opportunity Name")) ||
    text(column(row, "Opportunity")) ||
    text(column(row, "Lead Name")) ||
    text(column(row, "Customer name", "Customer Name")) ||
    ""
  );
}


function getCurrencySymbol(currency) {
  if (currency === "USD") return "$";
  if (currency === "EUR") return "€";
  return "₹";
}


function formatValue(value, currency = "INR", display = "Crores") {
  const symbol = getCurrencySymbol(currency);
  const numericValue = number(value);

  if (display === "Raw") {
    return `${symbol}${numericValue.toLocaleString("en-IN", {
      maximumFractionDigits: 0,
    })}`;
  }

  if (display === "Lakhs") {
    return `${symbol}${(numericValue / 100000).toFixed(2)} L`;
  }

  return `${symbol}${(numericValue / 10000000).toFixed(2)} Cr`;
}


/*
 * Sensitivity controls how "loud" the insight feed is —
 * how many items surface and how tight the thresholds are.
 * Low = fewer, only the most severe signals.
 * High = more signals, looser thresholds.
 */
function getSensitivityConfig(level) {
  if (level === "Low") {
    return { maxItems: 3, agingMultiplier: 1.5, shareThreshold: 0.35 };
  }

  if (level === "High") {
    return { maxItems: 10, agingMultiplier: 0.75, shareThreshold: 0.15 };
  }

  // Medium (default)
  return { maxItems: 6, agingMultiplier: 1, shareThreshold: 0.25 };
}


/* =========================================================
   INSIGHT CARD
========================================================= */

function InsightCard({ severity, icon: Icon, title, description }) {
  const styles = {
    critical: {
      bg: "bg-rose-50",
      border: "border-rose-100",
      iconBg: "bg-rose-100 text-rose-600",
    },
    warning: {
      bg: "bg-amber-50",
      border: "border-amber-100",
      iconBg: "bg-amber-100 text-amber-600",
    },
    positive: {
      bg: "bg-emerald-50",
      border: "border-emerald-100",
      iconBg: "bg-emerald-100 text-emerald-600",
    },
    info: {
      bg: "bg-indigo-50",
      border: "border-indigo-100",
      iconBg: "bg-indigo-100 text-indigo-600",
    },
  };

  const style = styles[severity] || styles.info;

  return (
    <div
      className={`flex items-start gap-4 p-4 rounded-xl border ${style.bg} ${style.border}`}
    >
      <div
        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${style.iconBg}`}
      >
        <Icon size={18} />
      </div>

      <div className="min-w-0">
        <p className="font-semibold text-sm text-slate-800">{title}</p>
        <p className="text-sm text-slate-500 mt-1">{description}</p>
      </div>
    </div>
  );
}


/* =========================================================
   MAIN COMPONENT
========================================================= */

function Insights({ data, settings }) {

  const opportunities =
    data?.currentOpportunities ||
    data?.opportunities ||
    [];

  const activities =
    data?.activities || [];

  const currency = settings.currency;
  const valueDisplay = settings.valueDisplay;

  const ageWarning = settings.opportunityRisk.ageWarning;
  const ageCritical = settings.opportunityRisk.ageCritical;
  const highValueThreshold = settings.opportunityRisk.highValueThreshold;
  const highValueThresholdAmount = highValueThreshold * 10000000;

  const minimumActivities = settings.activityRisk.minimumActivities;

  const toggles = settings.insights;

  const sensitivity = getSensitivityConfig(settings.insightSensitivity);


  /* =======================================================
     ACTIVITY COUNT PER OPPORTUNITY
     (the piece nothing else in the app currently computes —
     this is what powers "low engagement" detection)
  ======================================================= */

  const activityCountByRecord = useMemo(() => {
    const map = {};

    activities.forEach((row) => {
      const related = getRelatedTo(row);

      if (!related) {
        return;
      }

      map[related] = (map[related] || 0) + 1;
    });

    return map;
  }, [activities]);


  /* =======================================================
     PIPELINE ALERTS
     Flags concentration risk: is pipeline value dangerously
     dependent on a small number of large deals?
  ======================================================= */

  const pipelineAlerts = useMemo(() => {
    if (!toggles.pipelineAlerts || !opportunities.length) {
      return [];
    }

    const activeOpps = opportunities.filter((row) =>
      getOutcome(row).toLowerCase().includes("active")
    );

    const totalActiveValue = activeOpps.reduce(
      (sum, row) => sum + getOpportunityValue(row),
      0
    );

    if (!totalActiveValue) {
      return [];
    }

    const sorted = [...activeOpps].sort(
      (a, b) => getOpportunityValue(b) - getOpportunityValue(a)
    );

    const topOpp = sorted[0];
    const topShare = topOpp
      ? getOpportunityValue(topOpp) / totalActiveValue
      : 0;

    const results = [];

    if (topShare >= sensitivity.shareThreshold) {
      results.push({
        severity: topShare >= sensitivity.shareThreshold * 1.5 ? "critical" : "warning",
        icon: AlertTriangle,
        title: "Pipeline concentration risk",
        description: `${text(column(topOpp, "Opportunity Name")) || "One opportunity"} accounts for ${(topShare * 100).toFixed(0)}% of active pipeline value (${formatValue(getOpportunityValue(topOpp), currency, valueDisplay)}). Losing it would materially impact forecast.`,
      });
    }

    const top5Value = sorted
      .slice(0, 5)
      .reduce((sum, row) => sum + getOpportunityValue(row), 0);

    const top5Share = top5Value / totalActiveValue;

    if (top5Share >= sensitivity.shareThreshold * 2 && sorted.length > 5) {
      results.push({
        severity: "info",
        icon: TrendingUp,
        title: "Top 5 deals drive most of the pipeline",
        description: `The 5 largest active opportunities represent ${(top5Share * 100).toFixed(0)}% of total active pipeline value (${formatValue(top5Value, currency, valueDisplay)} of ${formatValue(totalActiveValue, currency, valueDisplay)}).`,
      });
    }

    return results;
  }, [opportunities, toggles.pipelineAlerts, sensitivity, currency, valueDisplay]);


  /* =======================================================
     AGING ALERTS
     Uses settings.opportunityRisk directly.
  ======================================================= */

  const agingAlerts = useMemo(() => {
    if (!toggles.agingAlerts || !opportunities.length) {
      return [];
    }

    const activeOpps = opportunities.filter((row) =>
      getOutcome(row).toLowerCase().includes("active")
    );

    const adjustedCritical = Math.round(ageCritical * sensitivity.agingMultiplier);

    const critical = activeOpps.filter((row) => getAge(row) > adjustedCritical);

    if (!critical.length) {
      return [];
    }

    const criticalValue = critical.reduce(
      (sum, row) => sum + getOpportunityValue(row),
      0
    );

    return [
      {
        severity: critical.length > activeOpps.length * 0.2 ? "critical" : "warning",
        icon: AlertTriangle,
        title: `${critical.length} opportunit${critical.length === 1 ? "y" : "ies"} aging past ${adjustedCritical} days`,
        description: `Representing ${formatValue(criticalValue, currency, valueDisplay)} in pipeline value. Opportunities this old typically need re-qualification or escalation to close.`,
      },
    ];
  }, [opportunities, toggles.agingAlerts, ageCritical, sensitivity, currency, valueDisplay]);


  /* =======================================================
     FORECAST SIGNALS
     Compares recent vs. prior period creation volume/value.
  ======================================================= */

  const forecastSignals = useMemo(() => {
    if (!toggles.forecastSignals || !opportunities.length) {
      return [];
    }

    const monthMap = {};

    opportunities.forEach((row) => {
      const month = text(column(row, "Opportunity Month (G)", "Opportunity Month")) || "Unknown";

      if (!monthMap[month]) {
        monthMap[month] = { count: 0, value: 0 };
      }

      monthMap[month].count += 1;
      monthMap[month].value += getOpportunityValue(row);
    });

    const months = Object.keys(monthMap).filter((m) => m !== "Unknown");

    if (months.length < 2) {
      return [];
    }

    const last = monthMap[months[months.length - 1]];
    const prior = monthMap[months[months.length - 2]];

    if (!prior || !prior.value) {
      return [];
    }

    const change = (last.value - prior.value) / prior.value;

    if (Math.abs(change) < sensitivity.shareThreshold / 2) {
      return [];
    }

    const rising = change > 0;

    return [
      {
        severity: rising ? "positive" : "warning",
        icon: rising ? TrendingUp : TrendingDown,
        title: `Pipeline creation ${rising ? "up" : "down"} ${Math.abs(change * 100).toFixed(0)}% month-over-month`,
        description: `${months[months.length - 1]} added ${formatValue(last.value, currency, valueDisplay)} in new pipeline vs ${formatValue(prior.value, currency, valueDisplay)} the prior month.`,
      },
    ];
  }, [opportunities, toggles.forecastSignals, sensitivity, currency, valueDisplay]);


  /* =======================================================
     OWNER PERFORMANCE
  ======================================================= */

  const ownerPerformanceInsights = useMemo(() => {
    if (!toggles.ownerPerformance || !opportunities.length) {
      return [];
    }

    const map = {};

    opportunities.forEach((row) => {
      const owner = getOwner(row);

      if (!map[owner]) {
        map[owner] = { won: 0, lost: 0, active: 0, value: 0 };
      }

      const outcome = getOutcome(row).toLowerCase();

      if (outcome.includes("won")) map[owner].won += 1;
      else if (outcome.includes("lost")) map[owner].lost += 1;
      else if (outcome.includes("active")) map[owner].active += 1;

      map[owner].value += getOpportunityValue(row);
    });

    const owners = Object.entries(map)
      .map(([owner, stats]) => {
        const decided = stats.won + stats.lost;
        const winRate = decided ? stats.won / decided : null;
        return { owner, ...stats, winRate };
      })
      .filter((o) => o.won + o.lost >= 3);

    if (!owners.length) {
      return [];
    }

    const sorted = [...owners].sort((a, b) => (b.winRate ?? 0) - (a.winRate ?? 0));

    const top = sorted[0];
    const bottom = sorted[sorted.length - 1];

    const results = [];

    if (top && top.winRate !== null) {
      results.push({
        severity: "positive",
        icon: Users,
        title: `${top.owner} leads on win rate`,
        description: `${(top.winRate * 100).toFixed(0)}% win rate across ${top.won + top.lost} decided opportunities, contributing ${formatValue(top.value, currency, valueDisplay)} in pipeline value.`,
      });
    }

    if (
      bottom &&
      bottom.winRate !== null &&
      bottom.owner !== top?.owner &&
      bottom.winRate < sensitivity.shareThreshold
    ) {
      results.push({
        severity: "warning",
        icon: Users,
        title: `${bottom.owner} may need support`,
        description: `${(bottom.winRate * 100).toFixed(0)}% win rate across ${bottom.won + bottom.lost} decided opportunities — noticeably below team average.`,
      });
    }

    return results;
  }, [opportunities, toggles.ownerPerformance, sensitivity, currency, valueDisplay]);


  /* =======================================================
     INDUSTRY TRENDS
  ======================================================= */

  const industryTrendInsights = useMemo(() => {
    if (!toggles.industryTrends || !opportunities.length) {
      return [];
    }

    const map = {};

    opportunities.forEach((row) => {
      const industry = getIndustry(row);

      if (!map[industry]) {
        map[industry] = { count: 0, value: 0 };
      }

      map[industry].count += 1;
      map[industry].value += getOpportunityValue(row);
    });

    const totalValue = Object.values(map).reduce((sum, i) => sum + i.value, 0);

    if (!totalValue) {
      return [];
    }

    const sorted = Object.entries(map)
      .map(([industry, stats]) => ({
        industry,
        ...stats,
        share: stats.value / totalValue,
      }))
      .filter((i) => i.industry !== "Unknown")
      .sort((a, b) => b.value - a.value);

    if (!sorted.length) {
      return [];
    }

    const leader = sorted[0];

    if (leader.share < sensitivity.shareThreshold) {
      return [];
    }

    return [
      {
        severity: "info",
        icon: Building2,
        title: `${leader.industry} is your leading industry`,
        description: `${leader.count} opportunities worth ${formatValue(leader.value, currency, valueDisplay)}, or ${(leader.share * 100).toFixed(0)}% of total pipeline value.`,
      },
    ];
  }, [opportunities, toggles.industryTrends, sensitivity, currency, valueDisplay]);


  /* =======================================================
     ACTIVITY INSIGHTS (low engagement)
     Uses settings.activityRisk.minimumActivities — the one
     setting with no other consumer in the app.
  ======================================================= */

  const lowEngagementOpportunities = useMemo(() => {
    if (!toggles.activityInsights) {
      return [];
    }

    const activeOpps = opportunities.filter((row) =>
      getOutcome(row).toLowerCase().includes("active")
    );

    return activeOpps
      .map((row) => {
        const name = text(column(row, "Opportunity Name"));
        const count = activityCountByRecord[name] || 0;

        return { row, name, count };
      })
      .filter((item) => item.name && item.count < minimumActivities)
      .sort((a, b) => a.count - b.count)
      .slice(0, sensitivity.maxItems);
  }, [
    opportunities,
    activityCountByRecord,
    toggles.activityInsights,
    minimumActivities,
    sensitivity,
  ]);


  const activityInsightSummary = useMemo(() => {
    if (!toggles.activityInsights || !lowEngagementOpportunities.length) {
      return [];
    }

    const totalValue = lowEngagementOpportunities.reduce(
      (sum, item) => sum + getOpportunityValue(item.row),
      0
    );

    return [
      {
        severity: "warning",
        icon: Zap,
        title: `${lowEngagementOpportunities.length} active opportunit${lowEngagementOpportunities.length === 1 ? "y has" : "ies have"} fewer than ${minimumActivities} logged activities`,
        description: `Representing ${formatValue(totalValue, currency, valueDisplay)} in pipeline value. Low activity volume on active deals is often an early sign of stalled progress.`,
      },
    ];
  }, [lowEngagementOpportunities, toggles.activityInsights, minimumActivities, currency, valueDisplay]);


  /* =======================================================
     COMBINE + RANK ALL INSIGHTS
  ======================================================= */

  const allInsights = useMemo(() => {
    const severityRank = { critical: 0, warning: 1, info: 2, positive: 3 };

    const combined = [
      ...pipelineAlerts,
      ...agingAlerts,
      ...forecastSignals,
      ...ownerPerformanceInsights,
      ...industryTrendInsights,
      ...activityInsightSummary,
    ];

    return combined
      .sort((a, b) => severityRank[a.severity] - severityRank[b.severity])
      .slice(0, sensitivity.maxItems);
  }, [
    pipelineAlerts,
    agingAlerts,
    forecastSignals,
    ownerPerformanceInsights,
    industryTrendInsights,
    activityInsightSummary,
    sensitivity,
  ]);


  const activeToggleCount = Object.values(toggles).filter(Boolean).length;


  /* =======================================================
     EMPTY STATE
  ======================================================= */

  if (!opportunities.length && !activities.length) {
    return (
      <div className="p-8">
        <SectionHeader
          title="Sales Intelligence"
          subtitle="Automated signals surfaced from your pipeline and activity data."
        />

        <div className="bg-white border border-slate-200 rounded-2xl p-16 text-center mt-6">
          <Brain size={42} className="mx-auto text-slate-300" />

          <h2 className="text-xl font-bold text-slate-900 mt-5">
            No data available for insights
          </h2>

          <p className="text-slate-400 mt-2">
            Upload opportunity and activity data from Excel or CSV files to generate intelligence signals.
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

      <SectionHeader
        title="Sales Intelligence"
        subtitle={`${activeToggleCount} of 6 signal types enabled • Sensitivity: ${settings.insightSensitivity}`}
      />


      {/* ==================================================
          KPI SUMMARY
      ================================================== */}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">

        <KPI
          title="Active Insights"
          value={allInsights.length}
          subtitle="Signals surfaced this run"
          icon={Brain}
          iconClass="bg-violet-50 text-violet-600"
        />

        <KPI
          title="Critical / Warning"
          value={
            allInsights.filter(
              (i) => i.severity === "critical" || i.severity === "warning"
            ).length
          }
          subtitle="Requiring attention"
          icon={AlertTriangle}
          iconClass="bg-rose-50 text-rose-600"
        />

        <KPI
          title="Low Engagement"
          value={lowEngagementOpportunities.length}
          subtitle={`Below ${minimumActivities} activities`}
          icon={Zap}
          iconClass="bg-amber-50 text-amber-600"
        />

        <KPI
          title="High-Value Deals"
          value={
            highValueThreshold > 0
              ? opportunities.filter(
                  (row) => getOpportunityValue(row) >= highValueThresholdAmount
                ).length
              : 0
          }
          subtitle={
            highValueThreshold > 0
              ? `Above ${formatValue(highValueThresholdAmount, currency, valueDisplay)}`
              : "No threshold set"
          }
          icon={TrendingUp}
          iconClass="bg-indigo-50 text-indigo-600"
        />

      </div>


      {/* ==================================================
          INSIGHT FEED
      ================================================== */}

      <div className="mt-6">
        <ChartCard
          title="Intelligence Feed"
          subtitle="Ranked by severity, filtered by your sensitivity setting"
        >
          {allInsights.length ? (
            <div className="space-y-3">
              {allInsights.map((insight, index) => (
                <InsightCard key={index} {...insight} />
              ))}
            </div>
          ) : (
            <div className="py-12 text-center text-sm text-slate-400">
              No signals to report right now. Enable more signal types in
              Settings or adjust sensitivity to see more.
            </div>
          )}
        </ChartCard>
      </div>


      {/* ==================================================
          LOW ENGAGEMENT TABLE
      ================================================== */}

      {toggles.activityInsights && lowEngagementOpportunities.length > 0 && (
        <div className="mt-6">
          <ChartCard
            title="Low-Engagement Opportunities"
            subtitle={`Active opportunities with fewer than ${minimumActivities} logged activities`}
          >
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left py-3 pr-4 font-semibold text-slate-500">
                      Opportunity
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-500">
                      Owner
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-500">
                      Stage
                    </th>
                    <th className="text-right py-3 px-4 font-semibold text-slate-500">
                      Activities
                    </th>
                    <th className="text-right py-3 pl-4 font-semibold text-slate-500">
                      Value
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {lowEngagementOpportunities.map((item, index) => (
                    <tr
                      key={column(item.row, "Opportunity ID") || index}
                      className="border-b border-slate-50 hover:bg-slate-50 transition"
                    >
                      <td className="py-4 pr-4 font-semibold text-slate-800">
                        {item.name || "Unnamed"}
                      </td>

                      <td className="py-4 px-4 text-slate-600">
                        {getOwner(item.row)}
                      </td>

                      <td className="py-4 px-4">
                        <span className="inline-flex px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-semibold">
                          {text(column(item.row, "Opportunity Stage")) || "Unknown"}
                        </span>
                      </td>

                      <td className="py-4 px-4 text-right">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-semibold">
                          <Activity size={12} />
                          {item.count}
                        </span>
                      </td>

                      <td className="py-4 pl-4 text-right font-bold text-slate-900">
                        {formatValue(
                          getOpportunityValue(item.row),
                          currency,
                          valueDisplay
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </ChartCard>
        </div>
      )}


      {/* ==================================================
          DISABLED SIGNALS NOTICE
      ================================================== */}

      {activeToggleCount < 6 && (
        <div className="mt-6 flex items-center justify-between px-5 py-4 rounded-2xl bg-slate-50 border border-slate-200">
          <p className="text-sm text-slate-500">
            {6 - activeToggleCount} signal type
            {6 - activeToggleCount === 1 ? "" : "s"} currently disabled in
            Settings.
          </p>

          <span className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600">
            Go to Settings <ArrowRight size={13} />
          </span>
        </div>
      )}

    </div>
  );
}


export default Insights;