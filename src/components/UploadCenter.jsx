import {
  UploadCloud,
  FileSpreadsheet,
  X,
  ArrowRight,
} from "lucide-react";

export default function UploadCenter({
  files,
  setFiles,
  onBuild,
}) {
  function handleFiles(event) {
    const selectedFiles = Array.from(
      event.target.files || []
    );

    setFiles((previous) => [
      ...previous,
      ...selectedFiles,
    ]);

    event.target.value = "";
  }

  function removeFile(index) {
    setFiles((previous) =>
      previous.filter(
        (_, i) => i !== index
      )
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-12">

      <div className="w-full max-w-5xl">

        {/* Header */}

        <div className="text-center mb-10">

          <div className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-600 px-4 py-2 rounded-full text-sm font-semibold mb-5">

            <FileSpreadsheet size={16} />

            SALES INTELLIGENCE PLATFORM

          </div>

          <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-slate-900">

            Turn your sales data into

            <span className="block text-indigo-600 mt-2">
              sales intelligence.
            </span>

          </h1>

          <p className="text-slate-500 text-lg max-w-2xl mx-auto mt-5 leading-relaxed">

            Upload one or multiple monthly
            Excel or CSV files. We'll automatically
            analyse Opportunities, Leads and
            Activities and build your dashboard.

          </p>

        </div>

        {/* Upload area */}

        <label className="block cursor-pointer">

          <div className="group border-2 border-dashed border-slate-300 hover:border-indigo-400 bg-white hover:bg-indigo-50/30 rounded-3xl p-16 text-center transition-all duration-300">

            <div className="w-20 h-20 mx-auto rounded-3xl bg-indigo-50 group-hover:bg-indigo-100 flex items-center justify-center transition">

              <UploadCloud
                size={40}
                className="text-indigo-600"
              />

            </div>

            <h2 className="text-xl font-bold text-slate-800 mt-6">

              Upload your Excel or CSV files

            </h2>

            <p className="text-slate-400 mt-2">

              Upload one month or multiple months

            </p>

            <div className="inline-flex mt-6 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-semibold transition">

              Upload Files

            </div>

            <p className="text-xs text-slate-400 mt-4">

              Supports .xlsx, .xls and .csv

            </p>

          </div>

          <input
            type="file"
            multiple
            accept=".xlsx,.xls,.csv"
            onChange={handleFiles}
            className="hidden"
          />

        </label>

        {/* Files */}

        {files.length > 0 && (

          <div className="mt-6 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">

            <div className="flex items-center justify-between mb-5">

              <div>

                <h3 className="font-bold text-slate-800">
                  Files ready
                </h3>

                <p className="text-sm text-slate-400 mt-1">

                  {files.length} file
                  {files.length !== 1
                    ? "s"
                    : ""} selected

                </p>

              </div>

              <div className="bg-emerald-50 text-emerald-600 px-3 py-1.5 rounded-full text-xs font-semibold">

                READY

              </div>

            </div>

            <div className="space-y-2">

              {files.map(
                (file, index) => (

                  <div
                    key={`${file.name}-${index}`}
                    className="flex items-center justify-between bg-slate-50 hover:bg-slate-100 rounded-xl px-4 py-3 transition"
                  >

                    <div className="flex items-center gap-3">

                      <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center">

                        <FileSpreadsheet
                          size={18}
                          className="text-emerald-600"
                        />

                      </div>

                      <div>

                        <p className="text-sm font-semibold text-slate-700">
                          {file.name}
                        </p>

                        <p className="text-xs text-slate-400">
                          {(
                            file.size /
                            1024 /
                            1024
                          ).toFixed(2)}{" "}
                          MB
                        </p>

                      </div>

                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        removeFile(index)
                      }
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 transition"
                    >

                      <X size={17} />

                    </button>

                  </div>

                )
              )}

            </div>

            <button
              type="button"
              onClick={onBuild}
              className="w-full mt-6 bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition shadow-lg shadow-indigo-200"
            >

              Build My Dashboard

              <ArrowRight size={19} />

            </button>

          </div>

        )}

      </div>

    </div>
  );
}