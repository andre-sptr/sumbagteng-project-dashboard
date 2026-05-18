import * as XLSX from 'xlsx';

export interface BoqItem {
  no: number;
  is_section: boolean;
  designator: string;
  uraian_pekerjaan: string;
  satuan: string;
  harga_satuan_material: number;
  harga_satuan_jasa: number;
  volume: number;
  total_material: number;
  total_jasa: number;
  total: number;
  keterangan: string;
}

function toNum(val: unknown): number {
  if (val === null || val === undefined || val === '') return 0;
  const n = typeof val === 'number' ? val : parseFloat(String(val).replace(/,/g, ''));
  return isNaN(n) ? 0 : n;
}

function toStr(val: unknown): string {
  return val === null || val === undefined ? '' : String(val).trim();
}

export function parseBoQExcelItems(buffer: ArrayBuffer): BoqItem[] {
  const workbook = XLSX.read(buffer, { type: 'array' });

  if (!workbook.SheetNames.length) {
    throw new Error('File Excel tidak memiliki sheet yang valid.');
  }

  const sheet = workbook.Sheets[workbook.SheetNames[0]!]!;
  const json = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: '' }) as unknown[][];

  const items: BoqItem[] = [];
  const SUMMARY = new Set(['MATERIAL', 'JASA', 'TOTAL']);

  for (let i = 2; i < json.length; i++) {
    const row = (Array.isArray(json[i]) ? json[i] : []) as unknown[];
    const noRaw = toStr(row[0]);
    const designator = toStr(row[1]);

    if (!noRaw || !designator) continue;
    if (SUMMARY.has(noRaw.toUpperCase())) continue;

    const isSection = /^[A-Za-z]$/.test(noRaw);

    items.push({
      no: isSection ? 0 : (parseInt(noRaw, 10) || 0),
      is_section: isSection,
      designator,
      uraian_pekerjaan: toStr(row[2]),
      satuan: toStr(row[3]),
      harga_satuan_material: toNum(row[4]),
      harga_satuan_jasa: toNum(row[5]),
      volume: toNum(row[6]),
      total_material: toNum(row[7]),
      total_jasa: toNum(row[8]),
      total: toNum(row[9]),
      keterangan: toStr(row[10]),
    });
  }

  return items;
}

// Legacy interface kept for /api/boq/parse backward compatibility
export interface BoqRow {
  id: string;
  nama_lop: string;
  id_ihld: string;
  sto: string;
  batch_program: string;
  project_name: string;
  region: string;
  full_data: string;
  rowIndex: number;
}

export function parseBoQExcel(buffer: ArrayBuffer): BoqRow[] {
  const items = parseBoQExcelItems(buffer);
  return items.map((item, i) => ({
    id: `boq_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    nama_lop: '',
    id_ihld: item.designator,
    sto: '',
    batch_program: '',
    project_name: '',
    region: 'SUMBAGTENG',
    full_data: JSON.stringify(item),
    rowIndex: i + 3,
  }));
}
