/**
 * Minimal CSV parser for recorded dataset import.
 *
 * Rules:
 *   - First row is always the column headers.
 *   - If the second row contains mostly non-numeric text it is treated as a
 *     units row (e.g. "°C", "ppm") and skipped from data.
 *   - Columns with no numeric values at all are silently dropped.
 *   - Empty cells are filled with the column minimum so the series stays
 *     continuous; a null value never reaches the signal path.
 */

export interface ParsedColumn {
  key: string;    // safe identifier derived from the header
  label: string;  // original header text
  unit: string;   // unit string from optional second row, or ""
  values: number[];
  min: number;
  max: number;
}

export interface ParsedDataset {
  name: string;
  columns: ParsedColumn[];
  rowCount: number;
}

export type ParseResult =
  | { ok: true; dataset: ParsedDataset }
  | { ok: false; error: string };

// ---------------------------------------------------------------------------

function splitLine(line: string): string[] {
  const cells: string[] = [];
  let cell = "";
  let inQuote = false;
  for (const ch of line) {
    if (ch === '"') { inQuote = !inQuote; continue; }
    if (ch === "," && !inQuote) { cells.push(cell.trim()); cell = ""; continue; }
    cell += ch;
  }
  cells.push(cell.trim());
  return cells;
}

function looksLikeUnitsRow(cells: string[]): boolean {
  const nonempty = cells.filter(c => c !== "");
  if (nonempty.length === 0) return false;
  const nonNumeric = nonempty.filter(c => isNaN(Number(c)));
  return nonNumeric.length > nonempty.length * 0.5;
}

function makeKey(header: string, used: Set<string>): string {
  let base = header.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/, "") || "col";
  let key = base;
  let n = 2;
  while (used.has(key)) key = `${base}_${n++}`;
  used.add(key);
  return key;
}

// ---------------------------------------------------------------------------

export function parseCSV(text: string, filename: string): ParseResult {
  const lines = text.replace(/\r\n?/g, "\n").split("\n").filter(l => l.trim() !== "");

  if (lines.length < 2) {
    return { ok: false, error: "File needs at least a header row and one data row." };
  }

  const headers = splitLine(lines[0]);
  if (headers.length === 0) return { ok: false, error: "No columns found in header row." };

  // Detect optional units row
  let dataStart = 1;
  const units: string[] = headers.map(() => "");
  if (lines.length > 2 && looksLikeUnitsRow(splitLine(lines[1]))) {
    splitLine(lines[1]).forEach((u, i) => { if (i < units.length) units[i] = u; });
    dataStart = 2;
  }

  // Collect raw values per column
  const raw: (number | null)[][] = headers.map(() => []);
  for (let r = dataStart; r < lines.length; r++) {
    const cells = splitLine(lines[r]);
    for (let c = 0; c < headers.length; c++) {
      const s = cells[c]?.trim() ?? "";
      const n = Number(s);
      raw[c].push(s === "" || isNaN(n) ? null : n);
    }
  }

  const usedKeys = new Set<string>();
  const columns: ParsedColumn[] = [];

  for (let c = 0; c < headers.length; c++) {
    const nums = raw[c].filter((v): v is number => v !== null);
    if (nums.length === 0) continue; // drop non-numeric columns silently

    const min = Math.min(...nums);
    const max = Math.max(...nums);
    // Fill missing values with column minimum so the series is always complete
    const values = raw[c].map(v => v ?? min);

    columns.push({
      key: makeKey(headers[c], usedKeys),
      label: headers[c].trim(),
      unit: units[c] ?? "",
      values,
      min,
      max,
    });
  }

  if (columns.length === 0) return { ok: false, error: "No numeric columns found." };

  return {
    ok: true,
    dataset: {
      name: filename.replace(/\.csv$/i, "").replace(/[-_]/g, " ").trim(),
      columns,
      rowCount: Math.max(...columns.map(c => c.values.length)),
    },
  };
}
