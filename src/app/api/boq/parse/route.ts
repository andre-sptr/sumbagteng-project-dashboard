import { NextRequest } from 'next/server';
import { parseBoQExcelItems } from '@/lib/excel';
import { successResponse, errorResponse } from '@/lib/response';
import { validateExcelFile, validateFileSize } from '@/lib/validation';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) return errorResponse('File tidak ditemukan', 400);
    if (!validateExcelFile(file.name)) return errorResponse('Format file harus .xlsx atau .xls', 400);
    if (!validateFileSize(file.size, 10)) return errorResponse('Ukuran file terlalu besar (maksimal 10MB)', 400);

    const buffer = await file.arrayBuffer();
    const items = parseBoQExcelItems(buffer);

    if (items.length === 0) return errorResponse('Tidak ada data yang ditemukan di file Excel', 400);

    return successResponse(items, `Berhasil menguraikan ${items.length} baris data`);
  } catch (error) {
    console.error('Error parsing BoQ:', error);
    return errorResponse('Gagal menguraikan file: ' + (error as Error).message, 500);
  }
}
