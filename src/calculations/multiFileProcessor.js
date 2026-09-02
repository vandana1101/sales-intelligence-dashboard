import {
  processWorkbook,
} from "./dataProcessor";

import {
  formatMonth,
  parseDate,
  maxDate,
} from "./dateUtils";


/*
 * Get a column value using a few common
 * header variations.
 *
 * This helps keep CSV and Excel files
 * compatible when their headers differ
 * slightly in capitalization/spacing.
 */
function getColumnValue(row, possibleNames) {

  if (!row) {
    return null;
  }

  const normalizedKeys =
    Object.keys(row).reduce(
      (map, key) => {

        const normalized =
          String(key)
            .trim()
            .toLowerCase()
            .replace(/\s+/g, " ");

        map[normalized] = key;

        return map;

      },
      {}
    );


  for (const name of possibleNames) {

    const normalizedName =
      String(name)
        .trim()
        .toLowerCase()
        .replace(/\s+/g, " ");


    const actualKey =
      normalizedKeys[normalizedName];


    if (
      actualKey !== undefined &&
      row[actualKey] !== null &&
      row[actualKey] !== undefined
    ) {

      return row[actualKey];

    }

  }


  return null;

}


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

        const updatedTime =
          getColumnValue(
            row,
            [
              "Updated Time",
              "UpdatedTime",
              "Updated Date",
            ]
          );


        const createdDate =
          getColumnValue(
            row,
            [
              "Opportunity Created Date",
              "Opportunity Created",
              "Created Date",
            ]
          );


        if (updatedTime) {
          allDates.push(updatedTime);
        }


        if (createdDate) {
          allDates.push(createdDate);
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
 *
 * CSV and Excel files are already normalized
 * by workbookReader.js, so this function does
 * not need separate CSV logic.
 */
export function buildMultiFileDataset(
  classifiedWorkbooks
) {

  const opportunities = [];
  const leads = [];
  const activities = [];

  const fileSummaries = [];


  (classifiedWorkbooks || []).forEach(
    (workbook) => {

      if (!workbook) {
        return;
      }


      const fileName =
        workbook.fileName || "Unknown file";


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


  (opportunities || []).forEach(
    (row) => {

      const id =
        getColumnValue(
          row,
          [
            "Opportunity ID",
            "Opportunity Id",
            "OpportunityID",
          ]
        );


      if (
        id === null ||
        id === undefined ||
        String(id).trim() === ""
      ) {
        return;
      }


      const opportunityId =
        String(id).trim();


      const existing =
        latestById.get(
          opportunityId
        );


      if (!existing) {

        latestById.set(
          opportunityId,
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


      /*
       * If the current record has a newer
       * snapshot date, replace the old one.
       */
      if (
        currentDate &&
        existingDate &&
        currentDate > existingDate
      ) {

        latestById.set(
          opportunityId,
          row
        );

        return;

      }


      /*
       * If the existing record has no valid
       * snapshot date but the new record does,
       * prefer the new record.
       */
      if (
        currentDate &&
        !existingDate
      ) {

        latestById.set(
          opportunityId,
          row
        );

      }

    }
  );


  return Array.from(
    latestById.values()
  );

}