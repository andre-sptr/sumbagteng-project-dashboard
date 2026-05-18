import type { BoqItem } from './excel';

const SUMMARY_ROWS = new Set(['MATERIAL', 'JASA', 'TOTAL']);

function toNumber(value: unknown): number {
  if (value === null || value === undefined || value === '') return 0;
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;

  const parsed = Number.parseFloat(String(value).replace(/,/g, '').trim());
  return Number.isFinite(parsed) ? parsed : 0;
}

function toString(value: unknown): string {
  return value === null || value === undefined ? '' : String(value).trim();
}

function objectValue(row: Record<string, unknown>, key: keyof BoqItem) {
  return row[key];
}

function fromArray(row: unknown[]): BoqItem | null {
  const noRaw = toString(row[0]);
  const designator = toString(row[1]);

  if (!noRaw || !designator) return null;
  if (SUMMARY_ROWS.has(noRaw.toUpperCase())) return null;

  const isSection = /^[A-Za-z]$/.test(noRaw);

  return {
    no: isSection ? 0 : Number.parseInt(noRaw, 10) || 0,
    is_section: isSection,
    designator,
    uraian_pekerjaan: toString(row[2]),
    satuan: toString(row[3]),
    harga_satuan_material: toNumber(row[4]),
    harga_satuan_jasa: toNumber(row[5]),
    volume: toNumber(row[6]),
    total_material: toNumber(row[7]),
    total_jasa: toNumber(row[8]),
    total: toNumber(row[9]),
    keterangan: toString(row[10]),
  };
}

export function normalizeBoqItem(row: unknown): BoqItem | null {
  if (Array.isArray(row)) return fromArray(row);
  if (!row || typeof row !== 'object') return null;

  const record = row as Record<string, unknown>;
  if (typeof record.full_data === 'string') {
    try {
      const parsed = JSON.parse(record.full_data);
      if (Array.isArray(parsed)) return fromArray(parsed);
      return normalizeBoqItem(parsed);
    } catch {
      return null;
    }
  }

  const designator = toString(objectValue(record, 'designator'));
  if (!designator) return null;

  return {
    no: toNumber(objectValue(record, 'no')),
    is_section: Boolean(objectValue(record, 'is_section')),
    designator,
    uraian_pekerjaan: toString(objectValue(record, 'uraian_pekerjaan')),
    satuan: toString(objectValue(record, 'satuan')),
    harga_satuan_material: toNumber(objectValue(record, 'harga_satuan_material')),
    harga_satuan_jasa: toNumber(objectValue(record, 'harga_satuan_jasa')),
    volume: toNumber(objectValue(record, 'volume')),
    total_material: toNumber(objectValue(record, 'total_material')),
    total_jasa: toNumber(objectValue(record, 'total_jasa')),
    total: toNumber(objectValue(record, 'total')),
    keterangan: toString(objectValue(record, 'keterangan')),
  };
}

export function normalizeBoqItems(rows: unknown): BoqItem[] {
  if (!Array.isArray(rows)) return [];
  return rows.flatMap((row) => {
    const item = normalizeBoqItem(row);
    return item ? [item] : [];
  });
}
