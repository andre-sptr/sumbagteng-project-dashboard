import { NextRequest } from 'next/server';
import { BoqRepository } from '@/repositories/BoqRepository';
import { parseBoQExcelItems } from '@/lib/excel';
import { successResponse, withErrorHandling } from '@/lib/response';
import { validateExcelFile, validateFileSize } from '@/lib/validation';
import { ValidationError, FileProcessingError } from '@/lib/errors';

export const dynamic = 'force-dynamic';

export const POST = withErrorHandling(async (request: NextRequest) => {
  const formData = await request.formData();
  const file = formData.get('file') as File | null;
  const id_ihld = formData.get('id_ihld') as string | null;

  if (!file) throw new ValidationError('File tidak ditemukan');
  if (!id_ihld) throw new ValidationError('id_ihld tidak boleh kosong');

  if (!validateExcelFile(file.name)) {
    throw new ValidationError('Format file harus .xlsx atau .xls');
  }
  if (!validateFileSize(file.size, 10)) {
    throw new ValidationError('Ukuran file terlalu besar (maksimal 10MB)');
  }

  const buffer = await file.arrayBuffer();
  const uploadedItems = parseBoQExcelItems(buffer);

  if (uploadedItems.length === 0) {
    throw new FileProcessingError('Tidak ada data yang ditemukan di file Excel', file.name);
  }

  // Determine comparison source: UT first, fallback to AANWIJZING
  let source: 'ut' | 'aanwijzing' | null = null;
  if (BoqRepository.hasBoqItems(id_ihld, 'ut')) {
    source = 'ut';
  } else if (BoqRepository.hasBoqItems(id_ihld, 'aanwijzing')) {
    source = 'aanwijzing';
  }

  if (!source) {
    return successResponse({
      source: null,
      message: 'Tidak ada data BOQ UT atau AANWIJZING untuk project ini.',
      summary: null,
      details: [],
    });
  }

  const dbItems = BoqRepository.getItemsByProject(id_ihld, source);

  // Build lookup maps by designator
  const uploadMap = new Map<string, { volume: number; total: number }>();
  for (const item of uploadedItems) {
    if (item.is_section) continue;
    const key = item.designator.trim();
    if (!key) continue;
    const existing = uploadMap.get(key);
    if (existing) {
      existing.volume += item.volume;
      existing.total += item.total;
    } else {
      uploadMap.set(key, { volume: item.volume, total: item.total });
    }
  }

  const dbMap = new Map<string, { volume: number; total: number }>();
  for (const item of dbItems) {
    dbMap.set(item.designator, { volume: item.volume, total: item.total });
  }

  // Collect all unique designators
  const allDesignators = new Set([...uploadMap.keys(), ...dbMap.keys()]);

  type Status = 'sama' | 'baru' | 'hilang' | 'berubah';

  interface DetailRow {
    designator: string;
    status: Status;
    vol_upload: number;
    vol_db: number;
    selisih_vol: number;
    cost_upload: number;
    cost_db: number;
    selisih_cost: number;
  }

  const details: DetailRow[] = [];
  let countSama = 0;
  let countBaru = 0;
  let countHilang = 0;
  let countBerubah = 0;
  let totalCostUpload = 0;
  let totalCostDb = 0;

  for (const designator of allDesignators) {
    const upload = uploadMap.get(designator);
    const db = dbMap.get(designator);

    const volUpload = upload?.volume ?? 0;
    const volDb = db?.volume ?? 0;
    const costUpload = upload?.total ?? 0;
    const costDb = db?.total ?? 0;

    totalCostUpload += costUpload;
    totalCostDb += costDb;

    let status: Status;
    if (!upload) {
      status = 'hilang';
      countHilang++;
    } else if (!db) {
      status = 'baru';
      countBaru++;
    } else if (volUpload !== volDb || Math.abs(costUpload - costDb) > 0.01) {
      status = 'berubah';
      countBerubah++;
    } else {
      status = 'sama';
      countSama++;
    }

    details.push({
      designator,
      status,
      vol_upload: volUpload,
      vol_db: volDb,
      selisih_vol: volUpload - volDb,
      cost_upload: costUpload,
      cost_db: costDb,
      selisih_cost: costUpload - costDb,
    });
  }

  // Sort: berubah first, then baru, hilang, sama
  const statusOrder: Record<Status, number> = { berubah: 0, baru: 1, hilang: 2, sama: 3 };
  details.sort((a, b) => statusOrder[a.status] - statusOrder[b.status] || a.designator.localeCompare(b.designator));

  return successResponse({
    source,
    summary: {
      designator_upload: uploadMap.size,
      designator_db: dbMap.size,
      count_sama: countSama,
      count_baru: countBaru,
      count_hilang: countHilang,
      count_berubah: countBerubah,
      total_cost_upload: totalCostUpload,
      total_cost_db: totalCostDb,
      selisih_cost: totalCostUpload - totalCostDb,
    },
    details,
  });
});
