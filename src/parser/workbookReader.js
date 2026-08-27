import * as XLSX from "xlsx";

export async function readWorkbook(file) {
  const buffer = await file.arrayBuffer();

  const workbook = XLSX.read(buffer, {
    type: "array",
    cellDates: true,
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
    fileName: file.name,
    sheetNames: workbook.SheetNames,
    sheets,
  };
}