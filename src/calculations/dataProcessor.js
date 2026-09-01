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


  // ------------------------------------------
  // OPPORTUNITIES
  // ------------------------------------------

  if (
    classifiedWorkbook.opportunities
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
      processed.rows;

    result.opportunityReferenceDate =
      processed.referenceDate;
  }


  // ------------------------------------------
  // WON ANALYSIS
  //
  // Preserve the Excel Won Analysis sheet
  // separately.
  //
  // The actual dashboard analysis can still
  // be calculated dynamically from
  // result.opportunities.
  // ------------------------------------------

  if (
    classifiedWorkbook.wonAnalysis
  ) {

    result.wonAnalysis =
      classifiedWorkbook
        .wonAnalysis
        .rows;

    result.wonAnalysisSheetName =
      classifiedWorkbook
        .wonAnalysis
        .sheetName;

  }


  // ------------------------------------------
  // LEADS
  // ------------------------------------------

  if (
    classifiedWorkbook.leads
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
    classifiedWorkbook.activities
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
    classifiedWorkbook.unknown || [];


  return result;
}