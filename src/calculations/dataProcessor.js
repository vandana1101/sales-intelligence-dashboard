import {
  processOpportunities,
} from "./opportunityCalculations";


export function processWorkbook(
  classifiedWorkbook
) {

  const result = {
    opportunities: [],
    leads: [],
    activities: [],
    wonAnalysis: [],
    unknown: [],
  };


  /*
   * Protect against an empty or invalid
   * classified workbook.
   *
   * This is useful when processing CSV files
   * because every uploaded CSV becomes a
   * normalized workbook-like object.
   */
  if (
    !classifiedWorkbook ||
    typeof classifiedWorkbook !== "object"
  ) {

    return result;

  }


  // ------------------------------------------
  // OPPORTUNITIES
  // ------------------------------------------

  if (
    classifiedWorkbook.opportunities &&
    Array.isArray(
      classifiedWorkbook.opportunities.rows
    )
  ) {

    const rows =
      classifiedWorkbook
        .opportunities
        .rows;


    const processed =
      processOpportunities(
        rows
      );


    result.opportunities =
      processed?.rows || [];


    result.opportunityReferenceDate =
      processed?.referenceDate || null;

  }


  // ------------------------------------------
  // WON ANALYSIS
  //
  // Preserve a separately classified
  // Won Analysis source if one exists.
  //
  // The actual Won Analysis dashboard can
  // still calculate dynamically from
  // result.opportunities.
  // ------------------------------------------

  if (
    classifiedWorkbook.wonAnalysis &&
    Array.isArray(
      classifiedWorkbook.wonAnalysis.rows
    )
  ) {

    result.wonAnalysis =
      classifiedWorkbook
        .wonAnalysis
        .rows;


    result.wonAnalysisSheetName =
      classifiedWorkbook
        .wonAnalysis
        .sheetName || null;

  }


  // ------------------------------------------
  // LEADS
  // ------------------------------------------

  if (
    classifiedWorkbook.leads &&
    Array.isArray(
      classifiedWorkbook.leads.rows
    )
  ) {

    result.leads =
      classifiedWorkbook
        .leads
        .rows;

  }


  // ------------------------------------------
  // ACTIVITIES
  // ------------------------------------------

  if (
    classifiedWorkbook.activities &&
    Array.isArray(
      classifiedWorkbook.activities.rows
    )
  ) {

    result.activities =
      classifiedWorkbook
        .activities
        .rows;

  }


  // ------------------------------------------
  // UNKNOWN SHEETS
  // ------------------------------------------

  result.unknown =
    Array.isArray(
      classifiedWorkbook.unknown
    )
      ? classifiedWorkbook.unknown
      : [];


  return result;
}