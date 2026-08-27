function SectionHeader({
  title,
  subtitle,
  action,
}) {

  return (

    <div className="flex items-end justify-between mb-5">

      <div>

        <h2 className="text-lg font-bold text-slate-900">

          {title}

        </h2>


        {subtitle && (

          <p className="text-sm text-slate-400 mt-1">

            {subtitle}

          </p>

        )}

      </div>


      {action}

    </div>

  );

}


export default SectionHeader;