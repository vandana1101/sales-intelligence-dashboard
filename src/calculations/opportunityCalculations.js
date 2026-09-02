import {
  daysBetween,
  formatMonth,
  formatOpportunityWeek,
  parseDate,
  maxDate,
} from "./dateUtils";


/* =========================================================
   HEADER HELPERS
========================================================= */

/*
 * Normalize column names so Excel and CSV files with
 * slightly different spacing/capitalization can still
 * be processed consistently.
 */
function normalizeHeader(value) {

  return String(value ?? "")
    .replace(/^\uFEFF/, "")
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");

}


/*
 * Get a value from a row using multiple possible
 * versions of the same column name.
 */
function getColumnValue(
  row,
  possibleNames
) {

  if (!row) {
    return null;
  }


  const keys =
    Object.keys(row);


  const normalizedKeys =
    keys.reduce(
      (map, key) => {

        map[
          normalizeHeader(key)
        ] = key;

        return map;

      },
      {}
    );


  for (
    const name of possibleNames
  ) {

    const actualKey =
      normalizedKeys[
        normalizeHeader(name)
      ];


    if (
      actualKey !== undefined
    ) {

      return row[actualKey];

    }

  }


  return null;

}


/* =========================================================
   REFERENCE DATE
========================================================= */

/*
 * Finds the effective snapshot/reference date
 * of the dataset.
 *
 * We use the latest Updated Time rather than
 * today's date so historical Excel/CSV files
 * remain reproducible.
 */
export function getReferenceDate(
  rows
) {

  const updatedDates =
    rows
      .map((row) =>
        getColumnValue(
          row,
          [
            "Updated Time",
            "UpdatedTime",
            "Updated Date",
          ]
        )
      )
      .filter(Boolean);


  const opportunityDates =
    rows
      .map((row) =>
        getColumnValue(
          row,
          [
            "Opportunity Created Date",
            "Opportunity Created",
            "Created Date",
          ]
        )
      )
      .filter(Boolean);


  return (
    maxDate(updatedDates) ||
    maxDate(opportunityDates) ||
    new Date()
  );

}


/* =========================================================
   AGE
========================================================= */

/*
 * Calculate the Age of an opportunity.
 */
export function calculateAge(
  row,
  referenceDate
) {

  const created =
    parseDate(
      getColumnValue(
        row,
        [
          "Opportunity Created Date",
          "Opportunity Created",
          "Created Date",
        ]
      )
    );


  if (
    !created ||
    !referenceDate
  ) {

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


/* =========================================================
   OPPORTUNITY ENRICHMENT
========================================================= */

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
  // ORIGINAL COLUMN VALUES
  // ------------------------------------------

  const createdDate =
    getColumnValue(
      row,
      [
        "Opportunity Created Date",
        "Opportunity Created",
        "Created Date",
      ]
    );


  const rfqReceivedDate =
    getColumnValue(
      row,
      [
        "RFQ Received date",
        "RFQ Received Date",
        "RFQ Received",
      ]
    );


  const solutionRequestDate =
    getColumnValue(
      row,
      [
        "Solution request raised date",
        "Solution Request Raised Date",
        "Solution Request Date",
      ]
    );


  const solutionReceivedDate =
    getColumnValue(
      row,
      [
        "Solution received date",
        "Solution Received Date",
        "Solution Received",
      ]
    );


  const bfApprovalDate =
    getColumnValue(
      row,
      [
        "BF team approved date",
        "BF Team Approved Date",
        "BF Approval Date",
      ]
    );


  const rfqTargetDate =
    getColumnValue(
      row,
      [
        "RFQ Submission target date",
        "RFQ Submission Target Date",
        "RFQ Target Date",
      ]
    );


  const proposalSubmittedDate =
    getColumnValue(
      row,
      [
        "Proposal submitted date",
        "Proposal Submitted Date",
        "Proposal Date",
      ]
    );


  const dateWon =
    getColumnValue(
      row,
      [
        "Date won",
        "Date Won",
        "Won Date",
      ]
    );


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
  //
  // Excel:
  // =IF(OR(G2="",AT2=""),"",AT2-G2)
  // ------------------------------------------

  enriched[
    "Days: Created to RFQ Received (G&AT)"
  ] =
    daysBetween(
      createdDate,
      rfqReceivedDate
    );


  // ------------------------------------------
  // SOLUTION REQUEST → SOLUTION RECEIVED
  //
  // Excel:
  // =IF(OR(AY2="",AW2=""),"",AY2-AW2)
  // ------------------------------------------

  enriched[
    "Days: Solution Request to Solution Received (AY&AW)"
  ] =
    daysBetween(
      solutionRequestDate,
      solutionReceivedDate
    );


  // ------------------------------------------
  // SOLUTION RECEIVED → BF APPROVAL
  //
  // Excel:
  // =IF(OR(BA2="",AY2=""),"",BA2-AY2)
  // ------------------------------------------

  enriched[
    "Days: solution Received to BF Approval (BA&AY)"
  ] =
    daysBetween(
      solutionReceivedDate,
      bfApprovalDate
    );


  // ------------------------------------------
  // PROPOSAL SUBMISSION → RFQ TARGET
  //
  // Excel:
  // =IF(OR(BB2="",AU2=""),"",BB2-AU2)
  // ------------------------------------------

  enriched[
    "Days: Proposal Submission to RFQ Submission target date (BB&AU)"
  ] =
    daysBetween(
      rfqTargetDate,
      proposalSubmittedDate
    );


  // ------------------------------------------
  // PROPOSAL SUBMISSION → WON
  //
  // Excel:
  // =IF(OR(BG2="",BB2=""),"",BG2-BB2)
  // ------------------------------------------

  enriched[
    "Days: Proposal Submission to Date Won (BB&BG)"
  ] =
    daysBetween(
      proposalSubmittedDate,
      dateWon
    );


  // ------------------------------------------
  // OPPORTUNITY WEEK
  // ------------------------------------------

  enriched[
    "Opportunity Week (G)"
  ] =
    formatOpportunityWeek(
      createdDate
    );


  // ------------------------------------------
  // OPPORTUNITY MONTH
  // ------------------------------------------

  enriched[
    "Opportunity Month (G)"
  ] =
    formatMonth(
      createdDate
    );


  // ------------------------------------------
  // PROPOSAL DELAY
  //
  // Excel:
  // =IF(OR(AU2="",BB2=""),0,AU2-BB2)
  //
  // Target Date - Proposal Submitted Date
  // ------------------------------------------

  const targetDate =
    parseDate(
      rfqTargetDate
    );


  const proposalDate =
    parseDate(
      proposalSubmittedDate
    );


  if (
    !targetDate ||
    !proposalDate
  ) {

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
      getColumnValue(
        row,
        [
          "Opportunity Stage",
          "Opportunity stage",
          "Stage",
        ]
      ) || ""
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

  } else if (
    stage === "Lost"
  ) {

    enriched["Outcome bucket"] =
      "Lost";

  } else if (
    stage === "Hold"
  ) {

    enriched["Outcome bucket"] =
      "Hold";

  } else {

    enriched["Outcome bucket"] =
      "Active/In Pipeline";

  }


  return enriched;

}


/* =========================================================
   PROCESS OPPORTUNITIES
========================================================= */

/*
 * Process the entire Opportunity dataset.
 */
export function processOpportunities(
  rows
) {

  if (
    !rows ||
    !Array.isArray(rows) ||
    rows.length === 0
  ) {

    return {
      rows: [],
      referenceDate: null,
    };

  }


  const referenceDate =
    getReferenceDate(
      rows
    );


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