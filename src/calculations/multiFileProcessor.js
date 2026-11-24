
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
 * Priority:
 * 1. Latest Opportunity Updated Time
 * 2. Latest Opportunity Created Date
 * 3. Latest date from Leads or Activities
 */
function getWorkbookSnapshotDate(classifiedWorkbook) {

  const updatedDates = [];
  const createdDates = [];
  const otherDates = [];


  // Opportunity dates
  if (
    Array.isArray(
      classifiedWorkbook.opportunities?.rows
    )
  ) {

    classifiedWorkbook.opportunities.rows.forEach(
      (row) => {

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
          updatedDates.push(updatedTime);
        }


        if (createdDate) {
          createdDates.push(createdDate);
        }

      }
    );

  }


  if (updatedDates.length) {
    return maxDate(updatedDates);
  }


  if (createdDates.length) {
    return maxDate(createdDates);
  }


  // Leads and Activities fallback
  [
    classifiedWorkbook.leads,
    classifiedWorkbook.activities,
  ].forEach(
    (section) => {

      if (
        !Array.isArray(section?.rows)
      ) {
        return;
      }


      section.rows.forEach(
        (row) => {

          Object.entries(row || {}).forEach(
            ([key, value]) => {

              if (
                /(date|time|created|updated)/i.test(key) &&
                value
              ) {

                otherDates.push(value);

              }

            }
          );

        }
      );

    }
  );


  return maxDate(otherDates);

}


/*
 * Add source and snapshot metadata
 * to every processed row.
 */
function addSnapshotMetadata(
  rows,
  fileName,
  snapshotDate,
  dataType,
  snapshotOrder
) {

  return rows.map(
    (row, rowOrder) => ({

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

      "__snapshot_order":
        snapshotOrder,

      "__row_order":
        rowOrder,

    })
  );

}


/*
 * Merge rows from multiple uploaded files.
 *
 * Each workbook is processed separately first.
 * The processed records are then combined.
 */
export function buildMultiFileDataset(
  classifiedWorkbooks
) {

  const opportunities = [];
  const leads = [];
  const activities = [];

  const fileSummaries = [];


  (classifiedWorkbooks || []).forEach(
    (workbook, snapshotOrder) => {

      if (!workbook) {
        return;
      }


      const fileName =
        workbook.fileName ||
        "Unknown file";


      const snapshotDate =
        getWorkbookSnapshotDate(
          workbook
        );


      /*
       * Run the existing calculation engine.
       */
      const processed =
        processWorkbook(
          workbook
        );


      // Opportunities
      if (
        Array.isArray(
          processed.opportunities
        )
      ) {

        opportunities.push(
          ...addSnapshotMetadata(
            processed.opportunities,
            fileName,
            snapshotDate,
            "opportunity",
            snapshotOrder
          )
        );

      }


      // Leads
      if (
        Array.isArray(
          processed.leads
        )
      ) {

        leads.push(
          ...addSnapshotMetadata(
            processed.leads,
            fileName,
            snapshotDate,
            "lead",
            snapshotOrder
          )
        );

      }


      // Activities
      if (
        Array.isArray(
          processed.activities
        )
      ) {

        activities.push(
          ...addSnapshotMetadata(
            processed.activities,
            fileName,
            snapshotDate,
            "activity",
            snapshotOrder
          )
        );

      }


      // File summary
      fileSummaries.push({

        fileName,

        fileType:
          workbook.fileType || null,

        snapshotDate:
          snapshotDate
            ? snapshotDate.toISOString()
            : null,

        snapshotMonth:
          snapshotDate
            ? formatMonth(snapshotDate)
            : null,

        opportunities:
          processed.opportunities?.length || 0,

        leads:
          processed.leads?.length || 0,

        activities:
          processed.activities?.length || 0,

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
 *
 * All historical snapshots remain available
 * in the main opportunities array.
 */
export function getCurrentOpportunities(
  opportunities
) {

  const latestById = new Map();

  const rowsWithoutId = [];


  (opportunities || []).forEach(
    (row) => {

      const id =
        getColumnValue(
          row,
          [
            "Opportunity ID",
            "Opportunity Id",
            "OpportunityID",
            "Opportunity_ID",
          ]
        );


      // Preserve rows without an Opportunity ID.
      if (
        id === null ||
        id === undefined ||
        String(id).trim() === ""
      ) {

        rowsWithoutId.push(row);

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


      let shouldReplace = false;


      if (
        currentDate &&
        existingDate &&
        currentDate.getTime() !== existingDate.getTime()
      ) {

        shouldReplace =
          currentDate > existingDate;

      } else if (
        currentDate &&
        !existingDate
      ) {

        shouldReplace = true;

      } else if (
        !currentDate &&
        existingDate
      ) {

        shouldReplace = false;

      } else {

        /*
         * If dates are equal or unavailable,
         * the later uploaded snapshot wins.
         */

        const existingSnapshotOrder =
          Number(
            existing["__snapshot_order"] ?? -1
          );


        const currentSnapshotOrder =
          Number(
            row["__snapshot_order"] ?? -1
          );


        const existingRowOrder =
          Number(
            existing["__row_order"] ?? -1
          );


        const currentRowOrder =
          Number(
            row["__row_order"] ?? -1
          );


        shouldReplace =
          currentSnapshotOrder > existingSnapshotOrder ||
          (
            currentSnapshotOrder === existingSnapshotOrder &&
            currentRowOrder >= existingRowOrder
          );

      }


      if (shouldReplace) {

        latestById.set(
          opportunityId,
          row
        );

      }

    }
  );


  return [
    ...latestById.values(),
    ...rowsWithoutId,
  ];

}
