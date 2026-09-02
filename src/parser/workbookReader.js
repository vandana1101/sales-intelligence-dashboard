import * as XLSX from "xlsx";

/**
 * Reads both Excel workbooks and CSV files.
 *
 * Supported:
 * - .xlsx
 * - .xls
 * - .csv
 *
 * Returns the same normalized structure for all file types:
 *
 * {
 *   fileName,
 *   fileType,
 *   sheetNames,
 *   sheets
 * }
 */

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
        new Error("The file read operation was aborted.")
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
        new Error("The file read operation was aborted.")
      );
    };

    reader.readAsText(file);
  });
}

async function readCSV(file) {
  /*
   * CSV is text data, so read it directly as text.
   *
   * This avoids unnecessarily reading a CSV as a binary
   * ArrayBuffer and lets SheetJS handle the CSV structure.
   */
  try {
    const csvText = await file.text();

    if (
      typeof csvText !== "string" ||
      !csvText.trim()
    ) {
      throw new Error(
        "The CSV file is empty."
      );
    }

    return XLSX.read(csvText, {
      type: "string",
      raw: false,
      cellDates: true,
    });
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

      return XLSX.read(csvText, {
        type: "string",
        raw: false,
        cellDates: true,
      });
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
     * Fallback to FileReader for environments where
     * Blob.arrayBuffer() fails.
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

  /*
   * CSV and Excel now use their appropriate
   * reading mechanisms.
   */
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
      const worksheet =
        workbook.Sheets[
          sheetName
        ];

      sheets[sheetName] =
        XLSX.utils.sheet_to_json(
          worksheet,
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