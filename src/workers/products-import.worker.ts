import * as XLSX from "xlsx";

const MAX_ROWS = 5000;

self.onmessage = async (event: MessageEvent<ArrayBuffer>) => {
  try {
    const wb = XLSX.read(event.data, {
      type: "array",
      dense: true,
      cellStyles: false,
      cellHTML: false,
      cellFormula: false,
      sheetRows: MAX_ROWS + 1,
    });
    const sheetName = wb.SheetNames[0];
    if (!sheetName) {
      self.postMessage({ matrix: [] });
      return;
    }
    const sheet = wb.Sheets[sheetName];
    if (!sheet) {
      self.postMessage({ matrix: [] });
      return;
    }
    const matrix = XLSX.utils
      .sheet_to_json<unknown[]>(sheet, { header: 1, blankrows: false, raw: true })
      .map((row) =>
        (row as unknown[]).map((cell) =>
          cell === null || cell === undefined ? "" : String(cell),
        ),
      );
    self.postMessage({ matrix });
  } catch (error) {
    self.postMessage({ error: error instanceof Error ? error.message : "Falha ao ler a planilha" });
  }
};
