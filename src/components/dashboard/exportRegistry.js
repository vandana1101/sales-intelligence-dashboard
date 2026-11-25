// Shared live export data registry. Each page's existing filtered exportSections
// register here whenever its filters or underlying data change.
export const dashboardExportRegistry = new Map();

export function registerDashboardExport(pageId, pageLabel, sections) {
  if (!pageId) return;
  dashboardExportRegistry.set(pageId, {
    pageId,
    pageLabel: pageLabel || pageId,
    sections: Array.isArray(sections) ? sections : [],
  });
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("dashboard-export-registry-updated"));
  }
}
