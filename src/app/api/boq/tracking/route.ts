import { NextRequest } from 'next/server';
import { BoqRepository } from '@/repositories/BoqRepository';
import { successResponse, withErrorHandling } from '@/lib/response';

export const dynamic = 'force-dynamic';

// GET /api/boq/tracking            → global aggregate (AANWIJZING vs UT)
// GET /api/boq/tracking?id_ihld=X  → per-project comparison (AANWIJZING vs UT)
export const GET = withErrorHandling(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const id_ihld = searchParams.get('id_ihld');

  if (id_ihld) {
    const tracking = BoqRepository.getTrackingByProject(id_ihld);
    return successResponse({ type: 'project', id_ihld, tracking });
  }

  const tracking = BoqRepository.getTrackingGlobal();
  return successResponse({ type: 'global', tracking });
});
