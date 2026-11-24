import { useState } from "react";
import { ChevronDown, X } from "lucide-react";

export default function MultiSelectFilter({ label, options = [], selected = [], onChange }) {
  const [open, setOpen] = useState(false);
  const toggle = (value) => onChange(selected.includes(value) ? selected.filter((item) => item !== value) : [...selected, value]);
  const display = selected.length === 0 ? `All ${label}` : selected.length === 1 ? selected[0] : `${selected.length} ${label} selected`;
  return (
    <div className="relative min-w-[150px]">
      <button type="button" onClick={() => setOpen((value) => !value)} className="flex min-h-[42px] w-full items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-left text-sm text-slate-600 hover:border-indigo-300">
        <span className="truncate">{display}</span><ChevronDown size={15} className="shrink-0 text-slate-400" />
      </button>
      {open && <>
        <button type="button" aria-label="Close filter" onClick={() => setOpen(false)} className="fixed inset-0 z-40 cursor-default" />
        <div className="absolute left-0 top-[48px] z-50 max-h-72 min-w-[210px] overflow-auto rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-100 px-2 pb-2 text-xs">
            <button type="button" onClick={() => onChange(options)} className="font-semibold text-indigo-600">Select all</button>
            <button type="button" onClick={() => onChange([])} className="text-slate-500">Clear</button>
          </div>
          {options.map((value) => <label key={value} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-sm text-slate-700 hover:bg-slate-50"><input type="checkbox" checked={selected.includes(value)} onChange={() => toggle(value)} className="accent-indigo-600" /><span>{value}</span></label>)}
          {!options.length && <p className="p-3 text-xs text-slate-400">No values available</p>}
          <button type="button" onClick={() => setOpen(false)} className="mt-1 flex w-full items-center justify-center gap-1 rounded-lg bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-700"><X size={13} /> Done</button>
        </div>
      </>}
    </div>
  );
}
