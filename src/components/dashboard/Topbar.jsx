import {
  Bell,
  Download,
  CalendarDays,
} from "lucide-react";


function Topbar({
  title,
  subtitle,
}) {

  return (

    <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-8 sticky top-0 z-30">

      {/* Left */}

      <div>

        <h1 className="text-xl font-bold text-slate-900">

          {title}

        </h1>


        <p className="text-sm text-slate-400 mt-0.5">

          {subtitle}

        </p>

      </div>


      {/* Right */}

      <div className="flex items-center gap-3">


        {/* Date */}

        <button className="hidden md:flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-600 hover:bg-slate-50">

          <CalendarDays size={16} />

          All periods

        </button>


        {/* Export */}

        <button className="hidden md:flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 shadow-sm">

          <Download size={16} />

          Export

        </button>


        {/* Notifications */}

        <button className="w-10 h-10 rounded-xl border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50">

          <Bell size={18} />

        </button>

      </div>

    </header>

  );

}


export default Topbar;