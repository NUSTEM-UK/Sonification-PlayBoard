export interface DatasetColumn {
  key: string;
  label: string;
  samples: number[];
  min: number;
  max: number;
}

export interface DatasetRecord {
  id: string;
  label: string;
  rowCount: number;
  columns: DatasetColumn[];
}

function makeId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function cleanLabel(label: string, fallback: string): string {
  const trimmed = label.trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

function splitCsvLine(line: string): string[] {
  return line.split(",").map((part) => part.trim().replace(/^"|"$/g, ""));
}

function isTimeLike(header: string): boolean {
  return /^(time|timestamp|t)$/i.test(header.trim());
}

class DatasetStore {
  datasets = $state<DatasetRecord[]>([]);

  addCsvDataset(label: string, text: string): DatasetRecord {
    const lines = text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
    if (lines.length < 2) throw new Error("CSV needs a header row and at least one data row.");

    const headers = splitCsvLine(lines[0]);
    const rows = lines.slice(1).map(splitCsvLine);
    const columns: DatasetColumn[] = [];

    headers.forEach((header, columnIndex) => {
      if (columnIndex === 0 && isTimeLike(header)) return;
      const samples: number[] = [];
      for (const row of rows) {
        const raw = row[columnIndex];
        if (raw === undefined || raw === "") continue;
        const value = Number(raw);
        if (!Number.isFinite(value)) return;
        samples.push(value);
      }
      if (samples.length === 0) return;
      columns.push({
        key: `col-${columnIndex}`,
        label: cleanLabel(header, `Column ${columnIndex + 1}`),
        samples,
        min: Math.min(...samples),
        max: Math.max(...samples),
      });
    });

    if (columns.length === 0) throw new Error("No numeric columns found in the CSV.");

    const record: DatasetRecord = {
      id: makeId("csv"),
      label: cleanLabel(label.replace(/\.[^.]+$/, ""), "CSV dataset"),
      rowCount: Math.max(...columns.map((column) => column.samples.length)),
      columns,
    };

    this.datasets = [...this.datasets, record];
    return record;
  }

  get(id: string): DatasetRecord | undefined {
    return this.datasets.find((dataset) => dataset.id === id);
  }

  getSample(datasetId: string, columnKey: string, position: number): number {
    const dataset = this.get(datasetId);
    const column = dataset?.columns.find((entry) => entry.key === columnKey);
    if (!dataset || !column || column.samples.length === 0) return 0;
    const index = position % column.samples.length;
    return column.samples[index < 0 ? index + column.samples.length : index] ?? 0;
  }

  getNormalized(datasetId: string, columnKey: string, position: number): number {
    const dataset = this.get(datasetId);
    const column = dataset?.columns.find((entry) => entry.key === columnKey);
    if (!dataset || !column || column.samples.length === 0) return 0;
    const raw = this.getSample(datasetId, columnKey, position);
    const range = column.max - column.min;
    return range > 0 ? Math.max(0, Math.min(1, (raw - column.min) / range)) : Math.max(0, Math.min(1, raw));
  }
}

export const datasetStore = new DatasetStore();
