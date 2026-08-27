import { useState } from "react";

import {
  Settings as SettingsIcon,
  SlidersHorizontal,
  Brain,
  Database,
  RefreshCw,
  RotateCcw,
  Check,
  FileSpreadsheet,
  BriefcaseBusiness,
  Users,
  Activity,
  TrendingUp,
} from "lucide-react";

import SectionHeader from "../components/dashboard/SectionHeader";


function SettingsPage({ data, settings, setSettings, resetSettings }) {

  /* =========================================================
     SETTINGS STATE
     (seeded from the `settings` prop coming from App.jsx,
     NOT from localStorage directly — App.jsx already owns
     that read on startup via loadSavedSettings())
  ========================================================= */

  const [currency, setCurrency] =
    useState(settings.currency);

  const [valueDisplay, setValueDisplay] =
    useState(settings.valueDisplay);

  const [defaultPage, setDefaultPage] =
    useState(settings.defaultPage);

  const [ageWarning, setAgeWarning] =
    useState(settings.opportunityRisk.ageWarning);

  const [ageCritical, setAgeCritical] =
    useState(settings.opportunityRisk.ageCritical);

  const [highValueThreshold, setHighValueThreshold] =
    useState(settings.opportunityRisk.highValueThreshold);

  const [minimumActivities, setMinimumActivities] =
    useState(settings.activityRisk.minimumActivities);

  const [forecastHorizon, setForecastHorizon] =
    useState(settings.forecast.horizon);

  const [insightSensitivity, setInsightSensitivity] =
    useState(settings.insightSensitivity);

  /* =========================================================
     INTELLIGENCE TOGGLES
  ========================================================= */

  const [insights, setInsights] = useState(settings.insights);


  function toggleInsight(key) {

    setInsights((previous) => ({

      ...previous,

      [key]: !previous[key],

    }));

  }


  /* =========================================================
     DATA SUMMARY
  ========================================================= */

  const opportunities =
    data?.opportunities ||
    data?.currentOpportunities ||
    [];

  const leads =
    data?.leads || [];

  const activities =
    data?.activities || [];


  const loadedFiles =
    data?.files?.length ||
    (data?.fileName ? 1 : 0);


  /* =========================================================
     SAVE SETTINGS
     Pushes the new settings object up to App.jsx via the
     setSettings prop (App.jsx's updateSettings), which is
     what actually re-renders every other page AND persists
     to localStorage. This component no longer touches
     localStorage directly.
  ========================================================= */

  function saveSettings() {

    const newSettings = {

      currency,

      valueDisplay,

      defaultPage,

      opportunityRisk: {

        ageWarning,
        ageCritical,
        highValueThreshold,

      },

      activityRisk: {

        minimumActivities,

      },

      forecast: {

        horizon: forecastHorizon,

      },

      insightSensitivity,

      insights,

    };


    setSettings(newSettings);


    alert(
      "Dashboard settings saved successfully."
    );

  }


  /* =========================================================
     RESET SETTINGS
     Delegates to App.jsx's resetSettings (which updates
     App's state + localStorage), then syncs the local
     form fields to match so the inputs reflect the reset.
  ========================================================= */

  function handleReset() {

    resetSettings();

    setCurrency("INR");

    setValueDisplay("Crores");

    setDefaultPage("Overview");

    setAgeWarning(60);

    setAgeCritical(90);

    setHighValueThreshold(1);

    setMinimumActivities(3);

    setForecastHorizon(3);

    setInsightSensitivity("Medium");

    setInsights({

      pipelineAlerts: true,

      agingAlerts: true,

      forecastSignals: true,

      ownerPerformance: true,

      industryTrends: true,

      activityInsights: true,

    });

  }


  /* =========================================================
     INPUT STYLE
  ========================================================= */

  const inputClass =
    "w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100";


  /* =========================================================
     TOGGLE COMPONENT
  ========================================================= */

  function Toggle({
    enabled,
    onClick,
  }) {

    return (

      <button
        type="button"
        onClick={onClick}
        className={`relative w-11 h-6 rounded-full transition ${
          enabled
            ? "bg-indigo-600"
            : "bg-slate-300"
        }`}
      >

        <span
          className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition ${
            enabled
              ? "left-6"
              : "left-1"
          }`}
        />

      </button>

    );

  }


  /* =========================================================
     PAGE
  ========================================================= */

  return (

    <div className="p-8">

      {/* =====================================================
          HEADER
      ===================================================== */}

      <SectionHeader
        title="Dashboard Settings"
        subtitle="Configure how your sales intelligence dashboard analyses and presents your data."
        action={

          <div className="flex items-center gap-3">

            <button
              onClick={handleReset}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50"
            >

              <RotateCcw size={16} />

              Reset

            </button>


            <button
              onClick={saveSettings}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 shadow-sm"
            >

              <Check size={16} />

              Save Settings

            </button>

          </div>

        }
      />


      {/* =====================================================
          DATA SUMMARY
      ===================================================== */}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 mt-6">

        <div className="bg-white border border-slate-200 rounded-2xl p-5">

          <div className="flex items-center gap-3">

            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">

              <FileSpreadsheet size={19} />

            </div>

            <div>

              <p className="text-xs text-slate-400">
                Files Loaded
              </p>

              <p className="text-xl font-bold text-slate-900">
                {loadedFiles}
              </p>

            </div>

          </div>

        </div>


        <div className="bg-white border border-slate-200 rounded-2xl p-5">

          <div className="flex items-center gap-3">

            <div className="w-10 h-10 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center">

              <BriefcaseBusiness size={19} />

            </div>

            <div>

              <p className="text-xs text-slate-400">
                Opportunities
              </p>

              <p className="text-xl font-bold text-slate-900">
                {opportunities.length.toLocaleString("en-IN")}
              </p>

            </div>

          </div>

        </div>


        <div className="bg-white border border-slate-200 rounded-2xl p-5">

          <div className="flex items-center gap-3">

            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">

              <Users size={19} />

            </div>

            <div>

              <p className="text-xs text-slate-400">
                Leads
              </p>

              <p className="text-xl font-bold text-slate-900">
                {leads.length.toLocaleString("en-IN")}
              </p>

            </div>

          </div>

        </div>


        <div className="bg-white border border-slate-200 rounded-2xl p-5">

          <div className="flex items-center gap-3">

            <div className="w-10 h-10 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center">

              <Activity size={19} />

            </div>

            <div>

              <p className="text-xs text-slate-400">
                Activities
              </p>

              <p className="text-xl font-bold text-slate-900">
                {activities.length.toLocaleString("en-IN")}
              </p>

            </div>

          </div>

        </div>

      </div>


      {/* =====================================================
          DASHBOARD PREFERENCES
      ===================================================== */}

      <div className="mt-6 bg-white border border-slate-200 rounded-2xl overflow-hidden">

        <div className="p-6 border-b border-slate-100">

          <div className="flex items-center gap-3">

            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">

              <SettingsIcon size={20} />

            </div>

            <div>

              <h2 className="font-bold text-slate-900">
                Dashboard Preferences
              </h2>

              <p className="text-sm text-slate-400 mt-1">
                Control the default dashboard experience.
              </p>

            </div>

          </div>

        </div>


        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-5">

          <div>

            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Currency
            </label>

            <select
              value={currency}
              onChange={(e) =>
                setCurrency(e.target.value)
              }
              className={inputClass}
            >

              <option value="INR">
                INR — Indian Rupee
              </option>

              <option value="USD">
                USD — US Dollar
              </option>

              <option value="EUR">
                EUR — Euro
              </option>

            </select>

          </div>


          <div>

            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Value Display
            </label>

            <select
              value={valueDisplay}
              onChange={(e) =>
                setValueDisplay(e.target.value)
              }
              className={inputClass}
            >

              <option value="Raw">
                Raw Value
              </option>

              <option value="Lakhs">
                Lakhs
              </option>

              <option value="Crores">
                Crores
              </option>

            </select>

          </div>


          <div>

            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Default Landing Page
            </label>

            <select
              value={defaultPage}
              onChange={(e) =>
                setDefaultPage(e.target.value)
              }
              className={inputClass}
            >

              <option>Overview</option>
              <option>Opportunities</option>
              <option>Leads</option>
              <option>Activities</option>
              <option>Forecast</option>

            </select>

          </div>

        </div>

      </div>


      {/* =====================================================
          OPPORTUNITY RISK
      ===================================================== */}

      <div className="mt-6 bg-white border border-slate-200 rounded-2xl overflow-hidden">

        <div className="p-6 border-b border-slate-100">

          <div className="flex items-center gap-3">

            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">

              <SlidersHorizontal size={20} />

            </div>

            <div>

              <h2 className="font-bold text-slate-900">
                Opportunity Risk Rules
              </h2>

              <p className="text-sm text-slate-400 mt-1">
                Define when an opportunity should be considered at risk.
              </p>

            </div>

          </div>

        </div>


        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-5">

          <div>

            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Aging Warning
            </label>

            <div className="relative">

              <input
                type="number"
                min="1"
                value={ageWarning}
                onChange={(e) =>
                  setAgeWarning(
                    Number(e.target.value)
                  )
                }
                className={inputClass}
              />

              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                days
              </span>

            </div>

          </div>


          <div>

            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Aging Critical
            </label>

            <div className="relative">

              <input
                type="number"
                min="1"
                value={ageCritical}
                onChange={(e) =>
                  setAgeCritical(
                    Number(e.target.value)
                  )
                }
                className={inputClass}
              />

              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                days
              </span>

            </div>

          </div>


          <div>

            <label className="block text-sm font-semibold text-slate-700 mb-2">
              High-Value Threshold
            </label>

            <div className="relative">

              <input
                type="number"
                min="0"
                step="0.1"
                value={highValueThreshold}
                onChange={(e) =>
                  setHighValueThreshold(
                    Number(e.target.value)
                  )
                }
                className={inputClass}
              />

              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                ₹ Cr
              </span>

            </div>

          </div>

        </div>

      </div>


      {/* =====================================================
          ACTIVITY RULES + FORECAST
      ===================================================== */}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mt-6">


        {/* Activity */}

        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">

          <div className="p-6 border-b border-slate-100">

            <div className="flex items-center gap-3">

              <div className="w-10 h-10 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center">

                <Activity size={20} />

              </div>

              <div>

                <h2 className="font-bold text-slate-900">
                  Activity Rules
                </h2>

                <p className="text-sm text-slate-400 mt-1">
                  Identify opportunities with low engagement.
                </p>

              </div>

            </div>

          </div>


          <div className="p-6">

            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Minimum Activities
            </label>

            <input
              type="number"
              min="0"
              value={minimumActivities}
              onChange={(e) =>
                setMinimumActivities(
                  Number(e.target.value)
                )
              }
              className={inputClass}
            />

            <p className="text-xs text-slate-400 mt-2">
              Opportunities with fewer activities can be flagged as low engagement.
            </p>

          </div>

        </div>


        {/* Forecast */}

        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">

          <div className="p-6 border-b border-slate-100">

            <div className="flex items-center gap-3">

              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">

                <TrendingUp size={20} />

              </div>

              <div>

                <h2 className="font-bold text-slate-900">
                  Forecast Configuration
                </h2>

                <p className="text-sm text-slate-400 mt-1">
                  Configure how far ahead the forecast should look.
                </p>

              </div>

            </div>

          </div>


          <div className="p-6">

            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Forecast Horizon
            </label>

            <select
              value={forecastHorizon}
              onChange={(e) =>
                setForecastHorizon(
                  Number(e.target.value)
                )
              }
              className={inputClass}
            >

              <option value={1}>
                1 month
              </option>

              <option value={3}>
                3 months
              </option>

              <option value={6}>
                6 months
              </option>

              <option value={12}>
                12 months
              </option>

            </select>

          </div>

        </div>

      </div>


      {/* =====================================================
          INTELLIGENCE SETTINGS
      ===================================================== */}

      <div className="mt-6 bg-white border border-slate-200 rounded-2xl overflow-hidden">

        <div className="p-6 border-b border-slate-100">

          <div className="flex items-center gap-3">

            <div className="w-10 h-10 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center">

              <Brain size={20} />

            </div>

            <div>

              <h2 className="font-bold text-slate-900">
                Sales Intelligence
              </h2>

              <p className="text-sm text-slate-400 mt-1">
                Choose which intelligence signals appear throughout the dashboard.
              </p>

            </div>

          </div>

        </div>


        <div className="p-6">

          <div className="mb-6">

            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Insight Sensitivity
            </label>

            <div className="flex gap-2">

              {["Low", "Medium", "High"].map(
                (level) => (

                  <button
                    key={level}
                    onClick={() =>
                      setInsightSensitivity(
                        level
                      )
                    }
                    className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
                      insightSensitivity === level
                        ? "bg-indigo-600 text-white"
                        : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                    }`}
                  >

                    {level}

                  </button>

                )
              )}

            </div>

          </div>


          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">

            {[
              [
                "pipelineAlerts",
                "Pipeline Alerts",
                "Highlight significant pipeline changes.",
              ],

              [
                "agingAlerts",
                "Aging Risk Alerts",
                "Flag opportunities that are becoming stale.",
              ],

              [
                "forecastSignals",
                "Forecast Signals",
                "Show projected pipeline movements.",
              ],

              [
                "ownerPerformance",
                "Owner Performance",
                "Surface sales-owner performance signals.",
              ],

              [
                "industryTrends",
                "Industry Trends",
                "Identify industries contributing to pipeline.",
              ],

              [
                "activityInsights",
                "Activity Insights",
                "Detect low-engagement opportunities.",
              ],

            ].map(
              ([
                key,
                title,
                description,
              ]) => (

                <div
                  key={key}
                  className="flex items-center justify-between p-4 rounded-xl border border-slate-200 hover:bg-slate-50 transition"
                >

                  <div className="min-w-0">

                    <p className="font-semibold text-sm text-slate-800">
                      {title}
                    </p>

                    <p className="text-xs text-slate-400 mt-1">
                      {description}
                    </p>

                  </div>


                  <div className="ml-4 shrink-0">

                    <Toggle
                      enabled={
                        insights[key]
                      }
                      onClick={() =>
                        toggleInsight(key)
                      }
                    />

                  </div>

                </div>

              )
            )}

          </div>

        </div>

      </div>


      {/* =====================================================
          DATA MANAGEMENT
      ===================================================== */}

      <div className="mt-6 bg-white border border-slate-200 rounded-2xl overflow-hidden">

        <div className="p-6 border-b border-slate-100">

          <div className="flex items-center gap-3">

            <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center">

              <Database size={20} />

            </div>

            <div>

              <h2 className="font-bold text-slate-900">
                Data Management
              </h2>

              <p className="text-sm text-slate-400 mt-1">
                Manage the currently loaded workbook data.
              </p>

            </div>

          </div>

        </div>


        <div className="p-6 flex flex-wrap gap-3">

          <button
            onClick={() =>
              window.location.reload()
            }
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-sm font-semibold text-slate-600"
          >

            <RefreshCw size={16} />

            Reload Dashboard

          </button>


          <button
            onClick={() => {

              handleReset();

              alert(
                "Saved settings cleared."
              );

            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-sm font-semibold text-rose-600"
          >

            <RotateCcw size={16} />

            Clear Saved Settings

          </button>

        </div>

      </div>


      {/* =====================================================
          FOOTER
      ===================================================== */}

      <div className="mt-6 flex items-center justify-between text-xs text-slate-400">

        <p>
          Sales Intelligence Dashboard
        </p>

        <p>
          Settings are saved locally in your browser.
        </p>

      </div>

    </div>

  );

}


export default SettingsPage;