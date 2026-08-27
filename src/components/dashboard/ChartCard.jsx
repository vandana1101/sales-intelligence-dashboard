function ChartCard({
  title,
  subtitle,
  children,
  className = "",
  action,
}) {

  return (

    <section
      className={`
        bg-white
        rounded-2xl
        border
        border-slate-200
        shadow-sm
        overflow-hidden
        ${className}
      `}
    >

      <div className="flex items-start justify-between px-6 pt-5">

        <div>

          <h3 className="font-bold text-slate-900">

            {title}

          </h3>


          {subtitle && (

            <p className="text-xs text-slate-400 mt-1">

              {subtitle}

            </p>

          )}

        </div>


        {action}

      </div>


      <div className="p-6">

        {children}

      </div>

    </section>

  );

}


export default ChartCard;