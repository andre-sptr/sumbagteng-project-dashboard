// API endpoints for managing Aanwijzing (technical briefing) data
import { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { AanwijzingRepository } from '@/repositories/AanwijzingRepository';
import { ProjectRepository } from '@/repositories/ProjectRepository';
import { OltOdcRepository } from '@/repositories/OltOdcRepository';
import { TopologyAllocationRepository, AllocationConflict } from '@/repositories/TopologyAllocationRepository';
import { successResponse, withErrorHandling } from '@/lib/response';
import { normalizeBoqItems } from '@/lib/boq-items';
import { buildPortAllocations } from '@/lib/topology-allocation';
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

function conflictResponse(code: string, message: string, conflicts: AllocationConflict[]) {
  return NextResponse.json(
    {
      success: false,
      error: message,
      details: { code, conflicts },
    },
    { status: 409 }
  );
}

export const GET = withErrorHandling(async () => {
  const aanwijzingWithBoq = AanwijzingRepository.findAllWithBoq();
  const projects = ProjectRepository.getForSelect();
  const topology = {
    olts: OltOdcRepository.getOlts(),
    odcNames: OltOdcRepository.getDistinctOdcNames(),
  };
  return successResponse({ aanwijzing: aanwijzingWithBoq, projects, topology });
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
  const hasTopologyAllocation =
    Boolean(validated.area?.trim()) &&
    Boolean(validated.sto?.trim()) &&
    Boolean(validated.gpon?.trim()) &&
    Boolean(validated.odc_name?.trim());

  const allocations = hasTopologyAllocation
    ? buildPortAllocations({
        aanwijzing_id: aanwijzingId,
        nama_lop: validated.nama_lop,
        id_ihld: validated.id_ihld,
        area: validated.area || '',
        sto: validated.sto || '',
        olt_name: validated.gpon || '',
        odc_name: validated.odc_name || '',
        frame: validated.frame || 0,
        slot_awal: validated.slot_awal || 0,
        slot_akhir: validated.slot_akhir || 0,
        port_awal: validated.port_awal || 0,
        port_akhir: validated.port_akhir || 0,
      })
    : [];

  if (allocations.length > 0) {
    const conflicts = TopologyAllocationRepository.findExistingConflicts(allocations, aanwijzingId);
    const masterConflicts = conflicts.filter(c => c.source === 'master');
    if (masterConflicts.length > 0) {
      return conflictResponse(
        'TOPOLOGY_MASTER_CONFLICT',
        'Port sudah terisi di master Network Topology.',
        masterConflicts
      );
    }

    const allocationConflicts = conflicts.filter(c => c.source === 'allocation');
    if (allocationConflicts.length > 0 && !validated.allow_overwrite) {
      return conflictResponse(
        'TOPOLOGY_ALLOCATION_CONFLICT',
        'Port sudah dialokasikan oleh data AANWIJZING lain.',
        allocationConflicts
      );
    }
  }

  try {
    const aanwijzing = {
      id: aanwijzingId,
      nama_lop: validated.nama_lop,
      id_ihld: validated.id_ihld,
      tematik: validated.tematik || '',
      area: validated.area || '',
      sto: validated.sto || '',
      tanggal_aanwijzing: validated.tanggal_aanwijzing,
      catatan: validated.catatan || '',
      status_after_aanwijzing: validated.status_after_aanwijzing || '',
      gpon: validated.gpon || '',
      odc_name: validated.odc_name || '',
      frame: validated.frame || 0,
      slot_awal: validated.slot_awal || 0,
      slot_akhir: validated.slot_akhir || 0,
      port_awal: validated.port_awal || 0,
      port_akhir: validated.port_akhir || 0,
      wa_spang: validated.wa_spang || '',
      ut: validated.ut || ''
    };

    if (allocations.length > 0) {
      AanwijzingRepository.upsertWithAllocations(aanwijzing, allocations, validated.allow_overwrite);
    } else {
      AanwijzingRepository.upsert(aanwijzing);
      TopologyAllocationRepository.deleteForAanwijzing(aanwijzingId);
    }

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
    TopologyAllocationRepository.deleteForAanwijzing(id);
  } catch (error) {
    throw new DatabaseError(`Gagal menghapus data AANWIJZING: ${(error as Error).message}`);
  }

  return successResponse(null, 'Data AANWIJZING berhasil dihapus');
});
