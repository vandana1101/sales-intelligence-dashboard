import {
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";


function KPI({
  title,
  value,
  subtitle,
  trend,
  icon: Icon,
  iconClass = "bg-indigo-50 text-indigo-600",
}) {

  const positive =
    typeof trend === "string"
      ? !trend.startsWith("-")
      : true;


  return (

    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow">

      <div className="flex items-start justify-between">

        <div>

          <p className="text-sm font-medium text-slate-500">

            {title}

          </p>


          <p className="text-2xl font-bold text-slate-900 mt-2">

            {value}

          </p>

        </div>


        {Icon && (

          <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${iconClass}`}>

            <Icon size={20} />

          </div>

        )}

      </div>


      <div className="flex items-center justify-between mt-4">

        <p className="text-xs text-slate-400">

          {subtitle}

        </p>


        {trend && (

          <span
            className={`
              inline-flex
              items-center
              gap-1
              text-xs
              font-semibold
              ${
                positive
                  ? "text-emerald-600"
                  : "text-rose-600"
              }
            `}
          >

            {positive
              ? <ArrowUpRight size={13} />
              : <ArrowDownRight size={13} />
            }

            {trend}

          </span>

        )}

      </div>

    </div>

  );

}


export default KPI;