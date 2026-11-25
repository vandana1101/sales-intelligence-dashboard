import { useEffect } from "react";
import { registerDashboardExport } from "./exportRegistry";

// The old per-page download button is intentionally removed. This component
// now quietly registers the page's already-filtered export datasets so the
// central Download Centre can export them together.
export default function ExcelExportButton({ sections = [], fileName = "" }) {
  useEffect(() => {
    const key = String(fileName).toLowerCase();
    const pageMap = [
      ["opportunities", "opportunities", "Opportunities"],
      ["won-analysis", "won-analysis", "Won Analysis"],
      ["loss-analysis", "loss-analysis", "Loss Analysis"],
      ["leads", "leads", "Leads"],
      ["activities", "activities", "Activities"],
    ];
    const match = pageMap.find(([needle]) => key.includes(needle));
    if (match) registerDashboardExport(match[1], match[2], sections);
  }, [sections, fileName]);

  return null;
}
