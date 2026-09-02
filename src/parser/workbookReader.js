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
 *
 * The reader normalizes Excel and CSV values so that the rest of
 * the dashboard receives the same data representation regardless
 * of the source file type.
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
   VALUE NORMALIZATION
========================================================= */

function normalizeTextValue(value) {
  if (
    value === null ||
    value === undefined
  ) {
    return null;
  }

  const text =
    String(value)
      .replace(/^\uFEFF/, "")
      .trim();

  if (!text) {
    return null;
  }

  const normalized =
    text.toLowerCase();

  /*
   * Treat common CSV representations of
   * empty values the same as Excel blanks.
   */
  if (
    normalized === "na" ||
    normalized === "n/a" ||
    normalized === "null" ||
    normalized === "undefined" ||
    normalized === "-" ||
    normalized === "--"
  ) {
    return null;
  }

  return text;
}

function looksLikeDateHeader(header) {
  const value =
    normalizeHeader(header);

  return (
    value.includes("date") ||
    value.includes("time")
  );
}

function looksLikePercentageHeader(header) {
  const value =
    normalizeHeader(header);

  return (
    value.includes("%") ||
    value.includes("percent") ||
    value.includes("probability")
  );
}

function looksLikeNumericHeader(header) {
  const value =
    normalizeHeader(header);

  return (
    value.includes("value") ||
    value.includes("revenue") ||
    value.includes("amount") ||
    value.includes("cost") ||
    value.includes("price") ||
    value.includes("days") ||
    value.includes("age") ||
    value.includes("count") ||
    value.includes("score") ||
    value.includes("quantity") ||
    value.includes("number") ||
    value.includes("target")
  );
}

function parseNumericValue(value) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  if (
    typeof value === "number"
  ) {
    return Number.isFinite(value)
      ? value
      : null;
  }

  let text =
    String(value)
      .trim();

  if (!text) {
    return null;
  }

  /*
   * Remove currency symbols and whitespace.
   */
  text = text
    .replace(/[₹$€£]/g, "")
    .replace(/\s/g, "");

  /*
   * Handle percentages.
   *
   * The dashboard's existing calculations expect
   * percentage values as the numeric displayed value.
   *
   * Therefore:
   * "100%" -> 100
   * "75%"  -> 75
   */
  const isPercentage =
    text.endsWith("%");

  text =
    text.replace(/%/g, "");

  /*
   * Handle thousands separators.
   */
  text =
    text.replace(/,/g, "");

  const result =
    Number(text);

  if (
    !Number.isFinite(result)
  ) {
    return null;
  }

  return result;
}

function normalizeDateValue(value) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  /*
   * If SheetJS has already returned a Date,
   * convert it into a stable ISO date string.
   */
  if (
    value instanceof Date
  ) {
    if (
      Number.isNaN(
        value.getTime()
      )
    ) {
      return null;
    }

    return value
      .toISOString()
      .slice(0, 10);
  }

  const text =
    String(value)
      .replace(/^\uFEFF/, "")
      .trim();

  if (!text) {
    return null;
  }

  /*
   * DD-MMM-YY / DD-MMM-YYYY
   *
   * Examples:
   * 23-Mar-22
   * 23-Mar-2022
   */
  let match =
    text.match(
      /^(\d{1,2})[-/ ]([A-Za-z]{3,9})[-/ ](\d{2,4})$/
    );

  if (match) {
    const day =
      Number(match[1]);

    const monthText =
      match[2]
        .slice(0, 3)
        .toLowerCase();

    let year =
      Number(match[3]);

    if (year < 100) {
      year +=
        year >= 50
          ? 1900
          : 2000;
    }

    const months = {
      jan: 0,
      feb: 1,
      mar: 2,
      apr: 3,
      may: 4,
      jun: 5,
      jul: 6,
      aug: 7,
      sep: 8,
      oct: 9,
      nov: 10,
      dec: 11,
    };

    if (
      Object.prototype.hasOwnProperty.call(
        months,
        monthText
      )
    ) {
      const date =
        new Date(
          year,
          months[monthText],
          day
        );

      if (
        date.getFullYear() === year &&
        date.getMonth() ===
          months[monthText] &&
        date.getDate() === day
      ) {
        return date
          .toISOString()
          .slice(0, 10);
      }
    }
  }

  /*
   * DD/MM/YYYY or DD-MM-YYYY
   */
  match =
    text.match(
      /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/
    );

  if (match) {
    const day =
      Number(match[1]);

    const month =
      Number(match[2]) - 1;

    const year =
      Number(match[3]);

    const date =
      new Date(
        year,
        month,
        day
      );

    if (
      date.getFullYear() === year &&
      date.getMonth() === month &&
      date.getDate() === day
    ) {
      return date
        .toISOString()
        .slice(0, 10);
    }
  }

  /*
   * ISO timestamps / ISO dates.
   */
  const parsed =
    new Date(text);

  if (
    !Number.isNaN(
      parsed.getTime()
    )
  ) {
    return parsed
      .toISOString()
      .slice(0, 10);
  }

  /*
   * If this doesn't look like a valid date,
   * keep the original value rather than destroying
   * information.
   */
  return text;
}

/**
 * Normalize a row consistently regardless of whether
 * it came from Excel or CSV.
 */
function normalizeRow(row) {
  if (
    !row ||
    typeof row !== "object"
  ) {
    return {};
  }

  const normalizedRow = {};

  Object.entries(row).forEach(
    ([header, value]) => {
      const cleanHeader =
        String(header ?? "")
          .replace(/^\uFEFF/, "")
          .trim();

      if (!cleanHeader) {
        return;
      }

      /*
       * Preserve the ORIGINAL header name.
       *
       * The rest of the application already knows the
       * business column names and has tolerant header
       * matching.
       */
      if (
        looksLikeDateHeader(
          cleanHeader
        )
      ) {
        normalizedRow[
          cleanHeader
        ] =
          normalizeDateValue(
            value
          );

        return;
      }

      if (
        looksLikePercentageHeader(
          cleanHeader
        ) ||
        looksLikeNumericHeader(
          cleanHeader
        )
      ) {
        const numeric =
          parseNumericValue(
            value
          );

        /*
         * Only replace with numeric form when the
         * value is actually numeric.
         */
        normalizedRow[
          cleanHeader
        ] =
          numeric !== null
            ? numeric
            : normalizeTextValue(
                value
              );

        return;
      }

      normalizedRow[
        cleanHeader
      ] =
        normalizeTextValue(
          value
        );
    }
  );

  return normalizedRow;
}

function normalizeRows(rows) {
  if (!Array.isArray(rows)) {
    return [];
  }

  return rows.map(
    normalizeRow
  );
}

/* =========================================================
   FILE READERS
========================================================= */

function readAsArrayBuffer(file) {
  return new Promise(
    (resolve, reject) => {
      const reader =
        new FileReader();

      reader.onload = () => {
        resolve(
          reader.result
        );
      };

      reader.onerror = () => {
        reject(
          reader.error ||
            new Error(
              "The file could not be read."
            )
        );
      };

      reader.onabort = () => {
        reject(
          new Error(
            "The file read operation was aborted."
          )
        );
      };

      reader.readAsArrayBuffer(
        file
      );
    }
  );
}

function readAsText(file) {
  return new Promise(
    (resolve, reject) => {
      const reader =
        new FileReader();

      reader.onload = () => {
        resolve(
          reader.result
        );
      };

      reader.onerror = () => {
        reject(
          reader.error ||
            new Error(
              "The file could not be read."
            )
        );
      };

      reader.onabort = () => {
        reject(
          new Error(
            "The file read operation was aborted."
          )
        );
      };

      reader.readAsText(
        file
      );
    }
  );
}

/* =========================================================
   DATASET DETECTION
========================================================= */

function detectDatasetType(row) {
  if (!Array.isArray(row)) {
    return null;
  }

  const headers =
    row
      .map(normalizeHeader)
      .filter(Boolean);

  if (!headers.length) {
    return null;
  }

  const headerSet =
    new Set(headers);

  /*
   * Opportunities
   */
  const hasOpportunityId =
    headerSet.has(
      "opportunity id"
    );

  const hasOpportunityStage =
    headerSet.has(
      "opportunity stage"
    );

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
   * Leads
   */
  const hasLeadId =
    headerSet.has(
      "lead id"
    );

  const hasLeadStage =
    headerSet.has(
      "lead stage"
    );

  const hasLeadSource =
    headerSet.has(
      "lead source"
    );

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
   * Activities
   */
  const hasActivityId =
    headerSet.has(
      "activitys id"
    ) ||
    headerSet.has(
      "activity id"
    );

  const hasMeetingDate =
    headerSet.has(
      "meeting scheduled date"
    ) ||
    headerSet.has(
      "meeting date"
    );

  const hasActivityStatus =
    headerSet.has(
      "status"
    ) ||
    headerSet.has(
      "activity status"
    );

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

/* =========================================================
   CSV DATASET SPLITTING
========================================================= */

function splitCSVIntoDatasets(
  worksheet
) {
  const rows =
    XLSX.utils.sheet_to_json(
      worksheet,
      {
        header: 1,
        defval: null,
        raw: false,
        blankrows: true,
      }
    );

  const detectedSections =
    [];

  rows.forEach(
    (row, index) => {
      const type =
        detectDatasetType(
          row
        );

      if (!type) {
        return;
      }

      /*
       * Only detect the first occurrence of
       * each logical dataset.
       */
      const alreadyDetected =
        detectedSections.some(
          (section) =>
            section.type === type
        );

      if (
        !alreadyDetected
      ) {
        detectedSections.push({
          type,
          headerIndex: index,
        });
      }
    }
  );

  /*
   * No known datasets:
   * let the normal CSV reader handle it.
   */
  if (
    !detectedSections.length
  ) {
    return null;
  }

  const sheets = {};

  detectedSections.forEach(
    (
      section,
      sectionIndex
    ) => {
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

      let sectionRows =
        rows.slice(
          start,
          end
        );

      /*
       * Remove blank rows around the
       * logical dataset.
       */
      while (
        sectionRows.length &&
        sectionRows[0].every(
          (value) =>
            value === null ||
            value === undefined ||
            String(value).trim() ===
              ""
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
            String(value).trim() ===
              ""
        )
      ) {
        sectionRows.pop();
      }

      if (
        !sectionRows.length
      ) {
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
        normalizeRows(
          jsonRows
        );
    }
  );

  return sheets;
}

/* =========================================================
   CSV READER
========================================================= */

async function readCSV(file) {
  try {
    const csvText =
      await file.text();

    if (
      typeof csvText !==
        "string" ||
      !csvText.trim()
    ) {
      throw new Error(
        "The CSV file is empty."
      );
    }

    const workbook =
      XLSX.read(
        csvText,
        {
          type: "string",
          raw: false,
          cellDates: true,
        }
      );

    const firstSheetName =
      workbook.SheetNames[0];

    const firstWorksheet =
      workbook.Sheets[
        firstSheetName
      ];

    /*
     * Your CSV export contains multiple logical
     * datasets inside one physical CSV.
     */
    const datasets =
      splitCSVIntoDatasets(
        firstWorksheet
      );

    if (
      datasets &&
      Object.keys(datasets)
        .length
    ) {
      return {
        SheetNames:
          Object.keys(
            datasets
          ),

        Sheets: datasets,
      };
    }

    /*
     * Normal single-table CSV.
     */
    const sheets = {};

    workbook.SheetNames.forEach(
      (sheetName) => {
        const worksheet =
          workbook.Sheets[
            sheetName
          ];

        const rows =
          XLSX.utils.sheet_to_json(
            worksheet,
            {
              defval: null,
              raw: false,
            }
          );

        sheets[sheetName] =
          normalizeRows(
            rows
          );
      }
    );

    return {
      SheetNames:
        workbook.SheetNames,

      Sheets: sheets,
    };
  } catch (textError) {
    /*
     * FileReader fallback.
     */
    try {
      const csvText =
        await readAsText(file);

      if (
        typeof csvText !==
          "string" ||
        !csvText.trim()
      ) {
        throw new Error(
          "The CSV file is empty."
        );
      }

      const workbook =
        XLSX.read(
          csvText,
          {
            type: "string",
            raw: false,
            cellDates: true,
          }
        );

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
        Object.keys(datasets)
          .length
      ) {
        return {
          SheetNames:
            Object.keys(
              datasets
            ),

          Sheets: datasets,
        };
      }

      const sheets = {};

      workbook.SheetNames.forEach(
        (sheetName) => {
          const worksheet =
            workbook.Sheets[
              sheetName
            ];

          const rows =
            XLSX.utils.sheet_to_json(
              worksheet,
              {
                defval: null,
                raw: false,
              }
            );

          sheets[sheetName] =
            normalizeRows(
              rows
            );
        }
      );

      return {
        SheetNames:
          workbook.SheetNames,

        Sheets: sheets,
      };
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

/* =========================================================
   EXCEL READER
========================================================= */

async function readExcel(file) {
  let workbook;

  try {
    const buffer =
      await file.arrayBuffer();

    workbook =
      XLSX.read(
        buffer,
        {
          type: "array",
          cellDates: true,
          raw: false,
        }
      );
  } catch (arrayBufferError) {
    try {
      const buffer =
        await readAsArrayBuffer(
          file
        );

      workbook =
        XLSX.read(
          buffer,
          {
            type: "array",
            cellDates: true,
            raw: false,
          }
        );
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

  /*
   * Normalize Excel rows using the EXACT same
   * normalization function used for CSV.
   */
  const sheets = {};

  workbook.SheetNames.forEach(
    (sheetName) => {
      const worksheet =
        workbook.Sheets[
          sheetName
        ];

      const rows =
        XLSX.utils.sheet_to_json(
          worksheet,
          {
            defval: null,
            raw: false,
          }
        );

      sheets[sheetName] =
        normalizeRows(
          rows
        );
    }
  );

  return {
    SheetNames:
      workbook.SheetNames,

    Sheets: sheets,
  };
}

/* =========================================================
   PUBLIC API
========================================================= */

export async function readWorkbook(
  file
) {
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

  if (
    extension === "csv"
  ) {
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
    workbook.SheetNames.length ===
      0
  ) {
    throw new Error(
      "No readable data was found in the file."
    );
  }

  /*
   * At this point CSV and Excel both return
   * normalized row arrays.
   */
  const sheets = {};

  workbook.SheetNames.forEach(
    (sheetName) => {
      const source =
        workbook.Sheets[
          sheetName
        ];

      if (
        Array.isArray(source)
      ) {
        sheets[sheetName] =
          normalizeRows(
            source
          );

        return;
      }

      const rows =
        XLSX.utils.sheet_to_json(
          source,
          {
            defval: null,
            raw: false,
          }
        );

      sheets[sheetName] =
        normalizeRows(
          rows
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