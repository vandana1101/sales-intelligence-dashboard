import { useState } from "react";

import SettingsPage from "./pages/Settings";
import UploadCenter from "./components/UploadCenter";

import Sidebar from "./components/dashboard/Sidebar";

import Overview from "./pages/Overview";
import Opportunities from "./pages/Opportunities";
import Leads from "./pages/Leads";
import Activities from "./pages/Activities";
import Insights from "./pages/Insights";
import MonthComparison from "./pages/MonthComparison";
import Forecast from "./pages/Forecast";
import CustomCharts from "./pages/CustomCharts";

import { readWorkbook } from "./parser/workbookReader";
import { classifySheets } from "./parser/sheetClassifier";
import { processWorkbook } from "./calculations/dataProcessor";


/* =========================================================
   DEFAULT SETTINGS
========================================================= */

const DEFAULT_SETTINGS = {

  currency: "INR",

  valueDisplay: "Crores",

  defaultPage: "Overview",

  opportunityRisk: {

    ageWarning: 60,

    ageCritical: 90,

    highValueThreshold: 1,

  },

  activityRisk: {

    minimumActivities: 3,

  },

  forecast: {

    horizon: 3,

  },

  insightSensitivity: "Medium",

  insights: {

    pipelineAlerts: true,

    agingAlerts: true,

    forecastSignals: true,

    ownerPerformance: true,

    industryTrends: true,

    activityInsights: true,

  },

};


/* =========================================================
   LOAD SAVED SETTINGS
========================================================= */

function loadSavedSettings() {

  try {

    const saved =
      localStorage.getItem(
        "salesDashboardSettings"
      );


    if (!saved) {

      return DEFAULT_SETTINGS;

    }


    const parsed =
      JSON.parse(saved);


    /*
     * Merge saved settings with defaults.
     *
     * This is important because if we add a new
     * setting in the future, older users will
     * automatically receive the new default.
     */

    return {

      ...DEFAULT_SETTINGS,

      ...parsed,

      opportunityRisk: {

        ...DEFAULT_SETTINGS.opportunityRisk,

        ...(parsed.opportunityRisk || {}),

      },

      activityRisk: {

        ...DEFAULT_SETTINGS.activityRisk,

        ...(parsed.activityRisk || {}),

      },

      forecast: {

        ...DEFAULT_SETTINGS.forecast,

        ...(parsed.forecast || {}),

      },

      insights: {

        ...DEFAULT_SETTINGS.insights,

        ...(parsed.insights || {}),

      },

    };

  } catch (error) {

    console.warn(
      "Could not load saved dashboard settings:",
      error
    );


    return DEFAULT_SETTINGS;

  }

}


/* =========================================================
   MAIN APP
========================================================= */

function App() {

  /* =======================================================
     DATA STATE
  ======================================================= */

  const [
    files,
    setFiles,
  ] = useState([]);


  const [
    data,
    setData,
  ] = useState(null);


  const [
    loading,
    setLoading,
  ] = useState(false);


  /* =======================================================
     NAVIGATION STATE
  ======================================================= */

  const [
    activePage,
    setActivePage,
  ] = useState("overview");


  /* =======================================================
     GLOBAL SETTINGS STATE
  ======================================================= */

  const [
    settings,
    setSettings,
  ] = useState(
    loadSavedSettings
  );


  /* =======================================================
     UPDATE SETTINGS
  ======================================================= */

  function updateSettings(
    newSettings
  ) {

    setSettings(
      newSettings
    );


    try {

      localStorage.setItem(
        "salesDashboardSettings",
        JSON.stringify(
          newSettings
        )
      );

    } catch (error) {

      console.warn(
        "Could not save dashboard settings:",
        error
      );

    }

  }


  /* =======================================================
     RESET SETTINGS
  ======================================================= */

  function resetSettings() {

    const reset =
      {
        ...DEFAULT_SETTINGS,

        opportunityRisk: {
          ...DEFAULT_SETTINGS.opportunityRisk,
        },

        activityRisk: {
          ...DEFAULT_SETTINGS.activityRisk,
        },

        forecast: {
          ...DEFAULT_SETTINGS.forecast,
        },

        insights: {
          ...DEFAULT_SETTINGS.insights,
        },

      };


    updateSettings(
      reset
    );

  }


  /* =======================================================
     PAGE MAP
  ======================================================= */

  const pageMap = {

    Overview:
      "overview",

    Opportunities:
      "opportunities",

    Leads:
      "leads",

    Activities:
      "activities",

    Insights:
      "insights",

    Forecast:
      "forecast",

    Comparison:
      "comparison",

    "Custom Charts":
      "custom-charts",

  };


  /* =======================================================
     DEFAULT LANDING PAGE
  ======================================================= */

  function getLandingPage() {

    return (
      pageMap[
        settings.defaultPage
      ] ||
      "overview"
    );

  }


  /* =======================================================
     BUILD DASHBOARD
  ======================================================= */

  async function buildDashboard() {

    if (
      files.length === 0
    ) {

      alert(
        "Please upload at least one Excel file."
      );

      return;

    }


    setLoading(true);


    try {

      const processedFiles = [];


      for (
        const file of files
      ) {

        console.log(
          `Reading ${file.name}...`
        );


        const workbook =
          await readWorkbook(
            file
          );


        console.log(
          "Sheets found:",
          workbook.sheetNames
        );


        const classified =
          classifySheets(
            workbook.sheets
          );


        console.log(
          "Classification:",
          classified
        );


        const processed =
          processWorkbook(
            classified
          );


        console.log(
          "Processed workbook:",
          processed
        );


        processedFiles.push({

          fileName:
            file.name,

          ...processed,

        });

      }


      /* =====================================================
         DATA STRUCTURE
      ===================================================== */

      if (
        processedFiles.length === 1
      ) {

        setData(
          processedFiles[0]
        );

      } else {

        const combined = {

          files:
            processedFiles,

          opportunities:
            processedFiles.flatMap(
              (file) =>
                file.opportunities || []
            ),

          leads:
            processedFiles.flatMap(
              (file) =>
                file.leads || []
            ),

          activities:
            processedFiles.flatMap(
              (file) =>
                file.activities || []
            ),

        };


        setData(
          combined
        );

      }


      /* =====================================================
         APPLY SAVED LANDING PAGE
      ===================================================== */

      setActivePage(
        getLandingPage()
      );


      console.log(
        "FINAL DASHBOARD DATA:",
        processedFiles
      );


    } catch (error) {

      console.error(
        error
      );


      alert(
        "Something went wrong while reading the Excel file."
      );


    } finally {

      setLoading(false);

    }

  }


  /* =========================================================
     PAGE RENDERER
  ========================================================= */

  function renderPage() {

    if (!data) {

      return null;

    }


    switch (
      activePage
    ) {

      case "overview":

        return (

          <Overview
            data={data}
            settings={settings}
          />

        );


      case "opportunities":

        return (

          <Opportunities
            data={data}
            settings={settings}
          />

        );


      case "leads":

        return (

          <Leads
            data={data}
            settings={settings}
          />

        );


      case "activities":

        return (

          <Activities
            data={data}
            settings={settings}
          />

        );


      case "insights":

        return (

          <Insights
            data={data}
            settings={settings}
          />

        );


      case "comparison":

        return (

          <MonthComparison
            data={data}
            settings={settings}
          />

        );


      case "forecast":

        return (

          <Forecast
            data={data}
            settings={settings}
          />

        );


      case "custom-charts":

        return (

          <CustomCharts
            data={data}
            settings={settings}
          />

        );


      case "settings":

        return (

          <SettingsPage

            data={data}

            settings={settings}

            setSettings={
              updateSettings
            }

            resetSettings={
              resetSettings
            }

          />

        );


      default:

        return (

          <Overview
            data={data}
            settings={settings}
          />

        );

    }

  }


  /* =========================================================
     UPLOAD SCREEN
  ========================================================= */

  if (!data) {

    return (

      <>

        <UploadCenter

          files={files}

          setFiles={setFiles}

          onBuild={
            buildDashboard
          }

        />


        {loading && (

          <div
            className="
              fixed
              inset-0
              bg-white/70
              backdrop-blur-sm
              flex
              items-center
              justify-center
              z-50
            "
          >

            <div
              className="
                bg-white
                rounded-3xl
                shadow-2xl
                border
                border-slate-200
                p-10
                text-center
              "
            >

              <div
                className="
                  w-10
                  h-10
                  border-4
                  border-indigo-100
                  border-t-indigo-600
                  rounded-full
                  animate-spin
                  mx-auto
                "
              />


              <h3
                className="
                  font-bold
                  text-slate-800
                  mt-5
                "
              >

                Analysing your data...

              </h3>


              <p
                className="
                  text-sm
                  text-slate-400
                  mt-2
                "
              >

                Detecting sheets and
                preparing your dashboard

              </p>

            </div>

          </div>

        )}

      </>

    );

  }


  /* =========================================================
     DASHBOARD
  ========================================================= */

  return (

    <div
      className="
        min-h-screen
        bg-slate-50
      "
    >

      {/* =====================================================
          SIDEBAR
      ===================================================== */}

      <Sidebar

        activePage={
          activePage
        }

        onNavigate={
          setActivePage
        }

      />


      {/* =====================================================
          MAIN CONTENT
      ===================================================== */}

      <main
        className="
          ml-[76px]
          min-h-screen
        "
      >

        {
          renderPage()
        }

      </main>


      {/* =====================================================
          LOADING OVERLAY
      ===================================================== */}

      {loading && (

        <div
          className="
            fixed
            inset-0
            bg-white/70
            backdrop-blur-sm
            flex
            items-center
            justify-center
            z-50
          "
        >

          <div
            className="
              bg-white
              rounded-3xl
              shadow-2xl
              border
              border-slate-200
              p-10
              text-center
            "
          >

            <div
              className="
                w-10
                h-10
                border-4
                border-indigo-100
                border-t-indigo-600
                rounded-full
                animate-spin
                mx-auto
              "
            />


            <h3
              className="
                font-bold
                text-slate-800
                mt-5
              "
            >

              Analysing your data...

            </h3>


            <p
              className="
                text-sm
                text-slate-400
                mt-2
              "
            >

              Preparing your sales intelligence dashboard

            </p>

          </div>

        </div>

      )}

    </div>

  );

}


export default App;