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