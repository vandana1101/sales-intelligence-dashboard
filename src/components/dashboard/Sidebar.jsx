import {
  LayoutDashboard,
  BriefcaseBusiness,
  Users,
  Activity,
  GitCompareArrows,
  ChartNoAxesCombined,
  Sparkles,
  Brain,
  Settings,
  Database,
} from "lucide-react";


const navigation = [

  {
    id: "overview",
    label: "Overview",
    icon: LayoutDashboard,
  },

  {
    id: "opportunities",
    label: "Opportunities",
    icon: BriefcaseBusiness,
  },

  {
    id: "leads",
    label: "Leads",
    icon: Users,
  },

  {
    id: "activities",
    label: "Activities",
    icon: Activity,
  },

  {
    id: "insights",
    label: "Insights",
    icon: Brain,
  },

  {
    id: "comparison",
    label: "Month Comparison",
    icon: GitCompareArrows,
  },

  {
    id: "forecast",
    label: "Forecast",
    icon: ChartNoAxesCombined,
  },

  {
    id: "custom-charts",
    label: "Custom Analytics",
    icon: Sparkles,
  },

];


function Sidebar({
  activePage,
  onNavigate,
}) {

  return (

    <aside
      className="
        fixed
        left-0
        top-0
        bottom-0
        w-[76px]
        bg-white
        border-r
        border-slate-200
        z-40
        flex
        flex-col
        items-center
      "
    >

      {/* =================================================
          LOGO
      ================================================= */}

      <div className="h-20 flex items-center justify-center">

        <div
          className="
            w-11
            h-11
            rounded-2xl
            bg-gradient-to-br
            from-indigo-600
            to-violet-600
            flex
            items-center
            justify-center
            shadow-lg
            shadow-indigo-200
          "
        >

          <Database
            size={22}
            className="text-white"
          />

        </div>

      </div>


      {/* =================================================
          NAVIGATION
      ================================================= */}

      <nav
        className="
          flex-1
          flex
          flex-col
          items-center
          gap-2
          py-5
        "
      >

        {navigation.map(
          (item) => {

            const Icon =
              item.icon;

            const active =
              activePage ===
              item.id;


            return (

              <button

                key={
                  item.id
                }

                onClick={() =>
                  onNavigate(
                    item.id
                  )
                }

                title={
                  item.label
                }

                className={`
                  group
                  relative
                  w-12
                  h-12
                  rounded-2xl
                  flex
                  items-center
                  justify-center
                  transition-all
                  duration-200

                  ${
                    active

                      ? "bg-indigo-50 text-indigo-600 shadow-sm"

                      : "text-slate-400 hover:bg-slate-50 hover:text-slate-700"
                  }
                `}
              >

                <Icon
                  size={21}
                />


                {/* =======================================
                    ACTIVE INDICATOR
                ======================================= */}

                {active && (

                  <span
                    className="
                      absolute
                      -right-[13px]
                      w-1
                      h-7
                      bg-indigo-600
                      rounded-l-full
                    "
                  />

                )}


                {/* =======================================
                    TOOLTIP
                ======================================= */}

                <span
                  className="
                    absolute
                    left-16
                    bg-slate-900
                    text-white
                    text-xs
                    px-3
                    py-2
                    rounded-lg
                    opacity-0
                    pointer-events-none
                    group-hover:opacity-100
                    transition-opacity
                    whitespace-nowrap
                    z-50
                  "
                >

                  {item.label}

                </span>

              </button>

            );

          }
        )}

      </nav>


      {/* =================================================
          SETTINGS
      ================================================= */}

      <div className="pb-6">

        <button
          title="Settings"
          onClick={() => onNavigate("settings")}

          className={`
            w-12
            h-12
            rounded-2xl
            flex
            items-center
            justify-center
            transition
            ${
              activePage === "settings"
               ? "bg-indigo-50 text-indigo-600 shadow-sm"
               : "text-slate-400 hover:bg-slate-50 hover:text-slate-700"
            }
          `}  
        >

          <Settings
            size={21} />

        </button>

      </div>

    </aside>

  );

}


export default Sidebar;