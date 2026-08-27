import {
  processWorkbook,
} from "./dataProcessor";

import {
  formatMonth,
  parseDate,
  maxDate,
} from "./dateUtils";


/*
 * Get the reference/snapshot date for a workbook.
 *
 * We use the latest Updated Time available.
 * If that doesn't exist, we fall back to the
 * latest Opportunity Created Date.
 */
function getWorkbookSnapshotDate(
  classifiedWorkbook
) {

  const allDates = [];

  // Opportunity dates
  if (classifiedWorkbook.opportunities) {

    classifiedWorkbook.opportunities.rows
      .forEach((row) => {

        if (row["Updated Time"]) {
          allDates.push(
            row["Updated Time"]
          );
        }

        if (
          row["Opportunity Created Date"]
        ) {
          allDates.push(
            row["Opportunity Created Date"]
          );
        }

      });

  }


  // Lead dates
  if (classifiedWorkbook.leads) {

    classifiedWorkbook.leads.rows
      .forEach((row) => {

        Object.entries(row)
          .forEach(([key, value]) => {

            if (
              /date|time|created|updated/i
                .test(key) &&
              value
            ) {

              allDates.push(value);

            }

          });

      });

  }


  // Activity dates
  if (classifiedWorkbook.activities) {

    classifiedWorkbook.activities.rows
      .forEach((row) => {

        Object.entries(row)
          .forEach(([key, value]) => {

            if (
              /date|time|created|updated/i
                .test(key) &&
              value
            ) {

              allDates.push(value);

            }

          });

      });

  }


  return maxDate(allDates);

}


/*
 * Add metadata to every row.
 *
 * This is extremely important for multi-month
 * analysis because we need to know which
 * uploaded file a record came from.
 */
function addSnapshotMetadata(
  rows,
  fileName,
  snapshotDate,
  dataType
) {

  return rows.map((row) => ({

    ...row,

    "__source_file":
      fileName,

    "__data_type":
      dataType,

    "__snapshot_date":
      snapshotDate
        ? snapshotDate.toISOString()
        : null,

    "__snapshot_month":
      snapshotDate
        ? formatMonth(snapshotDate)
        : null,

  }));

}


/*
 * Merge rows from multiple uploaded files.
 */
export function buildMultiFileDataset(
  classifiedWorkbooks
) {

  const opportunities = [];
  const leads = [];
  const activities = [];

  const fileSummaries = [];


  classifiedWorkbooks.forEach(
    (workbook) => {

      const fileName =
        workbook.fileName;


      const snapshotDate =
        getWorkbookSnapshotDate(
          workbook
        );


      /*
       * First run the normal calculation engine.
       */
      const processed =
        processWorkbook(
          workbook
        );


      /*
       * Opportunities
       */
      if (
        processed.opportunities
      ) {

        opportunities.push(
          ...addSnapshotMetadata(
            processed.opportunities,
            fileName,
            snapshotDate,
            "opportunity"
          )
        );

      }


      /*
       * Leads
       */
      if (
        processed.leads
      ) {

        leads.push(
          ...addSnapshotMetadata(
            processed.leads,
            fileName,
            snapshotDate,
            "lead"
          )
        );

      }


      /*
       * Activities
       */
      if (
        processed.activities
      ) {

        activities.push(
          ...addSnapshotMetadata(
            processed.activities,
            fileName,
            snapshotDate,
            "activity"
          )
        );

      }


      fileSummaries.push({

        fileName,

        snapshotDate:
          snapshotDate
            ? snapshotDate.toISOString()
            : null,

        snapshotMonth:
          snapshotDate
            ? formatMonth(
                snapshotDate
              )
            : null,

        opportunities:
          processed.opportunities?.length ||
          0,

        leads:
          processed.leads?.length ||
          0,

        activities:
          processed.activities?.length ||
          0,

        unknownSheets:
          processed.unknown || [],

      });

    }
  );


  return {

    opportunities,

    leads,

    activities,

    fileSummaries,

  };

}


/*
 * Get the latest record for each Opportunity ID.
 *
 * This creates the CURRENT STATE dataset.
 */
export function getCurrentOpportunities(
  opportunities
) {

  const latestById =
    new Map();


  opportunities.forEach(
    (row) => {

      const id =
        row["Opportunity ID"];


      if (!id) {
        return;
      }


      const existing =
        latestById.get(
          String(id)
        );


      if (!existing) {

        latestById.set(
          String(id),
          row
        );

        return;

      }


      const existingDate =
        parseDate(
          existing["__snapshot_date"]
        );


      const currentDate =
        parseDate(
          row["__snapshot_date"]
        );


      if (
        currentDate &&
        existingDate &&
        currentDate > existingDate
      ) {

        latestById.set(
          String(id),
          row
        );

      }

    }
  );


  return Array.from(
    latestById.values()
  );

}