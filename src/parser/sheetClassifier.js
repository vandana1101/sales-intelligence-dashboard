const SHEET_RULES = {
  opportunities: [
    [
      "Opportunity ID",
      "Opportunity Id",
      "OpportunityID",
      "Opportunity_ID",
    ],
    [
      "Opportunity Stage",
      "OpportunityStage",
      "Opportunity_Stage",
      "Stage",
    ],
    [
      "Opportunity Created Date",
      "OpportunityCreatedDate",
      "Opportunity_Created_Date",
      "Created Date",
      "Opportunity Created",
    ],
  ],

  leads: [
    [
      "Lead ID",
      "Lead Id",
      "LeadID",
      "Lead_ID",
    ],
    [
      "Lead Stage",
      "LeadStage",
      "Lead_Stage",
      "Stage",
    ],
    [
      "Lead Source",
      "LeadSource",
      "Lead_Source",
      "Source",
    ],
  ],

  activities: [
    [
      "Activitys ID",
      "Activity ID",
      "Activity Id",
      "ActivityID",
      "Activity_ID",
      "Activitys_ID",
    ],
    [
      "Meeting scheduled date",
      "Meeting Scheduled Date",
      "MeetingScheduledDate",
      "Meeting_Scheduled_Date",
      "Meeting Date",
    ],
    [
      "Status",
      "Activity Status",
      "ActivityStatus",
      "Activity_Status",
    ],
  ],
};


/* =========================================================
   HEADER NORMALIZATION
========================================================= */

/*
 * Makes headers consistent across:
 *
 * Excel:
 * "Opportunity Created Date"
 *
 * CSV:
 * "Opportunity_Created_Date"
 *
 * CSV:
 * "opportunity-created-date"
 *
 * CSV:
 * " Opportunity Created Date "
 *
 * All become:
 *
 * "opportunity created date"
 */
function normalizeHeader(value) {

  return String(value ?? "")
    .replace(/^\uFEFF/, "")
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");

}


/* =========================================================
   CHECK WHETHER A COLUMN EXISTS
========================================================= */

function hasColumn(
  columns,
  possibleNames
) {

  const normalizedColumns =
    columns.map(
      normalizeHeader
    );


  return possibleNames.some(
    (name) =>
      normalizedColumns.includes(
        normalizeHeader(name)
      )
  );

}


/* =========================================================
   SCORE
========================================================= */

function calculateScore(
  rows,
  expectedColumns
) {

  if (
    !Array.isArray(rows) ||
    rows.length === 0
  ) {

    return 0;

  }


  const columns =
    Object.keys(
      rows[0] || {}
    );


  if (
    columns.length === 0
  ) {

    return 0;

  }


  return expectedColumns.reduce(
    (
      score,
      possibleNames
    ) => {

      return (
        score +
        (
          hasColumn(
            columns,
            possibleNames
          )
            ? 1
            : 0
        )
      );

    },
    0
  );

}


/* =========================================================
   CLASSIFY
========================================================= */

export function classifySheets(
  sheets
) {

  const result = {

    opportunities: null,

    leads: null,

    activities: null,

    unknown: [],

  };


  Object.entries(
    sheets || {}
  ).forEach(
    ([sheetName, rows]) => {

      if (
        !Array.isArray(rows) ||
        rows.length === 0
      ) {

        result.unknown.push(
          sheetName
        );

        return;

      }


      const scores = {

        opportunities:
          calculateScore(
            rows,
            SHEET_RULES.opportunities
          ),

        leads:
          calculateScore(
            rows,
            SHEET_RULES.leads
          ),

        activities:
          calculateScore(
            rows,
            SHEET_RULES.activities
          ),

      };


      const sortedTypes =
        Object.entries(
          scores
        ).sort(
          (a, b) =>
            b[1] - a[1]
        );


      const [
        bestType,
        bestScore,
      ] =
        sortedTypes[0];


      /*
       * No matching columns.
       */
      if (
        bestScore === 0
      ) {

        result.unknown.push(
          sheetName
        );

        return;

      }


      /*
       * Store the classified dataset.
       */
      result[bestType] = {

        sheetName,

        rows,

        score:
          bestScore,

      };

    }
  );


  return result;

}