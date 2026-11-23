import * as XLSX from "xlsx";

/**
 * Reads Excel workbooks and CSV files.
 *
 * Supported:
 * - .xlsx
 * - .xls
 * - .csv
 *
 * CSV exports can contain multiple logical datasets in one file.
 * This reader splits those datasets and then normalizes values so
 * Excel and CSV versions of the same source data enter the dashboard
 * in the same representation.
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

    reader.onload = () => resolve(reader.result);

    reader.onerror = () => {
      reject(
        reader.error ||
          new Error("The file could not be read.")
      );
    };

    reader.onabort = () => {
      reject(
        new Error("The file read operation was aborted.")
      );
    };

    reader.readAsArrayBuffer(file);
  });
}

function readAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(reader.result);

    reader.onerror = () => {
      reject(
        reader.error ||
          new Error("The file could not be read.")
      );
    };

    reader.onabort = () => {
      reject(
        new Error("The file read operation was aborted.")
      );
    };

    reader.readAsText(file);
  });
}

function detectDatasetType(row) {
  if (!Array.isArray(row)) return null;

  const headers = row
    .map(normalizeHeader)
    .filter(Boolean);

  if (!headers.length) return null;

  const headerSet = new Set(headers);

  if (
    headerSet.has("opportunity id") &&
    (
      headerSet.has("opportunity stage") ||
      headerSet.has("opportunity created date")
    )
  ) {
    return "opportunities";
  }

  if (
    headerSet.has("lead id") &&
    (
      headerSet.has("lead stage") ||
      headerSet.has("lead source")
    )
  ) {
    return "leads";
  }

  if (
    (
      headerSet.has("activitys id") ||
      headerSet.has("activity id")
    ) &&
    (
      headerSet.has("meeting scheduled date") ||
      headerSet.has("meeting date") ||
      headerSet.has("status") ||
      headerSet.has("activity status")
    )
  ) {
    return "activities";
  }

  return null;
}

function isEmptyValue(value) {
  if (value === null || value === undefined) {
    return true;
  }

  return String(value).trim() === "";
}

function isMissingMarker(value) {
  if (value === null || value === undefined) {
    return false;
  }

  const normalized = String(value)
    .replace(/^\uFEFF/, "")
    .trim()
    .toLowerCase();

  return [
    "na",
    "n/a",
    "null",
    "none",
    "nan",
  ].includes(normalized);
}

function isDateHeader(header) {
  const h = normalizeHeader(header);

  if (!h) return false;

  return (
    h.includes("date") ||
    h.includes("time") ||
    h.includes("(till)") ||
    h === "hold period till"
  );
}

function isNumericHeader(header) {
  const h = normalizeHeader(header);

  if (!h) return false;

  /*
   * Keep identifiers/contact numbers as strings.
   */
  if (
    h.includes(" id") ||
    h.endsWith("id") ||
    h.includes("number") ||
    h.includes("phone") ||
    h.includes("mobile") ||
    h.includes("import ref")
  ) {
    return false;
  }

  return (
    h.includes("revenue") ||
    h.includes("value") ||
    h.includes("probability") ||
    h.includes("margin") ||
    h === "age" ||
    h.includes("space") ||
    h.includes("sqft") ||
    h.includes("sft") ||
    h.includes("quantity") ||
    h.includes("amount") ||
    h.includes("cost") ||
    h.includes("count") ||
    h.includes("rate") ||
    h.includes("score") ||
    h.includes("days") ||
    h.includes("duration") ||
    h.includes("percentage") ||
    h.includes(" %") ||
    h.endsWith("%")
  );
}

function parseNumber(value) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value !== "string") return null;

  const cleaned = value
    .replace(/₹/g, "")
    .replace(/\$/g, "")
    .replace(/€/g, "")
    .replace(/,/g, "")
    .replace(/%/g, "")
    .trim();

  if (!cleaned) return null;

  const result = Number(cleaned);

  return Number.isFinite(result) ? result : null;
}

function pad2(value) {
  return String(value).padStart(2, "0");
}

function formatDate(date, includeTime = false) {
  if (
    !(date instanceof Date) ||
    Number.isNaN(date.getTime())
  ) {
    return null;
  }

  const base = `${date.getFullYear()}-${pad2(
    date.getMonth() + 1
  )}-${pad2(date.getDate())}`;

  if (!includeTime) return base;

  return `${base} ${pad2(
    date.getHours()
  )}:${pad2(
    date.getMinutes()
  )}:${pad2(
    date.getSeconds()
  )}`;
}

function parseDateValue(value) {
  if (value instanceof Date) {
    return formatDate(value, true);
  }

  if (typeof value === "number") {
    /*
     * Excel serial date.
     */
    if (value > 0 && value < 100000) {
      const parsed =
        XLSX.SSF.parse_date_code(value);

      if (parsed) {
        const date = new Date(
          parsed.y,
          parsed.m - 1,
          parsed.d,
          parsed.H || 0,
          parsed.M || 0,
          parsed.S || 0
        );

        return formatDate(date, true);
      }
    }

    return String(value);
  }

  if (
    value === null ||
    value === undefined
  ) {
    return null;
  }

  let text = String(value)
    .replace(/^\uFEFF/, "")
    .trim();

  if (!text) return null;

  /*
   * DD-MMM-YY / DD-MMM-YYYY
   */
  const dmyText = text.match(
    /^(\d{1,2})[-\s]([A-Za-z]{3,})[-\s](\d{2}|\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/
  );

  if (dmyText) {
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

    const day = Number(dmyText[1]);

    const month =
      months[
        dmyText[2]
          .slice(0, 3)
          .toLowerCase()
      ];

    let year = Number(dmyText[3]);

    if (year < 100) {
      year +=
        year >= 50
          ? 1900
          : 2000;
    }

    if (month !== undefined) {
      const date = new Date(
        year,
        month,
        day,
        Number(dmyText[4] || 0),
        Number(dmyText[5] || 0),
        Number(dmyText[6] || 0)
      );

      if (
        date.getFullYear() === year &&
        date.getMonth() === month &&
        date.getDate() === day
      ) {
        return formatDate(
          date,
          Boolean(dmyText[4])
        );
      }
    }
  }

  /*
   * DD/MM/YYYY and DD-MM-YYYY
   */
  const numericDmy = text.match(
    /^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/
  );

  if (numericDmy) {
    const day = Number(numericDmy[1]);

    const month =
      Number(numericDmy[2]) - 1;

    const year =
      Number(numericDmy[3]);

    const date = new Date(
      year,
      month,
      day,
      Number(numericDmy[4] || 0),
      Number(numericDmy[5] || 0),
      Number(numericDmy[6] || 0)
    );

    if (
      date.getFullYear() === year &&
      date.getMonth() === month &&
      date.getDate() === day
    ) {
      return formatDate(
        date,
        Boolean(numericDmy[4])
      );
    }
  }

  /*
   * ISO-like dates/timestamps.
   */
  const iso = new Date(text);

  if (!Number.isNaN(iso.getTime())) {
    return formatDate(
      iso,
      /[T ]\d{1,2}:\d{2}/.test(text)
    );
  }

  /*
   * Leave unusual date values untouched
   * rather than destroying data.
   */
  return text;
}

/**
 * Canonicalizes values by header so the same source
 * data represented as Excel or CSV reaches the
 * calculations in the same form.
 */
function normalizeRows(rows) {
  if (!Array.isArray(rows)) return [];

  return rows.map((row) => {
    if (
      !row ||
      typeof row !== "object"
    ) {
      return row;
    }

    const normalizedRow = {};

    Object.entries(row).forEach(
      ([header, value]) => {
        if (
          isEmptyValue(value) ||
          isMissingMarker(value)
        ) {
          normalizedRow[header] = null;
          return;
        }

        if (isDateHeader(header)) {
          normalizedRow[header] =
            parseDateValue(value);

          return;
        }

        if (isNumericHeader(header)) {
          const parsed =
            parseNumber(value);

          normalizedRow[header] =
            parsed === null
              ? value
              : parsed;

          return;
        }

        if (typeof value === "string") {
          normalizedRow[header] =
            value
              .replace(/^\uFEFF/, "")
              .trim();

          return;
        }

        normalizedRow[header] =
          value;
      }
    );

    return normalizedRow;
  });
}

/**
 * Removes rows that belong to pivot summaries
 * or other content appearing after the real CSV dataset.
 *
 * In the uploaded CSV, the Opportunity table contains
 * exactly 1,476 records. After those records the CSV has:
 *
 * Distinct Count of Opportunity ID
 * 1476
 *
 * Those summary rows must never become Opportunity records.
 */
function trimCSVSectionRows(
  sectionRows,
  expectedColumnCount
) {
  const cleaned = [];

  for (const row of sectionRows) {
    if (!Array.isArray(row)) continue;

    const firstCell = String(
      row[0] ?? ""
    )
      .replace(/^\uFEFF/, "")
      .trim()
      .toLowerCase();

    /*
     * Explicit pivot/report summary markers.
     */
    if (
      firstCell ===
        "distinct count of opportunity id" ||
      firstCell ===
        "count of opportunity id" ||
      firstCell ===
        "grand total" ||
      firstCell ===
        "row labels" ||
      firstCell ===
        "column labels"
    ) {
      break;
    }

    const nonEmpty = row.filter(
      (value) =>
        !isEmptyValue(value)
    ).length;

    /*
     * Completely blank row = end of dataset.
     */
    if (nonEmpty === 0) {
      if (cleaned.length) break;

      continue;
    }

    /*
     * Pivot summary rows are much shorter
     * than the actual Opportunity table.
     */
    if (
      expectedColumnCount > 10 &&
      row.length <
        expectedColumnCount * 0.75
    ) {
      break;
    }

    cleaned.push(row);
  }

  return cleaned;
}

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

  const detectedSections = [];

  rows.forEach(
    (row, index) => {
      const type =
        detectDatasetType(row);

      if (!type) return;

      if (
        detectedSections.some(
          (section) =>
            section.type === type
        )
      ) {
        return;
      }

      detectedSections.push({
        type,
        headerIndex: index,
      });
    }
  );

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

      const end = nextSection
        ? nextSection.headerIndex
        : rows.length;

      const headerRow =
        rows[start] || [];

      let sectionRows =
        rows.slice(
          start,
          end
        );

      sectionRows =
        trimCSVSectionRows(
          sectionRows,
          headerRow.length
        );

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

async function readCSV(file) {
  const readCSVText =
    async (csvText) => {
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
        workbook
          .SheetNames[0];

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
        Object.keys(
          datasets
        ).length
      ) {
        return {
          SheetNames:
            Object.keys(
              datasets
            ),
          Sheets:
            datasets,
        };
      }

      const sheets = {};

      workbook.SheetNames.forEach(
        (sheetName) => {
          sheets[sheetName] =
            normalizeRows(
              XLSX.utils.sheet_to_json(
                workbook.Sheets[
                  sheetName
                ],
                {
                  defval: null,
                  raw: false,
                }
              )
            );
        }
      );

      return {
        SheetNames:
          workbook.SheetNames,
        Sheets: sheets,
      };
    };

  try {
    return await readCSVText(
      await file.text()
    );
  } catch (textError) {
    try {
      return await readCSVText(
        await readAsText(file)
      );
    } catch (
      fallbackError
    ) {
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
  const parseExcel =
    (buffer) =>
      XLSX.read(
        buffer,
        {
          type: "array",
          cellDates: true,
          raw: false,
        }
      );

  try {
    return parseExcel(
      await file.arrayBuffer()
    );
  } catch (
    arrayBufferError
  ) {
    try {
      return parseExcel(
        await readAsArrayBuffer(
          file
        )
      );
    } catch (
      fallbackError
    ) {
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
    workbook.SheetNames
      .length === 0
  ) {
    throw new Error(
      "No readable data was found in the file."
    );
  }

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

      sheets[sheetName] =
        normalizeRows(
          XLSX.utils.sheet_to_json(
            source,
            {
              defval: null,
              raw: false,
            }
          )
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