import * as XLSX from "xlsx";

/**
 * Reads Excel workbooks and CSV files.
 *
 * Supported:
 * - .xlsx
 * - .xls
 * - .csv
 *
 * CSV files may contain multiple logical datasets in the same file.
 * For example:
 *
 *   Leads
 *   Opportunities
 *   Activities
 *
 * with unrelated pivot/calculation sections before or between them.
 *
 * The reader detects those dataset headers and converts them into
 * separate logical sheets so the existing classifier/calculation
 * pipeline can continue working normally.
 */

function normalizeHeader(value) {
  return String(value ?? "")
    .replace(/^\uFEFF/, "")
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
}

function readAsArrayBuffer(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      resolve(reader.result);
    };

    reader.onerror = () => {
      reject(
        reader.error ||
          new Error("The file could not be read.")
      );
    };

    reader.onabort = () => {
      reject(
        new Error(
          "The file read operation was aborted."
        )
      );
    };

    reader.readAsArrayBuffer(file);
  });
}

function readAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      resolve(reader.result);
    };

    reader.onerror = () => {
      reject(
        reader.error ||
          new Error("The file could not be read.")
      );
    };

    reader.onabort = () => {
      reject(
        new Error(
          "The file read operation was aborted."
        )
      );
    };

    reader.readAsText(file);
  });
}

/**
 * Determines whether an array represents the header row
 * for one of our supported datasets.
 */
function detectDatasetType(row) {
  if (!Array.isArray(row)) {
    return null;
  }

  const headers = row
    .map(normalizeHeader)
    .filter(Boolean);

  if (!headers.length) {
    return null;
  }

  const headerSet = new Set(headers);

  /*
   * Opportunity dataset
   */
  const hasOpportunityId =
    headerSet.has("opportunity id");

  const hasOpportunityStage =
    headerSet.has("opportunity stage");

  const hasOpportunityCreatedDate =
    headerSet.has(
      "opportunity created date"
    );

  if (
    hasOpportunityId &&
    (
      hasOpportunityStage ||
      hasOpportunityCreatedDate
    )
  ) {
    return "opportunities";
  }

  /*
   * Lead dataset
   */
  const hasLeadId =
    headerSet.has("lead id");

  const hasLeadStage =
    headerSet.has("lead stage");

  const hasLeadSource =
    headerSet.has("lead source");

  if (
    hasLeadId &&
    (
      hasLeadStage ||
      hasLeadSource
    )
  ) {
    return "leads";
  }

  /*
   * Activity dataset
   *
   * The source file uses "Activitys ID",
   * so both the original spelling and common
   * corrected spelling are supported.
   */
  const hasActivityId =
    headerSet.has("activitys id") ||
    headerSet.has("activity id");

  const hasMeetingDate =
    headerSet.has(
      "meeting scheduled date"
    ) ||
    headerSet.has("meeting date");

  const hasActivityStatus =
    headerSet.has("status") ||
    headerSet.has("activity status");

  if (
    hasActivityId &&
    (
      hasMeetingDate ||
      hasActivityStatus
    )
  ) {
    return "activities";
  }

  return null;
}

/**
 * Converts a CSV worksheet into logical datasets.
 *
 * This handles CSV exports that contain multiple tables/sections
 * in one file, such as:
 *
 *   miscellaneous/pivot data
 *   Leads
 *   miscellaneous data
 *   Opportunities
 *   miscellaneous data
 *   Activities
 */
function splitCSVIntoDatasets(worksheet) {
  const rows = XLSX.utils.sheet_to_json(
    worksheet,
    {
      header: 1,
      defval: null,
      raw: false,
      blankrows: true,
    }
  );

  const detectedSections = [];

  rows.forEach((row, index) => {
    const type =
      detectDatasetType(row);

    if (!type) {
      return;
    }

    /*
     * Prevent duplicate detection if a malformed file
     * happens to repeat a header.
     */
    const alreadyDetected =
      detectedSections.some(
        (section) =>
          section.type === type
      );

    if (!alreadyDetected) {
      detectedSections.push({
        type,
        headerIndex: index,
      });
    }
  });

  /*
   * If no known dataset headers were found,
   * fall back to the normal single-sheet CSV behavior.
   */
  if (!detectedSections.length) {
    return null;
  }

  const sheets = {};

  detectedSections.forEach(
    (section, sectionIndex) => {
      const nextSection =
        detectedSections[
          sectionIndex + 1
        ];

      const start =
        section.headerIndex;

      const end =
        nextSection
          ? nextSection.headerIndex
          : rows.length;

      const sectionRows =
        rows.slice(start, end);

      if (!sectionRows.length) {
        return;
      }

      /*
       * Remove completely empty rows from the end
       * and beginning of the logical section.
       */
      while (
        sectionRows.length &&
        sectionRows[0].every(
          (value) =>
            value === null ||
            value === undefined ||
            String(value).trim() === ""
        )
      ) {
        sectionRows.shift();
      }

      while (
        sectionRows.length &&
        sectionRows[
          sectionRows.length - 1
        ].every(
          (value) =>
            value === null ||
            value === undefined ||
            String(value).trim() === ""
        )
      ) {
        sectionRows.pop();
      }

      if (!sectionRows.length) {
        return;
      }

      const logicalWorksheet =
        XLSX.utils.aoa_to_sheet(
          sectionRows
        );

      const jsonRows =
        XLSX.utils.sheet_to_json(
          logicalWorksheet,
          {
            defval: null,
            raw: false,
          }
        );

      sheets[section.type] =
        jsonRows;
    }
  );

  return sheets;
}

async function readCSV(file) {
  /*
   * CSV is text data, so read it directly as text.
   */
  try {
    const csvText =
      await file.text();

    if (
      typeof csvText !== "string" ||
      !csvText.trim()
    ) {
      throw new Error(
        "The CSV file is empty."
      );
    }

    const workbook =
      XLSX.read(csvText, {
        type: "string",
        raw: false,
        cellDates: true,
      });

    const firstSheetName =
      workbook.SheetNames[0];

    const firstWorksheet =
      workbook.Sheets[
        firstSheetName
      ];

    /*
     * IMPORTANT:
     * Check whether this CSV contains multiple
     * logical datasets.
     */
    const datasets =
      splitCSVIntoDatasets(
        firstWorksheet
      );

    if (
      datasets &&
      Object.keys(datasets).length
    ) {
      return {
        SheetNames:
          Object.keys(datasets),
        Sheets: datasets,
      };
    }

    /*
     * Normal single-table CSV fallback.
     */
    return workbook;
  } catch (textError) {
    /*
     * Fallback for browsers/environments where
     * File.text() cannot read the selected file.
     */
    try {
      const csvText =
        await readAsText(file);

      if (
        typeof csvText !== "string" ||
        !csvText.trim()
      ) {
        throw new Error(
          "The CSV file is empty."
        );
      }

      const workbook =
        XLSX.read(csvText, {
          type: "string",
          raw: false,
          cellDates: true,
        });

      const firstSheetName =
        workbook.SheetNames[0];

      const firstWorksheet =
        workbook.Sheets[
          firstSheetName
        ];

      const datasets =
        splitCSVIntoDatasets(
          firstWorksheet
        );

      if (
        datasets &&
        Object.keys(datasets).length
      ) {
        return {
          SheetNames:
            Object.keys(datasets),
          Sheets: datasets,
        };
      }

      return workbook;
    } catch (fallbackError) {
      throw new Error(
        `CSV file could not be read. ${
          fallbackError?.message ||
          textError?.message ||
          "Please select the file again."
        }`
      );
    }
  }
}

async function readExcel(file) {
  /*
   * Excel files are binary, so use ArrayBuffer.
   */
  try {
    const buffer =
      await file.arrayBuffer();

    return XLSX.read(buffer, {
      type: "array",
      cellDates: true,
      raw: false,
    });
  } catch (arrayBufferError) {
    /*
     * Fallback to FileReader.
     */
    try {
      const buffer =
        await readAsArrayBuffer(file);

      return XLSX.read(buffer, {
        type: "array",
        cellDates: true,
        raw: false,
      });
    } catch (fallbackError) {
      throw new Error(
        `Excel file could not be read. ${
          fallbackError?.message ||
          arrayBufferError?.message ||
          "Please select the file again."
        }`
      );
    }
  }
}

export async function readWorkbook(file) {
  if (!file) {
    throw new Error(
      "No file was provided."
    );
  }

  const fileName =
    file.name || "";

  const extension =
    fileName
      .split(".")
      .pop()
      .toLowerCase();

  const supportedExtensions = [
    "xlsx",
    "xls",
    "csv",
  ];

  if (
    !supportedExtensions.includes(
      extension
    )
  ) {
    throw new Error(
      `Unsupported file type: .${extension}`
    );
  }

  let workbook;

  if (extension === "csv") {
    workbook =
      await readCSV(file);
  } else {
    workbook =
      await readExcel(file);
  }

  if (
    !workbook ||
    !Array.isArray(
      workbook.SheetNames
    ) ||
    workbook.SheetNames.length === 0
  ) {
    throw new Error(
      "No readable data was found in the file."
    );
  }

  const sheets = {};

  workbook.SheetNames.forEach(
    (sheetName) => {
      /*
       * For a normal Excel workbook, Sheets[sheetName]
       * is a worksheet.
       *
       * For our multi-dataset CSV, Sheets[sheetName]
       * is already an array of normalized rows.
       */
      const source =
        workbook.Sheets[
          sheetName
        ];

      if (Array.isArray(source)) {
        sheets[sheetName] =
          source;
        return;
      }

      sheets[sheetName] =
        XLSX.utils.sheet_to_json(
          source,
          {
            defval: null,
            raw: false,
          }
        );
    }
  );

  return {
    fileName,
    fileType: extension,
    sheetNames:
      workbook.SheetNames,
    sheets,
  };
}