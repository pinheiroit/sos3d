import * as XLSX from "xlsx";

const MAX_ROWS = 5000;

self.onmessage = async (event: MessageEvent<ArrayBuffer>) => {
  try {
    self.postMessage({ phase: "read", progress: 0.02 });
    const wb = XLSX.read(event.data, {
      type: "array",
      dense: true,
      cellStyles: false,
      cellHTML: false,
      cellFormula: false,
      sheetRows: MAX_ROWS + 1,
    });
    self.postMessage({ phase: "parse", progress: 0.5 });
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
    const raw = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
      header: 1,
      blankrows: false,
      raw: true,
    });
    self.postMessage({ phase: "convert", progress: 0.6 });
    const matrix: string[][] = [];
    for (let i = 0; i < raw.length; i += 1) {
      matrix.push(
        (raw[i] as unknown[]).map((cell) =>
          cell === null || cell === undefined ? "" : String(cell),
        ),
      );
      if (i % 250 === 0) {
        self.postMessage({ phase: "convert", progress: 0.6 + (0.4 * i) / Math.max(raw.length, 1) });
      }
    }
    self.postMessage({ phase: "convert", progress: 1 });
    self.postMessage({ matrix });
  } catch (error) {
    self.postMessage({ error: error instanceof Error ? error.message : "Falha ao ler a planilha" });
  }
};
