// API endpoints for managing Aanwijzing (technical briefing) data
import { NextRequest } from 'next/server';
import { AanwijzingRepository } from '@/repositories/AanwijzingRepository';
import { ProjectRepository } from '@/repositories/ProjectRepository';
import { successResponse, withErrorHandling } from '@/lib/response';
import { normalizeBoqItems } from '@/lib/boq-items';
import {
  aanwijzingSchema,
  aanwijzingQuerySchema,
  formatValidationError,
} from '@/lib/validation';
import { ValidationError, DatabaseError } from '@/lib/errors';

export const dynamic = 'force-dynamic';

function generateId(): string {
  return `AAN-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
}

export const GET = withErrorHandling(async () => {
  const aanwijzingWithBoq = AanwijzingRepository.findAllWithBoq();
  const projects = ProjectRepository.getForSelect();
  return successResponse({ aanwijzing: aanwijzingWithBoq, projects });
});

export const POST = withErrorHandling(async (request: NextRequest) => {
  const body = await request.json();
  if ((body as { id?: unknown }).id === null) {
    delete (body as { id?: unknown }).id;
  }

  const validationResult = aanwijzingSchema.safeParse(body);
  if (!validationResult.success) {
    throw new ValidationError(formatValidationError(validationResult.error));
  }

  const validated = validationResult.data;
  const aanwijzingId = validated.id || generateId();

  try {
    AanwijzingRepository.upsert({
      id: aanwijzingId,
      nama_lop: validated.nama_lop,
      id_ihld: validated.id_ihld,
      tematik: validated.tematik || '',
      tanggal_aanwijzing: validated.tanggal_aanwijzing,
      catatan: validated.catatan || '',
      status_after_aanwijzing: validated.status_after_aanwijzing || '',
      gpon: validated.gpon || '',
      frame: validated.frame || 0,
      slot_awal: validated.slot_awal || 0,
      slot_akhir: validated.slot_akhir || 0,
      port_awal: validated.port_awal || 0,
      port_akhir: validated.port_akhir || 0,
      wa_spang: validated.wa_spang || '',
      ut: validated.ut || ''
    });

    const boqItems = normalizeBoqItems((body as { boq_data?: unknown[] }).boq_data);
    if (boqItems.length > 0) {
      AanwijzingRepository.upsertBoqWithItems(
        {
          aanwijzing_id: aanwijzingId,
          nama_lop: validated.nama_lop,
          id_ihld: validated.id_ihld,
        },
        boqItems
      );
    }
  } catch (error) {
    throw new DatabaseError(`Gagal menyimpan data AANWIJZING: ${(error as Error).message}`);
  }

  return successResponse({ id: aanwijzingId }, 'Data AANWIJZING berhasil disimpan');
});

export const DELETE = withErrorHandling(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const params = { id: searchParams.get('id') };

  const validationResult = aanwijzingQuerySchema.safeParse(params);
  if (!validationResult.success) {
    throw new ValidationError(formatValidationError(validationResult.error));
  }

  const { id } = validationResult.data;

  try {
    AanwijzingRepository.delete(id);
    AanwijzingRepository.deleteBoqByAanwijzingId(id);
  } catch (error) {
    throw new DatabaseError(`Gagal menghapus data AANWIJZING: ${(error as Error).message}`);
  }

  return successResponse(null, 'Data AANWIJZING berhasil dihapus');
});
