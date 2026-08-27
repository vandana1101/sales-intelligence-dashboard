import {
  daysBetween,
  formatMonth,
  formatOpportunityWeek,
  parseDate,
  maxDate,
} from "./dateUtils";


/*
 * Finds the effective snapshot date of the dataset.
 *
 * We use the latest Updated Time rather than
 * today's date so historical Excel files remain
 * reproducible.
 */
export function getReferenceDate(rows) {
  const updatedDates = rows.map(
    (row) => row["Updated Time"]
  );

  const opportunityDates = rows.map(
    (row) =>
      row["Opportunity Created Date"]
  );

  return (
    maxDate(updatedDates) ||
    maxDate(opportunityDates) ||
    new Date()
  );
}


/*
 * Calculate the Age of an opportunity.
 */
export function calculateAge(
  row,
  referenceDate
) {
  const created =
    parseDate(
      row["Opportunity Created Date"]
    );

  if (!created || !referenceDate) {
    return null;
  }

  return Math.max(
    0,
    Math.floor(
      (
        referenceDate.getTime() -
        created.getTime()
      ) /
        (1000 * 60 * 60 * 24)
    )
  );
}


/*
 * Recreates the calculated Opportunity columns
 * from the original Excel workbook.
 */
export function enrichOpportunity(
  row,
  referenceDate
) {
  const enriched = {
    ...row,
  };

  // ------------------------------------------
  // AGE
  // ------------------------------------------

  enriched["Age"] =
    calculateAge(
      row,
      referenceDate
    );


  // ------------------------------------------
  // AGE BUCKET
  // ------------------------------------------

  enriched["Ages"] =
    enriched["Age"] !== null
      ? enriched["Age"] > 90
        ? ">90"
        : "<90"
      : null;


  // ------------------------------------------
  // CREATED → RFQ RECEIVED
  // Excel:
  // =IF(OR(G2="",AT2=""),"",AT2-G2)
  // ------------------------------------------

  enriched[
    "Days: Created to RFQ Received (G&AT)"
  ] =
    daysBetween(
      row["Opportunity Created Date"],
      row["RFQ Received date"]
    );


  // ------------------------------------------
  // SOLUTION REQUEST → SOLUTION RECEIVED
  // Excel:
  // =IF(OR(AY2="",AW2=""),"",AY2-AW2)
  // ------------------------------------------

  enriched[
    "Days: Solution Request to Solution Received (AY&AW)"
  ] =
    daysBetween(
      row["Solution request raised date"],
      row["Solution received date"]
    );


  // ------------------------------------------
  // SOLUTION RECEIVED → BF APPROVAL
  // Excel:
  // =IF(OR(BA2="",AY2=""),"",BA2-AY2)
  // ------------------------------------------

  enriched[
    "Days: solution Received to BF Approval (BA&AY)"
  ] =
    daysBetween(
      row["Solution received date"],
      row["BF team approved date"]
    );


  // ------------------------------------------
  // PROPOSAL SUBMISSION → RFQ TARGET
  // Excel:
  // =IF(OR(BB2="",AU2=""),"",BB2-AU2)
  // ------------------------------------------

  enriched[
    "Days: Proposal Submission to RFQ Submission target date (BB&AU)"
  ] =
    daysBetween(
      row["RFQ Submission target date"],
      row["Proposal submitted date"]
    );


  // ------------------------------------------
  // PROPOSAL SUBMISSION → WON
  // Excel:
  // =IF(OR(BG2="",BB2=""),"",BG2-BB2)
  // ------------------------------------------

  enriched[
    "Days: Proposal Submission to Date Won (BB&BG)"
  ] =
    daysBetween(
      row["Proposal submitted date"],
      row["Date won"]
    );


  // ------------------------------------------
  // OPPORTUNITY WEEK
  // ------------------------------------------

  enriched[
    "Opportunity Week (G)"
  ] =
    formatOpportunityWeek(
      row["Opportunity Created Date"]
    );


  // ------------------------------------------
  // OPPORTUNITY MONTH
  // ------------------------------------------

  enriched[
    "Opportunity Month (G)"
  ] =
    formatMonth(
      row["Opportunity Created Date"]
    );


  // ------------------------------------------
  // PROPOSAL DELAY
  //
  // Excel:
  // =IF(OR(AU2="",BB2=""),0,AU2-BB2)
  // ------------------------------------------

  const targetDate =
    parseDate(
      row["RFQ Submission target date"]
    );

  const proposalDate =
    parseDate(
      row["Proposal submitted date"]
    );

  if (!targetDate || !proposalDate) {

    enriched[
      "Delay in Proposal Submission Date (AU&BB)"
    ] = 0;

  } else {

    enriched[
      "Delay in Proposal Submission Date (AU&BB)"
    ] =
      daysBetween(
        proposalDate,
        targetDate
      );

  }


  // ------------------------------------------
  // OUTCOME BUCKET
  //
  // Excel:
  // Won / Onboarded / 1St Invoice / Agreement
  // → Won
  //
  // Lost → Lost
  //
  // Hold → Hold
  //
  // Everything else → Active/In Pipeline
  // ------------------------------------------

  const stage =
    String(
      row["Opportunity Stage"] || ""
    ).trim();

  if (
    [
      "Won",
      "Onboarded",
      "1St Invoice",
      "Agreement",
    ].includes(stage)
  ) {

    enriched["Outcome bucket"] =
      "Won";

  } else if (stage === "Lost") {

    enriched["Outcome bucket"] =
      "Lost";

  } else if (stage === "Hold") {

    enriched["Outcome bucket"] =
      "Hold";

  } else {

    enriched["Outcome bucket"] =
      "Active/In Pipeline";

  }


  return enriched;
}


/*
 * Process the entire Opportunity dataset.
 */
export function processOpportunities(
  rows
) {
  if (!rows || rows.length === 0) {
    return {
      rows: [],
      referenceDate: null,
    };
  }

  const referenceDate =
    getReferenceDate(rows);

  const processedRows =
    rows.map((row) =>
      enrichOpportunity(
        row,
        referenceDate
      )
    );

  return {
    rows: processedRows,
    referenceDate,
  };
}