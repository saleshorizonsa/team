import * as XLSX from "xlsx";

export function exportToExcel(
  filename: string,
  sheetName: string,
  rows: Record<string, string | number>[]
): void {
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));
  XLSX.writeFile(wb, filename);
}

export interface WorkbookSheet {
  name: string;
  rows: Record<string, string | number>[];
}

/** Build a single multi-sheet workbook and trigger download. Empty sheets are kept (with a placeholder). */
export function exportWorkbook(filename: string, sheets: WorkbookSheet[]): void {
  const wb = XLSX.utils.book_new();
  const used = new Set<string>();
  for (const s of sheets) {
    let name = (s.name || "Sheet").slice(0, 31);
    // sheet names must be unique
    let n = 1;
    while (used.has(name)) name = `${s.name.slice(0, 28)}_${++n}`;
    used.add(name);
    const ws = XLSX.utils.json_to_sheet(s.rows.length ? s.rows : [{ note: "No records" }]);
    XLSX.utils.book_append_sheet(wb, ws, name);
  }
  XLSX.writeFile(wb, filename);
}
