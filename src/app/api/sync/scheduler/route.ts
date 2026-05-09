import { SyncScheduler } from '@/lib/sync-scheduler';
import { successResponse, errorResponse } from '@/lib/response';

export async function GET() {
  return successResponse({ isRunning: SyncScheduler.isRunning() });
}

export async function POST(req: Request) {
  try {
    const { action } = await req.json() as { action: 'start' | 'stop' };
    if (action === 'start') {
      SyncScheduler.start();
    } else if (action === 'stop') {
      SyncScheduler.stop();
    } else {
      return errorResponse('Action tidak valid. Gunakan "start" atau "stop".');
    }
    return successResponse({ isRunning: SyncScheduler.isRunning() });
  } catch {
    return errorResponse('Gagal mengubah status scheduler');
  }
}
