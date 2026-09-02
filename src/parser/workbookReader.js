import * as XLSX from "xlsx";

/**
 * Reads both Excel workbooks and CSV files.
 *
 * Supported:
 * - .xlsx
 * - .xls
 * - .csv
 *
 * Returns the same normalized structure for all file types
 * so the rest of the dashboard can continue using:
 *
 * {
 *   fileName,
 *   fileType,
 *   sheetNames,
 *   sheets
 * }
 */
export async function readWorkbook(file) {
  if (!file) {
    throw new Error("No file was provided.");
  }

  const fileName = file.name || "";
  const extension = fileName
    .split(".")
    .pop()
    .toLowerCase();

  const supportedExtensions = ["xlsx", "xls", "csv"];

  if (!supportedExtensions.includes(extension)) {
    throw new Error(
      `Unsupported file type: .${extension}`
    );
  }

  const buffer = await file.arrayBuffer();

  const workbook = XLSX.read(buffer, {
    type: "array",
    cellDates: true,
    raw: false,
  });

  const sheets = {};

  workbook.SheetNames.forEach((sheetName) => {
    const worksheet = workbook.Sheets[sheetName];

    sheets[sheetName] = XLSX.utils.sheet_to_json(
      worksheet,
      {
        defval: null,
        raw: false,
      }
    );
  });

  return {
    fileName,
    fileType: extension,
    sheetNames: workbook.SheetNames,
    sheets,
  };
}