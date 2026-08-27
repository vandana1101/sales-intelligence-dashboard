const SHEET_RULES = {
  opportunities: [
    "Opportunity ID",
    "Opportunity Stage",
    "Opportunity Created Date",
  ],

  leads: [
    "Lead ID",
    "Lead Stage",
    "Lead Source",
  ],

  activities: [
    "Activitys ID",
    "Meeting scheduled date",
    "Status",
  ],
};

function calculateScore(rows, expectedColumns) {
  if (!rows || rows.length === 0) {
    return 0;
  }

  const columns = Object.keys(rows[0]);

  return expectedColumns.reduce(
    (score, column) => {
      return score + (columns.includes(column) ? 1 : 0);
    },
    0
  );
}

export function classifySheets(sheets) {
  const result = {
    opportunities: null,
    leads: null,
    activities: null,
    unknown: [],
  };

  Object.entries(sheets).forEach(
    ([sheetName, rows]) => {
      const scores = {
        opportunities: calculateScore(
          rows,
          SHEET_RULES.opportunities
        ),

        leads: calculateScore(
          rows,
          SHEET_RULES.leads
        ),

        activities: calculateScore(
          rows,
          SHEET_RULES.activities
        ),
      };

      const [bestType, bestScore] =
        Object.entries(scores).sort(
          (a, b) => b[1] - a[1]
        )[0];

      if (bestScore === 0) {
        result.unknown.push(sheetName);
        return;
      }

      result[bestType] = {
        sheetName,
        rows,
        score: bestScore,
      };
    }
  );

  return result;
}